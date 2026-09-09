import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { validateProject } from '../src/commands/validate.js';
import { buildProject } from '../src/commands/build.js';
import { createProject } from '../src/commands/create.js';

describe('Kawaijs CLI Commands', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('validates a valid Kawaijs project directory', () => {
    const exampleDir = path.resolve(__dirname, '../../../examples/hello-world');
    const isValid = validateProject(exampleDir);
    expect(isValid).toBe(true);
  });

  it('returns false when validating a non-existent directory', () => {
    const fakeDir = path.join(os.tmpdir(), 'non_existent_kawa_dir_' + Date.now());
    const isValid = validateProject(fakeDir);
    expect(isValid).toBe(false);
  });

  it('builds a static production web bundle', () => {
    const exampleDir = path.resolve(__dirname, '../../../examples/hello-world');
    const outDir = path.join(os.tmpdir(), 'kawa_build_test_' + Date.now());
    tempDirs.push(outDir);

    const success = buildProject(exampleDir, { outDir });
    expect(success).toBe(true);

    expect(fs.existsSync(path.join(outDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'style.css'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'assets'))).toBe(true);

    const htmlContent = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
    expect(htmlContent).toContain('<div id="app"></div>');
    expect(htmlContent).toContain('story =');
  });

  it('scaffolds a new project with createProject', () => {
    const testProjectName = path.join(os.tmpdir(), 'new_kawa_project_' + Date.now());
    tempDirs.push(testProjectName);

    const created = createProject(testProjectName);
    expect(created).toBe(true);

    expect(fs.existsSync(path.join(testProjectName, 'game', 'script.kawa'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'game', 'style.css'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'game', 'assets', 'backgrounds'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'package.json'))).toBe(true);

    const validated = validateProject(testProjectName);
    expect(validated).toBe(true);
  });
});
