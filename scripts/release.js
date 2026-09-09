import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const releaseType = process.argv[2] ?? 'patch'; // 'patch', 'minor', 'major' or explicit version

console.log(`\n🚀 Starting Kawaijs Release (${releaseType})...\n`);

// 1. Run tests and typecheck first
console.log('1️⃣ Running typecheck and test suite...');
execSync('npx tsc -b', { stdio: 'inherit' });
execSync('npm test', { stdio: 'inherit' });

// 2. Discover all packages
const packagesDir = path.resolve(process.cwd(), 'packages');
const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(packagesDir, d.name));

// Read current version from first package
const firstPkg = JSON.parse(fs.readFileSync(path.join(packageDirs[0], 'package.json'), 'utf-8'));
const currentVersion = firstPkg.version;

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+/.test(type)) return type;
  return `${major}.${minor}.${patch + 1}`;
}

const nextVersion = bumpVersion(currentVersion, releaseType);
console.log(`\n2️⃣ Bumping version: ${currentVersion} ➔ \x1b[32m${nextVersion}\x1b[0m\n`);

// Update package.json for root and all workspace packages
const rootPkgPath = path.resolve(process.cwd(), 'package.json');
if (fs.existsSync(rootPkgPath)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  rootPkg.version = nextVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8');
}

for (const dir of packageDirs) {
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.version = nextVersion;

    // Update internal workspace dependencies
    if (pkg.dependencies) {
      for (const dep of Object.keys(pkg.dependencies)) {
        if (dep.startsWith('@kawaijs/') || dep === 'kawaijs') {
          pkg.dependencies[dep] = `^${nextVersion}`;
        }
      }
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log(`   Updated ${pkg.name} -> ${nextVersion}`);
  }
}

// 3. Update lockfile and recompile
console.log('\n3️⃣ Syncing package-lock.json and rebuilding...');
execSync('npm install', { stdio: 'inherit' });
execSync('npx tsc -b', { stdio: 'inherit' });

// 4. Git Commit, Tag and Push
console.log('\n4️⃣ Committing and pushing to GitHub...');
execSync('git add .', { stdio: 'inherit' });
execSync(`git commit -m "chore(release): v${nextVersion}"`, { stdio: 'inherit' });
try {
  execSync(`git tag v${nextVersion}`, { stdio: 'inherit' });
} catch {
  // tag might already exist
}
execSync('git push origin main --tags', { stdio: 'inherit' });

// 5. Publish to npm
console.log('\n5️⃣ Publishing to npm...');
try {
  execSync('npm publish --workspaces --access public', { stdio: 'inherit' });
  console.log(`\n🎉 \x1b[32mSuccessfully released and published Kawaijs v${nextVersion} to npm and GitHub!\x1b[0m\n`);
} catch (err) {
  console.error('\n⚠️ Note: Could not publish automatically to npm (login required). Run `npm publish --workspaces --access public` once logged in.');
}
