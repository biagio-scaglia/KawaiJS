import { createLocation, createPosition } from '@kawaijs/ast';
import { KEYWORDS, type Token } from './token.js';
import { KawaError } from './diagnostic.js';

export interface LexerOptions {
  tabSize?: number;
}

export class Lexer {
  private readonly source: string;
  private readonly file: string;
  private readonly tabSize: number;

  private cursor = 0;
  private line = 1;
  private column = 1;

  private indentStack: number[] = [0];
  private pendingTokens: Token[] = [];
  private isAtLineStart = true;
  private hasTokensOnCurrentLine = false;

  constructor(source: string, file = '<anonymous>', options: LexerOptions = {}) {
    this.source = source;
    this.file = file;
    this.tabSize = options.tabSize ?? 4;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      const token = this.nextToken();
      tokens.push(token);
      if (token.type === 'EOF') {
        break;
      }
    }
    return tokens;
  }

  public nextToken(): Token {
    if (this.pendingTokens.length > 0) {
      return this.pendingTokens.shift()!;
    }

    while (!this.isEof()) {
      if (this.isAtLineStart) {
        this.handleIndentation();
        if (this.pendingTokens.length > 0) {
          return this.pendingTokens.shift()!;
        }
      }

      const ch = this.peek();

      // Skip non-newline whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      // Comments (# to end of line)
      if (ch === '#') {
        this.skipComment();
        continue;
      }

      // Newline
      if (ch === '\n') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        this.isAtLineStart = true;

        if (this.hasTokensOnCurrentLine) {
          this.hasTokensOnCurrentLine = false;
          return {
            type: 'NEWLINE',
            value: '\n',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
        continue;
      }

      this.hasTokensOnCurrentLine = true;

      // Strings (double or single quotes)
      if (ch === '"' || ch === "'") {
        return this.readString(ch);
      }

      // Numbers
      if (this.isDigit(ch)) {
        return this.readNumber();
      }

      // Identifiers / Keywords
      if (this.isAlpha(ch) || ch === '_') {
        return this.readIdentifier();
      }

      // Symbols & Operators
      if (ch === ':') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        return {
          type: 'COLON',
          value: ':',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition())
        };
      }

      if (ch === ',') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        return {
          type: 'COMMA',
          value: ',',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition())
        };
      }

      if (ch === '+') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return {
            type: 'PLUS_EQUALS',
            value: '+=',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
      }

      if (ch === '-') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return {
            type: 'MINUS_EQUALS',
            value: '-=',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
      }

      if (ch === '=') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return {
            type: 'DOUBLE_EQUALS',
            value: '==',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
        return {
          type: 'EQUALS',
          value: '=',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition())
        };
      }

      if (ch === '!') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return {
            type: 'NOT_EQUALS',
            value: '!=',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
      }

      if (ch === '>') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return {
            type: 'GREATER_EQUALS',
            value: '>=',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
        return {
          type: 'GREATER',
          value: '>',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition())
        };
      }

      if (ch === '<') {
        const startLoc = this.getCurrentPosition();
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return {
            type: 'LESS_EQUALS',
            value: '<=',
            loc: createLocation(this.file, startLoc, this.getCurrentPosition())
          };
        }
        return {
          type: 'LESS',
          value: '<',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition())
        };
      }

      // Unknown character
      const startLoc = this.getCurrentPosition();
      this.advance();
      throw new KawaError({
        code: 'E0001',
        message: `Unexpected character '${ch}'`,
        severity: 'error',
        loc: createLocation(this.file, startLoc, this.getCurrentPosition()),
        hint: 'Check for unsupported symbols or typos.'
      });
    }

    // Emit remaining DEDENT tokens at EOF
    if (this.indentStack.length > 1) {
      const pos = this.getCurrentPosition();
      while (this.indentStack.length > 1) {
        this.indentStack.pop();
        this.pendingTokens.push({
          type: 'DEDENT',
          value: '',
          loc: createLocation(this.file, pos, pos)
        });
      }
      this.pendingTokens.push({
        type: 'EOF',
        value: '',
        loc: createLocation(this.file, pos, pos)
      });
      return this.pendingTokens.shift()!;
    }

    const pos = this.getCurrentPosition();
    return {
      type: 'EOF',
      value: '',
      loc: createLocation(this.file, pos, pos)
    };
  }

  private handleIndentation(): void {
    let indentWidth = 0;
    const startLoc = this.getCurrentPosition();

    while (!this.isEof()) {
      const ch = this.peek();
      if (ch === ' ') {
        indentWidth += 1;
        this.advance();
      } else if (ch === '\t') {
        indentWidth += this.tabSize;
        this.advance();
      } else {
        break;
      }
    }

    // If line is empty or just a comment, ignore its indentation
    if (this.peek() === '\n' || this.peek() === '\r' || this.peek() === '#' || this.isEof()) {
      this.isAtLineStart = false;
      return;
    }

    this.isAtLineStart = false;
    const currentIndent = this.indentStack[this.indentStack.length - 1] ?? 0;

    if (indentWidth > currentIndent) {
      this.indentStack.push(indentWidth);
      this.pendingTokens.push({
        type: 'INDENT',
        value: ' '.repeat(indentWidth - currentIndent),
        loc: createLocation(this.file, startLoc, this.getCurrentPosition())
      });
    } else if (indentWidth < currentIndent) {
      while (
        this.indentStack.length > 1 &&
        (this.indentStack[this.indentStack.length - 1] ?? 0) > indentWidth
      ) {
        this.indentStack.pop();
        this.pendingTokens.push({
          type: 'DEDENT',
          value: '',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition())
        });
      }

      const top = this.indentStack[this.indentStack.length - 1] ?? 0;
      if (top !== indentWidth) {
        throw new KawaError({
          code: 'E0002',
          message: `Inconsistent indentation level (${indentWidth} spaces, expected ${top})`,
          severity: 'error',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition()),
          hint: 'Ensure indentation uses consistent spaces across blocks.'
        });
      }
    }
  }

  private readString(quote: string): Token {
    const startLoc = this.getCurrentPosition();
    this.advance(); // consume opening quote

    let value = '';
    while (!this.isEof() && this.peek() !== quote) {
      const ch = this.peek();
      if (ch === '\n') {
        throw new KawaError({
          code: 'E0003',
          message: 'Unterminated string literal (newline before closing quote)',
          severity: 'error',
          loc: createLocation(this.file, startLoc, this.getCurrentPosition()),
          hint: 'Make sure your string closes with the matching quote on the same line.'
        });
      }

      if (ch === '\\') {
        this.advance();
        if (this.isEof()) break;
        const escapeCh = this.advance();
        switch (escapeCh) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          case '\\': value += '\\'; break;
          default: value += escapeCh; break;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isEof()) {
      throw new KawaError({
        code: 'E0003',
        message: 'Unterminated string literal at end of file',
        severity: 'error',
        loc: createLocation(this.file, startLoc, this.getCurrentPosition())
      });
    }

    this.advance(); // consume closing quote
    return {
      type: 'STRING',
      value,
      loc: createLocation(this.file, startLoc, this.getCurrentPosition())
    };
  }

  private readNumber(): Token {
    const startLoc = this.getCurrentPosition();
    let numStr = '';

    while (!this.isEof() && (this.isDigit(this.peek()) || this.peek() === '.')) {
      numStr += this.advance();
    }

    return {
      type: 'NUMBER',
      value: numStr,
      loc: createLocation(this.file, startLoc, this.getCurrentPosition())
    };
  }

  private readIdentifier(): Token {
    const startLoc = this.getCurrentPosition();
    let idStr = '';

    while (!this.isEof() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-')) {
      idStr += this.advance();
    }

    const keywordType = KEYWORDS[idStr];
    return {
      type: keywordType ?? 'IDENTIFIER',
      value: idStr,
      loc: createLocation(this.file, startLoc, this.getCurrentPosition())
    };
  }

  private skipComment(): void {
    while (!this.isEof() && this.peek() !== '\n') {
      this.advance();
    }
  }

  private peek(offset = 0): string {
    const idx = this.cursor + offset;
    return idx < this.source.length ? this.source[idx]! : '\0';
  }

  private advance(): string {
    const ch = this.source[this.cursor] ?? '\0';
    this.cursor += 1;
    if (ch === '\n') {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return ch;
  }

  private isEof(): boolean {
    return this.cursor >= this.source.length;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  private getCurrentPosition() {
    return createPosition(this.line, this.column, this.cursor);
  }
}
