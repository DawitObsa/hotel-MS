import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = resolve(projectRoot, 'backend/.env.example');
const envPath = resolve(projectRoot, 'backend/.env');

if (existsSync(envPath)) {
  console.error('backend/.env already exists; it was left unchanged.');
  process.exitCode = 1;
} else {
  const contents = readFileSync(examplePath, 'utf8')
    .replace(/^MONGODB_URI=.*$/m, 'MONGODB_URI=mongodb://127.0.0.1:27017/hospital_ms')
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`)
    .replace(/^ADMIN_SETUP_KEY=.*$/m, `ADMIN_SETUP_KEY=${randomBytes(32).toString('hex')}`);
  writeFileSync(envPath, contents, { flag: 'wx', mode: 0o600 });
  console.log('Created backend/.env for local development. Keep it private; it is gitignored.');
}
