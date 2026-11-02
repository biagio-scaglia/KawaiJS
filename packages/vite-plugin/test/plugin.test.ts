import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { kawaijsPlugin } from '../src/index.js';

describe('Vite Plugin Kawaijs', () => {
  it('transforms .kawa code into an ES module with exported story package', () => {
    const plugin = kawaijsPlugin();
    const sourceCode = `
character yumia "Yumia"

label start:
    scene bg classroom
    yumia "Hello from Vite Plugin!"
`;
    const result = (plugin as any).transform.call({ error: (msg: string) => { throw new Error(msg); } }, sourceCode, 'main.kawa');

    expect(result).toBeDefined();
    expect(result?.code).toContain('export const story =');
    expect(result?.code).toContain('export default story;');
    expect(result?.code).toContain('Hello from Vite Plugin!');
  });

  it('ignores non .kawa files', () => {
    const plugin = kawaijsPlugin();
    const result = (plugin as any).transform('const a = 1;', 'main.ts');
    expect(result).toBeNull();
  });

  it('handles query parameters like ?import', () => {
    const plugin = kawaijsPlugin();
    const sourceCode = `label start:\n    "Hello with query"\n`;
    const result = (plugin as any).transform(sourceCode, 'main.kawa?import');
    expect(result).toBeDefined();
    expect(result?.code).toContain('Hello with query');
  });

  it('rejects default-resolver include paths outside the script directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kawa-vite-jail-'));
    const scriptPath = path.join(tmp, 'main.kawa');
    const secretPath = path.join(tmp, '..', `secret_${Date.now()}.txt`);
    fs.writeFileSync(scriptPath, 'include "../secret.txt"\nlabel start:\n    "x"\n', 'utf-8');
    fs.writeFileSync(secretPath, 'label leaked:\n    "nope"\n', 'utf-8');

    const plugin = kawaijsPlugin();
    expect(() => {
      (plugin as any).transform(fs.readFileSync(scriptPath, 'utf-8'), scriptPath);
    }).toThrow(/Cannot resolve include|Failed to compile/);

    fs.rmSync(tmp, { recursive: true, force: true });
    try {
      fs.unlinkSync(secretPath);
    } catch {
      /* ignore */
    }
  });

  it('supports include filter and fileResolver option', () => {
    const plugin = kawaijsPlugin({
      include: /game\/.*\.kawa/,
      fileResolver: (target) => {
        if (target === 'extra.kawa') {
          return 'label extra:\n    "Extra content"\n';
        }
        return null;
      }
    });

    // Should ignore files not matching include filter
    const ignored = (plugin as any).transform('label start:\n    "ignored"', 'other/file.kawa');
    expect(ignored).toBeNull();

    // Should compile matching files and resolve include
    const matching = (plugin as any).transform(
      'include "extra.kawa"\nlabel start:\n    call extra\n',
      'game/main.kawa'
    );
    expect(matching).toBeDefined();
    expect(matching?.code).toContain('Extra content');
  });
});
