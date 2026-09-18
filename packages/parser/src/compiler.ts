import type {
  CharacterDefinition,
  ChoiceOption,
  Instruction,
  ProgramNode,
  StatementNode,
  StoryPackage
} from '@kawaijs/ast';
import { KawaError } from './diagnostic.js';
import { closestMatch } from './suggest.js';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';

export type FileResolver = (filePath: string, fromFile: string) => string | undefined | null;

export interface CompilerOptions {
  validateLabels?: boolean;
  fileResolver?: FileResolver;
}

export class Compiler {
  private readonly program: ProgramNode;
  private readonly options: CompilerOptions;
  private anonymousLabelCounter = 0;
  private defines: Record<string, string> = {};

  constructor(program: ProgramNode, options: CompilerOptions = { validateLabels: true }) {
    this.program = program;
    this.options = options;
  }

  public compile(): StoryPackage {
    const characters: Record<string, CharacterDefinition> = {};
    const labels: Record<string, Instruction[]> = {};
    this.defines = {};

    const rootFile = this.program.loc?.file ?? '<anonymous>';
    const flattenedStatements = this.expandStatements(this.program.statements, rootFile, new Set([rootFile]));

    // 1. First pass: Collect character / define declarations and label bodies
    for (const stmt of flattenedStatements) {
      if (stmt.type === 'CharacterDecl') {
        if (characters[stmt.id]) {
          throw new KawaError({
            code: 'E0208',
            message: `Duplicate character declaration '${stmt.id}'`,
            severity: 'error',
            loc: stmt.loc
          });
        }
        characters[stmt.id] = {
          id: stmt.id,
          name: stmt.displayName,
          color: stmt.color
        };
      } else if (stmt.type === 'DefineDecl') {
        if (this.defines[stmt.name]) {
          throw new KawaError({
            code: 'E0205',
            message: `Duplicate define '${stmt.name}'`,
            severity: 'error',
            loc: stmt.loc
          });
        }
        this.defines[stmt.name] = stmt.value;
      } else if (stmt.type === 'LabelDecl') {
        if (labels[stmt.name]) {
          throw new KawaError({
            code: 'E0201',
            message: `Duplicate label declaration '${stmt.name}'`,
            severity: 'error',
            loc: stmt.loc
          });
        }
        labels[stmt.name] = this.compileBlock(stmt.name, stmt.body, labels);
      }
    }

    // 2. Validate label references if enabled
    if (this.options.validateLabels) {
      this.validateLabelReferences(labels);
    }

    const userLabels = Object.keys(labels).filter((l) => !l.startsWith('__'));
    if (userLabels.length === 0) {
      throw new KawaError({
        code: 'E0203',
        message: 'Story has no labels to start from. Declare at least one `label`.',
        severity: 'error',
        loc: this.program.loc
      });
    }

    // Prefer `start`, otherwise the first *user* label. Synthetic `__*` labels must never
    // become the entrypoint (they are inserted while compiling menu/if bodies).
    const startLabel = labels['start'] ? 'start' : userLabels[0]!;

    return {
      meta: {
        title: 'Kawaijs Visual Novel',
        version: '0.1.0',
        startLabel
      },
      characters,
      defines: { ...this.defines },
      labels
    };
  }

  private expandStatements(
    statements: StatementNode[],
    currentFile: string,
    visited: Set<string>
  ): StatementNode[] {
    const result: StatementNode[] = [];
    for (const stmt of statements) {
      if (stmt.type === 'IncludeStmt') {
        const targetPath = stmt.file;
        let source: string | null | undefined;

        if (this.options.fileResolver) {
          source = this.options.fileResolver(targetPath, currentFile);
        }

        if (source === undefined || source === null) {
          throw new KawaError({
            code: 'E0207',
            message: `Cannot resolve include file '${targetPath}' from '${currentFile}'. Ensure file exists or fileResolver is provided.`,
            severity: 'error',
            loc: stmt.loc
          });
        }

        if (visited.has(targetPath)) {
          throw new KawaError({
            code: 'E0206',
            message: `Circular include detected: '${targetPath}'`,
            severity: 'error',
            loc: stmt.loc
          });
        }

        const nextVisited = new Set(visited);
        nextVisited.add(targetPath);

        const lexer = new Lexer(source, targetPath);
        const parser = new Parser(lexer.tokenize(), targetPath);
        const subProgram = parser.parse();
        const expandedSub = this.expandStatements(subProgram.statements, targetPath, nextVisited);
        result.push(...expandedSub);
      } else {
        result.push(stmt);
      }
    }
    return result;
  }

