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
    show yumia happy at center

    yumia "Good morning! Are you ready for the festival?"

    menu:
        "Yes, absolutely!":
            jump ready

        "Not yet...":
            jump not_ready

label ready:
    show yumia excited
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

### 2. Validate Your Script

```bash
npx kawaijs validate
```

---

## ✨ Features

- **🌐 Web-Native**: Runs directly in modern browsers with zero backend dependencies. Deploy to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or itch.io.
- **✍️ Writer-Friendly**: Indentation-based Kawa Script designed for narrative designers and story writers.
- **🎨 Deep CSS Theming**: Customize dialogue boxes, choice overlays, buttons, fonts, and animations using standard CSS and CSS custom properties.
- **⏱️ Deterministic Rollback**: Step backwards through dialogue and choices with instant snapshot rollbacks (`vm.rollback()`).
- **💾 Save & Load**: Built-in persistence for game save slots using LocalStorage / IndexedDB.
- **📦 Modular Architecture**: Decoupled compiler (`@kawaijs/parser`), headless state machine (`@kawaijs/runtime`), and presentation layer (`@kawaijs/renderer-dom`).

---

## 💻 CLI Usage

```bash
# Create a new visual novel project
kawa create <project-name>

# Validate syntax, jump labels, and asset links
kawa validate [path]

# Show version
kawa version
```

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
