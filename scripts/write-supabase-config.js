const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public');
const outputConfigPath = path.join(outputDir, 'supabase.config.local.js');

const staticFiles = [
  'index.html',
  'app.js',
  'styles.css',
  'deco-bartender.png',
  'supabase.config.example.js',
];

const url = process.env.PROMPT_POUR_SUPABASE_URL;
const anonKey = process.env.PROMPT_POUR_SUPABASE_ANON_KEY;

function ensureCleanOutputDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyStaticSiteFiles() {
  for (const fileName of staticFiles) {
    const fromPath = path.join(projectRoot, fileName);
    const toPath = path.join(outputDir, fileName);
    fs.copyFileSync(fromPath, toPath);
  }
}

function writeGeneratedSupabaseConfig() {
  if (!url || !anonKey) {
    console.log('Supabase env vars missing; skipping supabase.config.local.js generation.');
    return;
  }

  const configContent = `window.PROMPT_POUR_SUPABASE_CONFIG = {\n  url: ${JSON.stringify(url)},\n  anonKey: ${JSON.stringify(anonKey)},\n};\n`;
  fs.writeFileSync(outputConfigPath, configContent, 'utf8');
  console.log('Wrote public/supabase.config.local.js from environment variables.');
}

ensureCleanOutputDir(outputDir);
copyStaticSiteFiles();
writeGeneratedSupabaseConfig();
console.log('Prepared static output in public/.');
