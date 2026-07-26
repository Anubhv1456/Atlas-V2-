const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

if (!config.includes('includeAssets')) {
  config = config.replace(/manifestFilename: 'manifest.webmanifest',/, "manifestFilename: 'manifest.webmanifest',\n      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-512x512-maskable.png'],");
}

fs.writeFileSync(configPath, config, 'utf8');
console.log("Added includeAssets to vite.config.ts");
