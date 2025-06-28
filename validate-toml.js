const fs = require('fs');
const toml = require('@iarna/toml');
try {
  const content = fs.readFileSync('netlify.toml', 'utf-8');
  toml.parse(content);
  console.log('TOML is valid!');
} catch (e) {
  console.error('Invalid TOML:', e.message);
}