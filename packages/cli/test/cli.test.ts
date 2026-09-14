import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { validateProject } from '../src/commands/validate.js';
import { buildProject } from '../src/commands/build.js';
import { createProject } from '../src/commands/create.js';
import { loadProjectConfig } from '../src/config.js';
import {
  parseBuildCommandArgs,
  parseDevCommandArgs,
  renderStaticShareMetaTags
} from '../src/parse-args.js';
import { renderSeoHeadTags, resolveFavicon } from '../src/seo.js';
import { DEFAULT_KAWA_CONFIG } from '../src/config.js';

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
    expect(htmlContent).toContain('property="og:title"');
    expect(htmlContent).toContain('name="twitter:card"');
    expect(htmlContent).toContain('application/ld+json');
    expect(htmlContent).toContain('rel="icon"');
    expect(fs.existsSync(path.join(outDir, 'manifest.webmanifest'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'sw.js'))).toBe(true);
    expect(
      fs.existsSync(path.join(outDir, 'icon.svg')) || fs.existsSync(path.join(outDir, 'favicon.svg'))
    ).toBe(true);
    expect(htmlContent).toContain('manifest.webmanifest');
    expect(htmlContent).toContain('serviceWorker');
  });

  it('copies a user favicon and emits SEO head tags from config', () => {
    const testDir = path.join(os.tmpdir(), 'kawa_seo_favicon_' + Date.now());
    tempDirs.push(testDir);
    fs.mkdirSync(path.join(testDir, 'game', 'assets', 'backgrounds'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'game', 'script.kawa'),
      'label start:\n    "hi"\n    return\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testDir, 'game', 'favicon.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#f43f5e"/></svg>',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(testDir, 'game', 'kawa.config.json'),
      JSON.stringify({
        title: 'SEO Novel',
        author: 'Tester',
        seo: {
          favicon: 'favicon.svg',
          description: 'SEO description here',
          keywords: ['vn', 'test'],
          canonicalUrl: 'https://example.com/seo-novel/',
          locale: 'it_IT'
        },
        share: {
          defaultImage: 'backgrounds/classroom.svg'
        }
      }),
      'utf-8'
    );

    const outDir = path.join(testDir, 'dist');
    const ok = buildProject(testDir, { outDir });
    expect(ok).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'favicon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'robots.txt'))).toBe(true);

    const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
    expect(html).toContain('lang="it"');
    expect(html).toContain('SEO description here');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('favicon.svg');
    expect(html).toContain('name="author"');
    expect(html).toContain('application/ld+json');

    const resolved = resolveFavicon(testDir, {
      ...DEFAULT_KAWA_CONFIG,
      seo: { favicon: 'favicon.svg' }
    });
    expect(resolved.isGenerated).toBe(false);
    expect(resolved.outFileName).toBe('favicon.svg');

    const tags = renderSeoHeadTags({
      config: {
        ...DEFAULT_KAWA_CONFIG,
        title: 'Demo',
        seo: { description: 'Blurb', keywords: 'a,b' }
      },
      favicon: resolved,
      appleTouchIcon: resolved
    });
    expect(tags).toContain('og:title');
    expect(tags).toContain('Blurb');
  });

  it('parses dev/build CLI flags for --at and --port/--out', () => {
    expect(parseDevCommandArgs(['dev', './game', '--port', '4123', '--at', 'start'])).toEqual({
      projectDir: './game',
      port: 4123,
      startLabel: 'start'
    });
    expect(parseBuildCommandArgs(['build', '--at=ending', '--out', 'public'])).toEqual({
      projectDir: '.',
      startLabel: 'ending',
      outDir: 'public'
    });
    const tags = renderStaticShareMetaTags({
      title: 'Demo',
      description: 'A VN',
      image: './assets/bg.svg'
    });
    expect(tags).toContain('og:title');
    expect(tags).toContain('./assets/bg.svg');
  });

  it('scaffolds a new project with createProject', () => {
    const testProjectName = path.join(os.tmpdir(), 'new_kawa_project_' + Date.now());
    tempDirs.push(testProjectName);

    const created = createProject(testProjectName);
    expect(created).toBe(true);

    expect(fs.existsSync(path.join(testProjectName, 'game', 'script.kawa'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'game', 'style.css'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'game', 'kawa.config.json'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'game', 'favicon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'game', 'assets', 'backgrounds'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectName, 'package.json'))).toBe(true);

    const script = fs.readFileSync(path.join(testProjectName, 'game', 'script.kawa'), 'utf-8');
    expect(script).toContain('vfx sakura');
    expect(script).toContain('with fade');
    expect(script).toContain('with bounce');

    const validated = validateProject(testProjectName);
    expect(validated).toBe(true);
  });

  it('loads custom project configuration and defaults properly', () => {
    const testDir = path.join(os.tmpdir(), 'kawa_config_test_' + Date.now());
    tempDirs.push(testDir);
    fs.mkdirSync(path.join(testDir, 'game'), { recursive: true });

    const customConfig = {
      title: 'Custom Adventure',
      theme: {
        primaryColor: '#8b5cf6'
      },
      settings: {
        textSpeed: 10
      }
    };
    fs.writeFileSync(path.join(testDir, 'game', 'kawa.config.json'), JSON.stringify(customConfig), 'utf-8');

    const config = loadProjectConfig(testDir);
    expect(config.title).toBe('Custom Adventure');
    expect(config.theme?.primaryColor).toBe('#8b5cf6');
    expect(config.settings?.textSpeed).toBe(10);
    expect(config.window?.width).toBe(1280);
  });
});
