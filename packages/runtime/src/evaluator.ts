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

interface ExprToken {
  type: 'num' | 'str' | 'bool' | 'id' | 'op' | 'paren';
  value: string;
}

function tokenizeExpr(expr: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const ch = expr[i]!;

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < len && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < len) {
          i++;
          str += expr[i];
        } else {
          str += expr[i];
        }
        i++;
      }
      if (i < len && expr[i] === quote) {
        i++;
      }
      tokens.push({ type: 'str', value: str });
      continue;
    }

    // Multi-char operators: &&, ||, ==, !=, >=, <=
    const two = expr.slice(i, i + 2);
    if (two === '&&' || two === '||' || two === '==' || two === '!=' || two === '>=' || two === '<=') {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    // Single-char operators: +, -, *, /, %, ^, >, <, !
    if (['+', '-', '*', '/', '%', '^', '>', '<', '!'].includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(expr[i + 1]!))) {
      let numStr = '';
      while (i < len && (/\d/.test(expr[i]!) || expr[i] === '.')) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'num', value: numStr });
      continue;
    }

    // Identifiers & keywords (and, or, not, true, false, variable_names)
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = '';
      while (i < len && /[a-zA-Z0-9_-]/.test(expr[i]!)) {
        idStr += expr[i];
        i++;
      }
      const lower = idStr.toLowerCase();
      if (lower === 'true' || lower === 'false') {
        tokens.push({ type: 'bool', value: lower });
      } else if (lower === 'and') {
        tokens.push({ type: 'op', value: '&&' });
      } else if (lower === 'or') {
        tokens.push({ type: 'op', value: '||' });
      } else if (lower === 'not') {
        tokens.push({ type: 'op', value: '!' });
      } else {
        tokens.push({ type: 'id', value: idStr });
      }
      continue;
    }

    // Unknown char fallback
    i++;
  }

  return tokens;
}

class ExpressionParser {
  private pos = 0;
  constructor(
    private readonly tokens: ExprToken[],
    private readonly variables: Record<string, unknown>
  ) {}

  private peek(): ExprToken | undefined {
    return this.tokens[this.pos];
  }

  private advance(): ExprToken | undefined {
    return this.tokens[this.pos++];
  }

  private match(val: string): boolean {
    const t = this.peek();
    if (t && t.value === val) {
      this.pos++;
      return true;
    }
    return false;
  }

