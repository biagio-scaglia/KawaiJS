import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playgroundDir = path.join(root, 'playground');
const outDir = path.join(playgroundDir, 'dist');
const entry = path.join(playgroundDir, 'src', 'main.ts');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function rimraf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

rimraf(outDir);
fs.mkdirSync(outDir, { recursive: true });

console.log('Bundling playground…');
esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  outfile: path.join(outDir, 'playground.js'),
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  logLevel: 'info'
});

copyFile(path.join(playgroundDir, 'index.html'), path.join(outDir, 'index.html'));
copyFile(path.join(playgroundDir, 'playground.css'), path.join(outDir, 'playground.css'));

const assetSrc = path.join(root, 'templates', 'starter', 'game', 'assets');
copyFile(
  path.join(assetSrc, 'backgrounds', 'classroom.svg'),
  path.join(outDir, 'assets', 'backgrounds', 'classroom.svg')
);
copyFile(
  path.join(assetSrc, 'characters', 'yumia', 'happy.svg'),
  path.join(outDir, 'assets', 'characters', 'yumia', 'happy.svg')
);

// Theme CSS so preview matches the engine look
const themeCandidates = [
  path.join(root, 'packages', 'renderer-dom', 'src', 'theme.css'),
  path.join(root, 'packages', 'renderer-dom', 'dist', 'theme.css')
];
for (const theme of themeCandidates) {
  if (fs.existsSync(theme)) {
    const css = fs.readFileSync(theme, 'utf8');
    const existing = fs.readFileSync(path.join(outDir, 'playground.css'), 'utf8');
    fs.writeFileSync(path.join(outDir, 'playground.css'), `${css}\n\n${existing}`, 'utf8');
    break;
  }
}

console.log(`✅ Playground built → ${outDir}`);
