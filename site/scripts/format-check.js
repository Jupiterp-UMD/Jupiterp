#!/usr/bin/env node
/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Format checker script that validates .svelte and .ts files
 * against the project's style guide (STYLE.md). Checks for file ownership
 * comments and 80-column line limits.
 */

import fs from 'fs';
import path from 'path';

// const MAX_LINE_LENGTH = 80;

// Skipped Directories
const FORBIDDEN_DIRECTORIES = ['node_modules', '.svelte-kit', 'build'];

// Expected ownership comment patterns
const TS_OWNERSHIP_PATTERN = /^\/\*\*\s*\n\s*\*\s*This file is part of Jupiterp/;
const SVELTE_OWNERSHIP_PATTERN = /^<!--\s*\nThis file is part of Jupiterp/;

// Exemption comments
// Format: // format-check exempt <lines> [extra-chars]
// Or: <!-- format-check exempt <lines> [extra-chars] -->
// const TS_EXEMPT_PATTERN = /\/\/\s*format-check\s+exempt\s+(\d+)(?:\s+(\d+))?/;
// const SVELTE_EXEMPT_PATTERN = /<!--\s*format-check\s+exempt\s+(\d+)(?:\s+(\d+))?\s*-->/;

/**
 * Checks that a .ts or .svelte file is exempt from checks based on its path.
 */
function fileExempt(filePath) {
  const exemptFiles = ['vite.config.ts'];

  for (const exemptFile of exemptFiles) {
    if (filePath.endsWith(exemptFile)) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively finds all .ts and .svelte files in a directory,
 * excluding forbidden directories.
 */
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (FORBIDDEN_DIRECTORIES.includes(entry.name)) {
        continue;
      }
      findFiles(fullPath, files);
    } else if (entry.isFile() && !fileExempt(fullPath)) {
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.svelte')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Checks if a file has the required ownership comment at the top.
 */
function checkOwnership(content, filePath) {
  const isSvelte = filePath.endsWith('.svelte');
  const pattern = isSvelte ? SVELTE_OWNERSHIP_PATTERN : TS_OWNERSHIP_PATTERN;

  if (!pattern.test(content)) {
    const expectedFormat = isSvelte
      ? `<!--\nThis file is part of Jupiterp. For terms of use...`
      : `/**\n * This file is part of Jupiterp. For terms of use...`;
    return {
      type: 'ownership',
      message: `Missing or not formated correctly ownership comment at top of file`,
      suggestion: `Expected format:\n${expectedFormat}`,
    };
  }

  return null;
}

// /**
//  * Checks all lines for the 80-char limit, includes indentations as per PEP-8.
//  * In order to except a line, or many lines add the following comments:
//  *   // format-check exempt <lines> [extra-chars]
//  *   <!-- format-check exempt <lines> [extra-chars] -->
//  * <lines> is the number of following lines to exempt,
//  *  [extra-chars] is optional and allows that many extra characters beyond 80.
//  * Ex:
//  * // format-check exempt 5 does not check the next 5 lines
//  * // format-check exempt 5 5 checks the next 5 lines for being below 85 chars
//  */
// function checkLineLength(content) {
//   const lines = content.split('\n');
//   const violations = [];

//   let exemptLinesRemaining = 0;
//   let extraCharsAllowed = 0;

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];

//     // Check for exemption comments
//     const tsMatch = line.match(TS_EXEMPT_PATTERN);
//     const svelteMatch = line.match(SVELTE_EXEMPT_PATTERN);
//     const match = tsMatch || svelteMatch;

//     if (match) {
//       exemptLinesRemaining = parseInt(match[1], 10);
//       extraCharsAllowed = match[2] ? parseInt(match[2], 10) : Infinity;
//       continue;
//     }

//     // Apply exemption if active
//     if (exemptLinesRemaining > 0) {
//       const effectiveLimit = extraCharsAllowed === Infinity ? Infinity : MAX_LINE_LENGTH + extraCharsAllowed;

//       if (line.length > effectiveLimit) {
//         violations.push({
//           type: 'line-length',
//           line: i + 1,
//           length: line.length,
//           message: `Line ${i + 1} exceeds ${effectiveLimit} columns`,
//           preview: line.length > 60 ? line.substring(0, 57) + '...' : line,
//         });
//       }
//       exemptLinesRemaining--;
//       continue;
//     }

//     // Normal check
//     if (line.length > MAX_LINE_LENGTH) {
//       violations.push({
//         type: 'line-length',
//         line: i + 1,
//         length: line.length,
//         message: `Line ${i + 1} exceeds ${MAX_LINE_LENGTH} columns`,
//         preview: line.length > 60 ? line.substring(0, 57) + '...' : line,
//       });
//     }
//   }

//   return violations;
// }

/**
 * Checks a file for all formatting issues.
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];

  // Check ownership comment
  const ownershipError = checkOwnership(content, filePath);
  if (ownershipError) {
    errors.push(ownershipError);
  }

  // Check line lengths
  // const lineLengthErrors = checkLineLength(content, filePath);
  // errors.push(...lineLengthErrors);

  return errors;
}

/**
 * The actual format checker
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: format-check <directory>');
    console.error('Example: format-check ./src');
    process.exit(1);
  }

  const targetDir = path.resolve(args[0]);

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  if (!fs.statSync(targetDir).isDirectory()) {
    console.error(`Error: Path is not a directory: ${targetDir}`);
    process.exit(1);
  }

  console.log(`Checking format in: ${targetDir}\n`);

  const files = findFiles(targetDir);
  let totalErrors = 0;
  let filesWithErrors = 0;

  for (const file of files) {
    const errors = checkFile(file);

    if (errors.length > 0) {
      filesWithErrors++;
      const relativePath = path.relative(process.cwd(), file);
      console.log(`\x1b[31m✗\x1b[0m ${relativePath}`);

      for (const error of errors) {
        totalErrors++;
        if (error.type === 'ownership') {
          console.log(`  \x1b[33m⚠ ${error.message}\x1b[0m`);
          const suggestionLines = error.suggestion.split('\n');
          for (const suggestionLine of suggestionLines) {
            console.log(`    ${suggestionLine}`);
          }
        } else if (error.type === 'line-length') {
          console.log(`  \x1b[33m⚠ ${error.message}\x1b[0m ` + `(${error.length} chars)`);
          console.log(`    "${error.preview}"`);
        }
      }
      console.log('');
    }
  }

  // Summary
  console.log('─'.repeat(50));
  if (totalErrors === 0) {
    console.log(`\x1b[32m✓ All ${files.length} files passed format checks\x1b[0m`);
    process.exit(0);
  } else {
    console.log(`\x1b[31m✗ Found ${totalErrors} error(s) in ` + `${filesWithErrors} file(s)\x1b[0m`);
    console.log(`  Checked ${files.length} files total`);
    process.exit(1);
  }
}

main();
