const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const pngPath = path.join(frontendDir, 'favicon.png');
const svgPath = path.join(frontendDir, 'favicon.svg');

if (!fs.existsSync(pngPath)) {
  console.error('favicon.png não encontrado em frontend/');
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);
const base64 = pngBuffer.toString('base64');
const dataUrl = 'data:image/png;base64,' + base64;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
  <defs>
    <clipPath id="circle">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <image x="0" y="0" width="100" height="100" href="${dataUrl}" clip-path="url(#circle)" preserveAspectRatio="xMidYMid slice"/>
</svg>
`;

fs.writeFileSync(svgPath, svg.trim(), 'utf8');
console.log('favicon.svg (circular) criado em frontend/');
