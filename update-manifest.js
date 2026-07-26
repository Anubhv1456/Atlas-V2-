const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'artifacts/study-tracker/public/manifest.webmanifest');
let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(/\/icons\/icon-192x192\.png/g, '/icons/atlas-icon-192.png');
manifest = manifest.replace(/\/icons\/icon-512x512\.png/g, '/icons/atlas-icon-512.png');
fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log("Updated manifest.webmanifest");
