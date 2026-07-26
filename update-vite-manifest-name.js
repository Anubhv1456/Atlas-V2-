const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(
  /manifest: \{/,
  "manifestFilename: 'app-manifest-v2.webmanifest',\n      manifest: {"
);

fs.writeFileSync(configPath, config, 'utf8');
console.log("Updated vite.config.ts to use app-manifest-v2.webmanifest");
