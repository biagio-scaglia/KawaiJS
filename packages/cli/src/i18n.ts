import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AchievementDefinition, StoryPackage } from '@kawaijs/ast';
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
