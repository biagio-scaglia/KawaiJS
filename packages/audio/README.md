# @kawaijs/audio

**Web Audio API sound, background music crossfading, and voice playback controller for Kawaijs visual novels.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install @kawaijs/audio
```

## Features
- **BGM Channel**: Smooth fade-in/fade-out crossfading and looping.
- **SFX Sound Pool**: Concurrent sound effect playback without clipping.
- **Voice Lines**: Dialogue voice line triggers with auto-stop on new dialogue.
- **StoryVM Integration**: `audioManager.attachToVM(vm)` automatically binds script `play music`, `play sound`, and `stop music` commands.

## License
MIT © Biagio Scaglia
