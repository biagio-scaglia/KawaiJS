export * from '@kawaijs/ast';
export * from '@kawaijs/parser';
export * from '@kawaijs/runtime';
export * from '@kawaijs/renderer-dom';
export * from '@kawaijs/audio';
export * from '@kawaijs/vite-plugin';
export * from './config.js';
export * from './parse-args.js';
export * from './pwa.js';
export * from './seo.js';
export * from './i18n.js';

import * as fs from 'node:fs';
import { createProject } from './commands/create.js';
import { validateProject } from './commands/validate.js';
import { startDevServer } from './commands/dev.js';
import { buildProject } from './commands/build.js';
import { buildEmbedSnippet, parseEmbedCommandArgs } from './commands/embed.js';
import { parseBuildCommandArgs, parseDevCommandArgs } from './parse-args.js';

export { createProject, validateProject, startDevServer, buildProject, buildEmbedSnippet };

export function runCLI(args: string[]): void {
  const command = args[0];

  switch (command) {
    case 'create': {
      const projectName = args[1] ?? 'my-novel';
      createProject(projectName);
      break;
    }

    case 'dev': {
      const parsed = parseDevCommandArgs(args);
      startDevServer(parsed.projectDir, {
        port: parsed.port,
        startLabel: parsed.startLabel
      });
      break;
    }

    case 'build': {
      const parsed = parseBuildCommandArgs(args);
      const ok = buildProject(parsed.projectDir, {
        outDir: parsed.outDir,
        startLabel: parsed.startLabel
      });
      if (!ok) {
        process.exitCode = 1;
      }
      break;
    }

    case 'embed': {
      const parsed = parseEmbedCommandArgs(args);
      const snippet = buildEmbedSnippet(parsed.projectDir, {
        width: parsed.width,
        height: parsed.height,
        startLabel: parsed.startLabel,
        src: parsed.src
      });
      console.log(snippet);
      break;
    }

    case 'validate': {
      const targetPath = args[1] ?? '.';
      const ok = validateProject(targetPath);
      if (!ok) {
        process.exitCode = 1;
      }
      break;
    }

    case 'version':
    case '-v':
    case '--version': {
      try {
        const pkgUrl = new URL('../package.json', import.meta.url);
        const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf-8'));
        console.log(`Kawaijs v${pkg.version}`);
      } catch {
        console.log('Kawaijs v0.1.11');
      }
      break;
    }

    case 'help':
    case '-h':
    case '--help':
    default: {
      console.log(`
🌸 Kawaijs — Web-Native Visual Novel Engine & Toolchain

Usage:
  kawa <command> [arguments]
  kawaijs <command> [arguments]

Commands:
  create <name>              Scaffold a new visual novel project
  dev [path] [--port N] [--at label]
                             Start the local development server (live reload)
  build [path] [--out dir] [--at label]
                             Build a static production web bundle (dist/)
  embed [path] [--width N] [--height N] [--at label] [--src url]
                             Print an iframe embed snippet (?embed=1)
  validate [path]            Validate Kawa Script syntax, labels, and links
  help                       Show this help message
  version                    Show version information

URL flags (browser):
  ?at=<label>                Deep-link into a label (skips main menu)
  ?embed=1                   Compact embed / iframe mode
  ?continue=<token>          Restore a shared continue-link save
  ?lang=<code>               Force string-table language (e.g. it)

Example:
  kawa create my-novel
  cd my-novel
  kawa dev --at start
  kawa embed --width 960 --height 540 --src https://you.example/game/
`);
      break;
    }
  }
}
