const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const requiredFiles = ['index.html', 'app.js', 'styles.css', 'deco-bartender.png'];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${file}`);
  }
}

const indexPath = path.join(root, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.trim()) {
  fail('index.html is empty.');
}

const requiredPatterns = [
  { pattern: /id=["']app["']/, label: 'id="app" mount container' },
  { pattern: /href=["']styles\.css["']/, label: 'styles.css reference' },
  { pattern: /src=["']app\.js["']/, label: 'app.js reference' },
];

for (const check of requiredPatterns) {
  if (!check.pattern.test(indexContent)) {
    fail(`index.html missing ${check.label}.`);
  }
}

const appCheck = spawnSync('node', ['--check', path.join(root, 'app.js')], { stdio: 'inherit' });
if (appCheck.status !== 0) {
  fail('node --check app.js failed.');
}

console.log('✅ Static smoke check passed.');
