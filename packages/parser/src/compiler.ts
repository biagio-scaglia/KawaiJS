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
    labels: Record<string, Instruction[]>
  ): Instruction[] {
    const instructions: Instruction[] = [];

    for (const stmt of statements) {
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
          const choiceOptions: ChoiceOption[] = [];
          for (const choice of stmt.choices) {
            this.anonymousLabelCounter += 1;
            const syntheticLabel = `__choice_${currentLabel}_${this.anonymousLabelCounter}`;
            
            // Compile choice body into its own synthetic label block
            const choiceInstructions = this.compileBlock(syntheticLabel, choice.body, labels);
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
          break;
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
            loc: stmt.loc
          });
          break;

        case 'IfStmt': {
          this.anonymousLabelCounter += 1;
          const thenLabel = `__if_then_${currentLabel}_${this.anonymousLabelCounter}`;
          const mergeLabel = `__if_merge_${currentLabel}_${this.anonymousLabelCounter}`;

          const thenInstructions = this.compileBlock(thenLabel, stmt.thenBranch, labels);
          // If thenBranch doesn't end with jump or return, fall through to mergeLabel
          thenInstructions.push({ type: 'jump', targetLabel: mergeLabel });
          labels[thenLabel] = thenInstructions;

          let elseLabel: string | undefined;
          if (stmt.elseBranch) {
            elseLabel = `__if_else_${currentLabel}_${this.anonymousLabelCounter}`;
            const elseInstructions = this.compileBlock(elseLabel, stmt.elseBranch.body, labels);
            elseInstructions.push({ type: 'jump', targetLabel: mergeLabel });
            labels[elseLabel] = elseInstructions;
          } else {
            elseLabel = mergeLabel;
          }

          instructions.push({
            type: 'branch',
            condition: stmt.condition,
            thenLabel,
            elseLabel,
            loc: stmt.loc
          });

          // Create merge block for following instructions
          labels[mergeLabel] = [];
          // Switch compiling remainder of statements into mergeLabel if needed
          break;
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

    for (const [labelName, instructions] of Object.entries(labels)) {
      for (const inst of instructions) {
        if (inst.type === 'jump' && !knownLabels.has(inst.targetLabel)) {
          throw new KawaError({
            code: 'E0202',
            message: `Unknown label '${inst.targetLabel}' referenced in '${labelName}'`,
            severity: 'error',
            loc: inst.loc,
            hint: `Available labels: ${Array.from(knownLabels).filter(l => !l.startsWith('__')).join(', ')}`
          });
        }
      }
    }
  }
}
