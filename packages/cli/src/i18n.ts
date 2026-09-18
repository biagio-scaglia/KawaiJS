import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AchievementDefinition, StoryPackage } from '@kawaijs/ast';
import { compileScript } from '@kawaijs/parser';
import { loadProjectConfig } from './config.js';

export type I18nTables = Record<string, Record<string, string>>;

/** Load `game/lang/<code>.json` string tables. */
export function loadLangTables(projectDir: string): I18nTables {
  const rootDir = path.resolve(process.cwd(), projectDir);
  const candidates = [
    path.join(rootDir, 'game', 'lang'),
    path.join(rootDir, 'lang')
  ];

  const tables: I18nTables = {};
  for (const dir of candidates) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith('.json')) continue;
      const code = entry.replace(/\.json$/i, '').toLowerCase();
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, entry), 'utf-8')) as Record<
          string,
          unknown
        >;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (typeof v === 'string') flat[k] = v;
        }
        tables[code] = flat;
      } catch {
        // skip invalid
      }
    }
  }
  return tables;
}

export function loadAchievementCatalog(projectDir: string): AchievementDefinition[] {
  const config = loadProjectConfig(projectDir);
  return [...(config.achievements ?? [])];
}

/** Attach i18n + achievement catalog onto a compiled story package. */
export function enrichStoryPackage(
  story: StoryPackage,
  projectDir: string
): StoryPackage {
  const i18n = loadLangTables(projectDir);
  const achievements = loadAchievementCatalog(projectDir);
  return {
    ...story,
    i18n: Object.keys(i18n).length > 0 ? i18n : story.i18n,
    achievements: achievements.length > 0 ? achievements : story.achievements
  };
}

export interface ExtractI18nOptions {
  lang?: string;
  outDir?: string;
}

/**
 * Extracts translatable strings from story scripts into a localization JSON catalog.
 */
export function extractI18nCatalog(
  projectDir: string,
  options: ExtractI18nOptions = {}
): { lang: string; catalogPath: string; count: number } {
  const rootDir = path.resolve(process.cwd(), projectDir);
  const langCode = (options.lang ?? 'en').toLowerCase();

  let scriptPath = path.join(rootDir, 'game', 'script.kawa');
  if (!fs.existsSync(scriptPath)) {
    const candidate = path.join(rootDir, 'script.kawa');
    if (fs.existsSync(candidate)) {
      scriptPath = candidate;
    }
  }

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Cannot find Kawa script at '${scriptPath}'`);
  }

  const source = fs.readFileSync(scriptPath, 'utf-8');
  const fileResolver = (target: string, from: string) => {
    const base = from && from !== '<anonymous>' ? path.dirname(path.resolve(rootDir, from)) : path.dirname(scriptPath);
    const resolved = path.resolve(base, target);
    if (fs.existsSync(resolved)) return fs.readFileSync(resolved, 'utf-8');
    const alt = path.resolve(rootDir, 'game', target);
    if (fs.existsSync(alt)) return fs.readFileSync(alt, 'utf-8');
    throw new Error(`Cannot find include file ${target}`);
  };

  const story: StoryPackage = compileScript(source, scriptPath, { fileResolver });

  const catalog: Record<string, string> = {};

  // 1. Character names
  for (const [id, char] of Object.entries(story.characters)) {
    if (char.name) {
      catalog[`char.${id}`] = char.name;
    }
  }

  // 2. Labels and instructions
  for (const [labelName, instructions] of Object.entries(story.labels)) {
    let dIdx = 0;
    for (const inst of instructions) {
      if (inst.type === 'dialogue') {
        dIdx++;
        // Check for explicit {t:key} in dialogue
        const tMatch = inst.text.match(/\{t:([a-zA-Z0-9_.-]+)(?:\|([^}]*))?\}/);
        if (tMatch) {
          const key = tMatch[1]!;
          const fallback = tMatch[2] ?? key;
          catalog[key] = fallback;
        } else {
          const autoKey = `${labelName}.line_${dIdx}`;
          catalog[autoKey] = inst.text;
        }
      } else if (inst.type === 'choice') {
        if (inst.prompt) {
          catalog[`${labelName}.choice_prompt`] = inst.prompt;
        }
        inst.choices.forEach((c, cIdx) => {
          catalog[`${labelName}.choice_${cIdx + 1}`] = c.text;
        });
      } else if (inst.type === 'input') {
        if (inst.prompt) {
          catalog[`${labelName}.input_${inst.variable}`] = inst.prompt;
        }
      }
    }
  }

  // 3. Target directory and file
  const outDir = options.outDir
    ? path.resolve(rootDir, options.outDir)
    : fs.existsSync(path.join(rootDir, 'game'))
      ? path.join(rootDir, 'game', 'lang')
      : path.join(rootDir, 'lang');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const catalogPath = path.join(outDir, `${langCode}.json`);
  let existing: Record<string, string> = {};
  if (fs.existsSync(catalogPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch {}
  }

  const merged = { ...catalog, ...existing };
  fs.writeFileSync(catalogPath, JSON.stringify(merged, null, 2), 'utf-8');

  return {
    lang: langCode,
    catalogPath,
    count: Object.keys(merged).length
  };
}

