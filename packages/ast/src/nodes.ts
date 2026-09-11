import type { SourceLocation } from './source.js';

export type ASTNodeType =
  | 'Program'
  | 'CharacterDecl'
  | 'LabelDecl'
  | 'SceneStmt'
  | 'ShowStmt'
  | 'HideStmt'
  | 'DialogueStmt'
  | 'MenuStmt'
  | 'ChoiceItem'
  | 'JumpStmt'
  | 'ReturnStmt'
  | 'SetStmt'
  | 'IfStmt'
  | 'ElifBranch'
  | 'ElseBranch'
  | 'PlayStmt'
  | 'StopStmt';

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
  | LabelDeclNode
  | SceneStmtNode
  | ShowStmtNode
  | HideStmtNode
  | DialogueStmtNode
  | MenuStmtNode
  | JumpStmtNode
  | ReturnStmtNode
  | SetStmtNode
  | IfStmtNode
  | PlayStmtNode
  | StopStmtNode;

export interface CharacterDeclNode extends BaseNode {
  readonly type: 'CharacterDecl';
  readonly id: string;
  readonly displayName: string;
  readonly color?: string;
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
