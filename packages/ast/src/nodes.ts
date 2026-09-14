import type { SourceLocation } from './source.js';

export type ASTNodeType =
  | 'Program'
  | 'CharacterDecl'
  | 'DefineDecl'
  | 'LabelDecl'
  | 'SceneStmt'
  | 'ShowStmt'
  | 'HideStmt'
  | 'DialogueStmt'
  | 'MenuStmt'
  | 'ChoiceItem'
  | 'JumpStmt'
  | 'CallStmt'
  | 'ReturnStmt'
  | 'SetStmt'
  | 'IfStmt'
  | 'ElifBranch'
  | 'ElseBranch'
  | 'PlayStmt'
  | 'StopStmt'
  | 'VfxStmt'
  | 'CameraStmt'
  | 'PauseStmt'
  | 'CgStmt'
  | 'InputStmt'
  | 'WindowStmt'
  | 'ThemeStmt'
  | 'StyleStmt'
  | 'HotspotStmt'
  | 'LayerStmt'
  | 'AnimateStmt'
  | 'UnlockStmt'
  | 'LangStmt';

export interface BaseNode {
  readonly type: ASTNodeType;
  readonly loc?: SourceLocation;
}

export interface ProgramNode extends BaseNode {
  readonly type: 'Program';
  readonly statements: StatementNode[];
}

export type StatementNode =
  | CharacterDeclNode
  | DefineDeclNode
  | LabelDeclNode
  | SceneStmtNode
  | ShowStmtNode
  | HideStmtNode
  | DialogueStmtNode
  | MenuStmtNode
  | JumpStmtNode
  | CallStmtNode
  | ReturnStmtNode
  | SetStmtNode
  | IfStmtNode
  | PlayStmtNode
  | StopStmtNode
  | VfxStmtNode
  | CameraStmtNode
  | PauseStmtNode
  | CgStmtNode
  | InputStmtNode
  | WindowStmtNode
  | ThemeStmtNode
  | StyleStmtNode
  | HotspotStmtNode
  | LayerStmtNode
  | AnimateStmtNode
  | UnlockStmtNode
  | LangStmtNode;

export interface CharacterDeclNode extends BaseNode {
  readonly type: 'CharacterDecl';
  readonly id: string;
  readonly displayName: string;
  readonly color?: string;
}

/** Asset / string alias: `define bg classroom = "classroom.svg"` */
export interface DefineDeclNode extends BaseNode {
  readonly type: 'DefineDecl';
  readonly name: string;
  readonly value: string;
}

export interface LabelDeclNode extends BaseNode {
  readonly type: 'LabelDecl';
  readonly name: string;
  readonly body: StatementNode[];
}

export interface SceneStmtNode extends BaseNode {
  readonly type: 'SceneStmt';
  readonly background: string;
  readonly transition?: string;
}

export interface ShowStmtNode extends BaseNode {
  readonly type: 'ShowStmt';
  readonly character: string;
  readonly expression?: string;
  readonly position?: string; // e.g. 'left', 'center', 'right'
  readonly transition?: string;
  /** Named stage layer (master / overlay / …). */
  readonly layer?: string;
  /** Explicit z-index (higher draws above). */
  readonly z?: number;
}

export interface HideStmtNode extends BaseNode {
  readonly type: 'HideStmt';
  readonly character: string;
  readonly transition?: string;
}

export interface DialogueStmtNode extends BaseNode {
  readonly type: 'DialogueStmt';
  readonly speaker?: string; // If undefined, represents narration
  readonly text: string;
}

export interface ChoiceItemNode extends BaseNode {
  readonly type: 'ChoiceItem';
  readonly text: string;
  readonly condition?: string;
  readonly body: StatementNode[];
}

export interface MenuStmtNode extends BaseNode {
  readonly type: 'MenuStmt';
  readonly prompt?: string;
  readonly choices: ChoiceItemNode[];
}

export interface JumpStmtNode extends BaseNode {
  readonly type: 'JumpStmt';
  readonly targetLabel: string;
}

