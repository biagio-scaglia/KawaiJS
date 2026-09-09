/**
 * Resolves a token or identifier against the current runtime variable store.
 */
export function resolveValue(token: string, variables: Record<string, unknown>): unknown {
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

  // Lookup in variable store
  if (trimmed in variables) {
    return variables[trimmed];
  }

  return trimmed;
}

/**
 * Evaluates a condition expression against the current variables.
 */
export function evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
  const trimmed = condition.trim();
  if (!trimmed || trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (v === true) return 1;
    if (v === false || v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // Binary comparison operators: >=, <=, !=, ==, >, <
  const operators = ['>=', '<=', '!=', '==', '>', '<'] as const;
  for (const op of operators) {
    const idx = trimmed.indexOf(op);
    if (idx !== -1) {
      const leftRaw = trimmed.slice(0, idx);
      const rightRaw = trimmed.slice(idx + op.length);
      const leftVal = resolveValue(leftRaw, variables);
      const rightVal = resolveValue(rightRaw, variables);

      switch (op) {
        case '>=':
          return toNum(leftVal) >= toNum(rightVal);
        case '<=':
          return toNum(leftVal) <= toNum(rightVal);
        case '>':
          return toNum(leftVal) > toNum(rightVal);
        case '<':
          return toNum(leftVal) < toNum(rightVal);
        case '==':
          return leftVal === rightVal || String(leftVal) === String(rightVal);
        case '!=':
          return leftVal !== rightVal && String(leftVal) !== String(rightVal);
      }
    }
  }

  // Negation
  if (trimmed.startsWith('!')) {
    const varName = trimmed.slice(1).trim();
    const val = variables[varName];
    if (val === false || val === 'false' || val === 0 || val === '0' || val === undefined || val === null || val === '') {
      return true;
    }
    return false;
  }

  // Single identifier / flag
  const val = trimmed in variables ? variables[trimmed] : resolveValue(trimmed, variables);
  if (val === false || val === 'false' || val === 0 || val === '0' || val === undefined || val === null || val === '') {
    return false;
  }
  return Boolean(val);
}

/**
 * Applies a variable assignment / arithmetic update.
 */
export function applySetOperation(
  currentValue: unknown,
  operator: '=' | '+=' | '-=' | undefined,
  assignedValue: unknown,
  variables: Record<string, unknown>
): unknown {
  const resolved = typeof assignedValue === 'string' && assignedValue in variables
    ? variables[assignedValue]
    : assignedValue;

  switch (operator) {
    case '+=':
      return Number(currentValue ?? 0) + Number(resolved);
    case '-=':
      return Number(currentValue ?? 0) - Number(resolved);
    case '=':
    default:
      return resolved;
  }
}
