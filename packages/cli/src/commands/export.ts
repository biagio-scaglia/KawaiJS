import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildProject } from './build.js';
import { loadProjectConfig } from '../config.js';

export interface ExportOptions {
  target?: 'tauri' | 'electron';
  outDir?: string;
  startLabel?: string;
}

export function exportDesktopProject(
  projectDir = '.',
  options: ExportOptions = {}
): boolean {
  const rootDir = path.resolve(process.cwd(), projectDir);
  const target = (options.target ?? 'tauri').toLowerCase() as 'tauri' | 'electron';
  const config = loadProjectConfig(rootDir);
  const title = config.title ?? 'Kawaijs Visual Novel';
  const slug = title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'kawaijs-novel';

  console.log(`\n🖥️ Exporting Kawaijs Visual Novel for Desktop (${target.toUpperCase()})...`);
  console.log(`   Source: ${rootDir}`);

  // 1. First build the static web bundle into dist/
  const distDir = path.join(rootDir, 'dist');
  const buildOk = buildProject(projectDir, { startLabel: options.startLabel });
  if (!buildOk) {
    console.error('❌ Failed to build web bundle for desktop export.');
    return false;
  }

  const exportDir = path.resolve(
    rootDir,
    options.outDir ?? (target === 'tauri' ? 'desktop-tauri' : 'desktop-electron')
  );

  if (fs.existsSync(exportDir)) {
    fs.rmSync(exportDir, { recursive: true, force: true });
  }
  fs.mkdirSync(exportDir, { recursive: true });

  if (target === 'tauri') {
    setupTauriExport(exportDir, distDir, title, slug);
  } else {
    setupElectronExport(exportDir, distDir, title, slug);
  }

  console.log(`\n🎉 Desktop export generated in: ${exportDir}`);
  console.log(`\nNext steps for ${target.toUpperCase()}:`);
  if (target === 'tauri') {
    console.log(`  cd ${path.relative(process.cwd(), exportDir) || '.'}`);
    console.log(`  npm install`);
    console.log(`  npx tauri dev      # test desktop app locally`);
    console.log(`  npx tauri build    # compile native .exe / .dmg / .AppImage binary\n`);
  } else {
    console.log(`  cd ${path.relative(process.cwd(), exportDir) || '.'}`);
    console.log(`  npm install`);
    console.log(`  npm start          # run locally in Electron`);
    console.log(`  npm run dist       # build installer binaries with electron-builder\n`);
  }

  return true;
}

function setupTauriExport(
  exportDir: string,
  distDir: string,
  title: string,
  slug: string
): void {
  const srcTauri = path.join(exportDir, 'src-tauri');
  const srcTauriSrc = path.join(srcTauri, 'src');
  const outDist = path.join(exportDir, 'dist');

  fs.mkdirSync(srcTauriSrc, { recursive: true });
  copyDirectoryRecursive(distDir, outDist);

  // 1. Cargo.toml
  const cargoToml = `[package]
name = "${slug}"
version = "0.1.0"
description = "${title}"
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }

[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;
  fs.writeFileSync(path.join(srcTauri, 'Cargo.toml'), cargoToml, 'utf-8');

  // 2. build.rs
  const buildRs = `fn main() {
    tauri_build::build()
}
`;
  fs.writeFileSync(path.join(srcTauri, 'build.rs'), buildRs, 'utf-8');

  // 3. main.rs
  const mainRs = `// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri visual novel");
}
`;
  fs.writeFileSync(path.join(srcTauriSrc, 'main.rs'), mainRs, 'utf-8');

  // 4. tauri.conf.json
  const tauriConf = {
    build: {
      beforeDevCommand: '',
      beforeBuildCommand: '',
      devPath: '../dist',
      distDir: '../dist'
    },
    package: {
      productName: title,
      version: '0.1.0'
    },
    tauri: {
      allowlist: {
        all: false,
        shell: {
          open: true
        }
      },
      windows: [
        {
          title,
          width: 1280,
          height: 720,
          minWidth: 640,
          minHeight: 360,
          resizable: true,
          fullscreen: false,
          center: true
        }
      ],
      security: {
        csp: null
      },
      bundle: {
        active: true,
        identifier: `com.kawaijs.${slug}`,
        icon: ['icons/icon.png', 'icons/icon.ico']
      }
    }
  };
  fs.writeFileSync(
    path.join(srcTauri, 'tauri.conf.json'),
    JSON.stringify(tauriConf, null, 2),
    'utf-8'
  );

  // 5. package.json
  const pkg = {
    name: `${slug}-desktop`,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'tauri dev',
      build: 'tauri build'
    },
    devDependencies: {
      '@tauri-apps/cli': '^1.5.14'
    }
  };
  fs.writeFileSync(
    path.join(exportDir, 'package.json'),
    JSON.stringify(pkg, null, 2),
    'utf-8'
  );
}

function setupElectronExport(
  exportDir: string,
  distDir: string,
  title: string,
  slug: string
): void {
  const outDist = path.join(exportDir, 'dist');
  copyDirectoryRecursive(distDir, outDist);

  // 1. main.js
  const mainJs = `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    aspectRatio: 16 / 9,
    useContentSize: true,
    title: ${JSON.stringify(title)},
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
  fs.writeFileSync(path.join(exportDir, 'main.js'), mainJs, 'utf-8');

  // 2. preload.js
  const preloadJs = `window.addEventListener('DOMContentLoaded', () => {
  // Safe desktop runtime sandbox
});
`;
  fs.writeFileSync(path.join(exportDir, 'preload.js'), preloadJs, 'utf-8');

  // 3. package.json
  const pkg = {
    name: `${slug}-electron`,
    version: '0.1.0',
    description: title,
    main: 'main.js',
    scripts: {
      start: 'electron .',
      dist: 'electron-builder'
    },
    build: {
      appId: `com.kawaijs.${slug}`,
      productName: title,
      files: ['main.js', 'preload.js', 'dist/**/*'],
      directories: {
        output: 'build-out'
      },
      win: {
        target: ['nsis', 'portable']
      },
      mac: {
        target: ['dmg']
      },
      linux: {
        target: ['AppImage']
      }
    },
    devDependencies: {
      electron: '^28.2.0',
      'electron-builder': '^24.9.1'
    }
  };
  fs.writeFileSync(
    path.join(exportDir, 'package.json'),
    JSON.stringify(pkg, null, 2),
    'utf-8'
  );
}

function copyDirectoryRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
