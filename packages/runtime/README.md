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
- **Deterministic Virtual Machine**: Headless execution loop.
- **Time-Travel Rollback**: Deep state snapshots for backwards navigation.
- **Save & Load**: Pluggable storage adapters (LocalStorage, Memory).
- **Dialogue History**: Built-in history logging for spoken lines.

## License
MIT © Biagio Scaglia
