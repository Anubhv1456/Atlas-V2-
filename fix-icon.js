const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const publicDir = path.join(__dirname, 'artifacts/study-tracker/public');
const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1FA89B" rx="112" />
  <path d="M256 120 L120 392 L180 392 L220 290 L292 290 L332 392 L392 392 Z" fill="#ffffff" />
  <path d="M256 180 L275 240 L237 240 Z" fill="#1FA89B" />
</svg>`;

const svgPath = path.join(publicDir, 'icon-base.svg');
fs.writeFileSync(svgPath, svg, 'utf8');

console.log("Generating basic SVG-based PNG icons...");
try {
  execSync(`npx sharp -i ${svgPath} -o ${publicDir}/pwa-192x192.png resize 192 192`);
  execSync(`npx sharp -i ${svgPath} -o ${publicDir}/pwa-512x512.png resize 512 512`);
  execSync(`npx sharp -i ${svgPath} -o ${publicDir}/pwa-512x512-maskable.png resize 512 512`);
  execSync(`npx sharp -i ${svgPath} -o ${publicDir}/apple-touch-icon.png resize 180 180`);
  execSync(`npx sharp -i ${svgPath} -o ${publicDir}/favicon.png resize 64 64`);
} catch (e) {
  console.error("Error generating PNGs:", e.message);
}

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/"favicon\.png"/g, '"/favicon.png"');
index = index.replace(/"apple-touch-icon\.png"/g, '"/apple-touch-icon.png"');
fs.writeFileSync(indexPath, index, 'utf8');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');
config = config.replace(/src: 'pwa-/g, "src: '/pwa-");
fs.writeFileSync(configPath, config, 'utf8');

console.log("Updated paths and generated icons.");
