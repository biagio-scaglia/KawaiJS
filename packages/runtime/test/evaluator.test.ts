import { describe, it, expect } from 'vitest';
import {
  evaluateExpression,
  evaluateCondition,
  applySetOperation,
  interpolateVariables
} from '../src/evaluator.js';

describe('Advanced Math & Logical Evaluator', () => {
  it('evaluates basic arithmetic operations with correct precedence', () => {
    const vars = { a: 10, b: 5, c: 2 };
    expect(evaluateExpression('a + b * c', vars)).toBe(20);
    expect(evaluateExpression('(a + b) * c', vars)).toBe(30);
    expect(evaluateExpression('a / b + c', vars)).toBe(4);
    expect(evaluateExpression('10 % 3', vars)).toBe(1);
    expect(evaluateExpression('2 ^ 3', vars)).toBe(8);
  });

  it('evaluates complex RPG stat formulas with decimals and variables', () => {
    const vars = {
      strength: 14,
      agility: 8,
      multiplier: 1.5,
      penalty: 3
    };
    // (14 + 8) * 1.5 - 3 = 22 * 1.5 - 3 = 33 - 3 = 30
    const result = evaluateExpression('(strength + agility) * multiplier - penalty', vars);
    expect(result).toBe(30);
  });

  it('evaluates logical conditions with boolean operators (&&, ||, !, and, or, not)', () => {
    const vars = {
      affinity: 15,
      has_key: true,
      is_locked: false,
      level: 5
    };

    expect(evaluateCondition('affinity >= 10 && has_key', vars)).toBe(true);
    expect(evaluateCondition('affinity < 10 || is_locked', vars)).toBe(false);
    expect(evaluateCondition('!is_locked && (affinity >= 10 || level > 10)', vars)).toBe(true);
    expect(evaluateCondition('has_key and not is_locked', vars)).toBe(true);
  });

  it('handles string concatenation and literal resolution', () => {
    const vars = { player: 'Alice', title: 'Sensei' };
    expect(evaluateExpression('"Hello " + player', vars)).toBe('Hello Alice');
    expect(evaluateExpression('player + " (" + title + ")"', vars)).toBe('Alice (Sensei)');
  });

  it('applies set operations with compound expressions', () => {
    const vars: Record<string, unknown> = {
      score: 10,
      bonus: 5,
      multiplier: 2
    };

    const newScore = applySetOperation(vars['score'], '=', '(score + bonus) * multiplier', vars, true);
    expect(newScore).toBe(30);

    const incremented = applySetOperation(10, '+=', 5, vars);
    expect(incremented).toBe(15);

    const decremented = applySetOperation(10, '-=', 4, vars);
    expect(decremented).toBe(6);
  });

  it('interpolates string tables and variables', () => {
    const vars = { name: 'Yumia' };
    const i18n = {
      it: { greeting: 'Ciao [name]!' },
      en: { greeting: 'Hello [name]!' }
    };

    const resIt = interpolateVariables('{t:greeting}', vars, { lang: 'it', i18n });
    expect(resIt).toBe('Ciao Yumia!');

    const resEn = interpolateVariables('{t:greeting}', vars, { lang: 'en', i18n });
    expect(resEn).toBe('Hello Yumia!');
  });
});
