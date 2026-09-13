# @kawaijs/renderer-dom

**Semantic HTML5/CSS3 presentation renderer and design system for Kawaijs visual novels.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/renderer-dom @kawaijs/runtime @kawaijs/parser
```

## Quick Example

```typescript
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '@kawaijs/runtime';
import { DOMRenderer } from '@kawaijs/renderer-dom';
import '@kawaijs/renderer-dom/dist/theme.css';

const story = compileScript(`
character yumia "Yumia" #f43f5e

label start:
    scene bg classroom with fade
    show yumia happy at center
    yumia "Hello from Kawaijs DOM renderer!"
`);

const vm = new StoryVM(story);

const renderer = new DOMRenderer(vm, {
  container: document.getElementById('app')!,
  mainMenu: {
    enabled: true,
    title: "My Visual Novel",
    subtitle: "A Web Tale"
  }
});
```

## Features

- **Ren'Py-Style Start / Main Menu**: Start Game, Continue, Load, Preferences, About, and Quit. Fully customizable through `MainMenuOptions` or standard CSS.
- **Save & Load Modals**: Multi-slot save system with live state previews, slot deletion, and timestamps.
- **Preferences Modal**: Interactive sliders for Typewriter speed, Auto-forward delay, Music and SFX volume.
- **Dialogue History / Backlog**: Formatted log of all past speaker interactions.
- **Responsive 16:9 Letterboxing**: Automatically scales to any screen aspect ratio.
- **Rich Text Engine**: Built-in support for `{b}`, `{i}`, `{color=...}`, `{size=...}` tags with XSS sanitization.
- **Keyboard Navigation**: Full keyboard shortcut integration (<kbd>Space</kbd>, <kbd>Backspace</kbd>, <kbd>A</kbd>, <kbd>Tab</kbd>, <kbd>S</kbd>, <kbd>L</kbd>, <kbd>H</kbd>, <kbd>P</kbd>, <kbd>Esc</kbd>).

## License

MIT License © 2026 [Biagio Scaglia](https://github.com/biagio-scaglia)
