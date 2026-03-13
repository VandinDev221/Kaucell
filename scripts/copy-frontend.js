const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'frontend');
const to = path.join(__dirname, '..', 'public');

if (!fs.existsSync(from)) {
  console.error('Pasta frontend não encontrada.');
  process.exit(1);
}

if (!fs.existsSync(to)) {
  fs.mkdirSync(to, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(from, to);
console.log('Frontend copiado para public/');
