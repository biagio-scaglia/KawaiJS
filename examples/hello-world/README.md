# Hello World — Kawaijs Showcase

Living demo of the `.kawa` language: **fade** scenes, **sakura** petals, sprite transitions, audio, camera, CG, and three endings.

## Run

From the monorepo root:

```bash
npm run dev
# → kawa dev ./examples/hello-world
```

Or:

```bash
npx kawa dev ./examples/hello-world
npx kawa validate ./examples/hello-world
```

## What to look for in `game/script.kawa`

| Lines / route | Feature |
| :--- | :--- |
| Opening classroom | `scene bg classroom with fade` + `vfx sakura` |
| Character entrances | `show ... with bounce` / `dissolve` / `nod` |
| Technical route | `vfx fog`, rooftop, fullscreen `cg` |
| Creative route | `vfx sakura` then `vfx tint` (petals **keep** falling under tint) |
| Endings | Branching by `dev_score` / `creative_score` |

## Assets

Backgrounds, character expressions, and BGM/SFX live under `game/assets/`.
