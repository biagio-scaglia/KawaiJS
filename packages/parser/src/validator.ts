import type { StoryPackage, Instruction } from '@kawaijs/ast';
import { type KawaDiagnostic, KawaError } from './diagnostic.js';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Compiler } from './compiler.js';

export interface ValidationReport {
  readonly isValid: boolean;
  readonly errors: readonly KawaDiagnostic[];
  readonly warnings: readonly KawaDiagnostic[];
  readonly info: readonly KawaDiagnostic[];
  readonly characterCount: number;
  readonly labelCount: number;
  readonly instructionCount: number;
}

/**
 * Perform semantic analysis and validation on a compiled StoryPackage.
 */
export function validateStory(story: StoryPackage): ValidationReport {
  const errors: KawaDiagnostic[] = [];
  const warnings: KawaDiagnostic[] = [];
  const info: KawaDiagnostic[] = [];

  const declaredLabels = new Set(Object.keys(story.labels));
  const declaredCharacters = new Set(Object.keys(story.characters));
  const referencedLabels = new Set<string>();

  const startLabel = story.meta.startLabel ?? 'start';
  referencedLabels.add(startLabel);

  // 1. Validate Start Label
  if (!declaredLabels.has(startLabel)) {
    errors.push({
      code: 'E0203',
      message: `Start label '${startLabel}' is not defined in the story.`,
      severity: 'error',
      hint: `Create a 'label ${startLabel}:' block as the entry point of your visual novel.`
    });
  }

  let totalInstructions = 0;

  // 2. Validate instructions in every label
  for (const instructions of Object.values(story.labels)) {
    totalInstructions += instructions.length;

    for (const inst of instructions) {
      validateInstruction(inst, declaredLabels, declaredCharacters, referencedLabels, errors, warnings);
    }
  }

  // 3. Check for unreachable labels (excluding internal compiler labels starting with '__')
  for (const labelName of declaredLabels) {
    if (!labelName.startsWith('__') && !referencedLabels.has(labelName)) {
      warnings.push({
        code: 'W0201',
        message: `Label '${labelName}' is defined but never jumped to or called.`,
        severity: 'warning',
        hint: `Check if you have a typo in a 'jump ${labelName}' or 'call ${labelName}'.`
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    characterCount: declaredCharacters.size,
    labelCount: Array.from(declaredLabels).filter(l => !l.startsWith('__')).length,
    instructionCount: totalInstructions
  };
}

function validateInstruction(
  inst: Instruction,
  declaredLabels: Set<string>,
  declaredCharacters: Set<string>,
  referencedLabels: Set<string>,
  errors: KawaDiagnostic[],
  warnings: KawaDiagnostic[]
): void {
  switch (inst.type) {
    case 'jump': {
      referencedLabels.add(inst.targetLabel);
      if (!declaredLabels.has(inst.targetLabel)) {
        errors.push({
          code: 'E0202',
          message: `Jump target label '${inst.targetLabel}' is not defined.`,
          severity: 'error',
          loc: inst.loc,
          hint: findClosestLabelMatch(inst.targetLabel, declaredLabels)
        });
      }
      break;
    }

    case 'call': {
      referencedLabels.add(inst.targetLabel);
      if (!declaredLabels.has(inst.targetLabel)) {
        errors.push({
          code: 'E0202',
          message: `Call target label '${inst.targetLabel}' is not defined.`,
          severity: 'error',
          loc: inst.loc,
          hint: findClosestLabelMatch(inst.targetLabel, declaredLabels)
        });
      }
      break;
    }

    case 'branch': {
      referencedLabels.add(inst.thenLabel);
      if (!declaredLabels.has(inst.thenLabel)) {
        errors.push({
          code: 'E0202',
          message: `Branch target label '${inst.thenLabel}' is not defined.`,
          severity: 'error',
          loc: inst.loc
        });
      }
      if (inst.elseLabel) {
        referencedLabels.add(inst.elseLabel);
        if (!declaredLabels.has(inst.elseLabel)) {
          errors.push({
            code: 'E0202',
            message: `Branch target else-label '${inst.elseLabel}' is not defined.`,
            severity: 'error',
            loc: inst.loc
          });
        }
      }
      break;
    }

    case 'choice': {
      for (const choice of inst.choices) {
        referencedLabels.add(choice.targetLabel);
        if (!declaredLabels.has(choice.targetLabel)) {
          errors.push({
            code: 'E0202',
            message: `Choice target label '${choice.targetLabel}' is not defined.`,
            severity: 'error',
            loc: inst.loc
          });
        }
      }
      break;
    }

    case 'dialogue': {
      if (inst.speaker && !declaredCharacters.has(inst.speaker)) {
        warnings.push({
          code: 'W0202',
          message: `Character '${inst.speaker}' used in dialogue is not declared.`,
          severity: 'warning',
          loc: inst.loc,
          hint: `Declare character using 'character ${inst.speaker} "${inst.speaker}"' at the top of your script.`
        });
      }
      break;
    }

    case 'show': {
      if (inst.character && !declaredCharacters.has(inst.character)) {
        warnings.push({
          code: 'W0203',
          message: `Character '${inst.character}' in show statement is not declared.`,
          severity: 'warning',
          loc: inst.loc,
          hint: `Declare character using 'character ${inst.character} "${inst.character}"'`
        });
      }
      break;
    }

    case 'scene': {
      if (!inst.background || !inst.background.trim()) {
        warnings.push({
          code: 'W0204',
          message: `Scene statement has an empty background name.`,
          severity: 'warning',
          loc: inst.loc
        });
      }
      break;
    }
  }
}

/**
 * Levenshtein distance string similarity helper to suggest closest matching label names.
 */
function findClosestLabelMatch(target: string, available: Set<string>): string | undefined {
  let closest: string | undefined;
  let minDistance = 3;

  for (const candidate of available) {
    if (candidate.startsWith('__')) continue;
    const dist = levenshtein(target.toLowerCase(), candidate.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      closest = candidate;
    }
  }

  return closest ? `Did you mean '${closest}'?` : undefined;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          Math.min(matrix[i]![j - 1]! + 1, matrix[i - 1]![j]! + 1)
        );
      }
    }
  }
  return matrix[b.length]![a.length]!;
}

/**
 * Validate raw Kawa script source code directly.
 */
export function validateScript(source: string, filename = 'script.kawa'): ValidationReport {
  try {
    const lexer = new Lexer(source, filename);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filename);
    const ast = parser.parse();
    const compiler = new Compiler(ast, { validateLabels: false });
    const story = compiler.compile();
    return validateStory(story);
  } catch (err: unknown) {
    const errorDiagnostic: KawaDiagnostic =
      err instanceof KawaError
        ? err.diagnostic
        : {
            code: 'E0000',
            message: err instanceof Error ? err.message : String(err),
            severity: 'error'
          };

    return {
      isValid: false,
      errors: [errorDiagnostic],
      warnings: [],
      info: [],
      characterCount: 0,
      labelCount: 0,
      instructionCount: 0
    };
  }
}
