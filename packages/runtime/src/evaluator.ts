export const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeKey(key: string): boolean {
  return !DANGEROUS_KEYS.has(key);
}

export function hasVar(variables: Record<string, unknown>, key: string): boolean {
  if (!isSafeKey(key)) return false;
  return Object.prototype.hasOwnProperty.call(variables, key);
}

/**
 * Resolves a token or identifier against the current runtime variable store.
 */
export function resolveValue(
  token: string,
  variables: Record<string, unknown>,
  isVariable?: boolean
): unknown {
  const trimmed = token.trim();

  // Boolean literals
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Number literal
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }

  // Quoted string literal
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Explicitly marked as not a variable (string literal without quotes)
  if (isVariable === false) {
    return trimmed;
  }

  // Lookup in variable store
  if (hasVar(variables, trimmed)) {
    return variables[trimmed];
  }

  // If token is a valid identifier syntax but not defined in store, resolve to undefined
  if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function findOperatorOutsideQuotes(
  str: string,
  targetOps: readonly string[]
): { op: string; index: number } | null {
  let inQuote: '"' | "'" | null = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (inQuote) {
      if (ch === inQuote && str[i - 1] !== '\\') inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    for (const op of targetOps) {
      if (str.startsWith(op, i)) {
        if (op === 'and' || op === 'or') {
          const before = i === 0 ? ' ' : str[i - 1]!;
          const after = i + op.length >= str.length ? ' ' : str[i + op.length]!;
          if (/\s/.test(before) && /\s/.test(after)) {
            return { op, index: i };
          }
        } else {
          return { op, index: i };
        }
      }
    }
  }
  return null;
}

function isTruthy(val: unknown): boolean {
  if (
    val === false ||
    val === 'false' ||
    val === 0 ||
    val === '0' ||
    val === undefined ||
    val === null ||
    val === ''
  ) {
    return false;
  }
  return Boolean(val);
}

/**
 * Evaluates a condition expression against the current variables.
 */
export function evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
  const trimmed = condition.trim();
  if (!trimmed || trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // 1. Compound OR ('||' or ' or ')
  const orMatch = findOperatorOutsideQuotes(trimmed, ['||', 'or']);
  if (orMatch) {
    const left = trimmed.slice(0, orMatch.index);
    const right = trimmed.slice(orMatch.index + orMatch.op.length);
    return evaluateCondition(left, variables) || evaluateCondition(right, variables);
  }

  // 2. Compound AND ('&&' or ' and ')
  const andMatch = findOperatorOutsideQuotes(trimmed, ['&&', 'and']);
  if (andMatch) {
    const left = trimmed.slice(0, andMatch.index);
    const right = trimmed.slice(andMatch.index + andMatch.op.length);
    return evaluateCondition(left, variables) && evaluateCondition(right, variables);
  }

  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (v === true) return 1;
    if (v === false || v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // 3. Binary comparison operators: >=, <=, !=, ==, >, <
  const operators = ['>=', '<=', '!=', '==', '>', '<'] as const;
  const cmpMatch = findOperatorOutsideQuotes(trimmed, operators);
  if (cmpMatch) {
    const op = cmpMatch.op;
    const leftRaw = trimmed.slice(0, cmpMatch.index);
    const rightRaw = trimmed.slice(cmpMatch.index + op.length);
    const leftVal = resolveValue(leftRaw, variables);
    const rightVal = resolveValue(rightRaw, variables);

    const isLeftNumeric = typeof leftVal === 'number' || (!isNaN(Number(leftVal)) && typeof leftVal === 'string' && leftVal.trim() !== '');
    const isRightNumeric = typeof rightVal === 'number' || (!isNaN(Number(rightVal)) && typeof rightVal === 'string' && rightVal.trim() !== '');

    switch (op) {
      case '==':
        return leftVal === rightVal || String(leftVal) === String(rightVal);
      case '!=':
        return leftVal !== rightVal && String(leftVal) !== String(rightVal);
      case '>=':
        if (isLeftNumeric && isRightNumeric) return toNum(leftVal) >= toNum(rightVal);
        return String(leftVal ?? '') >= String(rightVal ?? '');
      case '<=':
        if (isLeftNumeric && isRightNumeric) return toNum(leftVal) <= toNum(rightVal);
        return String(leftVal ?? '') <= String(rightVal ?? '');
      case '>':
        if (isLeftNumeric && isRightNumeric) return toNum(leftVal) > toNum(rightVal);
        return String(leftVal ?? '') > String(rightVal ?? '');
      case '<':
        if (isLeftNumeric && isRightNumeric) return toNum(leftVal) < toNum(rightVal);
        return String(leftVal ?? '') < String(rightVal ?? '');
    }
  }

  // 4. Negation
  if (trimmed.startsWith('!')) {
    const inner = trimmed.slice(1).trim();
    return !evaluateCondition(inner, variables);
  }

  // 5. Single identifier / flag
  const val = hasVar(variables, trimmed) ? variables[trimmed] : resolveValue(trimmed, variables);
  return isTruthy(val);
}

/**
 * Applies a variable assignment / arithmetic update.
 */
export function applySetOperation(
  currentValue: unknown,
  operator: '=' | '+=' | '-=' | undefined,
  assignedValue: unknown,
  variables: Record<string, unknown>,
  isVariable?: boolean
): unknown {
  const resolved = isVariable !== false && typeof assignedValue === 'string' && hasVar(variables, assignedValue)
    ? variables[assignedValue]
    : assignedValue;

  switch (operator) {
    case '+=':
      if (typeof currentValue === 'string' || typeof resolved === 'string') {
        return String(currentValue ?? '') + String(resolved ?? '');
      }
      return Number(currentValue ?? 0) + Number(resolved);
    case '-=':
      return Number(currentValue ?? 0) - Number(resolved);
    case '=':
    default:
      return resolved;
  }
}
