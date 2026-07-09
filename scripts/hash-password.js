// scripts/hash-password.js
// Membuat bcrypt hash untuk password admin, lalu SQL siap-tempel ke Supabase.
//   node scripts/hash-password.js isebsimode ise8517474
import bcrypt from 'bcryptjs';

const username = process.argv[2] || 'isebsimode';
const password = process.argv[3];

if (!password) {
  console.error('Pemakaian: node scripts/hash-password.js <username> <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\n=== Hash bcrypt ===');
console.log(hash);
console.log('\n=== SQL untuk dijalankan di Supabase SQL Editor ===');
console.log(
  `INSERT INTO users (username, password_hash, role)\n` +
  `VALUES ('${username}', '${hash}', 'admin')\n` +
  `ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;\n`,
);
