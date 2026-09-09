import type { SourceLocation } from '@kawaijs/ast';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface KawaDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly loc?: SourceLocation;
  readonly hint?: string;
}

export class KawaError extends Error {
  readonly diagnostic: KawaDiagnostic;

  constructor(diagnostic: KawaDiagnostic) {
    super(diagnostic.message);
    this.name = 'KawaError';
    this.diagnostic = diagnostic;
  }
}

/**
 * Formats a diagnostic into a human-friendly compiler error message with code frames.
 */
export function formatDiagnostic(diagnostic: KawaDiagnostic, sourceText?: string): string {
  const prefix = `[Kawa ${diagnostic.severity.toUpperCase()}] ${diagnostic.code}: ${diagnostic.message}`;
  
  if (!diagnostic.loc) {
    return prefix;
  }

  const { file, start, end } = diagnostic.loc;
  const locationHeader = ` --> ${file}:${start.line}:${start.column}`;

  if (!sourceText) {
    return `${prefix}\n${locationHeader}`;
  }

  const lines = sourceText.split(/\r?\n/);
  const targetLineIdx = start.line - 1;
  const lineContent = lines[targetLineIdx] ?? '';

  const lineNumStr = String(start.line);
  const padding = ' '.repeat(lineNumStr.length);

  const startCol = Math.max(1, start.column);
  const endCol = (end.line === start.line && end.column > start.column) ? end.column : startCol + 1;
  const underlineLen = Math.max(1, endCol - startCol);
  const caretLine = ' '.repeat(startCol - 1) + '^'.repeat(underlineLen);

  let frame = `${prefix}\n${locationHeader}\n${padding} |\n${lineNumStr} | ${lineContent}\n${padding} | ${caretLine}`;

  if (diagnostic.hint) {
    frame += `\n${padding} =\n${padding} = Hint: ${diagnostic.hint}`;
  }

  return frame;
}
