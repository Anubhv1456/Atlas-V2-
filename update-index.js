const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace('<link rel="manifest" href="/manifest.webmanifest">\n', '');
fs.writeFileSync(indexPath, index, 'utf8');
console.log("Removed duplicate manifest link");
