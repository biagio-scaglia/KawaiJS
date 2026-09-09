# @kawaijs/vite-plugin

**Official Vite plugin for Kawaijs visual novel projects.**

Part of the [Kawaijs](https://github.com/biagio-scaglia/KawaiJS) visual novel engine.

## Installation

```bash
npm install -D @kawaijs/vite-plugin
```

## Usage

In your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import kawaijsPlugin from '@kawaijs/vite-plugin';

export default defineConfig({
  plugins: [kawaijsPlugin()]
});
```

Now you can import `.kawa` scripts directly in TypeScript/JavaScript with instant HMR:

```typescript
import story from './game/script.kawa';
import { mountKawaApp } from '@kawaijs/renderer-dom';

mountKawaApp(story, document.getElementById('app')!);
```

## License
MIT © Biagio Scaglia
