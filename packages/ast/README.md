# @kawaijs/ast

**Abstract Syntax Tree (AST) and Story Intermediate Representation (IR) type definitions for Kawaijs.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/ast
```

## Features
- Pure, zero-dependency TypeScript definitions.
- Discriminated union types for all Kawa Script syntax nodes (`StatementNode`, `DialogueStmtNode`, `MenuStmtNode`, etc.).
- Serialized Story IR instruction formats (`StoryPackage`, `Instruction`) with source location tracking (`SourceLocation`).

## License
MIT © Biagio Scaglia
