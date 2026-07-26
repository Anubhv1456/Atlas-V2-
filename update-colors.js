const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/theme_color: '.*'/, "theme_color: '#121315'");
config = config.replace(/background_color: '.*'/, "background_color: '#121315'");

fs.writeFileSync(configPath, config, 'utf8');
console.log("Updated colors in vite.config.ts");
