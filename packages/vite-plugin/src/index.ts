import { compileScript } from '@kawaijs/parser';

export interface KawaijsPluginOptions {
  include?: string | RegExp | (string | RegExp)[];
}

export function kawaijsPlugin(_options: KawaijsPluginOptions = {}) {
  return {
    name: 'vite-plugin-kawaijs',
    transform(code: string, id: string) {
      if (!id.endsWith('.kawa')) {
        return null;
      }

      try {
        const storyPackage = compileScript(code, id);
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

