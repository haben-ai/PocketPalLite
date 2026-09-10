#!/usr/bin/env node
/**
 * Regenerates THIRD_PARTY_LICENSES.txt (repo root) and
 * src/legal/thirdPartyLicensesData.json (the Open Source Licenses screen's
 * data source) from the real resolved production dependency tree, via
 * `license-checker`. Re-run this after any dependency change:
 *
 *   npx license-checker --production --json --out /tmp/licenses.json
 *   node scripts/generate-third-party-licenses.js /tmp/licenses.json
 *
 * Deliberately includes the full production closure (not just this
 * project's direct dependencies) -- everything reachable from
 * package.json's "dependencies" is a defensible, standard scope for a
 * NOTICES file (over-disclosure is safe; under-disclosure isn't), even
 * though a handful of entries (Metro/babel build tooling) never actually
 * ship inside the built app.
 */
const fs = require('fs');
const path = require('path');

const licensesJsonPath = process.argv[2];
if (!licensesJsonPath) {
  console.error(
    'Usage: node scripts/generate-third-party-licenses.js <license-checker-output.json>\n' +
      'Generate that file first with:\n' +
      '  npx license-checker --production --json --out /tmp/licenses.json',
  );
  process.exit(1);
}

const PROJECT_ROOT = path.join(__dirname, '..');
const TXT_OUT = path.join(PROJECT_ROOT, 'THIRD_PARTY_LICENSES.txt');
const JSON_OUT = path.join(PROJECT_ROOT, 'src', 'legal', 'thirdPartyLicensesData.json');

const raw = JSON.parse(fs.readFileSync(licensesJsonPath, 'utf8'));
const rootPkg = require(path.join(PROJECT_ROOT, 'package.json'));
const rootKey = `${rootPkg.name}@${rootPkg.version}`;

const entries = [];
for (const [key, info] of Object.entries(raw)) {
  if (key === rootKey) continue; // this app itself, not a third-party dep
  const lastAt = key.lastIndexOf('@');
  const name = key.slice(0, lastAt);
  const version = key.slice(lastAt + 1);
  let licenseText = null;
  if (info.licenseFile && fs.existsSync(info.licenseFile)) {
    try {
      const text = fs.readFileSync(info.licenseFile, 'utf8');
      // license-checker sometimes points at a README when no separate
      // LICENSE file exists -- skip anything absurdly long (clearly not a
      // license body) rather than embed a whole README as "the license".
      if (text.length < 40000) {
        licenseText = text.trim();
      }
    } catch {
      // unreadable -- fall through, handled below
    }
  }
  entries.push({
    name,
    version,
    license: info.licenses || 'UNKNOWN',
    repository: info.repository || null,
    publisher: info.publisher || null,
    licenseText,
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(JSON_OUT), {recursive: true});
fs.writeFileSync(JSON_OUT, JSON.stringify(entries));

const lines = [];
lines.push('THIRD-PARTY NOTICES');
lines.push('');
lines.push(
  `${rootPkg.name} makes use of the following third-party open-source software. Each package is listed with its name, version, license type, and the license text provided by its authors.`,
);
lines.push('');
lines.push(`Generated for ${rootPkg.name} v${rootPkg.version}. ${entries.length} packages.`);
lines.push('');
lines.push('='.repeat(78));
lines.push('');

for (const e of entries) {
  lines.push(`${e.name} ${e.version}`);
  lines.push(`License: ${e.license}`);
  if (e.repository) lines.push(`Repository: ${e.repository}`);
  lines.push('-'.repeat(78));
  lines.push(
    e.licenseText ||
      `(No separate license file was found in this package. SPDX license identifier: ${e.license}.)`,
  );
  lines.push('');
  lines.push('='.repeat(78));
  lines.push('');
}

fs.writeFileSync(TXT_OUT, lines.join('\n'));

const missing = entries.filter(e => !e.licenseText);
console.log(`${entries.length} packages written to ${path.relative(PROJECT_ROOT, TXT_OUT)}`);
if (missing.length) {
  console.log(
    `${missing.length} package(s) had no discoverable LICENSE file (SPDX id used instead):`,
  );
  missing.forEach(e => console.log(`  - ${e.name}@${e.version} (${e.license})`));
}
