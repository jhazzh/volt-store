// Picks the env file for the data scripts. Local by default; production only
// when asked for explicitly:
//
//   npm run seed              → .env.local      (local Supabase)
//   npm run seed -- --prod    → .env.prod.local (live project)
//
// Preloaded via `node --import`, so it runs before the script's own imports
// and before any Supabase client reads process.env.
const prod = process.argv.includes("--prod");
const file = prod ? ".env.prod.local" : ".env.local";

try {
  process.loadEnvFile(file);
} catch {
  console.error(`Missing env file: ${file}`);
  process.exit(1);
}

if (prod) console.warn(`⚠️  Using PRODUCTION (${file})`);
