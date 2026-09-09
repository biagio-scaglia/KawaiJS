import type { StoryPackage } from '@kawaijs/ast';
import { Lexer, type LexerOptions } from './lexer.js';
import { Parser } from './parser.js';
import { Compiler, type CompilerOptions } from './compiler.js';

export * from './token.js';
export * from './diagnostic.js';
export * from './lexer.js';
export * from './parser.js';
export * from './compiler.js';

/**
 * Convenience helper to compile a raw Kawa Script string directly into a StoryPackage IR.
 */
export function compileScript(
  source: string,
  file = 'script.kawa',
  options?: LexerOptions & CompilerOptions
): StoryPackage {
  const lexer = new Lexer(source, file, options);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, file);
  const ast = parser.parse();
  const compiler = new Compiler(ast, options);
  return compiler.compile();
}
