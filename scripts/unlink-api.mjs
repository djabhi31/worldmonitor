import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(ROOT, 'api');

if (fs.existsSync(apiDir)) {
  try {
    const stat = fs.lstatSync(apiDir);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(apiDir);
    } else {
      try {
        fs.unlinkSync(apiDir);
      } catch {
        fs.rmdirSync(apiDir);
      }
    }
    console.log('[build-setup] Successfully unlinked temporary api junction.');
  } catch (err) {
    console.warn('[build-setup] Warning: Could not unlink api junction:', err.message);
  }
}
