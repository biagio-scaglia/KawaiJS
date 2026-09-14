export * from '@kawaijs/ast';
export * from '@kawaijs/parser';
export * from '@kawaijs/runtime';
export * from '@kawaijs/renderer-dom';
export * from '@kawaijs/audio';
export * from '@kawaijs/vite-plugin';
export * from './config.js';
export * from './parse-args.js';

import * as fs from 'node:fs';
import { createProject } from './commands/create.js';
import { validateProject } from './commands/validate.js';
import { startDevServer } from './commands/dev.js';
import { buildProject } from './commands/build.js';
import { parseBuildCommandArgs, parseDevCommandArgs } from './parse-args.js';

export { createProject, validateProject, startDevServer, buildProject };

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
  validate [path]            Validate Kawa Script syntax, labels, and links
  help                       Show this help message
  version                    Show version information

URL flags (browser):
  ?at=<label>                Deep-link into a label (skips main menu)
  ?embed=1                   Compact embed / iframe mode

Keyboard Shortcuts in Game:
  Space / Enter     Advance dialogue
  Backspace         Rollback (step back)
  S                 Open Save Game menu
  L                 Open Load Game menu
  H                 Open Dialogue History
  Escape            Close active modal

Example:
  kawa create my-novel
  cd my-novel
  kawa dev --at start
`);
      break;
    }
  }
}
