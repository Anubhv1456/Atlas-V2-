const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');
config = config.replace(/theme_color: '#ffffff'/g, "theme_color: '#121315'");
config = config.replace(/background_color: '#ffffff'/g, "background_color: '#121315'");
fs.writeFileSync(configPath, config, 'utf8');

const indexPath = path.join(__dirname, 'artifacts/study-tracker/index.html');
let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/<meta name="theme-color" content="#ffffff">/, '<meta name="theme-color" content="#fafaf8" media="(prefers-color-scheme: light)">\n    <meta name="theme-color" content="#121315" media="(prefers-color-scheme: dark)">');
fs.writeFileSync(indexPath, index, 'utf8');

console.log("Fixed colors");