  /** Resolve `define` aliases. Returns `fallback` (or `primary`) when unset. */
  private resolveAlias(primary: string, fallback?: string): string {
    if (this.defines[primary]) return this.defines[primary]!;
    if (fallback !== undefined) {
      if (this.defines[fallback]) return this.defines[fallback]!;
      return fallback;
    }
    return primary;
  }

  private compileBlock(
    currentLabel: string,
    statements: StatementNode[],
    labels: Record<string, Instruction[]>,
    continuationLabel?: string
  ): Instruction[] {
    const instructions: Instruction[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]!;

      switch (stmt.type) {
        case 'SceneStmt':
          instructions.push({
            type: 'scene',
            background: this.resolveAlias(stmt.background),
            transition: stmt.transition,
            loc: stmt.loc
          });
          break;

        case 'ShowStmt':
          instructions.push({
            type: 'show',
            character: stmt.character,
            expression: stmt.expression,
            position: stmt.position,
            transition: stmt.transition,
            layer: stmt.layer,
            z: stmt.z,
            loc: stmt.loc
          });
          break;

        case 'HideStmt':
          instructions.push({
            type: 'hide',
            character: stmt.character,
            transition: stmt.transition,
            loc: stmt.loc
          });
          break;

        case 'DialogueStmt':
          instructions.push({
            type: 'dialogue',
            speaker: stmt.speaker,
            text: stmt.text,
            loc: stmt.loc
          });
          break;

        case 'MenuStmt': {
          const remainingStatements = statements.slice(i + 1);
          const hasRemaining = remainingStatements.length > 0;
          this.anonymousLabelCounter += 1;
          const mergeLabel = `__menu_merge_${currentLabel}_${this.anonymousLabelCounter}`;

          const choiceOptions: ChoiceOption[] = [];
          if (stmt.choices.length === 0) {
            throw new KawaError({
              code: 'E0204',
              message: `Menu in '${currentLabel}' has no choices.`,
              severity: 'error',
              loc: stmt.loc,
              hint: 'Add at least one choice option under the menu block.'
            });
          }
          for (const choice of stmt.choices) {
            this.anonymousLabelCounter += 1;
            const syntheticLabel = `__choice_${currentLabel}_${this.anonymousLabelCounter}`;

            const choiceInstructions = this.compileBlock(syntheticLabel, choice.body, labels, mergeLabel);
            const lastInst = choiceInstructions[choiceInstructions.length - 1];
            if (!lastInst || (lastInst.type !== 'jump' && lastInst.type !== 'return')) {
              choiceInstructions.push({ type: 'jump', targetLabel: mergeLabel });
            }
            labels[syntheticLabel] = choiceInstructions;

            choiceOptions.push({
              text: choice.text,
              targetLabel: syntheticLabel,
              condition: choice.condition
            });
          }

          instructions.push({
            type: 'choice',
            prompt: stmt.prompt,
            choices: choiceOptions,
            fallbackLabel: mergeLabel,
            loc: stmt.loc
          });

          if (hasRemaining) {
            labels[mergeLabel] = this.compileBlock(mergeLabel, remainingStatements, labels, continuationLabel);
          } else if (continuationLabel) {
            labels[mergeLabel] = [{ type: 'jump', targetLabel: continuationLabel }];
          } else {
            labels[mergeLabel] = [{ type: 'return' }];
          }
          return instructions;
        }

        case 'JumpStmt':
          instructions.push({
            type: 'jump',
            targetLabel: stmt.targetLabel,
            loc: stmt.loc
          });
          break;

        case 'CallStmt':
          instructions.push({
            type: 'call',
            targetLabel: stmt.targetLabel,
            loc: stmt.loc
          });
          break;

        case 'ReturnStmt':
          instructions.push({
            type: 'return',
            loc: stmt.loc
          });
          break;

        case 'SetStmt':
          instructions.push({
            type: 'set',
            variable: stmt.variable,
            operator: stmt.operator,
            value: stmt.value,
            isVariable: stmt.isVariable,
            loc: stmt.loc
          });
          break;

        case 'IfStmt': {
          const remainingStatements = statements.slice(i + 1);
          const hasRemaining = remainingStatements.length > 0;
          this.anonymousLabelCounter += 1;
          const mergeLabel = `__if_merge_${currentLabel}_${this.anonymousLabelCounter}`;

          // Compile Then Branch
          this.anonymousLabelCounter += 1;
          const thenLabel = `__if_then_${currentLabel}_${this.anonymousLabelCounter}`;
          const thenInstructions = this.compileBlock(thenLabel, stmt.thenBranch, labels, mergeLabel);
          const lastThen = thenInstructions[thenInstructions.length - 1];
          if (!lastThen || (lastThen.type !== 'jump' && lastThen.type !== 'return')) {
            thenInstructions.push({ type: 'jump', targetLabel: mergeLabel });
          }
          labels[thenLabel] = thenInstructions;

          // Compile Else & Elif Branches
          let currentBranchTarget = mergeLabel;

          if (stmt.elseBranch) {
            this.anonymousLabelCounter += 1;
            const elseLabel = `__if_else_${currentLabel}_${this.anonymousLabelCounter}`;
            const elseInstructions = this.compileBlock(elseLabel, stmt.elseBranch.body, labels, mergeLabel);
            const lastElse = elseInstructions[elseInstructions.length - 1];
            if (!lastElse || (lastElse.type !== 'jump' && lastElse.type !== 'return')) {
              elseInstructions.push({ type: 'jump', targetLabel: mergeLabel });
            }
            labels[elseLabel] = elseInstructions;
            currentBranchTarget = elseLabel;
          }

          const elifBranches = stmt.elifBranches || [];
          for (let e = elifBranches.length - 1; e >= 0; e--) {
            const elif = elifBranches[e]!;
            this.anonymousLabelCounter += 1;
            const elifThenLabel = `__elif_then_${currentLabel}_${this.anonymousLabelCounter}`;
            const elifTestLabel = `__elif_test_${currentLabel}_${this.anonymousLabelCounter}`;

            const elifThenInst = this.compileBlock(elifThenLabel, elif.body, labels, mergeLabel);
            const lastElif = elifThenInst[elifThenInst.length - 1];
            if (!lastElif || (lastElif.type !== 'jump' && lastElif.type !== 'return')) {
              elifThenInst.push({ type: 'jump', targetLabel: mergeLabel });
            }
            labels[elifThenLabel] = elifThenInst;

            labels[elifTestLabel] = [
              {
                type: 'branch',
                condition: elif.condition,
                thenLabel: elifThenLabel,
                elseLabel: currentBranchTarget,
                loc: elif.loc
              }
            ];
            currentBranchTarget = elifTestLabel;
          }

          instructions.push({
            type: 'branch',
            condition: stmt.condition,
            thenLabel,
            elseLabel: currentBranchTarget,
            loc: stmt.loc
          });

          if (hasRemaining) {
            labels[mergeLabel] = this.compileBlock(mergeLabel, remainingStatements, labels, continuationLabel);
          } else if (continuationLabel) {
            labels[mergeLabel] = [{ type: 'jump', targetLabel: continuationLabel }];
          } else {
            labels[mergeLabel] = [{ type: 'return' }];
          }
          return instructions;
        }

        case 'PlayStmt':
          instructions.push({
            type: 'play_audio',
            channel: stmt.channel,
            track: this.resolveAlias(`${stmt.channel} ${stmt.track}`, stmt.track),
            fade: stmt.fade,
            loop: stmt.loop,
            loc: stmt.loc
          });
          break;

        case 'StopStmt':
          instructions.push({
            type: 'stop_audio',
            channel: stmt.channel,
            fade: stmt.fade,
            loc: stmt.loc
          });
          break;

        case 'VfxStmt':
          instructions.push({
            type: 'vfx',
            effect: stmt.effect,
            intensity: stmt.intensity,
            color: stmt.color,
            loc: stmt.loc
          });
          break;

        case 'CameraStmt':
          instructions.push({
            type: 'camera',
            action: stmt.action,
            duration: stmt.duration,
            loc: stmt.loc
          });
          break;

        case 'PauseStmt':
          instructions.push({
            type: 'pause',
            duration: stmt.duration,
            loc: stmt.loc
          });
          break;

        case 'CgStmt':
          instructions.push({
            type: 'cg',
            image: this.resolveAlias(stmt.image),
            unlockId: stmt.unlockId,
            loc: stmt.loc
          });
          break;

        case 'InputStmt':
          instructions.push({
            type: 'input',
            variable: stmt.variable,
            prompt: stmt.prompt,
            loc: stmt.loc
          });
          break;

        case 'WindowStmt':
          instructions.push({
            type: 'window',
            action: stmt.action,
            loc: stmt.loc
          });
          break;

        case 'ThemeStmt':
          instructions.push({
            type: 'theme',
            name: stmt.name,
            loc: stmt.loc
          });
          break;

        case 'StyleStmt':
          instructions.push({
            type: 'style',
            target: stmt.target,
            name: stmt.name,
            loc: stmt.loc
          });
          break;

        case 'HotspotStmt': {
          // Writer-friendly percent (0–100) or fraction (0–1) → normalize to 0–1
          const norm = (n: number): number => {
            if (!Number.isFinite(n)) return 0;
            const v = n > 1 ? n / 100 : n;
            return Math.min(1, Math.max(0, v));
          };
          instructions.push({
            type: 'hotspot',
            id: stmt.id,
            x: norm(stmt.x),
            y: norm(stmt.y),
            w: Math.max(0.01, norm(stmt.w)),
            h: Math.max(0.01, norm(stmt.h)),
            targetLabel: stmt.targetLabel,
            loc: stmt.loc
          });
          break;
        }

        case 'LayerStmt':
          instructions.push({
            type: 'layer',
            name: stmt.name,
            loc: stmt.loc
          });
          break;

        case 'AnimateStmt':
          instructions.push({
            type: 'animate',
            character: stmt.character,
            animation: stmt.animation,
            durationMs: stmt.durationMs,
            loc: stmt.loc
          });
          break;

        case 'UnlockStmt':
          instructions.push({
            type: 'unlock',
            id: stmt.id,
            title: stmt.title,
            description: stmt.description,
            loc: stmt.loc
          });
          break;

        case 'LangStmt':
          instructions.push({
            type: 'lang',
            code: stmt.code,
            loc: stmt.loc
          });
          break;

        case 'CharacterDecl':
        case 'DefineDecl':
        case 'LabelDecl': {
          const kind =
            stmt.type === 'CharacterDecl'
              ? 'character'
              : stmt.type === 'DefineDecl'
                ? 'define'
                : 'label';
          throw new KawaError({
            code: 'E0209',
            message: `Nested ${kind} declaration is not allowed inside a label body. Move it to the top level.`,
            severity: 'error',
            loc: stmt.loc
          });
        }
      }
    }

