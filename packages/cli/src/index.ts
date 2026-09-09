export * from '@kawaijs/ast';
export * from '@kawaijs/parser';
export * from '@kawaijs/runtime';
export * from '@kawaijs/renderer-dom';
export * from '@kawaijs/audio';
export * from '@kawaijs/vite-plugin';

import { createProject } from './commands/create.js';
import { validateProject } from './commands/validate.js';
import { startDevServer } from './commands/dev.js';
import { buildProject } from './commands/build.js';

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
      const targetPath = args[1] ?? '.';
      startDevServer(targetPath);
      break;
    }

    case 'build': {
      const targetPath = args[1] ?? '.';
      const ok = buildProject(targetPath);
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
      console.log('Kawaijs v0.1.2');
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
  create <name>     Scaffold a new visual novel project
  dev [path]        Start the local development server (with live reload)
  build [path]      Build a static production web bundle (dist/)
  validate [path]   Validate Kawa Script syntax, labels, and links
  help              Show this help message
  version           Show version information

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
  kawa dev
`);
      break;
    }
  }
}
