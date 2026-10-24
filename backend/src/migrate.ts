import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { validateConfig } from './config.js';

async function main() {
  validateConfig();
  const file = fileURLToPath(new URL('../../db/schema.sql', import.meta.url));
  await db.query(await readFile(file, 'utf8'));
  console.log('Database schema applied.');
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => db.end());
