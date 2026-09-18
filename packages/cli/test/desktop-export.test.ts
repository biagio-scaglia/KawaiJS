import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createProject } from '../src/commands/create.js';
import { extractI18nCatalog } from '../src/i18n.js';
import { exportDesktopProject } from '../src/commands/export.js';

describe('Desktop Export & i18n Extraction', () => {
  it('extracts i18n translation catalog into json', () => {
    const tmpDir = path.join(os.tmpdir(), `kawa_i18n_test_${Date.now()}`);
    createProject(tmpDir);

    const result = extractI18nCatalog(tmpDir, { lang: 'it' });
    expect(result.lang).toBe('it');
    expect(fs.existsSync(result.catalogPath)).toBe(true);
    expect(result.count).toBeGreaterThan(0);

    const catalog = JSON.parse(fs.readFileSync(result.catalogPath, 'utf-8'));
    expect(Object.keys(catalog).length).toBe(result.count);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports project as Tauri desktop scaffolding', () => {
    const tmpDir = path.join(os.tmpdir(), `kawa_tauri_test_${Date.now()}`);
    createProject(tmpDir);

    const ok = exportDesktopProject(tmpDir, { target: 'tauri' });
    expect(ok).toBe(true);

    const exportDir = path.join(tmpDir, 'desktop-tauri');
    expect(fs.existsSync(path.join(exportDir, 'src-tauri', 'Cargo.toml'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'src-tauri', 'tauri.conf.json'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'src-tauri', 'src', 'main.rs'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'dist', 'index.html'))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports project as Electron desktop scaffolding', () => {
    const tmpDir = path.join(os.tmpdir(), `kawa_electron_test_${Date.now()}`);
    createProject(tmpDir);

    const ok = exportDesktopProject(tmpDir, { target: 'electron' });
    expect(ok).toBe(true);

    const exportDir = path.join(tmpDir, 'desktop-electron');
    expect(fs.existsSync(path.join(exportDir, 'main.js'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'preload.js'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'dist', 'index.html'))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
