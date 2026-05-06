const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputConfigPath = path.join(projectRoot, 'supabase.config.local.js');

const url = process.env.PROMPT_POUR_SUPABASE_URL;
const anonKey = process.env.PROMPT_POUR_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.log('Supabase env vars missing; skipping supabase.config.local.js generation.');
  process.exit(0);
}

const configContent = `window.PROMPT_POUR_SUPABASE_CONFIG = {\n  url: ${JSON.stringify(url)},\n  anonKey: ${JSON.stringify(anonKey)},\n};\n`;

fs.writeFileSync(outputConfigPath, configContent, 'utf8');
console.log('Wrote supabase.config.local.js from environment variables.');
