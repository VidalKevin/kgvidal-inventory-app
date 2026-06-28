import { randomBytes, scryptSync } from "node:crypto";

const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  const value = process.argv[index + 1];

  if (key?.startsWith("--") && value && !value.startsWith("--")) {
    args.set(key.slice(2), value);
    index += 1;
  }
}

const email = args.get("email")?.trim().toLowerCase();
const username = args.get("username")?.trim();
const password = args.get("password") ?? process.env.APP_ADMIN_PASSWORD;

if (!email || !username || !password) {
  console.error(
    "Usage: node scripts/generate-app-admin-sql.mjs --email you@example.com --username kevin --password \"Strong password here\""
  );
  console.error(
    "Tip: to avoid showing the password in command history, set APP_ADMIN_PASSWORD first and omit --password."
  );
  process.exit(1);
}

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log(`-- Run this in Supabase SQL Editor after supabase/app_users.sql.
insert into public.app_users (
  email,
  username,
  role,
  access_level,
  status,
  password_hash,
  password_salt,
  updated_at
) values (
  ${sqlText(email)},
  ${sqlText(username)},
  'Admin',
  'Full Access',
  'Active',
  ${sqlText(hash)},
  ${sqlText(salt)},
  now()
)
on conflict (email) do update set
  username = excluded.username,
  role = excluded.role,
  access_level = excluded.access_level,
  status = excluded.status,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  updated_at = now();`);
