import { describe, it, expect } from 'vitest';
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
});