export interface CallStmtNode extends BaseNode {
  readonly type: 'CallStmt';
  readonly targetLabel: string;
}

export interface ReturnStmtNode extends BaseNode {
  readonly type: 'ReturnStmt';
}

export interface SetStmtNode extends BaseNode {
  readonly type: 'SetStmt';
  readonly variable: string;
  readonly operator: '=' | '+=' | '-=';
  readonly value: unknown;
  readonly isVariable?: boolean;
}

export interface ElifBranchNode extends BaseNode {
  readonly type: 'ElifBranch';
  readonly condition: string;
  readonly body: StatementNode[];
}

export interface ElseBranchNode extends BaseNode {
  readonly type: 'ElseBranch';
  readonly body: StatementNode[];
}

export interface IfStmtNode extends BaseNode {
  readonly type: 'IfStmt';
  readonly condition: string;
  readonly thenBranch: StatementNode[];
  readonly elifBranches: ElifBranchNode[];
  readonly elseBranch?: ElseBranchNode;
}

export interface PlayStmtNode extends BaseNode {
  readonly type: 'PlayStmt';
  readonly channel: 'music' | 'sound' | 'voice';
  readonly track: string;
  readonly fade?: number;
  readonly loop?: boolean;
}

export interface StopStmtNode extends BaseNode {
  readonly type: 'StopStmt';
  readonly channel: 'music' | 'sound' | 'voice';
  readonly fade?: number;
}

export interface VfxStmtNode extends BaseNode {
  readonly type: 'VfxStmt';
  readonly effect: 'rain' | 'snow' | 'sakura' | 'fog' | 'tint' | 'stop';
  readonly intensity?: number | string;
  readonly color?: string;
}

export interface CameraStmtNode extends BaseNode {
  readonly type: 'CameraStmt';
  readonly action: 'shake' | 'vpunch' | 'hpunch' | 'flash';
  readonly duration?: number;
}

export interface PauseStmtNode extends BaseNode {
  readonly type: 'PauseStmt';
  readonly duration?: number; // duration in milliseconds, or undefined for click-to-continue
}

export interface CgStmtNode extends BaseNode {
  readonly type: 'CgStmt';
  readonly image: string;
  readonly unlockId?: string;
}

/** Prompt the player and store the result in a variable. */
export interface InputStmtNode extends BaseNode {
  readonly type: 'InputStmt';
  readonly variable: string;
  readonly prompt: string;
}

/** Show/hide the dialogue window without advancing the story. */
export interface WindowStmtNode extends BaseNode {
  readonly type: 'WindowStmt';
  readonly action: 'show' | 'hide';
}

/** Apply a CSS theme token on the player root (`data-kawa-theme`). */
export interface ThemeStmtNode extends BaseNode {
  readonly type: 'ThemeStmt';
  readonly name: string;
}

/** Attach a named style token to a UI target (dialogue, stage, root, choices). */
export interface StyleStmtNode extends BaseNode {
  readonly type: 'StyleStmt';
  readonly target: string;
  readonly name: string;
}

/** Clickable region on the stage/CG, normalized later to 0–1. */
export interface HotspotStmtNode extends BaseNode {
  readonly type: 'HotspotStmt';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly targetLabel: string;
}

/** Set the default sprite layer for subsequent `show` statements. */
export interface LayerStmtNode extends BaseNode {
  readonly type: 'LayerStmt';
  readonly name: string;
}

/**
 * CSS-first sprite animation.
 * `animate yumia with "slide-in 400ms"` → class `kawa-css-anim-slide-in`.
 */
export interface AnimateStmtNode extends BaseNode {
  readonly type: 'AnimateStmt';
  readonly character: string;
  readonly animation: string;
  readonly durationMs?: number;
}

/** Unlock an achievement / exportable flag. */
export interface UnlockStmtNode extends BaseNode {
  readonly type: 'UnlockStmt';
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
}

/** Switch active UI / string-table language. */
export interface LangStmtNode extends BaseNode {
  readonly type: 'LangStmt';
  readonly code: string;
}

