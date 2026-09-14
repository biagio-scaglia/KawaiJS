# @kawaijs/runtime

**Headless Story VM, State Machine, Snapshot Rollback, and Persistence Engine for Kawaijs.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/runtime
```

## Quick Example

```typescript
import { compileScript } from '@kawaijs/parser';
import { StoryVM } from '@kawaijs/runtime';

const story = compileScript(`
label start:
    "Welcome to the story!"
    "Step 2"
`);

const vm = new StoryVM(story);
vm.onStateChange((state) => {
  console.log('Dialogue:', state.dialogue?.text);
});

vm.start();
vm.next(); // Advances to Step 2
vm.rollback(); // Rolls back to Welcome
```

## Features
- **Deterministic Virtual Machine**: Headless execution loop (dialogue, choices, audio, VFX state, camera events).
- **Time-Travel Rollback**: Deep state snapshots for backwards navigation (dialogue history trims with rollback).
- **Save & Load**: Pluggable storage adapters (LocalStorage, Memory). Schema **v2** persists dialogue history and migrates older slots via `migrateSaveSlot` / `migrateSaveV1ToV2`.
- **Dialogue History**: Built-in backlog with `trimTo` / `replaceAll` for rollback and load restore.
- **VFX state**: `sakura` / `rain` / `snow` / `fog` / `tint` — tint overlays keep the active weather effect.

## Save schema

Current version: **2** (`CURRENT_SAVE_SCHEMA_VERSION`).

| Version | Notes |
|--------|--------|
| 1 | Snapshot + storyHash; history not persisted |
| 2 | Adds `historyEntries`; snapshot may include `historyLength` for rollback |

Loads always run through `migrateSaveSlot`, which normalizes missing fields and upgrades v1 → v2.

## License
MIT © Biagio Scaglia
