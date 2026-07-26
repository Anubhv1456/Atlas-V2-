const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

// replace relative paths with absolute in icons array
config = config.replace(/src: 'pwa-/g, "src: '/pwa-");
fs.writeFileSync(configPath, config, 'utf8');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/href="favicon.png"/g, 'href="/favicon.png"');
index = index.replace(/href="apple-touch-icon.png"/g, 'href="/apple-touch-icon.png"');
index = index.replace(/href="manifest.webmanifest"/g, 'href="/manifest.webmanifest"');
index = index.replace(/href="registerSW.js"/g, 'href="/registerSW.js"');
fs.writeFileSync(indexPath, index, 'utf8');

console.log("Fixed absolute paths");
