import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(ROOT, 'api');
const underApiDir = path.join(ROOT, '_api');

if (!fs.existsSync(apiDir) && fs.existsSync(underApiDir)) {
  try {
    fs.symlinkSync(underApiDir, apiDir, 'junction');
    console.log('[build-setup] Created temporary api -> _api junction for build.');
  } catch (err) {
    console.warn('[build-setup] Warning: Could not create api symlink:', err.message);
  }
}
