const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'frontend');
const to = path.join(__dirname, '..');

if (!fs.existsSync(from)) {
  console.error('Pasta frontend não encontrada.');
  process.exit(1);
}

function copyRecursive(src, destDir) {
  const stat = fs.statSync(src);
  const basename = path.basename(src);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(destDir, basename));
    }
  } else {
    const dest = path.join(destDir, basename);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copia cada arquivo/pasta de frontend para a raiz (index.html, produtos.html, styles.css, etc.)
for (const name of fs.readdirSync(from)) {
  const srcPath = path.join(from, name);
  copyRecursive(srcPath, to);
}
console.log('Frontend copiado para a raiz do projeto.');
