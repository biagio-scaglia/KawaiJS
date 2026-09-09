import type {
  CharacterDeclNode,
  ChoiceItemNode,
  DialogueStmtNode,
  ElifBranchNode,
  ElseBranchNode,
  HideStmtNode,
  IfStmtNode,
  JumpStmtNode,
  LabelDeclNode,
  MenuStmtNode,
  PlayStmtNode,
  ProgramNode,
  ReturnStmtNode,
  SceneStmtNode,
  SetStmtNode,
  ShowStmtNode,
  SourceLocation,
  StatementNode,
  StopStmtNode
} from '@kawaijs/ast';
import { createLocation } from '@kawaijs/ast';
import { Token, TokenType } from './token.js';
import { KawaError } from './diagnostic.js';
import { Lexer } from './lexer.js';

export class Parser {
  private readonly tokens: Token[];
  private readonly file: string;
  private cursor = 0;

  constructor(tokens: Token[], file = '<anonymous>') {
    this.tokens = tokens;
    this.file = file;
  }

  public static fromSource(source: string, file = '<anonymous>'): Parser {
    const lexer = new Lexer(source, file);
    const tokens = lexer.tokenize();
    return new Parser(tokens, file);
  }

  public parse(): ProgramNode {
    const startLoc = this.currentLocation();
    const statements: StatementNode[] = [];

    this.skipNewlines();
    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      this.skipNewlines();
    }

