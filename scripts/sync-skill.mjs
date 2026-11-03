#!/usr/bin/env node
// Copy the FlyMyAI guide into the plugin and pin the plugin version to the guide's.
//
//   node scripts/sync-skill.mjs [skill.md]          copy (default: ../docs/static/skill.md)
//   node scripts/sync-skill.mjs --check [skill.md]  fail if the copy or the version differ
//
// The plugin version is the platform version of the guide it carries (metadata.version).
// A plugin-only change adds a suffix (1.27.3-1); a new guide version resets it.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'plugins/flymyai/skills/flymyai/SKILL.md');
const MANIFEST = join(ROOT, 'plugins/flymyai/.claude-plugin/plugin.json');

const args = process.argv.slice(2);
const check = args.includes('--check');
const source = resolve(args.find((arg) => !arg.startsWith('--')) ?? join(ROOT, '../docs/static/skill.md'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

const skill = readFileSync(source, 'utf8');
const front = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1] ?? '';
const name = /^name: *(.+)$/m.exec(front)?.[1].trim();
const version = /^ {2}version: "?(\d+\.\d+\.\d+)"?$/m.exec(front)?.[1];
const line = /^Platform version: Headless Cloud (\d+\.\d+\.\d+) /m.exec(skill)?.[1];
if (name !== 'flymyai' || !version) fail(`${source}: needs SKILL.md frontmatter with name flymyai and metadata.version`);
if (line !== version) fail(`${source}: metadata.version ${version} differs from the platform version line ${line}`);

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const base = String(manifest.version).split('-')[0];

if (check) {
  const errors = [];
  if (readFileSync(TARGET, 'utf8') !== skill) errors.push(`${TARGET} differs from ${source}`);
  if (base !== version) errors.push(`plugin.json version ${manifest.version} does not follow the guide version ${version}`);
  if (errors.length) fail(errors.join('\n'));
  console.log(`plugin flymyai ${manifest.version} carries guide ${version}`);
} else {
  writeFileSync(TARGET, skill);
  if (base !== version) {
    manifest.version = version;
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`plugin flymyai ${manifest.version}: guide ${version} copied from ${source}`);
}
