import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, formatDiagnostic, KawaError } from '@kawaijs/parser';

export function validateProject(targetPath = '.'): boolean {
  const resolvedPath = path.resolve(targetPath);
  console.log(`\n🔍 Validating Kawaijs script at: ${resolvedPath}\n`);

  let scriptFile = resolvedPath;
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    const candidate = path.join(resolvedPath, 'game', 'script.kawa');
    if (fs.existsSync(candidate)) {
      scriptFile = candidate;
    } else {
      const rootCandidate = path.join(resolvedPath, 'script.kawa');
      if (fs.existsSync(rootCandidate)) {
        scriptFile = rootCandidate;
      }
    }
  }

  if (!fs.existsSync(scriptFile)) {
    console.error(`❌ Error: No .kawa script file found at '${scriptFile}'`);
    return false;
  }

  try {
    const source = fs.readFileSync(scriptFile, 'utf-8');
    const story = compileScript(source, path.basename(scriptFile));
    
    const charCount = Object.keys(story.characters).length;
    const labelCount = Object.keys(story.labels).filter(l => !l.startsWith('__')).length;
    
    console.log(`✅ Script validation successful!`);
    console.log(`   - File: ${path.basename(scriptFile)}`);
    console.log(`   - Characters declared: ${charCount}`);
    console.log(`   - Story labels: ${labelCount}`);
    console.log(`   - Start label: '${story.meta.startLabel}'`);
    return true;
  } catch (err: unknown) {
    if (err instanceof KawaError) {
      const source = fs.existsSync(scriptFile) ? fs.readFileSync(scriptFile, 'utf-8') : undefined;
      console.error(formatDiagnostic(err.diagnostic, source));
    } else if (err instanceof Error) {
      console.error(`❌ Error: ${err.message}`);
    } else {
      console.error('❌ Unknown validation error:', err);
    }
    return false;
  }
}
