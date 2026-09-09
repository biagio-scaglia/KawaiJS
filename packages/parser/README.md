# @kawaijs/parser

**Indentation-aware Lexer, Parser, Compiler, and Diagnostic Engine for Kawa Script.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/parser
```

## Quick Example

```typescript
import { compileScript } from '@kawaijs/parser';

const script = `
character yumia "Yumia"

label start:
    scene bg classroom
    yumia "Hello world!"
`;

const storyPackage = compileScript(script, 'main.kawa');
console.log(storyPackage);
```

## Features
- **Indentation Lexer**: Clean Python/Ren'Py-style whitespace and block tracking.
- **Rich Diagnostics**: Formatted code frames with line numbers, caret underlines, and hint suggestions.
- **AST to IR Compiler**: Compiles high-level script into an execution instruction stream with label resolution.

## License
MIT © Biagio Scaglia
