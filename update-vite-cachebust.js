const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/atlas-app-icon-192\.png/g, 'atlas-icon-v2-192.png');
config = config.replace(/atlas-app-icon-512\.png/g, 'atlas-icon-v2-512.png');
config = config.replace(/atlas-manifest\.webmanifest/g, 'atlas-manifest-v2.webmanifest');

fs.writeFileSync(configPath, config, 'utf8');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/atlas-app-icon-192\.png/g, 'atlas-icon-v2-192.png');
index = index.replace(/atlas-favicon\.png/g, 'atlas-favicon-v2.png');
index = index.replace(/atlas-manifest\.webmanifest/g, 'atlas-manifest-v2.webmanifest');
fs.writeFileSync(indexPath, index, 'utf8');

console.log("Updated config and index for cache busting");
