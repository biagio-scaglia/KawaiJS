<div align="center">

# 🌸 Kawaijs

**A modern, web-native visual novel engine and toolchain inspired by Ren'Py.**

[![npm version](https://img.shields.io/npm/v/kawaijs.svg?color=crimson)](https://www.npmjs.com/package/kawaijs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/biagio-scaglia/KawaiJS/blob/main/LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-biagio--scaglia%2FKawaiJS-181717?logo=github)](https://github.com/biagio-scaglia/KawaiJS)

</div>

---

## 📖 Introduction

**Kawaijs** is a developer-friendly, web-native visual novel engine and toolchain. It bridges the clean, human-friendly authoring experience of Ren'Py with modern Web technologies (HTML5, standard CSS, and TypeScript).

Write your story in **Kawa Script** (`.kawa`), style dialogue boxes and choices with **standard CSS**, and deploy anywhere as a pure static web application.

```text
character yumia "Yumia" #f43f5e

label start:
    scene bg classroom with fade
    vfx sakura
    show yumia happy at center with bounce

    yumia "Good morning! Ready for the festival under the cherry blossoms?"

    menu:
        "Yes, absolutely!":
            jump ready

        "Not yet...":
            jump not_ready

label ready:
    show yumia excited with nod
    yumia "Awesome! Let's get to work."
    return

label not_ready:
    yumia "Don't worry, we still have time."
    return
```

---

## 🚀 Quick Start

### 1. Scaffold a New Visual Novel

```bash
npx kawaijs create my-novel
cd my-novel
```

`create` copies the showcase starter (fade, sakura, sprite transitions, CG routes). Run `npx kawa dev ./examples/hello-world` in the monorepo for the same demo.

### 2. Validate Your Script

```bash
npx kawaijs validate
```

---

## ✨ Features

- **🌐 Web-Native**: Runs directly in modern browsers with zero backend dependencies. Deploy to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or itch.io.
- **✍️ Writer-Friendly**: Indentation-based Kawa Script designed for narrative designers and story writers.
- **🌸 Atmosphere**: `vfx sakura` / rain / snow / fog / tint, scene `with fade`, sprite `with bounce|dissolve|nod`.
- **🎨 Deep CSS Theming**: Customize dialogue boxes, choice overlays, buttons, fonts, and animations using standard CSS and CSS custom properties.
- **⏱️ Deterministic Rollback**: Step backwards through dialogue and choices with instant snapshot rollbacks (`vm.rollback()`).
- **💾 Save & Load**: Built-in persistence for game save slots using LocalStorage (schema v2 with history).
- **📦 Modular Architecture**: Decoupled compiler (`@kawaijs/parser`), headless state machine (`@kawaijs/runtime`), and presentation layer (`@kawaijs/renderer-dom`).

---

## 💻 CLI Usage

```bash
# Create a new visual novel project
kawa create <project-name>

# Dev server (live reload) — optional deep-link + port
kawa dev [path] [--port 3000] [--at label]

# Static production bundle
kawa build [path] [--out dist] [--at label]

# Validate syntax, jump labels, and asset links
kawa validate [path]

# Show version
kawa version
```

Browser URL flags: `?at=<label>` (deep-link), `?embed=1` (iframe mode), `?continue=<token>` (restore shared save).

### SEO, favicon & social

Configure in `game/kawa.config.json`:

```json
{
  "seo": {
    "favicon": "favicon.svg",
    "description": "Your game blurb",
    "keywords": ["visual novel", "web"],
    "canonicalUrl": "https://you.example/game/",
    "locale": "it_IT",
    "twitterSite": "@studio"
  },
  "share": {
    "defaultImage": "backgrounds/cover.png",
    "twitterCard": "summary_large_image"
  }
}
```

- Drop `game/favicon.svg` (or `.png` / `.ico`) — or set `seo.favicon`
- `kawa build` copies the favicon into `dist/`, sets `<link rel="icon">` / apple-touch, OG/Twitter/JSON-LD, and uses it as the PWA icon
- With `seo.canonicalUrl`, also writes `dist/robots.txt`

`kawa build` emits a PWA (`manifest.webmanifest`, `sw.js`, icon) by default.

### Embed kit

```bash
kawa embed --width 960 --height 540 --at start --src https://you.example/game/
```

Prints a responsive iframe snippet with `?embed=1` (and optional `?at=`).

---

## 📦 Modular Packages

Kawaijs is built as a clean modular toolkit:

| Package | Description |
| :--- | :--- |
| [`kawaijs`](https://www.npmjs.com/package/kawaijs) | All-in-one engine bundle & CLI |
| [`@kawaijs/ast`](https://www.npmjs.com/package/@kawaijs/ast) | Syntax AST & Story IR type definitions |
| [`@kawaijs/parser`](https://www.npmjs.com/package/@kawaijs/parser) | Indentation Lexer, Parser & Diagnostic error reporter |
| [`@kawaijs/runtime`](https://www.npmjs.com/package/@kawaijs/runtime) | Headless Story VM, rollback engine & persistence |
| [`@kawaijs/renderer-dom`](https://www.npmjs.com/package/@kawaijs/renderer-dom) | Semantic DOM renderer & CSS design system |
| [`@kawaijs/cli`](https://www.npmjs.com/package/@kawaijs/cli) | Dedicated CLI binary package |

---

## 📜 License

MIT License © 2026 [Biagio Scaglia](https://github.com/biagio-scaglia)
