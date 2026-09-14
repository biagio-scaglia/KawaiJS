import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, validateStory, formatDiagnostic, KawaError } from '@kawaijs/parser';
import type { StoryPackage } from '@kawaijs/ast';

function resolveAssetPath(assetsDir: string, raw: string, kind: 'background' | 'character' | 'audio'): string {
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('/') ||
    raw.startsWith('./')
  ) {
    return '';
  }

  if (kind === 'background') {
    const clean = raw.replace(/^bg[\s_]+/i, '').trim();
    return path.join(assetsDir, 'backgrounds', clean.includes('.') ? clean : `${clean}.svg`);
  }
  if (kind === 'character') {
    const clean = raw.replace(/_/g, path.sep).replace(/\s+/g, path.sep).trim();
    return path.join(assetsDir, 'characters', clean.includes('.') ? clean : `${clean}.svg`);
  }
  return path.join(assetsDir, 'audio', raw.includes('.') ? raw : `${raw}.mp3`);
}

function collectMissingAssets(story: StoryPackage, assetsDir: string): string[] {
  if (!fs.existsSync(assetsDir)) return [];

  const missing: string[] = [];
  const seen = new Set<string>();

  const check = (filePath: string, label: string): void => {
    if (!filePath || seen.has(filePath)) return;
    seen.add(filePath);
    if (!fs.existsSync(filePath)) {
      missing.push(label);
    }
  };

  for (const instructions of Object.values(story.labels)) {
    for (const inst of instructions) {
      if (inst.type === 'scene' && inst.background) {
        const fp = resolveAssetPath(assetsDir, inst.background, 'background');
        check(fp, `background "${inst.background}"`);
      } else if (inst.type === 'show') {
        const key = inst.expression ? `${inst.character}/${inst.expression}` : inst.character;
        const fp = resolveAssetPath(assetsDir, key, 'character');
        check(fp, `character "${key}"`);
      } else if (inst.type === 'play_audio' && inst.track) {
        const fp = resolveAssetPath(assetsDir, inst.track, 'audio');
        check(fp, `audio "${inst.track}"`);
      } else if (inst.type === 'cg' && inst.image) {
        const fp = resolveAssetPath(assetsDir, inst.image, 'background');
        check(fp, `cg "${inst.image}"`);
      }
    }
  }

  return missing;
}

export function validateProject(targetPath = '.'): boolean {
  const resolvedPath = path.resolve(targetPath);
  console.log(`\n🔍 Validating Kawaijs script at: ${resolvedPath}\n`);

  let scriptFile = resolvedPath;
  let projectRoot = resolvedPath;
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    const candidate = path.join(resolvedPath, 'game', 'script.kawa');
    if (fs.existsSync(candidate)) {
      scriptFile = candidate;
      projectRoot = resolvedPath;
    } else {
      const rootCandidate = path.join(resolvedPath, 'script.kawa');
      if (fs.existsSync(rootCandidate)) {
        scriptFile = rootCandidate;
        projectRoot = resolvedPath;
      }
    }
  } else {
    projectRoot = path.dirname(scriptFile);
    if (path.basename(projectRoot) === 'game') {
      projectRoot = path.dirname(projectRoot);
    }
  }

  if (!fs.existsSync(scriptFile)) {
    console.error(`❌ Error: No .kawa script file found at '${scriptFile}'`);
    return false;
  }

  try {
    const source = fs.readFileSync(scriptFile, 'utf-8');
    const story = compileScript(source, path.basename(scriptFile));
    const report = validateStory(story);

    let assetsDir = path.join(projectRoot, 'game', 'assets');
    if (!fs.existsSync(assetsDir)) {
      const alt = path.join(projectRoot, 'assets');
      if (fs.existsSync(alt)) assetsDir = alt;
    }

    const missingAssets = collectMissingAssets(story, assetsDir);
    if (missingAssets.length > 0) {
      console.log(`⚠️  Missing assets (${missingAssets.length}):`);
      for (const m of missingAssets.slice(0, 20)) {
        console.warn(`   - ${m}`);
      }
      if (missingAssets.length > 20) {
        console.warn(`   …and ${missingAssets.length - 20} more`);
      }
      console.log('');
    }

    if (report.warnings.length > 0) {
      console.log(`⚠️  Script Warnings (${report.warnings.length}):`);
      for (const w of report.warnings) {
        console.warn(formatDiagnostic(w, source));
        console.log('');
      }
    }

    if (!report.isValid) {
      console.error(`❌ Script Validation Failed (${report.errors.length} error${report.errors.length > 1 ? 's' : ''}):`);
      for (const e of report.errors) {
        console.error(formatDiagnostic(e, source));
        console.log('');
      }
      return false;
    }

    console.log(`✅ Script validation successful!`);
    console.log(`   - File: ${path.basename(scriptFile)}`);
    console.log(`   - Characters declared: ${report.characterCount}`);
    console.log(`   - Story labels: ${report.labelCount}`);
    console.log(`   - Instructions: ${report.instructionCount}`);
    console.log(`   - Start label: '${story.meta.startLabel ?? 'start'}'`);
    if (missingAssets.length === 0 && fs.existsSync(assetsDir)) {
      console.log(`   - Referenced assets: all present under ${path.relative(projectRoot, assetsDir) || 'assets'}`);
    }
    return true;
  } catch (err: unknown) {
    if (err instanceof KawaError) {
      const source = fs.existsSync(scriptFile) ? fs.readFileSync(scriptFile, 'utf-8') : undefined;
      console.error(formatDiagnostic(err.diagnostic, source));
    } else if (err instanceof Error) {
      console.error(`❌ Error: ${err.message}`);
    } else {
      console.error('❌ Unknown validation error:', err);
    }
    return false;
  }
}
