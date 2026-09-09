export * from '@kawaijs/ast';
export * from '@kawaijs/parser';
export * from '@kawaijs/runtime';
export * from '@kawaijs/renderer-dom';

import { createProject } from './commands/create.js';
import { validateProject } from './commands/validate.js';

export { createProject, validateProject };

export function runCLI(args: string[]): void {
  const command = args[0];

  switch (command) {
    case 'create': {
      const projectName = args[1] ?? 'my-novel';
      createProject(projectName);
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
      console.log('Kawaijs v0.1.0');
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
  validate [path]   Validate Kawa Script syntax, labels, and links
  dev               Start the local development server (with HMR)
  build             Build a static production web bundle
  help              Show this help message
  version           Show version information

Example:
  kawa create my-novel
  cd my-novel
  kawa validate
`);
      break;
    }
  }
}
