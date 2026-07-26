const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

const newIcons = `icons: [
          {
            src: '/atlas-icon-v3-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/atlas-icon-v3-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/atlas-icon-v3-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]`;

config = config.replace(/icons:\s*\[[\s\S]*?\],/, newIcons + ',');
config = config.replace(/manifestFilename:\s*'.*?'/, "manifestFilename: 'atlas-manifest-v3.webmanifest'");
// Add id to manifest if missing
if (!config.includes("id: '/'")) {
    config = config.replace(/short_name: 'Atlas',/, "short_name: 'Atlas',\n        id: '/',\n        start_url: '/',\n        display: 'standalone',");
}

fs.writeFileSync(configPath, config, 'utf8');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/atlas-icon-v2-192\.png/g, 'atlas-icon-v3-192.png');
index = index.replace(/atlas-favicon-v2\.png/g, 'atlas-favicon-v3.png');
index = index.replace(/atlas-manifest-v2\.webmanifest/g, 'atlas-manifest-v3.webmanifest');
// Also remove crossorigin="use-credentials" from manifest link to be safe as it might prevent fetching if no cookies
index = index.replace(/ crossorigin="use-credentials"/g, '');
fs.writeFileSync(indexPath, index, 'utf8');

console.log("Updated config and index for v3");