    const endLoc = this.currentLocation();
    return {
      type: 'Program',
      statements,
      loc: createLocation(this.file, startLoc.start, endLoc.end)
    };
  }

  private parseStatement(): StatementNode | null {
    this.skipNewlines();
    if (this.isAtEnd()) return null;

    const token = this.peek();

    switch (token.type) {
      case 'CHARACTER':
        return this.parseCharacterDecl();
      case 'LABEL':
        return this.parseLabelDecl();
      case 'SCENE':
        return this.parseSceneStmt();
      case 'SHOW':
        return this.parseShowStmt();
      case 'HIDE':
        return this.parseHideStmt();
      case 'MENU':
        return this.parseMenuStmt();
      case 'JUMP':
        return this.parseJumpStmt();
      case 'RETURN':
        return this.parseReturnStmt();
      case 'SET':
        return this.parseSetStmt();
      case 'IF':
        return this.parseIfStmt();
      case 'PLAY':
        return this.parsePlayStmt();
      case 'STOP':
        return this.parseStopStmt();
      case 'STRING':
        // Narration without speaker identifier
        return this.parseDialogueStmt();
      case 'NARRATOR':
        return this.parseDialogueStmt();
      case 'IDENTIFIER': {
        // Speaker dialogue e.g. yumia "Hello!"
        if (this.peek(1).type === 'STRING') {
          return this.parseDialogueStmt();
        }
        throw new KawaError({
          code: 'E0100',
          message: `Unexpected identifier '${token.value}'. Did you mean to use a command like 'show', 'scene', 'jump' or a dialogue statement?`,
          severity: 'error',
          loc: token.loc
        });
      }
      default:
        throw new KawaError({
          code: 'E0101',
          message: `Unexpected token '${token.value}' (${token.type})`,
          severity: 'error',
          loc: token.loc
        });
    }
  }

  private parseCharacterDecl(): CharacterDeclNode {
    const startTok = this.consume('CHARACTER', 'Expected "character" keyword');
    const idTok = this.consume('IDENTIFIER', 'Expected character identifier (e.g. yumia)');
    const nameTok = this.consume('STRING', 'Expected character display name in quotes (e.g. "Yumia")');

    let color: string | undefined;
    if (this.check('STRING') || this.check('IDENTIFIER')) {
      color = this.advance().value;
    }

    this.consumeOptionalNewline();
    return {
      type: 'CharacterDecl',
      id: idTok.value,
      displayName: nameTok.value,
      color,
      loc: createLocation(this.file, startTok.loc.start, nameTok.loc.end)
    };
  }

  private parseLabelDecl(): LabelDeclNode {
    const startTok = this.consume('LABEL', 'Expected "label" keyword');
    const nameTok = this.consume('IDENTIFIER', 'Expected label name');
    this.consume('COLON', 'Expected ":" after label name');
    this.consumeOptionalNewline();

    const body = this.parseBlock();
    return {
      type: 'LabelDecl',
      name: nameTok.value,
      body,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseSceneStmt(): SceneStmtNode {
    const startTok = this.consume('SCENE', 'Expected "scene" keyword');
    
    // Background can be multiple identifiers e.g. "bg classroom" or "classroom"
    const bgParts: string[] = [];
    while (this.check('IDENTIFIER') && this.peek().value !== 'with') {
      bgParts.push(this.advance().value);
    }

    if (bgParts.length === 0) {
      throw new KawaError({
        code: 'E0102',
        message: 'Expected background name after "scene"',
        severity: 'error',
        loc: this.currentLocation()
      });
    }

    let transition: string | undefined;
    if (this.match('WITH')) {
      transition = this.consume('IDENTIFIER', 'Expected transition name after "with"').value;
    }

    this.consumeOptionalNewline();
    return {
      type: 'SceneStmt',
      background: bgParts.join(' '),
      transition,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseShowStmt(): ShowStmtNode {
    const startTok = this.consume('SHOW', 'Expected "show" keyword');
    const charTok = this.consume('IDENTIFIER', 'Expected character name after "show"');

    let expression: string | undefined;
    if (this.check('IDENTIFIER') && this.peek().value !== 'at' && this.peek().value !== 'with') {
      expression = this.advance().value;
    }

    let position: string | undefined;
    if (this.match('AT')) {
      position = this.consume('IDENTIFIER', 'Expected position identifier after "at" (e.g. left, center, right)').value;
    }

    let transition: string | undefined;
    if (this.match('WITH')) {
      transition = this.consume('IDENTIFIER', 'Expected transition name after "with"').value;
    }

    this.consumeOptionalNewline();
    return {
      type: 'ShowStmt',
      character: charTok.value,
      expression,
      position,
      transition,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseHideStmt(): HideStmtNode {
    const startTok = this.consume('HIDE', 'Expected "hide" keyword');
    const charTok = this.consume('IDENTIFIER', 'Expected character name after "hide"');

    let transition: string | undefined;
    if (this.match('WITH')) {
      transition = this.consume('IDENTIFIER', 'Expected transition name after "with"').value;
    }

    this.consumeOptionalNewline();
    return {
      type: 'HideStmt',
      character: charTok.value,
      transition,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseDialogueStmt(): DialogueStmtNode {
    let speaker: string | undefined;
    let startLoc = this.currentLocation();

    if (this.check('NARRATOR')) {
      const narTok = this.advance();
      speaker = undefined; // pure narration
      startLoc = narTok.loc;
    } else if (this.check('IDENTIFIER')) {
      const spkTok = this.advance();
      speaker = spkTok.value;
      startLoc = spkTok.loc;
    }

    const textTok = this.consume('STRING', 'Expected dialogue string');
    this.consumeOptionalNewline();

    return {
      type: 'DialogueStmt',
      speaker,
      text: textTok.value,
      loc: createLocation(this.file, startLoc.start, textTok.loc.end)
    };
  }

  private parseMenuStmt(): MenuStmtNode {
    const startTok = this.consume('MENU', 'Expected "menu" keyword');
    this.consume('COLON', 'Expected ":" after menu');
    this.consumeOptionalNewline();

    this.consume('INDENT', 'Expected indented block under "menu:"');
    const choices: ChoiceItemNode[] = [];

    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.isAtEnd()) break;

      const choiceTextTok = this.consume('STRING', 'Expected choice option string (e.g. "Say hello":)');
      this.consume('COLON', 'Expected ":" after choice string');
      this.consumeOptionalNewline();

      const choiceBody = this.parseBlock();
      choices.push({
        type: 'ChoiceItem',
        text: choiceTextTok.value,
        body: choiceBody,
        loc: createLocation(this.file, choiceTextTok.loc.start, this.previousLocation().end)
      });
      this.skipNewlines();
    }

    this.consume('DEDENT', 'Expected dedent closing menu block');
    return {
      type: 'MenuStmt',
      choices,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseJumpStmt(): JumpStmtNode {
    const startTok = this.consume('JUMP', 'Expected "jump" keyword');
    const labelTok = this.consume('IDENTIFIER', 'Expected target label name after "jump"');
    this.consumeOptionalNewline();

    return {
      type: 'JumpStmt',
      targetLabel: labelTok.value,
      loc: createLocation(this.file, startTok.loc.start, labelTok.loc.end)
    };
  }

  private parseReturnStmt(): ReturnStmtNode {
    const startTok = this.consume('RETURN', 'Expected "return" keyword');
    this.consumeOptionalNewline();

    return {
      type: 'ReturnStmt',
      loc: startTok.loc
    };
  }

  private parseSetStmt(): SetStmtNode {
    const startTok = this.consume('SET', 'Expected "set" keyword');
    const varTok = this.consume('IDENTIFIER', 'Expected variable name after "set"');

    let operator: '=' | '+=' | '-=' = '=';
    if (this.match('EQUALS')) {
      operator = '=';
    } else if (this.match('PLUS_EQUALS')) {
      operator = '+=';
    } else if (this.match('MINUS_EQUALS')) {
      operator = '-=';
    } else {
      throw new KawaError({
        code: 'E0103',
        message: 'Expected "=", "+=", or "-=" in set statement',
        severity: 'error',
        loc: this.currentLocation()
      });
    }

    let value: unknown;
    if (this.check('STRING')) {
      value = this.advance().value;
    } else if (this.check('NUMBER')) {
      value = Number(this.advance().value);
    } else if (this.check('BOOLEAN')) {
      value = this.advance().value === 'true';
    } else if (this.check('IDENTIFIER')) {
      value = this.advance().value;
    } else {
      throw new KawaError({
        code: 'E0103',
        message: 'Expected string, number, or boolean value in set assignment',
        severity: 'error',
        loc: this.currentLocation()
      });
    }

    this.consumeOptionalNewline();
    return {
      type: 'SetStmt',
      variable: varTok.value,
      operator,
      value,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseIfStmt(): IfStmtNode {
    const startTok = this.consume('IF', 'Expected "if" keyword');
    const condition = this.readUntilColon();
    this.consume('COLON', 'Expected ":" after if condition');
    this.consumeOptionalNewline();

    const thenBranch = this.parseBlock();
    const elifBranches: ElifBranchNode[] = [];
    let elseBranch: ElseBranchNode | undefined;

    while (this.check('ELIF')) {
      const elifTok = this.advance();
      const elifCond = this.readUntilColon();
      this.consume('COLON', 'Expected ":" after elif condition');
      this.consumeOptionalNewline();
      const elifBody = this.parseBlock();
      elifBranches.push({
        type: 'ElifBranch',
        condition: elifCond,
        body: elifBody,
        loc: createLocation(this.file, elifTok.loc.start, this.previousLocation().end)
      });
    }

    if (this.check('ELSE')) {
      const elseTok = this.advance();
      this.consume('COLON', 'Expected ":" after else');
      this.consumeOptionalNewline();
      const elseBody = this.parseBlock();
      elseBranch = {
        type: 'ElseBranch',
        body: elseBody,
        loc: createLocation(this.file, elseTok.loc.start, this.previousLocation().end)
      };
    }

    return {
      type: 'IfStmt',
      condition,
      thenBranch,
      elifBranches,
      elseBranch,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parsePlayStmt(): PlayStmtNode {
    const startTok = this.consume('PLAY', 'Expected "play" keyword');
    const channelTok = this.advance();
    if (channelTok.type !== 'MUSIC' && channelTok.type !== 'SOUND' && channelTok.type !== 'VOICE') {
      throw new KawaError({
        code: 'E0104',
        message: 'Expected channel (music, sound, or voice) after "play"',
        severity: 'error',
        loc: channelTok.loc
      });
    }

    const trackTok = this.consume('IDENTIFIER', 'Expected audio track name');
    let fade: number | undefined;
    let loop: boolean | undefined = channelTok.type === 'MUSIC';

    while (this.check('FADEIN') || this.check('LOOP')) {
      if (this.match('FADEIN')) {
        fade = Number(this.consume('NUMBER', 'Expected number of seconds for fadein').value);
      } else if (this.match('LOOP')) {
        loop = true;
      }
    }

    this.consumeOptionalNewline();
    return {
      type: 'PlayStmt',
      channel: channelTok.value.toLowerCase() as 'music' | 'sound' | 'voice',
      track: trackTok.value,
      fade,
      loop,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseStopStmt(): StopStmtNode {
    const startTok = this.consume('STOP', 'Expected "stop" keyword');
    const channelTok = this.advance();
    if (channelTok.type !== 'MUSIC' && channelTok.type !== 'SOUND' && channelTok.type !== 'VOICE') {
      throw new KawaError({
        code: 'E0105',
        message: 'Expected channel (music, sound, or voice) after "stop"',
        severity: 'error',
        loc: channelTok.loc
      });
    }

    let fade: number | undefined;
    if (this.match('FADEOUT')) {
      fade = Number(this.consume('NUMBER', 'Expected number of seconds for fadeout').value);
    }

    this.consumeOptionalNewline();
    return {
      type: 'StopStmt',
      channel: channelTok.value.toLowerCase() as 'music' | 'sound' | 'voice',
      fade,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseBlock(): StatementNode[] {
    this.consume('INDENT', 'Expected indented block');
    const statements: StatementNode[] = [];

    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.isAtEnd()) break;

      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      this.skipNewlines();
    }

    this.consume('DEDENT', 'Expected dedent to close block');
    return statements;
  }

  private readUntilColon(): string {
    const parts: string[] = [];
    while (!this.check('COLON') && !this.check('NEWLINE') && !this.isAtEnd()) {
      parts.push(this.advance().value);
    }
    return parts.join(' ');
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private consumeOptionalNewline(): void {
    if (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const current = this.peek();
    throw new KawaError({
      code: 'E0106',
      message: `${errorMessage}, but found '${current.value}' (${current.type})`,
      severity: 'error',
      loc: current.loc
    });
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.cursor += 1;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(offset = 0): Token {
    const idx = this.cursor + offset;
    return idx < this.tokens.length ? this.tokens[idx]! : this.tokens[this.tokens.length - 1]!;
  }

  private previous(): Token {
    return this.tokens[this.cursor - 1]!;
  }

  private currentLocation(): SourceLocation {
    return this.peek().loc;
  }

  private previousLocation(): SourceLocation {
    return this.previous().loc;
  }
}
