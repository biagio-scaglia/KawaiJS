# @kawaijs/parser

**Indentation-aware Lexer, Parser, Compiler, and Diagnostic Engine for Kawa Script.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/parser
```

## Quick Example

```typescript
import { compileScript, validateScript, validateStory } from '@kawaijs/parser';

const script = `
character yumia "Yumia"

label start:
    scene bg classroom with fade
    vfx sakura
    show yumia happy at center with bounce
    yumia "Hello world!"
`;

const storyPackage = compileScript(script, 'main.kawa');
console.log(storyPackage);

const report = validateScript(script);
console.log(report.isValid, report.errors);
```

## Features
- **Indentation Lexer**: Clean Python/Ren'Py-style whitespace and block tracking.
- **Directives**: `scene`/`show`/`hide` transitions, `define`, `input`, `window`, `vfx`, `camera`, `pause`, `cg`, audio, `menu`, `if`/`call`/`jump`, `hotspot`, `theme`/`style`, `unlock`, `lang`.
- **Safe entrypoint**: Without `label start:`, `meta.startLabel` is the first **user** label — never a synthetic `__if_*` / `__menu_*` label.
- **Strict top-level decls**: Nested `label` / `character` / `define` inside a label body throw `E0209`. Duplicate characters throw `E0208`. Empty scripts (no labels) throw `E0203`.
- **Include cycles**: Paths are normalized (`ch.kawa` ≡ `./ch.kawa`); sibling and recursive cycles raise `E0206`.
- **Rich Diagnostics**: Formatted code frames with line numbers, caret underlines, and hint suggestions.
- **Validation**: `validateStory` / `validateScript` check jump, call, branch, choice (incl. `fallbackLabel`), and **hotspot** targets.
- **AST to IR Compiler**: Compiles high-level script into an execution instruction stream with label resolution.

## License
MIT © Biagio Scaglia