  public parse(): unknown {
    if (this.tokens.length === 0) return undefined;
    const res = this.parseOr();
    return res;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.match('||')) {
      const right = this.parseAnd();
      left = isTruthy(left) || isTruthy(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseEquality();
    while (this.match('&&')) {
      const right = this.parseEquality();
      left = isTruthy(left) && isTruthy(right);
    }
    return left;
  }

  private parseEquality(): unknown {
    let left = this.parseComparison();
    while (true) {
      if (this.match('==')) {
        const right = this.parseComparison();
        left = left === right || String(left) === String(right);
      } else if (this.match('!=')) {
        const right = this.parseComparison();
        left = left !== right && String(left) !== String(right);
      } else {
        break;
      }
    }
    return left;
  }

  private parseComparison(): unknown {
    let left = this.parseAddSub();
    while (true) {
      if (this.match('>=')) {
        const right = this.parseAddSub();
        left = this.toNum(left) >= this.toNum(right);
      } else if (this.match('<=')) {
        const right = this.parseAddSub();
        left = this.toNum(left) <= this.toNum(right);
      } else if (this.match('>')) {
        const right = this.parseAddSub();
        left = this.toNum(left) > this.toNum(right);
      } else if (this.match('<')) {
        const right = this.parseAddSub();
        left = this.toNum(left) < this.toNum(right);
      } else {
        break;
      }
    }
    return left;
  }

  private parseAddSub(): unknown {
    let left = this.parseMulDiv();
    while (true) {
      if (this.match('+')) {
        const right = this.parseMulDiv();
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left ?? '') + String(right ?? '');
        } else {
          left = this.toNum(left) + this.toNum(right);
        }
      } else if (this.match('-')) {
        const right = this.parseMulDiv();
        left = this.toNum(left) - this.toNum(right);
      } else {
        break;
      }
    }
    return left;
  }

  private parseMulDiv(): unknown {
    let left = this.parseUnary();
    while (true) {
      if (this.match('*')) {
        const right = this.parseUnary();
        left = this.toNum(left) * this.toNum(right);
      } else if (this.match('/')) {
        const right = this.parseUnary();
        const denom = this.toNum(right);
        left = denom === 0 ? 0 : this.toNum(left) / denom;
      } else if (this.match('%')) {
        const right = this.parseUnary();
        const denom = this.toNum(right);
        left = denom === 0 ? 0 : this.toNum(left) % denom;
      } else if (this.match('^')) {
        const right = this.parseUnary();
        left = Math.pow(this.toNum(left), this.toNum(right));
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): unknown {
    if (this.match('!')) {
      const val = this.parseUnary();
      return !isTruthy(val);
    }
    if (this.match('-')) {
      const val = this.parseUnary();
      return -this.toNum(val);
    }
    if (this.match('+')) {
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const t = this.advance();
    if (!t) return undefined;

    if (t.type === 'paren' && t.value === '(') {
      const val = this.parseOr();
      this.match(')');
      return val;
    }

    if (t.type === 'num') {
      return Number(t.value);
    }

    if (t.type === 'str') {
      return t.value;
    }

    if (t.type === 'bool') {
      return t.value === 'true';
    }

    if (t.type === 'id') {
      if (hasVar(this.variables, t.value)) {
        return this.variables[t.value];
      }
      return undefined;
    }

    return t.value;
  }

  private toNum(v: unknown): number {
    if (typeof v === 'number') return v;
    if (v === true) return 1;
    if (v === false || v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
}

/**
 * Evaluates an arbitrary arithmetic or logical expression against variables.
 */
export function evaluateExpression(expr: string, variables: Record<string, unknown>): unknown {
  const trimmed = expr.trim();
  if (!trimmed) return undefined;
  const tokens = tokenizeExpr(trimmed);
  const parser = new ExpressionParser(tokens, variables);
  return parser.parse();
}

/**
 * Evaluates a condition expression against the current variables.
 */
export function evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
  const trimmed = condition.trim();
  if (!trimmed || trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const result = evaluateExpression(trimmed, variables);
  return isTruthy(result);
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
  let resolved: unknown;

  if (typeof assignedValue === 'string') {
    const trimmed = assignedValue.trim();
    // If it's a quoted string literal, unpack it
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      resolved = trimmed.slice(1, -1);
    } else if (isVariable === false) {
      resolved = assignedValue;
    } else {
      // Evaluate as expression (can be identifier, number, or compound expression)
      const evaluated = evaluateExpression(trimmed, variables);
      resolved = evaluated !== undefined ? evaluated : trimmed;
    }
  } else {
    resolved = assignedValue;
  }

  switch (operator) {
    case '+=':
      if (typeof currentValue === 'string' || typeof resolved === 'string') {
        return String(currentValue ?? '') + String(resolved ?? '');
      }
      return Number(currentValue ?? 0) + Number(resolved ?? 0);
    case '-=':
      return Number(currentValue ?? 0) - Number(resolved ?? 0);
    case '=':
    default:
      return resolved;
  }
}
/**
 * Interpolates variables in dialogue or prompt strings (e.g. "Hello [player_name]!").
 */
export function interpolateVariables(
  text: string,
  variables: Record<string, unknown>,
  options?: {
    readonly lang?: string | null;
    readonly i18n?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  }
): string {
  if (!text) return text;
  let out = text;

  // i18n: {t:key} or {t:key|fallback}
  if (out.includes('{t:')) {
    const lang = options?.lang || 'en';
    const table = options?.i18n?.[lang] ?? options?.i18n?.['en'];
    out = out.replace(/\{t:([a-zA-Z0-9_.-]+)(?:\|([^}]*))?\}/g, (match, key: string, fallback?: string) => {
      const val = table?.[key];
      if (val !== undefined) return val;
      if (fallback !== undefined) return fallback;
      return match;
    });
  }

  if (!out.includes('[')) return out;
  return out.replace(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g, (match, varName) => {
    if (hasVar(variables, varName)) {
      const val = variables[varName];
      return val !== undefined && val !== null ? String(val) : '';
    }
    return match;
  });
}

/** Built-in layer → z-index map (overridable with explicit `z N`). */
export const DEFAULT_LAYER_Z: Readonly<Record<string, number>> = {
  background: 0,
  master: 10,
  overlay: 30,
  ui: 50
};

export function resolveSpriteZ(layer: string | undefined | null, z: number | undefined): number {
  if (typeof z === 'number' && Number.isFinite(z)) return z;
  if (layer && DEFAULT_LAYER_Z[layer] !== undefined) return DEFAULT_LAYER_Z[layer]!;
  return DEFAULT_LAYER_Z.master ?? 10;
}
