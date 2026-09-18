# @kawaijs/audio

**Web Audio API sound, background music crossfading, and voice playback controller for Kawaijs visual novels.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/audio
```

## Features
- **BGM Channel**: Smooth fade-in/fade-out crossfading and looping. Music requested before a user gesture is **queued** until unlock (no orphaned `Audio` elements).
- **SFX Sound Pool**: Concurrent sound effect playback with a bounded pool; volume changes apply to active SFX.
- **Voice Lines**: Dialogue voice line triggers with auto-stop on new dialogue; ducking respects the current music volume slider.
- **StoryVM Integration**: `audioManager.attachToVM(vm)` binds script `play` / `stop` commands. **Idempotent** — re-attaching (or pairing with `DOMRenderer`, which also uses `attachToVM`) replaces the previous subscription instead of stacking listeners.

```typescript
import { AudioManager } from '@kawaijs/audio';
import { StoryVM } from '@kawaijs/runtime';

const audio = new AudioManager();
const detach = audio.attachToVM(vm, (track) => `assets/audio/${track}`);
// … later
detach();
audio.destroy();
```

## License
MIT © Biagio Scaglia
