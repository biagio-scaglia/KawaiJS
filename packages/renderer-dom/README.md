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
    vfx sakura
    show yumia happy at center with bounce
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

- **Ren'Py-Style Start / Main Menu**: Start Game, Continue, Load, CG Gallery, Preferences, About, and Quit. Fully customizable through `MainMenuOptions` or standard CSS.
- **Modal focus lifecycle**: Escape / gamepad dismiss and modal replacement call registered closers so focus traps (`trapFocus`) restore the previous element. Opening Save while Settings is open releases the previous trap first.
- **Input prompts**: `input` overlays cannot be closed with Escape (avoids soft-locking `pendingInput`).
- **Atmospheric VFX Layer**: Canvas particles for `sakura` (cherry blossoms), `rain`, `snow`, plus `fog` / `tint` overlays (`tint` layers over weather without stopping petals).
- **Scene & Sprite Transitions**: Background wipe/push/zoom/glitch/…; same-asset transition changes re-trigger animations; CSS `url()` values are escaped via `cssUrl`.
- **Speaking sprites**: Lip-sync animates the `<img>`, not the positioned wrapper — sprites stay centered (`translateX(-50%)`).
- **Camera Directives & Shakes**: `shake`, `vpunch`, `hpunch`, and screen `flash`.
- **Unlockable CG Gallery & Lightbox**: Fullscreen illustration modal with progress tracking and lightbox viewer (`data:` limited to `data:image/*`).
- **Save & Load Modals**: Multi-slot save system with live state previews, slot deletion, and timestamps.
- **Preferences Modal**: Interactive sliders for Typewriter speed, Auto-forward delay, Music and SFX volume (language codes are HTML-escaped).
- **Dialogue History / Backlog**: Formatted log of all past speaker interactions (synced on rollback/load).
- **Typewriter safety**: Hiding the dialogue box (choices / `window hide`) clears the typewriter interval and completion callbacks.
- **Responsive 16:9 Letterboxing**: Automatically scales to any screen aspect ratio.
- **Rich Text & Interpolation**: Built-in support for dynamic variables `[var]`, `{b}`, `{i}`, `{color=...}`, `{size=...}`, glitch/shake/rainbow/corrupt tags with XSS sanitization.
- **Keyboard Navigation**: Space/Enter advance, Backspace rollback, A auto, Ctrl skip, S/L save/load, H history, P preferences, Esc title (or close modal with focus restore).
- **Theme / Style hooks**: `theme "noir|sakura|ocean|dusk"` and `style dialogue|choices|stage …` map to CSS tokens / classes.
- **Share & embed**: dynamic Open Graph meta per scene; `?embed=1` for iframe-friendly chrome; `?at=` deep-links.
- **Audio**: Uses `AudioManager.attachToVM` so a second manual `attachToVM` cannot stack duplicate listeners.

## License

MIT License © 2026 [Biagio Scaglia](https://github.com/biagio-scaglia)
