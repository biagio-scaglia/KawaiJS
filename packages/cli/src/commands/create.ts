import * as fs from 'node:fs';
import * as path from 'node:path';

export function createProject(projectName: string): boolean {
  const targetDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory '${projectName}' already exists.`);
    return false;
  }

  console.log(`\n✨ Creating a new Kawaijs visual novel in: ${targetDir}\n`);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'game', 'assets', 'backgrounds'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'game', 'assets', 'characters'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'game', 'assets', 'audio'), { recursive: true });

  // 1. game/script.kawa
  const starterScript = `# Kawaijs Visual Novel Script
character yumia "Yumia" #f43f5e

label start:
    scene bg classroom
    show yumia happy at center

    yumia "Hello! Welcome to Kawaijs."
    yumia "This is a web-native visual novel engine inspired by Ren'Py."

    menu:
        "Tell me more!":
            jump tell_more

        "Let's make a game!":
            jump make_game

label tell_more:
    show yumia excited at center
    yumia "Kawaijs scripts compile to pure static web apps that run anywhere!"
    yumia "You can customize every pixel using standard CSS."
    jump conclusion

label make_game:
    yumia "Awesome! Open game/script.kawa and start writing your story."
    jump conclusion

label conclusion:
    "Thank you for trying Kawaijs!"
    return
`;
  fs.writeFileSync(path.join(targetDir, 'game', 'script.kawa'), starterScript, 'utf-8');

  // 2. game/style.css
  const starterStyle = `/* Custom Visual Novel Styles */
:root {
  --kawa-primary-accent: #f43f5e;
  --kawa-dialogue-bg: rgba(15, 23, 42, 0.88);
  --kawa-dialogue-border: rgba(244, 63, 94, 0.4);
}
`;
  fs.writeFileSync(path.join(targetDir, 'game', 'style.css'), starterStyle, 'utf-8');

  // 3. package.json
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
      kawaijs: '^0.1.0'
    }
  };
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(starterPkg, null, 2), 'utf-8');

  // 4. README.md
  const starterReadme = `# ${projectName}

A visual novel created with **Kawaijs**.

## Getting Started

1. Validate script:
   \`\`\`bash
   npx kawa validate
   \`\`\`

2. Run development server:
   \`\`\`bash
   npx kawa dev
   \`\`\`

3. Build static web game:
   \`\`\`bash
   npx kawa build
   \`\`\`
`;
  fs.writeFileSync(path.join(targetDir, 'README.md'), starterReadme, 'utf-8');

  console.log(`✅ Successfully initialized ${projectName}!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  npx kawa validate`);
  console.log(`  npx kawa dev\n`);

  return true;
}
