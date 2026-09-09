<div align="center">

# 🌸 Kawaijs

**A modern, web-native visual novel engine and toolchain inspired by Ren'Py.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/kawaijs.svg)](https://www.npmjs.com/package/kawaijs)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 📖 Introduction

**Kawaijs** is a developer-friendly, web-native visual novel engine. It bridges the gap between the clean, human-friendly authoring experience of Ren'Py and the modern Web platform.

Write your story in **Kawa Script** (`.kawa`), style the entire interface with standard **CSS**, and deploy anywhere as a pure static web application.

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

## ✨ Features

- **Web-Native**: Runs natively in any browser with zero backend dependencies. Deploy to GitHub Pages, Netlify, Vercel, or itch.io.
- **Human-Friendly Scripting**: Indentation-based Kawa Script designed specifically for writers and narrative designers.
- **Deep CSS Customization**: Dialogue boxes, choice buttons, fonts, and transitions are styled with standard CSS and CSS custom properties.
- **Deterministic State Machine**: Headless runtime architecture with built-in instant **rollback** and **save/load** snapshots.
- **Rich Developer Tooling**: CLI for project scaffolding, script validation, and instant hot-module reload.
- **TypeScript First**: Strict type definitions for AST nodes, intermediate representations, and runtime state.

---

## 🚀 Quick Start

### 1. Create a Project

```bash
# Using the Kawaijs CLI
npx kawaijs create my-novel

cd my-novel
```

### 2. Validate Your Script

```bash
npx kawaijs validate
```

---

## 🏗️ Architecture

Kawaijs is organized as a modular monorepo:

- **`@kawaijs/ast`**: Abstract Syntax Tree and Story Intermediate Representation (IR) specifications.
- **`@kawaijs/parser`**: Indentation-aware lexer, recursive-descent parser, compiler, and diagnostic error reporter.
- **`@kawaijs/runtime`**: Headless story virtual machine, state machine, history manager, and persistence engine.
- **`@kawaijs/renderer-dom`**: Semantic HTML5/CSS3 renderer with responsive letterboxed stage, typewriter dialogue, and choice overlays.
- **`kawaijs` (CLI)**: Command-line toolchain for creating, validating, and building visual novels.

---

## 📜 License

MIT License © 2026 [Biagio Scaglia](https://github.com/biagio-scaglia)
