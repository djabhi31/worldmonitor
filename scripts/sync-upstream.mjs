#!/usr/bin/env node
/**
 * World Monitor (EarthSphere Edition) — Lifetime Upstream Sync Engine
 * 
 * Automatically synchronizes changes from koala73's upstream repository
 * (https://github.com/koala73/worldmonitor) while keeping Abhilash Ghosh's
 * EarthSphere Edition modifications 100% intact (custom README, deployment configs,
 * CI/CD workflows, and EarthSphere ecosystem coupling).
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
  } catch (error) {
    if (!options.allowFailure) {
      throw error;
    }
    return null;
  }
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

console.log('===========================================================');
console.log('🌐 World Monitor — Lifetime Upstream Sync Engine');
console.log('Maintainer: Abhilash Ghosh (@djabhi31)');
console.log('Upstream:   koala73 (koala73/worldmonitor)');
console.log('===========================================================\n');

// 1. Ensure upstream remote exists with proper ref tracking
const remotes = runSilent('git remote');
if (!remotes.split('\n').map((r) => r.trim()).includes('upstream')) {
  console.log('[1/5] Adding upstream remote...');
  run('git remote add upstream https://github.com/koala73/worldmonitor.git');
} else {
  console.log('[1/5] Upstream remote configured.');
}
run('git config remote.upstream.fetch "+refs/heads/*:refs/remotes/upstream/*"');

// 2. Fetch latest commits from upstream into explicit ref
console.log('[2/5] Fetching upstream branches...');
run('git fetch upstream +refs/heads/main:refs/remotes/upstream/main');

// 3. Check for new commits
const aheadBehind = runSilent('git rev-list --count HEAD..upstream/main');
const parsed = parseInt(String(aheadBehind || '').trim(), 10);
const newCommitsCount = (Number.isNaN(parsed) || parsed <= 0) ? 0 : parsed;

if (newCommitsCount === 0) {
  console.log('\n✅ Your repository is already 100% up-to-date with upstream!');
  console.log('No new commits found in koala73/worldmonitor:main.\n');
  process.exit(0);
}

console.log(`\n[3/5] Found ${newCommitsCount} new commit(s) from upstream. Preparing sync...`);

// 4. Backup custom files to preserve across upstream merges
const BACKUP_FILES = [
  'README.md',
  '.github/workflows/sync-upstream.yml',
  'scripts/sync-upstream.mjs',
  'scripts/generate-public-product-facts.mjs',
  'scripts/build-agent-skills-index.mjs',
  'scripts/generate-inventory-facts.mjs',
  'scripts/docs-stats.mjs',
  'scripts/build-sitemap.mjs',
  'scripts/vercel-ignore.sh',
  'tsconfig.api.json',
  'vercel.json',
];

const backups = new Map();
for (const file of BACKUP_FILES) {
  const filePath = path.join(ROOT, file);
  if (fs.existsSync(filePath)) {
    backups.set(file, fs.readFileSync(filePath));
  }
}

// 5. Merge upstream
console.log('[4/5] Merging upstream/main...');
try {
  run('git merge upstream/main -m "chore(upstream): sync latest updates from koala73/worldmonitor"');
} catch {
  console.log('Resolving conflicts and restoring EarthSphere Edition protections...');
  for (const [file, content] of backups) {
    const filePath = path.join(ROOT, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    run(`git add "${file}"`, { silent: true });
  }

  // Resolve any remaining unmerged conflict files using ours
  const unmerged = runSilent('git diff --name-only --diff-filter=U');
  if (unmerged) {
    for (const f of unmerged.split('\n').map((s) => s.trim()).filter(Boolean)) {
      run(`git checkout --ours -- "${f}"`, { allowFailure: true, silent: true });
      run(`git add "${f}"`, { allowFailure: true, silent: true });
    }
  }
  
  const mergeHead = path.join(ROOT, '.git', 'MERGE_HEAD');
  if (fs.existsSync(mergeHead)) {
    run('git commit -m "chore(upstream): sync latest updates with EarthSphere Edition protections"');
  }
}

// Ensure api/ is migrated into _api/ and removed so Vercel Hobby limits are never triggered
const apiDir = path.join(ROOT, 'api');
const underApiDir = path.join(ROOT, '_api');
if (fs.existsSync(apiDir)) {
  console.log('Migrating upstream api/ changes into _api/ ...');
  fs.cpSync(apiDir, underApiDir, { recursive: true, force: true });
  fs.rmSync(apiDir, { recursive: true, force: true });
  run('git add _api', { silent: true });
  run('git rm -rf --cached api', { allowFailure: true, silent: true });
  run('git commit --amend --no-edit', { allowFailure: true, silent: true });
}

// 6. Test build integrity (only if node_modules already exists or in CI)
if (process.env.CI || fs.existsSync(path.join(ROOT, 'node_modules'))) {
  console.log('\n[5/5] Verifying build integrity...');
  run('npm run build');
} else {
  console.log('\n[5/5] Skipping local build verification (node_modules not installed locally). CI/Vercel handles production build.');
}

console.log('\n===========================================================');
console.log('🎉 LIFETIME SYNC SUCCESSFUL!');
console.log('Upstream features merged. EarthSphere customizations 100% intact.');
console.log('Push updates to live deployment with:');
console.log('   git push origin main');
console.log('===========================================================\n');
