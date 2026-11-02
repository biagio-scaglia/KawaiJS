import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript } from '@kawaijs/parser';

export interface KawaijsPluginOptions {
  include?: string | RegExp | (string | RegExp)[];
  fileResolver?: (target: string, from: string) => string | null;
}

function matchesFilter(id: string, filter: string | RegExp | (string | RegExp)[]): boolean {
  if (Array.isArray(filter)) {
    return filter.some((f) => matchesFilter(id, f));
  }
  if (typeof filter === 'string') {
    return id.includes(filter);
  }
  if (filter instanceof RegExp) {
    return filter.test(id);
  }
  return true;
}

export function kawaijsPlugin(options: KawaijsPluginOptions = {}) {
  const defaultResolver = (target: string, from: string): string | null => {
    const rootDir = from && path.isAbsolute(from) ? path.dirname(from) : process.cwd();
    const resolvedRoot = path.resolve(rootDir);
    const isInsideRoot = (filePath: string): boolean => {
      const relative = path.relative(resolvedRoot, filePath);
      return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    };
    const candidate = path.resolve(resolvedRoot, target);
    if (isInsideRoot(candidate) && fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf-8');
    }
    return null;
  };

  const fileResolver = options.fileResolver ?? defaultResolver;

  return {
    name: 'vite-plugin-kawaijs',
    transform(code: string, id: string) {
      const cleanId = id.split('?')[0]!.split('#')[0]!;
      if (!cleanId.endsWith('.kawa')) {
        return null;
      }

      if (options.include && !matchesFilter(cleanId, options.include) && !matchesFilter(id, options.include)) {
        return null;
      }

      try {
        const storyPackage = compileScript(code, cleanId, { fileResolver });
        const jsonStr = JSON.stringify(storyPackage);

        return {
          code: `
export const story = ${jsonStr};
export default story;

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      window.location.reload();
    }
  });
}
`,
          map: { mappings: '' }
        };
      } catch (err: unknown) {
        const error = err as Error;
        throw new Error(`[vite-plugin-kawaijs] Failed to compile ${id}: ${error.message}`);
      }
    }
  };
}

export default kawaijsPlugin;

