import type {
  CharacterDeclNode,
  ChoiceItemNode,
  DialogueStmtNode,
  ElifBranchNode,
  ElseBranchNode,
  HideStmtNode,
  IfStmtNode,
  JumpStmtNode,
  CallStmtNode,
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
  StopStmtNode,
  VfxStmtNode,
  CameraStmtNode,
  PauseStmtNode,
  CgStmtNode,
  DefineDeclNode,
  InputStmtNode,
  WindowStmtNode,
  ThemeStmtNode,
  StyleStmtNode,
  HotspotStmtNode,
  LayerStmtNode,
  AnimateStmtNode,
  UnlockStmtNode,
  LangStmtNode,
  IncludeStmtNode
} from '@kawaijs/ast';
import { createLocation } from '@kawaijs/ast';
import { Token, TokenType } from './token.js';
import { KawaError } from './diagnostic.js';
import { unexpectedStatementHint } from './suggest.js';
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
      case 'DEFINE':
        return this.parseDefineDecl();
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
      case 'CALL':
        return this.parseCallStmt();
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
      case 'VFX':
        return this.parseVfxStmt();
      case 'CAMERA':
        return this.parseCameraStmt();
      case 'PAUSE':
        return this.parsePauseStmt();
      case 'CG':
        return this.parseCgStmt();
      case 'INPUT':
        return this.parseInputStmt();
      case 'WINDOW':
        return this.parseWindowStmt();
      case 'THEME':
        return this.parseThemeStmt();
      case 'STYLE':
        return this.parseStyleStmt();
      case 'HOTSPOT':
        return this.parseHotspotStmt();
      case 'LAYER':
        return this.parseLayerStmt();
      case 'ANIMATE':
        return this.parseAnimateStmt();
      case 'UNLOCK':
        return this.parseUnlockStmt();
      case 'LANG':
        return this.parseLangStmt();
      case 'INCLUDE':
      case 'IMPORT':
        return this.parseIncludeStmt();
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
          message: `Unexpected statement '${token.value}'.`,
          severity: 'error',
          loc: token.loc,
          hint: unexpectedStatementHint(token.value)
        });
      }
      default:
        throw new KawaError({
          code: 'E0101',
          message: `Unexpected token '${token.value}' (${token.type})`,
          severity: 'error',
          loc: token.loc,
          hint: unexpectedStatementHint(token.value)
        });
    }
  }

  private parseCharacterDecl(): CharacterDeclNode {
    const startTok = this.consume('CHARACTER', 'Expected "character" keyword');
    const idTok = this.consume('IDENTIFIER', 'Expected character identifier (e.g. yumia)');
    const nameTok = this.consume('STRING', 'Expected character display name in quotes (e.g. "Yumia")');

    let color: string | undefined;
    if (this.check('COLOR') || this.check('STRING') || this.check('IDENTIFIER')) {
      color = this.advance().value;
    }

    this.consumeOptionalNewline();
    return {
      type: 'CharacterDecl',
      id: idTok.value,
      displayName: nameTok.value,
      color,
      loc: createLocation(this.file, startTok.loc.start, (this.previous() ?? nameTok).loc.end)
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
    
    // Background can be a string literal e.g. "bg classroom" or multiple identifiers
    const bgParts: string[] = [];
    if (this.check('STRING')) {
      bgParts.push(this.advance().value);
    } else {
      while ((this.check('IDENTIFIER') || this.check('NUMBER')) && this.peek().value !== 'with') {
        bgParts.push(this.advance().value);
      }
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
      transition = this.parseTransitionName();
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
    if (
      this.check('IDENTIFIER') &&
      !['at', 'with', 'z', 'layer'].includes(this.peek().value.toLowerCase())
    ) {
      expression = this.advance().value;
    }

    let position: string | undefined;
    if (this.match('AT')) {
      position = this.consume('IDENTIFIER', 'Expected position identifier after "at" (e.g. left, center, right)').value;
    }

    let layer: string | undefined;
    let z: number | undefined;

    // Optional `layer <name>` and/or `z <number>` in either order
    while (!this.check('NEWLINE') && !this.check('DEDENT') && !this.check('EOF') && !this.check('WITH')) {
      if (this.match('LAYER') || (this.check('IDENTIFIER') && this.peek().value.toLowerCase() === 'layer')) {
        if (this.check('IDENTIFIER') && this.peek().value.toLowerCase() === 'layer') {
          this.advance();
        }
        layer = this.check('STRING')
          ? this.advance().value
          : this.consume('IDENTIFIER', 'Expected layer name after "layer"').value;
        continue;
      }
      if (this.check('IDENTIFIER') && this.peek().value.toLowerCase() === 'z') {
        this.advance();
        const zTok = this.consume('NUMBER', 'Expected z-index number after "z"');
        z = Number(zTok.value);
        continue;
      }
      break;
    }

    let transition: string | undefined;
    if (this.match('WITH')) {
      transition = this.parseTransitionName();
    }

    // Allow z/layer also after with (rare) — already handled above before with
    this.consumeOptionalNewline();
    return {
      type: 'ShowStmt',
      character: charTok.value,
      expression,
      position,
      transition,
      layer,
      z: Number.isFinite(z) ? z : undefined,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseHideStmt(): HideStmtNode {
    const startTok = this.consume('HIDE', 'Expected "hide" keyword');
    const charTok = this.consume('IDENTIFIER', 'Expected character name after "hide"');

    let transition: string | undefined;
    if (this.match('WITH')) {
      transition = this.parseTransitionName();
    }

    this.consumeOptionalNewline();
    return {
      type: 'HideStmt',
      character: charTok.value,
      transition,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseTransitionName(): string {
    if (this.check('IDENTIFIER') || this.check('FADEIN') || this.check('FADEOUT')) {
      return this.advance().value;
    }
    return this.consume('IDENTIFIER', 'Expected transition name after "with"').value;
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
    } else if (this.check('STRING') && this.peek(1).type === 'STRING') {
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
      let condition: string | undefined;
      if (this.match('IF')) {
        condition = this.readUntilColon().trim();
      }
      this.consume('COLON', 'Expected ":" after choice string');
      this.consumeOptionalNewline();

      const choiceBody = this.parseBlock();
      choices.push({
        type: 'ChoiceItem',
        text: choiceTextTok.value,
        condition,
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

  private parseCallStmt(): CallStmtNode {
    const startTok = this.consume('CALL', 'Expected "call" keyword');
    const labelTok = this.consume('IDENTIFIER', 'Expected target label name after "call"');
    this.consumeOptionalNewline();

    return {
      type: 'CallStmt',
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

    // Read remaining tokens on line
    const exprTokens: Token[] = [];
    while (!this.isAtEnd() && !this.check('NEWLINE')) {
      exprTokens.push(this.advance());
    }

    if (exprTokens.length === 0) {
      throw new KawaError({
        code: 'E0103',
        message: 'Expected value or expression in set assignment',
        severity: 'error',
        loc: this.currentLocation()
      });
    }

    let value: unknown;
    let isVariable = false;

    if (exprTokens.length === 1) {
      const single = exprTokens[0]!;
      if (single.type === 'STRING') {
        value = single.value;
        isVariable = false;
      } else if (single.type === 'NUMBER') {
        value = Number(single.value);
      } else if (single.type === 'BOOLEAN') {
        value = single.value === 'true';
      } else if (single.type === 'IDENTIFIER') {
        value = single.value;
        isVariable = true;
      } else {
        value = single.value;
        isVariable = true;
      }
    } else {
      // Compound expression: join tokens
      value = exprTokens.map(t => (t.type === 'STRING' ? `"${t.value}"` : t.value)).join(' ');
      isVariable = true;
    }

    this.consumeOptionalNewline();
    return {
      type: 'SetStmt',
      variable: varTok.value,
      operator,
      value,
      isVariable,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseIncludeStmt(): IncludeStmtNode {
    const startTok = this.check('INCLUDE')
      ? this.consume('INCLUDE', 'Expected "include" keyword')
      : this.consume('IMPORT', 'Expected "import" keyword');
    let filePath = '';
    if (this.check('STRING')) {
      filePath = this.advance().value;
    } else if (this.check('IDENTIFIER') || this.checkSoftIdentifier()) {
      filePath = this.advance().value;
    } else {
      throw new KawaError({
        code: 'E0106',
        message: 'Expected file path string after include / import',
        severity: 'error',
        loc: this.currentLocation()
      });
    }

    this.consumeOptionalNewline();
    return {
      type: 'IncludeStmt',
      file: filePath,
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

    if (!this.check('IDENTIFIER') && !this.check('STRING') && !this.checkSoftIdentifier()) {
      throw new KawaError({
        code: 'E0104',
        message: 'Expected audio track name (identifier or string literal) after audio channel',
        severity: 'error',
        loc: this.currentLocation()
      });
    }
    const trackTok = this.advance();
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
    if (this.match('FADEOUT') || this.match('FADEIN')) {
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

  private parseVfxStmt(): VfxStmtNode {
    const startTok = this.consume('VFX', 'Expected "vfx" keyword');
    const effectTok = this.advance();
    const effectName = effectTok.value.toLowerCase();
    const validEffects = ['rain', 'snow', 'sakura', 'fog', 'tint', 'stop'];

    if (!validEffects.includes(effectName)) {
      throw new KawaError({
        code: 'E0107',
        message: `Invalid VFX effect '${effectTok.value}'. Expected one of: ${validEffects.join(', ')}`,
        severity: 'error',
        loc: effectTok.loc
      });
    }

    let intensity: number | string | undefined;
    let color: string | undefined;

    if (effectName === 'tint') {
      if (this.check('COLOR')) {
        color = this.advance().value;
      } else if (this.check('STRING')) {
        color = this.advance().value;
      } else if (this.check('IDENTIFIER')) {
        color = this.advance().value;
      }
    } else if (effectName !== 'stop') {
      if (this.check('NUMBER')) {
        intensity = Number(this.advance().value);
      } else if (this.check('IDENTIFIER')) {
        intensity = this.advance().value;
      }
    }

    this.consumeOptionalNewline();
    return {
      type: 'VfxStmt',
      effect: effectName as 'rain' | 'snow' | 'sakura' | 'fog' | 'tint' | 'stop',
      intensity,
      color,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseCameraStmt(): CameraStmtNode {
    const startTok = this.consume('CAMERA', 'Expected "camera" keyword');
    const actionTok = this.advance();
    const actionName = actionTok.value.toLowerCase();
    const validActions = ['shake', 'vpunch', 'hpunch', 'flash'];

    if (!validActions.includes(actionName)) {
      throw new KawaError({
        code: 'E0108',
        message: `Invalid camera action '${actionTok.value}'. Expected one of: ${validActions.join(', ')}`,
        severity: 'error',
        loc: actionTok.loc
      });
    }

    let duration: number | undefined;
    if (this.check('NUMBER')) {
      duration = Number(this.advance().value);
    }

    this.consumeOptionalNewline();
    return {
      type: 'CameraStmt',
      action: actionName as 'shake' | 'vpunch' | 'hpunch' | 'flash',
      duration,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parsePauseStmt(): PauseStmtNode {
    const startTok = this.consume('PAUSE', 'Expected "pause" keyword');
    let duration: number | undefined;

    if (this.check('NUMBER')) {
      duration = Number(this.advance().value);
    }

    this.consumeOptionalNewline();
    return {
      type: 'PauseStmt',
      duration,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseCgStmt(): CgStmtNode {
    const startTok = this.consume('CG', 'Expected "cg" keyword');
    const imageTok = this.consume('STRING', 'Expected image filename or path in quotes after "cg"');

    let unlockId: string | undefined;
    if (this.match('AS')) {
      if (this.check('STRING')) {
        unlockId = this.advance().value;
      } else {
        unlockId = this.consume('IDENTIFIER', 'Expected unlock identifier after "as"').value;
      }
    }

    this.consumeOptionalNewline();
    return {
      type: 'CgStmt',
      image: imageTok.value,
      unlockId,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseDefineDecl(): DefineDeclNode {
    const startTok = this.consume('DEFINE', 'Expected "define" keyword');
    const nameParts: string[] = [];
    while (this.checkSoftIdentifier()) {
      nameParts.push(this.advance().value);
      if (this.check('EQUALS') || this.check('STRING')) break;
    }
    if (nameParts.length === 0) {
      throw new KawaError({
        code: 'E0110',
        message: 'Expected alias name after "define"',
        severity: 'error',
        loc: this.currentLocation()
      });
    }
    this.consume('EQUALS', 'Expected "=" after define name');
    const valueTok = this.consume('STRING', 'Expected string value after "define ... ="');
    this.consumeOptionalNewline();
    return {
      type: 'DefineDecl',
      name: nameParts.join(' '),
      value: valueTok.value,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseInputStmt(): InputStmtNode {
    const startTok = this.consume('INPUT', 'Expected "input" keyword');
    const varTok = this.consume('IDENTIFIER', 'Expected variable name after "input"');
    let prompt = 'Enter text';
    if (this.check('STRING')) {
      prompt = this.advance().value;
    }
    this.consumeOptionalNewline();
    return {
      type: 'InputStmt',
      variable: varTok.value,
      prompt,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseWindowStmt(): WindowStmtNode {
    const startTok = this.consume('WINDOW', 'Expected "window" keyword');
    let actionRaw: string;
    if (this.check('SHOW') || this.check('HIDE') || this.check('IDENTIFIER')) {
      actionRaw = this.advance().value.toLowerCase();
    } else {
      throw new KawaError({
        code: 'E0111',
        message: 'Expected "show" or "hide" after "window"',
        severity: 'error',
        loc: this.currentLocation()
      });
    }
    if (actionRaw !== 'show' && actionRaw !== 'hide') {
      throw new KawaError({
        code: 'E0111',
        message: `Invalid window action '${actionRaw}'. Expected "show" or "hide".`,
        severity: 'error',
        loc: startTok.loc
      });
    }
    this.consumeOptionalNewline();
    return {
      type: 'WindowStmt',
      action: actionRaw as 'show' | 'hide',
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseThemeStmt(): ThemeStmtNode {
    const startTok = this.consume('THEME', 'Expected "theme" keyword');
    let name: string;
    if (this.check('STRING') || this.checkSoftIdentifier()) {
      name = this.advance().value;
    } else {
      throw new KawaError({
        code: 'E0112',
        message: 'Expected theme name after "theme"',
        severity: 'error',
        loc: this.currentLocation(),
        hint: 'Example: theme "noir"   or   theme sakura'
      });
    }
    this.consumeOptionalNewline();
    return {
      type: 'ThemeStmt',
      name,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseStyleStmt(): StyleStmtNode {
    const startTok = this.consume('STYLE', 'Expected "style" keyword');
    if (!this.check('STRING') && !this.checkSoftIdentifier()) {
      throw new KawaError({
        code: 'E0113',
        message: 'Expected style target after "style"',
        severity: 'error',
        loc: this.currentLocation(),
        hint: 'Example: style dialogue glass\n     Targets: dialogue, stage, root, choices'
      });
    }
    const targetTok = this.advance();
    if (!this.check('STRING') && !this.checkSoftIdentifier()) {
      throw new KawaError({
        code: 'E0113',
        message: 'Expected style name after target',
        severity: 'error',
        loc: this.currentLocation(),
        hint: 'Example: style dialogue glass'
      });
    }
    const nameTok = this.advance();
    this.consumeOptionalNewline();
    return {
      type: 'StyleStmt',
      target: targetTok.value.toLowerCase(),
      name: nameTok.value,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseHotspotStmt(): HotspotStmtNode {
    const startTok = this.consume('HOTSPOT', 'Expected "hotspot" keyword');
    let id: string;
    if (this.check('STRING') || this.checkSoftIdentifier()) {
      id = this.advance().value;
    } else {
      throw new KawaError({
        code: 'E0114',
        message: 'Expected hotspot id after "hotspot"',
        severity: 'error',
        loc: this.currentLocation(),
        hint: 'Example: hotspot door 40 50 18 12 jump courtyard\n     Coordinates are percent of the stage (0–100) or fractions (0–1).'
      });
    }

    const readCoord = (label: string): number => {
      if (!this.check('NUMBER')) {
        throw new KawaError({
          code: 'E0114',
          message: `Expected ${label} coordinate after hotspot id`,
          severity: 'error',
          loc: this.currentLocation(),
          hint: 'Example: hotspot door 40 50 18 12 jump courtyard'
        });
      }
      return Number(this.advance().value);
    };

    const x = readCoord('x');
    const y = readCoord('y');
    const w = readCoord('w');
    const h = readCoord('h');

    if (!this.check('JUMP')) {
      throw new KawaError({
        code: 'E0114',
        message: 'Expected "jump" after hotspot rectangle',
        severity: 'error',
        loc: this.currentLocation(),
        hint: 'Example: hotspot door 40 50 18 12 jump courtyard'
      });
    }
    this.advance();
    const target = this.consume('IDENTIFIER', 'Expected target label after hotspot jump').value;

    this.consumeOptionalNewline();
    return {
      type: 'HotspotStmt',
      id,
      x,
      y,
      w,
      h,
      targetLabel: target,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseLayerStmt(): LayerStmtNode {
    const startTok = this.consume('LAYER', 'Expected "layer" keyword');
    const name = this.check('STRING')
      ? this.advance().value
      : this.consume('IDENTIFIER', 'Expected layer name (e.g. master, overlay)').value;
    this.consumeOptionalNewline();
    return {
      type: 'LayerStmt',
      name,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseAnimateStmt(): AnimateStmtNode {
    const startTok = this.consume('ANIMATE', 'Expected "animate" keyword');
    const charTok = this.consume('IDENTIFIER', 'Expected character name after "animate"');
    this.consume('WITH', 'Expected "with" after character in animate statement');

    let animation: string;
    let durationMs: number | undefined;

    if (this.check('STRING')) {
      const raw = this.advance().value.trim();
      // "slide-in 400ms" | "slide-in 400" | "slide-in"
      const match = raw.match(/^([a-zA-Z0-9_-]+)\s*(\d+)\s*(ms)?$/i) || raw.match(/^([a-zA-Z0-9_-]+)$/);
      if (match) {
        animation = match[1]!;
        if (match[2]) durationMs = Number(match[2]);
      } else {
        animation = raw.replace(/\s+/g, '-');
      }
    } else {
      animation = this.consume('IDENTIFIER', 'Expected animation name after "with"').value;
      if (this.check('NUMBER')) {
        durationMs = Number(this.advance().value);
      }
    }

    this.consumeOptionalNewline();
    return {
      type: 'AnimateStmt',
      character: charTok.value,
      animation: animation.toLowerCase(),
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseUnlockStmt(): UnlockStmtNode {
    const startTok = this.consume('UNLOCK', 'Expected "unlock" keyword');
    const id = this.check('STRING')
      ? this.advance().value
      : this.consume('IDENTIFIER', 'Expected achievement id after "unlock"').value;
    let title: string | undefined;
    let description: string | undefined;
    if (this.check('STRING')) {
      title = this.advance().value;
      if (this.check('STRING')) {
        description = this.advance().value;
      }
    }
    this.consumeOptionalNewline();
    return {
      type: 'UnlockStmt',
      id,
      title,
      description,
      loc: createLocation(this.file, startTok.loc.start, this.previousLocation().end)
    };
  }

  private parseLangStmt(): LangStmtNode {
    const startTok = this.consume('LANG', 'Expected "lang" keyword');
    const code = this.check('STRING')
      ? this.advance().value
      : this.consume('IDENTIFIER', 'Expected language code after "lang" (e.g. it, en)').value;
    this.consumeOptionalNewline();
    return {
      type: 'LangStmt',
      code: code.toLowerCase(),
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
      const tok = this.advance();
      if (tok.type === 'STRING') {
        parts.push(JSON.stringify(tok.value));
      } else {
        parts.push(tok.value);
      }
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

  private checkSoftIdentifier(): boolean {
    if (this.isAtEnd()) return false;
    const t = this.peek().type;
    if (t === 'IDENTIFIER') return true;
    // Keywords may appear as names (e.g. `define music theme`, `hotspot window`, `play music theme`)
    switch (t) {
      case 'NEWLINE':
      case 'INDENT':
      case 'DEDENT':
      case 'EOF':
      case 'COLON':
      case 'EQUALS':
      case 'PLUS_EQUALS':
      case 'MINUS_EQUALS':
      case 'DOUBLE_EQUALS':
      case 'NOT_EQUALS':
      case 'GREATER_EQUALS':
      case 'LESS_EQUALS':
      case 'GREATER':
      case 'LESS':
      case 'PLUS':
      case 'MINUS':
      case 'COMMA':
      case 'STRING':
      case 'NUMBER':
      case 'BOOLEAN':
      case 'COLOR':
        return false;
      default:
        return true;
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
