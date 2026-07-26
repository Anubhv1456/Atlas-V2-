const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/\/icons\/icon-192x192\.png/g, '/icons/atlas-icon-192.png');
config = config.replace(/\/icons\/icon-512x512\.png/g, '/icons/atlas-icon-512.png');

fs.writeFileSync(configPath, config, 'utf8');
console.log("Updated vite.config.ts");

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/\/icons\/icon-192x192\.png/g, '/icons/atlas-icon-192.png');
fs.writeFileSync(indexPath, index, 'utf8');
console.log("Updated index.html");
