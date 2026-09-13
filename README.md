<div align="center">

# 🌸 Kawaijs

**A modern, web-native visual novel engine and toolchain inspired by Ren'Py.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/kawaijs.svg)](https://www.npmjs.com/package/kawaijs)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-53%2F53%20Passing-brightgreen)](https://github.com/biagio-scaglia/KawaiJS)

[Quick Start](#-quick-start) • [Syntax Guide](#-kawa-script-syntax-guide) • [Start Menu](#-start-menu--ui-customization) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Architecture](#-architecture)

</div>

---

## 📖 Introduction

**Kawaijs** brings the expressive simplicity of **Ren'Py** to the modern Web ecosystem. It is a complete visual novel authoring engine designed for storytellers, game designers, and web developers.

- 📝 **Pythonic Scripting**: Clean, indentation-based syntax designed for readability.
- 🎨 **Pure Web Native**: Styled 100% with standard CSS, responsive letterboxing (16:9), and zero canvas lock-in.
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
    play music "bgm_peaceful.mp3" fadein 2.0 loop

    show yumia happy at center
    yumia "Good morning, Sensei! Welcome to the {b}Game Dev Club{/b}."
    
    set affinity = 10
    set has_key = false

    "The morning breeze blows gently through the open window."

    menu:
        "Ask about the club project":
            jump ask_project

        "Offer to help clean the classroom" if affinity >= 10:
            jump clean_room

        "Leave quietly":
            jump leave_early

label ask_project:
    show yumia excited at center
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
| **Scene & Background** | `scene bg <name> [with <transition>]` | `scene bg sunset with fade` |
| **Show Sprite** | `show <char> [<expr>] [at <pos>]` | `show yumia smile at center` |
| **Hide Sprite** | `hide <char>` | `hide yumia` |
| **Dialogue** | `<char> "<text>"` | `yumia "Hello world!"` |
| **Narration** | `"<text>"` | `"Silence filled the room."` |
| **Variables** | `set <var> = <val>` / `+=` / `-=` | `set karma += 5` |
| **Conditionals** | `if <cond>:` / `elif:` / `else:` | `if score >= 50 and flag:` |
| **Choice Menu** | `menu:` with `"Text" [if <cond>]:` | `"Open door" if has_key:` |
| **Audio - Music** | `play music "<file>" [fadein <s>] [loop]` | `play music "bgm.mp3" fadein 1.5` |
| **Audio - Sound SFX** | `play sound "<file>"` | `play sound "door_creak.mp3"` |
| **Audio - Voice** | `play voice "<file>"` | `play voice "yumia_01.mp3"` |
| **Stop Audio** | `stop music [fadeout <s>]` | `stop music fadeout 2.0` |
| **Navigation** | `jump <label>` / `call <label>` / `return` | `jump next_chapter` |

---

### 🖋️ Rich Text Formatting

Kawaijs supports inline text tags inside dialogue strings:

- `{b}Bold Text{/b}` ➔ **Bold Text**
- `{i}Italic Text{/i}` ➔ *Italic Text*
- `{color=#f43f5e}Custom Color{/color}` ➔ <span style="color:#f43f5e">Custom Color</span>
- `{size=1.3rem}Sized Text{/size}` ➔ Custom font size

---

## 🌸 Start Menu & UI Customization

Kawaijs includes an out-of-the-box Ren'Py-style Main Menu with:
- **Start Game** (New Game)
- **Continue** (Quick-load latest save)
- **Load Game** (Multi-slot save viewer with preview texts & timestamps)
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
| <kbd>Tab</kbd> / <kbd>Ctrl</kbd> | Hold or toggle Fast Skip Mode |
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

---

## 🛠️ CLI Reference

```bash
kawa create <directory>       # Scaffold a new visual novel template
kawa validate [directory]     # Lint and validate syntax and assets
kawa dev [directory]          # Start local dev server with hot reload
kawa build [directory]        # Export static standalone HTML5 distribution
```

---

## 📜 License

MIT License © 2026 [Biagio Scaglia](https://github.com/biagio-scaglia)