    return instructions;
  }

  private validateLabelReferences(labels: Record<string, Instruction[]>): void {
    const knownLabels = new Set(Object.keys(labels));
    const userLabels = Array.from(knownLabels).filter(l => !l.startsWith('__'));

    const assertKnown = (
      targetLabel: string,
      kind: string,
      labelName: string,
      loc: Instruction['loc']
    ): void => {
      if (knownLabels.has(targetLabel)) return;

      const closestLabel = closestMatch(targetLabel, userLabels, 3);
      let hint = `Available labels: ${userLabels.join(', ') || '(none)'}`;
      if (closestLabel) {
        hint = `Did you mean '${closestLabel}'?\n     Available labels: ${userLabels.join(', ')}`;
      }

      throw new KawaError({
        code: 'E0202',
        message: `Unknown label '${targetLabel}' referenced by ${kind} in '${labelName.startsWith('__') ? 'block' : labelName}'`,
        severity: 'error',
        loc,
        hint
      });
    };

    for (const [labelName, instructions] of Object.entries(labels)) {
      for (const inst of instructions) {
        if (inst.type === 'jump' || inst.type === 'call' || inst.type === 'hotspot') {
          assertKnown(inst.targetLabel, inst.type, labelName, inst.loc);
        } else if (inst.type === 'branch') {
          assertKnown(inst.thenLabel, 'branch', labelName, inst.loc);
          if (inst.elseLabel) {
            assertKnown(inst.elseLabel, 'branch', labelName, inst.loc);
          }
        } else if (inst.type === 'choice') {
          for (const choice of inst.choices) {
            assertKnown(choice.targetLabel, 'choice', labelName, inst.loc);
          }
          if (inst.fallbackLabel) {
            assertKnown(inst.fallbackLabel, 'choice', labelName, inst.loc);
          }
        }
      }
    }
  }
}
