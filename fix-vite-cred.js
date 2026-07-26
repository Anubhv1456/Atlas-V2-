const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/useCredentials: true,\n/, "");

fs.writeFileSync(configPath, config, 'utf8');
console.log("Removed useCredentials");
