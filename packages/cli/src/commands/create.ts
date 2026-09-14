import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function resolveStarterGameDir(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../../../../templates/starter/game'),
    path.resolve(here, '../../../templates/starter/game'),
    path.resolve(process.cwd(), 'templates/starter/game')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function createProject(projectName: string): boolean {
  const targetDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory '${projectName}' already exists.`);
    return false;
  }

  console.log(`\n✨ Creating a new Kawaijs visual novel in: ${targetDir}\n`);

  fs.mkdirSync(targetDir, { recursive: true });

  const starterGame = resolveStarterGameDir();
  if (starterGame) {
    // Full showcase template: script with sakura/transitions, assets, style
    copyDirRecursive(starterGame, path.join(targetDir, 'game'));
  } else {
    fs.mkdirSync(path.join(targetDir, 'game', 'assets', 'backgrounds'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'game', 'assets', 'characters'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'game', 'assets', 'audio'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'game', 'script.kawa'),
      `# Kawaijs Visual Novel Script
character yumia "Yumia" #f43f5e

label start:
    scene bg classroom with fade
    vfx sakura
    show yumia happy at center with bounce
    yumia "Hello! Welcome to Kawaijs."
    return
`,
      'utf-8'
    );
    fs.writeFileSync(
      path.join(targetDir, 'game', 'style.css'),
      `:root {\n  --kawa-primary-accent: #f43f5e;\n}\n`,
      'utf-8'
    );
  }

  // Project-specific config (always write so title matches folder name)
  const starterConfig = {
    title: projectName,
    author: 'Visual Novel Creator',
    version: '0.1.0',
    theme: {
      primaryColor: '#f43f5e',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    window: {
      width: 1280,
      height: 720,
      aspectRatio: '16/9'
    },
    settings: {
      textSpeed: 25,
      autoDelay: 2000,
      musicVolume: 0.8,
      soundVolume: 1.0,
      voiceVolume: 1.0
    },
    gallery: [
      {
        id: 'sunset_promise',
        title: 'Sunset Promise',
        image: 'cg_sunset_promise.svg',
        description: 'Unlocked on the technical or creative route.'
      },
      {
        id: 'celebration',
        title: 'Celebration',
        image: 'cg_celebration.svg',
        description: 'Unlocked on the master ending.'
      }
    ],
    share: {
      siteName: projectName,
      description: `Play ${projectName} — a Kawaijs visual novel in your browser.`,
      defaultImage: 'backgrounds/classroom.svg',
      twitterCard: 'summary_large_image'
    }
  };
  fs.writeFileSync(
    path.join(targetDir, 'game', 'kawa.config.json'),
    JSON.stringify(starterConfig, null, 2),
    'utf-8'
  );

  const starterPkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'kawa dev',
      build: 'kawa build',
      validate: 'kawa validate'
    },
    dependencies: {
      kawaijs: '^0.1.11'
    }
  };
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(starterPkg, null, 2), 'utf-8');

  const starterReadme = `# ${projectName}

A visual novel created with **Kawaijs**.

The starter script is a short showcase of:

- \`scene ... with fade\` background transitions
- \`vfx sakura\` / \`fog\` / \`tint\` atmosphere
- Sprite enters: \`with bounce\`, \`dissolve\`, \`nod\`
- Audio, camera flash/shake, CG unlocks, and branching endings

## Getting Started

\`\`\`bash
npx kawa validate
npx kawa dev
npx kawa build
\`\`\`

Edit \`game/script.kawa\` and refresh — the live server reloads on script/style changes.
`;
  fs.writeFileSync(path.join(targetDir, 'README.md'), starterReadme, 'utf-8');

  console.log(`✅ Successfully initialized ${projectName}!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  npx kawa validate`);
  console.log(`  npx kawa dev\n`);

  return true;
}
