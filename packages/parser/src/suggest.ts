/**
 * Statement-level commands and compact usage examples for diagnostics.
 */
export const STATEMENT_EXAMPLES: Readonly<Record<string, string>> = {
  character: 'character yumia "Yumia" #f43f5e',
  define: 'define bg classroom = "classroom.svg"',
  label: 'label start:',
  scene: 'scene bg classroom with fade',
  show: 'show yumia happy at left',
  hide: 'hide yumia',
  menu: 'menu:',
  jump: 'jump next_scene',
  call: 'call subroutine',
  return: 'return',
  set: 'set score += 1',
  if: 'if score >= 2:',
  play: 'play music ambient fade 2',
  stop: 'stop music fade 2',
  vfx: 'vfx sakura',
  camera: 'camera flash',
  pause: 'pause 800',
  cg: 'cg "sunset.svg" as "sunset"',
  input: 'input player_name "Your name?"',
  window: 'window hide',
  theme: 'theme "noir"',
  style: 'style dialogue glass',
  hotspot: 'hotspot door 40 50 18 12 jump courtyard'
};

export function levenshteinDistance(a: string, b: string): number {
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

export function closestMatch(
  raw: string,
  candidates: readonly string[],
  maxDistance = 3
): string | undefined {
  const needle = raw.toLowerCase();
  let best: string | undefined;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = levenshteinDistance(needle, candidate.toLowerCase());
    if (dist < bestDist && dist <= maxDistance) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

/**
 * Build a Did-you-mean hint for an unexpected statement identifier.
 */
export function unexpectedStatementHint(raw: string): string {
  const commands = Object.keys(STATEMENT_EXAMPLES);
  const closest = closestMatch(raw, commands);
  const lines: string[] = [];

  if (closest) {
    const example = STATEMENT_EXAMPLES[closest];
    lines.push(`Did you mean '${closest}'?`);
    if (example) lines.push(`Example: ${example}`);
  } else {
    lines.push(
      'Expected a command (scene, show, jump, theme, style, hotspot, …) or dialogue like: yumia "Hello"'
    );
  }

  lines.push('Narration uses a quoted string on its own line: "Silence filled the room."');
  return lines.join('\n     ');
}
