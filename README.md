# 🌸 Kawaijs

**A modern, web-native visual novel engine and toolchain inspired by Ren'Py.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/kawaijs.svg)](https://www.npmjs.com/package/kawaijs)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-140%2B%20Passing-brightgreen)](https://github.com/biagio-scaglia/KawaiJS)
[![Docs](https://img.shields.io/badge/Docs-Playable%20VN-f43f5e)](https://biagio-scaglia.github.io/KawaiJS/)

[Playable Docs](https://biagio-scaglia.github.io/KawaiJS/) · [Play Demo](https://biagio-scaglia.github.io/KawaiJS/showcase/) · [Playground](https://biagio-scaglia.github.io/KawaiJS/playground/) · [Quick Start](#-quick-start) · [Syntax Guide](#-kawa-script-syntax-guide) · [Start Menu](#-start-menu--ui-customization) · [Keyboard Shortcuts](#-keyboard-shortcuts) · [Architecture](#-architecture)

---

## 📖 Introduction

**Kawaijs** brings the expressive simplicity of **Ren'Py** to the modern Web ecosystem. It is a complete visual novel authoring engine designed for storytellers, game designers, and web developers.

- 🌐 **Web-Native**: Ren'Py for the Web — runs in modern browsers with zero backend. Deploy to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or itch.io.
- 📝 **Pythonic Scripting**: Clean, indentation-based syntax designed for readability.
- 🎨 **Pure Web Native**: Styled 100% with standard CSS, responsive letterboxing (16:9), and zero canvas lock-in.
- 🔍 **SEO & Branding**: User favicon, Open Graph / Twitter cards, JSON-LD, canonical URL, and PWA install icons from `kawa.config.json`.
- 🎮 **Out-of-the-Box VN UX**: Built-in Ren'Py-style Main Menu, Save/Load slot manager, Dialogue History (Backlog), Preferences (Text Speed, Auto-forward time, Audio volumes), Rollback, Auto-Mode, and Skip-Mode.
- ⚡ **Lightning Fast Toolchain**: Live-reload dev server, script validation, and zero-config static exports ready for GitHub Pages, Netlify, Vercel, or itch.io.

---

## 🚀 Quick Start

### 1. Scaffold a New Project

```bash
# Create a new visual novel project in seconds
npx kawa create my-novel

cd my-novel
```

### 2. Start the Live Dev Server

```bash
# Launches dev server at http://localhost:3000 with SSE live reload
npx kawa dev
```

Try the full showcase (sakura, fades, CG, three endings) from this repo:

```bash
npx kawa dev ./examples/hello-world
```

Or the **narrative demo** (*After the Bell*):

```bash
npm run dev:showcase
# → http://localhost:3000
# Production: https://biagio-scaglia.github.io/KawaiJS/showcase/
```

Or the **interactive documentation** VN (SEO / AEO / GEO ready):

```bash
npm run dev:docs
# → http://localhost:3000
# Production: https://biagio-scaglia.github.io/KawaiJS/
```

**Zero-install playground** (edit `.kawa` in the browser):

```bash
npm run build:playground
# open playground/dist/index.html via a local static server
# Production: https://biagio-scaglia.github.io/KawaiJS/playground/
```

Assemble the full GitHub Pages site locally:

```bash
npm run assemble:pages
# → docs/ (docs VN + /showcase + /playground + product CTA bar)
```

### 3. Build for Production

```bash
# Compiles your script and assets into a standalone, self-contained dist/ folder
npx kawa build
```

---

## 📝 Kawa Script Syntax Guide

```kawa
# 1. Metadata
title: "The Melancholy of Yumia"
author: "Biagio Scaglia"

# 2. Characters
character yumia "Yumia" #f43f5e
character sensei "Sensei" #38bdf8

# 3. Entry point label
label start:
    scene bg classroom with fade
    vfx sakura
    play music "bgm_peaceful.mp3" fadein 2.0 loop

    show yumia happy at center with bounce
    yumia "Good morning, Sensei! Welcome to the {b}Game Dev Club{/b}."
    
    set affinity = 10
    set has_key = false

    "Cherry blossoms drift past the window — that is {b}vfx sakura{/b}."

    menu:
        "Ask about the club project":
            jump ask_project

        "Offer to help clean the classroom" if affinity >= 10:
            jump clean_room

        "Leave quietly":
            jump leave_early

label ask_project:
    show yumia excited at center with nod
    yumia "We're building a web-native visual novel engine with {color=#38bdf8}Kawaijs{/color}!"
    set affinity += 15
    return

label clean_room:
    yumia "Thank you so much! You're always so thoughtful."
    return

label leave_early:
    yumia "Aw, see you tomorrow then!"
    return
```

---

### 📚 Syntax Cheat Sheet

| Feature | Syntax | Example |
| :--- | :--- | :--- |
| **Character** | `character <id> "<Name>" [<color>]` | `character yumia "Yumia" #f43f5e` |
| **Labels** | `label <name>:` | `label chapter_1:` |
| **Multi-file Include** | `include "<path.kawa>"` \| `import "<path>"` | `include "chapter2.kawa"` |
| **Scene & Background** | `scene bg <name> [with <transition>]` | `scene bg sunset with fade` |
| **Video Background / CG** | `scene "<video.webm>"` \| `cg "<anim.mp4>"` | `scene "intro_cutscene.webm"` |
| **Scene Transitions** | `fade` \| `dissolve` \| `wipeleft` \| `wiperight` \| `wipeup` \| `wipedown` \| `circlewipe` \| `iris` \| `pushleft` \| `pushright` \| `pushup` \| `pushdown` \| `zoom` \| `blur` \| `glitch` \| `corrupt` | `scene bg park with circlewipe` |
| **Show Sprite** | `show <char> [<expr>] [at <pos>] [with <anim>]` | `show yumia smile at center with bounce` |
| **Hide Sprite** | `hide <char> [with <anim>]` | `hide yumia` |
| **Sprite Transitions & Effects** | `with bounce` \| `dissolve` \| `nod` \| `shake` \| `slideleft` \| `slideright` \| `glitch` \| `invert` \| `vhs` | `show yumia with glitch` |
| **Define Alias** | `define <name...> = "<path>"` | `define bg classroom = "classroom.svg"` |
| **Player Input** | `input <var> ["prompt"]` | `input player_name "Your name?"` |
| **Dialogue Window** | `window show` \| `window hide` | `window hide` |
| **Theme Token** | `theme "<name>"` | `theme "noir"` / `"sakura"` / `"ocean"` / `"dusk"` |
| **Style Hook** | `style <target> <name>` | `style dialogue glass` / `style choices pill` |
| **Layer / z-order** | `layer <name>` · `show … z <n>` · `show … layer <name>` | `layer overlay` / `show yumia at left z 2` |
| **CSS Animate** | `animate <char> with "<name> [ms]"` | `animate yumia with "slide-in 400ms"` |
| **Achievement** | `unlock <id> ["title"] ["desc"]` | `unlock first_end "First Ending"` |
| **Language & i18n** | `lang "<code>"` · text `{t:key}` | `lang "it"` / `yumia "{t:hello}"` |
| **Hotspot** | `hotspot <id> <x> <y> <w> <h> jump <label>` | `hotspot door 40 50 18 12 jump courtyard` |
| **Deep Link** | URL `?at=<label>` or `?label=` | `/?at=courtyard_scene` |
| **Embed Mode** | URL `?embed=1` | iframe / blog embed (no main menu) |
| **Dialogue** | `<char> "<text>"` | `yumia "Hello world!"` |
| **Narration** | `"<text>"` | `"Silence filled the room."` |
| **Math & Variables** | `set <var> = <expr>` / `+=` / `-=` / `*=` / `/=` | `set karma = (str + agi) * 1.5 - penalty` |
| **Conditionals** | `if <cond>:` / `elif:` / `else:` | `if (affinity >= 10 and has_key) or is_admin:` |
| **Choice Menu** | `menu:` with `"Text" [if <cond>]:` | `"Open door" if has_key:` |
| **Audio - Music (BGM)** | `play music "<file>" [fadein <s>] [loop]` | `play music "bgm.mp3" fadein 1.5` |
| **Audio - Sound SFX** | `play sound "<file>"` | `play sound "door_creak.mp3"` |
| **Audio - Voice (Ducking)**| `play voice "<file>"` | `play voice "yumia_01.mp3"` |
| **Stop Audio** | `stop music [fadeout <s>]` | `stop music fadeout 2.0` |
| **Navigation** | `jump <label>` / `call <label>` / `return` | `jump next_chapter` |
| **Variable Interpolation** | `"<text> [var_name] <text>"` | `"Hello [player_name], you have [gold] coins!"` |
| **VFX Weather & Atmosphere** | `vfx <rain\|snow\|sakura\|fog\|tint\|stop> [<intensity\|color>]` | `vfx sakura` / `vfx tint "#f43f5e"` / `vfx stop` |
| **Camera & Shake Effects** | `camera <shake\|vpunch\|hpunch\|flash> [<duration_ms>]` | `camera shake 600` / `camera flash` |
| **Timed Pause** | `pause [<duration_ms>]` | `pause 1200` |
| **Fullscreen Event CG** | `cg "<image\|video>" [as "<unlock_id>"]` | `cg "cg_sunset.jpg" as "sunset"` |

---

### 🖋️ Rich Text & Animated Effects

Kawaijs supports inline formatting, micro-animations, and dynamic variable interpolation:

- **Variables**: `"Hello, [player_name]! Your affinity is [affinity]."`
- **Bold**: `{b}Bold Text{/b}` ➔ **Bold Text**
- **Italic**: `{i}Italic Text{/i}` ➔ *Italic Text*
- **Color**: `{color=#f43f5e}Custom Color{/color}` ➔ Custom color
- **Font Size**: `{size=1.3rem}Sized Text{/size}` ➔ Custom font size
- **Glitch & Aberration**: `{glitch}Distorted Reality{/glitch}` ➔ Animated RGB chromatic glitch
- **Shake / Fear**: `{shake}Intense Tremble{/shake}` ➔ Jittering animated text
- **Rainbow**: `{rainbow}Magical Aura{/rainbow}` ➔ Continuous hue-rotating rainbow gradient
- **Corrupt**: `{corrupt}0xDEADBEEF{/corrupt}` ➔ Monospace corrupted glitch text

---

### 🎮 Controller & Gamepad Support

Kawaijs includes out-of-the-box standard gamepad navigation via the Web Gamepad API:

| Button | Action |
| :--- | :--- |
| <kbd>A</kbd> / <kbd>Cross</kbd> (Btn 0) | Advance dialogue / Confirm menu choice / Trigger focused button |
| <kbd>B</kbd> / <kbd>Circle</kbd> (Btn 1) | Rollback / Close open modal or confirm dialog |
| <kbd>X</kbd> / <kbd>Square</kbd> (Btn 2) | Toggle Fast Skip Mode |
| <kbd>Y</kbd> / <kbd>Triangle</kbd> (Btn 3) | Toggle Auto-Forward Mode |
| <kbd>Start</kbd> / <kbd>Menu</kbd> (Btn 9) | Toggle Main Menu / Pause Screen |
| <kbd>D-Pad Up</kbd> / <kbd>Stick Up</kbd> | Navigate focus upwards across buttons and choices |
| <kbd>D-Pad Down</kbd> / <kbd>Stick Down</kbd> | Navigate focus downwards across buttons and choices |

---

### ✨ Visual Effects & Camera Directives

Bring your scenes to life with hardware-accelerated ambient effects and camera dynamics:

```kawa
define bg courtyard = "courtyard.svg"
define music rain = "bgm_rain"

label dramatic_scene:
    scene bg courtyard with dissolve

    # 1. Weather particle systems (sakura = cherry blossoms)
    vfx rain
    vfx snow
    vfx sakura
    vfx sakura 50          # optional intensity
    vfx fog
    vfx tint "#fda4af"     # color overlay — layers ON TOP of active weather
    vfx stop               # clear all VFX

    # 2. Sprite enter animations
    show yumia happy at center with bounce
    show kaori normal at right with dissolve
    show yumia excited with nod

    # 3. Camera shakes and flashes
    camera shake 500
    camera vpunch
    camera hpunch
    camera flash

    # 4. Timed dramatic pause / hide textbox
    window hide
    pause 1500
    window show

    # 5. Ask the player
    input player_name "What is your name?"

    # 6. Fullscreen CG illustration & unlock in Gallery
    cg "memories_under_rain.jpg" as "rain_cg"
    play music rain

    # 7. Web-native skin + clickable regions (coords are % of the stage)
    theme "noir"
    style dialogue glass
    window hide
    hotspot door 12 30 20 45 jump next_chapter
    hotspot window 70 18 22 30 jump next_chapter
```

> **Tip:** A new `scene` clears characters and VFX. Re-apply `vfx sakura` (or fog/rain) after each scene change.  
> **Tip:** `define` aliases are resolved at compile time for `scene`, `play`, and `cg`.  
> **Tip:** Multi-file stories: use `include "chapter1.kawa"` to split your VN across multiple `.kawa` files. Path aliases (`ch.kawa` vs `./ch.kawa`) are treated as the same file for cycle detection. Nested `label` / `character` / `define` inside a label body are rejected at compile time.  
> **Tip:** Export to Desktop: `kawa export --target=tauri` or `kawa export --target=electron` to build native PC/Mac executables.  
> **Tip:** i18n extraction: `kawa extract-i18n --lang=it` automatically extracts dialogue keys into `game/lang/it.json`.  
> **Tip:** Accessibility & Dyslexia font: built-in toggle for high-readability font and high contrast mode in Preferences.  
> **Tip:** Open a build with `?at=label_name` to deep-link past the main menu (labels starting with `__` are ignored).  
> **Tip:** Use `?embed=1` for iframe / itch / Notion embeds (compact UI, no main menu).  
> **Tip:** Share progress with **Copy continue link** in Save/Load (URL `?continue=…` restores the save).  
> **Tip:** Production builds ship as a **PWA** (`manifest.webmanifest` + `sw.js`) unless `pwa.enabled` is `false`.  
> **Tip:** Built-in CSS anims: `slide-in`, `slide-out`, `fade-in`, `fade-out`, `pop`, `pulse` (override in `style.css` with `.kawa-css-anim-*`).  
> **Tip:** Put string tables in `game/lang/it.json` and use `{t:key}` in dialogue; open with `?lang=it`.  
> **Tip:** `kawa embed --src https://you.example/game/ --width 960 --height 540` prints an iframe snippet.

Configure **SEO, favicon, and social previews** in `kawa.config.json`:

```json
{
  "title": "My Novel",
  "author": "Your Name",
  "seo": {
    "favicon": "favicon.svg",
    "appleTouchIcon": "favicon.svg",
    "description": "A browser visual novel about spring and secrets.",
    "keywords": ["visual novel", "romance", "web game"],
    "canonicalUrl": "https://you.example/my-novel/",
    "locale": "en_US",
    "robots": "index,follow",
    "twitterSite": "@yourstudio",
    "twitterCreator": "@you",
    "jsonLd": true
  },
  "share": {
    "siteName": "My Novel",
    "description": "A browser visual novel.",
    "defaultImage": "backgrounds/classroom.svg",
    "twitterCard": "summary_large_image",
    "labels": {
      "courtyard_scene": {
        "title": "Under the sakura",
        "description": "Yumia waits by the courtyard gate."
      }
    }
  },
  "pwa": {
    "enabled": true,
    "shortName": "My Novel"
  },
  "achievements": [
    { "id": "first_end", "title": "First Ending", "description": "Reach any ending." }
  ]
}
```

**Favicon:** put `game/favicon.svg` (or `.png` / `.ico`) in the project, or set `seo.favicon` to any path under `game/` / `game/assets/`.  
`kawa build` copies it into `dist/`, wires `<link rel="icon">`, apple-touch, and the PWA manifest icon.  
If missing, a default icon is generated.

**i18n:** add `game/lang/en.json` / `game/lang/it.json` as `{ "hello": "…" }` and write `yumia "{t:hello}"` in script. Force with `lang "it"` or `?lang=it`.

**SEO output includes:** description, keywords, author, robots, canonical, Open Graph, Twitter cards, JSON-LD (`WebApplication`), and `robots.txt` when `canonicalUrl` is set.

CLI deep-link helpers: `kawa dev --at courtyard_scene` · `kawa build --at start` · `kawa embed --src ./index.html`.
---

## 🌸 Start Menu & UI Customization

Kawaijs includes an out-of-the-box Ren'Py-style Main Menu with:
- **Start Game** (New Game)
- **Continue** (Quick-load latest save)
- **Load Game** (Multi-slot save viewer with preview texts & timestamps)
- **CG Gallery** (Unlockable event illustrations & lightbox viewer)
- **Preferences** (Text display speed slider, Auto-forward delay, Music & SFX volumes)
- **About** (Credits & metadata)
- **Quit**

### 🎨 Customizing via `game/style.css`

Every UI component uses clear semantic class names that can be overridden:

```css
/* Custom Main Menu Background & Alignment */
.kawa-main-menu {
  background: url('/assets/backgrounds/main_menu_bg.png') center/cover no-repeat;
}

/* Custom Title Typography */
.kawa-main-menu-title {
  font-family: 'Cinzel', serif;
  font-size: 3.2rem;
  background: linear-gradient(135deg, #fff 0%, #fda4af 100%);
  -webkit-background-clip: text;
}

/* Custom Menu Buttons */
.kawa-main-menu-btn {
  background: rgba(15, 23, 42, 0.85);
  border-radius: 12px;
}
.kawa-main-menu-btn:hover {
  background: var(--kawa-primary-accent);
  transform: translateX(6px);
}
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Advance dialogue / Complete typewriter text |
| <kbd>Backspace</kbd> | Rollback to previous dialogue state |
| <kbd>A</kbd> | Toggle Auto-Forward Mode |
| <kbd>Ctrl</kbd> | Toggle Fast Skip Mode |
| <kbd>S</kbd> | Open Save Game modal |
| <kbd>L</kbd> | Open Load Game modal |
| <kbd>H</kbd> | Open Dialogue History Backlog |
| <kbd>P</kbd> / <kbd>O</kbd> | Open Preferences / Settings modal |
| <kbd>Esc</kbd> | Return to Main Menu / Close active modal |

---

## 🏗️ Architecture

The Kawaijs monorepo is divided into modular, zero-dependency packages:

```
@kawaijs/ast            -> Formal AST & IR types
@kawaijs/parser         -> Indentation lexer, AST parser, and compiler
@kawaijs/runtime        -> Headless StoryVM, State, SaveManager & History
@kawaijs/audio          -> Multi-channel Web Audio Engine
@kawaijs/renderer-dom   -> Responsive DOM presentation layer & UI components
@kawaijs/vite-plugin    -> Vite plugin for importing .kawa scripts directly
kawaijs (CLI)           -> Command-line tools (dev, build, validate, create)
```

### Embedding as a TypeScript / JavaScript Library

```typescript
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '@kawaijs/runtime';
import { DOMRenderer } from '@kawaijs/renderer-dom';
import '@kawaijs/renderer-dom/dist/theme.css';

const story = compileScript(kawaSourceCode);
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

**API notes (stability):**

- `vm.getState()` returns a **cloned** snapshot — mutating it does not change the VM. Always read fresh state after `next()` / `choose()` / loads.
- Prefer letting `DOMRenderer` own audio binding. If you also call `audioManager.attachToVM(vm)`, the manager is **idempotent** (re-attach replaces the previous subscription — no double BGM).
- Modals restore focus on Escape / replacement (Save, History, Preferences, …). The `input` prompt cannot be dismissed with Escape (that would soft-lock the story).
- Without `label start:`, the compiler picks the first **user** label — never a synthetic `__if_*` / `__menu_*` block.
- `kawa build` runs semantic validation after compile (invalid hotspot/jump targets fail the build).

---

## 🛠️ CLI Reference

```bash
kawa create <directory>                    # Scaffold a new visual novel template
kawa validate [directory]                  # Lint labels, hotspots, syntax; report missing assets
kawa dev [directory]                       # Start local dev server with hot reload
kawa build [directory]                     # Compile + semantic validate → static HTML5 dist/
kawa export [dir] --target=tauri|electron  # Scaffold native desktop build (Tauri / Electron)
kawa extract-i18n [dir] [--lang=code]      # Scan dialogue & choices and emit translation JSON
kawa embed --src <url>                     # Generate responsive iframe snippet
```

---

## 🧪 Automated Testing & Headless Story Simulator

You can test all branching story paths (choices **and** hotspots), endings, dead-ends, and unreachable labels programmatically without loading a browser:

```typescript
import { compileScript } from '@kawaijs/parser';
import { simulateStory } from '@kawaijs/runtime';

const story = compileScript(kawaCode);
const result = simulateStory(story, {
  initialVariables: { karma: 0 }
});

console.log(`Explored ${result.totalPaths} branching paths.`);
console.log(`Unreachable labels (dead code):`, result.unreachableLabels);
console.log(`Discovered ${result.endings.length} distinct endings.`);
```

---

## 🧩 Custom UI & Component Overrides

Kawaijs ships a full Ren'Py-style player, but you can replace dialogue and choice rendering without forking the engine:

```typescript
import { DOMRenderer, DialogueBoxComponent, ChoiceMenuComponent } from '@kawaijs/renderer-dom';

const renderer = new DOMRenderer(vm, {
  container: document.getElementById('app')!,
  features: {
    quickMenu: true,
    advanceDebounceMs: 220 // prevents double-click skip after typewriter
  },
  components: {
    createDialogueBox: (speed) => new DialogueBoxComponent(speed),
    createChoiceMenu: ({ onSelect }) => new ChoiceMenuComponent({ onSelect })
  }
});
```

Style via CSS variables / `.kawa-*` classes, or supply your own classes that implement `DialogueBoxLike` / `ChoiceMenuLike`.

---

## 📜 License

MIT License © 2026 [Biagio Scaglia](https://github.com/biagio-scaglia)
