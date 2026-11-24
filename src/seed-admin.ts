import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { loadConfig } from './core/config/app-config.js';
import { createMysqlPool } from './core/database/mysql.js';
import { MysqlUsersRepository } from './modules/users/mysql-users.repository.js';
import { seedAdminInput } from './modules/users/users.dto.js';

async function readCredentials() {
  const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = process.env;
  if (email || password) return { email, password };
  if (!stdin.isTTY) return {};

  let hide = false;
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!hide) stdout.write(chunk);
      done();
    },
  });
  const terminal = createInterface({ input: stdin, output, terminal: true });
  try {
    const email = await terminal.question('Admin email: ');
    stdout.write('Password (12+ characters; hidden): ');
    hide = true;
    const password = await terminal.question('');
    stdout.write('\n');
    return { email, password };
  } finally {
    terminal.close();
  }
}

async function seed() {
  const config = loadConfig();
  const credentials = seedAdminInput.safeParse(await readCredentials());
  if (!credentials.success) {
    console.error('Provide a valid email and a password between 12 characters and 72 UTF-8 bytes.');
    return 1;
  }
  const { email, password } = credentials.data;
  const pool = createMysqlPool(config.database);
  try {
    const users = new MysqlUsersRepository(pool);
    const result = await users.seedAdmin(email, await bcrypt.hash(password, 12));
    if (result === 'editor') {
      console.error('That email belongs to an editor. Use a separate email for the administrator.');
      return 1;
    }
    console.log(result === 'created' ? 'Administrator created.' : 'Administrator already exists.');
    return 0;
  } finally {
    await pool.end();
  }
}

try {
  process.exitCode = await seed();
} catch {
  console.error('Could not seed administrator. Check the database configuration and run db:setup.');
  process.exitCode = 1;
}
