const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/atlas-icon-192\.png/g, 'atlas-app-icon-192.png');
config = config.replace(/atlas-icon-512\.png/g, 'atlas-app-icon-512.png');
fs.writeFileSync(configPath, config, 'utf8');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/atlas-icon-192\.png/g, 'atlas-app-icon-192.png');
fs.writeFileSync(indexPath, index, 'utf8');

console.log("Updated icon paths");
