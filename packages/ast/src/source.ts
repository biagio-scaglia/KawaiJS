/**
 * Represents a position within a source file (1-indexed line and column).
 */
export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

/**
 * Represents a range spanning across source locations.
 */
export interface SourceLocation {
  readonly file: string;
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

/**
 * Creates a standard SourcePosition.
 */
export function createPosition(line: number, column: number, offset: number): SourcePosition {
  return { line, column, offset };
}

/**
 * Creates a standard SourceLocation.
 */
export function createLocation(
  file: string,
  start: SourcePosition,
  end: SourcePosition
): SourceLocation {
  return { file, start, end };
}
