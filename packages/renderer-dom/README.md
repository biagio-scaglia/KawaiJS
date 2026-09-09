# @kawaijs/renderer-dom

**Semantic HTML5/CSS3 presentation renderer and design system for Kawaijs visual novels.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/renderer-dom
```

## Quick Example

```typescript
import { compileScript } from '@kawaijs/parser';
import { mountKawaApp } from '@kawaijs/renderer-dom';
import '@kawaijs/renderer-dom/src/theme.css';

const story = compileScript(`
character yumia "Yumia"

label start:
    scene bg classroom
    show yumia happy
    yumia "Hello from Kawaijs DOM renderer!"
`);

mountKawaApp(story, document.getElementById('app')!);
```

## Features
- **Semantic DOM Elements**: `.kawa-root`, `.kawa-stage`, `.kawa-dialogue-box`, `.kawa-choices`.
- **CSS Custom Properties**: Fully customizable theme tokens (`--kawa-primary-accent`, `--kawa-dialogue-bg`, etc.).
- **Typewriter Effect**: Smooth animated text with skip on click.
- **Built-in UI**: Quick menu (Back, History, Save, Load).

## License
MIT © Biagio Scaglia
