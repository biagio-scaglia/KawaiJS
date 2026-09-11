import type {
  CharacterDefinition,
  ChoiceOption,
  Instruction,
  ProgramNode,
  StatementNode,
  StoryPackage
} from '@kawaijs/ast';
import { KawaError } from './diagnostic.js';

export interface CompilerOptions {
  validateLabels?: boolean;
}

export class Compiler {
  private readonly program: ProgramNode;
  private readonly options: CompilerOptions;
  private anonymousLabelCounter = 0;

  constructor(program: ProgramNode, options: CompilerOptions = { validateLabels: true }) {
    this.program = program;
    this.options = options;
  }

  public compile(): StoryPackage {
    const characters: Record<string, CharacterDefinition> = {};
    const labels: Record<string, Instruction[]> = {};

    // 1. First pass: Collect character declarations and label bodies
    for (const stmt of this.program.statements) {
      if (stmt.type === 'CharacterDecl') {
        characters[stmt.id] = {
          id: stmt.id,
          name: stmt.displayName,
          color: stmt.color
        };
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

    return {
      meta: {
        title: 'Kawaijs Visual Novel',
        version: '0.1.0',
        startLabel: labels['start'] ? 'start' : Object.keys(labels)[0]
      },
      characters,
      labels
    };
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
            background: stmt.background,
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
            track: stmt.track,
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
      }
    }

    return instructions;
  }

  private validateLabelReferences(labels: Record<string, Instruction[]>): void {
    const knownLabels = new Set(Object.keys(labels));
    const userLabels = Array.from(knownLabels).filter(l => !l.startsWith('__'));

    for (const [labelName, instructions] of Object.entries(labels)) {
      for (const inst of instructions) {
        if (inst.type === 'jump' && !knownLabels.has(inst.targetLabel)) {
          let closestLabel: string | undefined;
          let minDistance = Infinity;

          for (const uLabel of userLabels) {
            const dist = levenshteinDistance(inst.targetLabel, uLabel);
            if (dist < minDistance && dist <= 3) {
              minDistance = dist;
              closestLabel = uLabel;
            }
          }

          let hint = `Available labels: ${userLabels.join(', ')}`;
          if (closestLabel) {
            hint = `Did you mean '${closestLabel}'?\n     Available labels: ${userLabels.join(', ')}`;
          }

          throw new KawaError({
            code: 'E0202',
            message: `Unknown label '${inst.targetLabel}' referenced in '${labelName.startsWith('__') ? 'block' : labelName}'`,
            severity: 'error',
            loc: inst.loc,
            hint
          });
        }
      }
    }
  }
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }

  return dp[m]![n]!;
}
