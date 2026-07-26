const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(
  /registerType: 'autoUpdate',/,
  "registerType: 'autoUpdate',\n      useCredentials: true,"
);

fs.writeFileSync(configPath, config, 'utf8');
console.log("Updated vite.config.ts to use useCredentials");
