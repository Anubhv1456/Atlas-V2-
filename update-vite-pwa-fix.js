const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

// replace icons array completely
const newIcons = `icons: [
          {
            src: 'atlas-app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'atlas-app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]`;

config = config.replace(/icons:\s*\[[\s\S]*?\],/, newIcons + ',');
config = config.replace(/manifestFilename:\s*'.*?'/, "manifestFilename: 'atlas-manifest.webmanifest'");

fs.writeFileSync(configPath, config, 'utf8');
console.log("Updated vite.config.ts");
