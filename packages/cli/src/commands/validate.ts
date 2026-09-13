import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileScript, validateStory, formatDiagnostic, KawaError } from '@kawaijs/parser';

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
    const report = validateStory(story);

    if (report.warnings.length > 0) {
      console.log(`⚠️  Script Warnings (${report.warnings.length}):`);
      for (const w of report.warnings) {
        console.warn(formatDiagnostic(w, source));
        console.log('');
      }
    }

    if (!report.isValid) {
      console.error(`❌ Script Validation Failed (${report.errors.length} error${report.errors.length > 1 ? 's' : ''}):`);
      for (const e of report.errors) {
        console.error(formatDiagnostic(e, source));
        console.log('');
      }
      return false;
    }

    console.log(`✅ Script validation successful!`);
    console.log(`   - File: ${path.basename(scriptFile)}`);
    console.log(`   - Characters declared: ${report.characterCount}`);
    console.log(`   - Story labels: ${report.labelCount}`);
    console.log(`   - Instructions: ${report.instructionCount}`);
    console.log(`   - Start label: '${story.meta.startLabel ?? 'start'}'`);
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
