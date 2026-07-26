const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/\/icons\/atlas-app-icon-192\.png/, '/atlas-app-icon-192.png');
index = index.replace(/app-manifest-v2\.webmanifest/, 'atlas-manifest.webmanifest');
fs.writeFileSync(indexPath, index, 'utf8');
console.log("Updated index.html");
