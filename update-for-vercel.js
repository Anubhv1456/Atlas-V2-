const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

// Replace base path logic and Replit logic
config = config.replace(/const isReplit = process\.env\.REPL_ID !== undefined;[\s\S]*?const basePath = process\.env\.BASE_PATH \?\? '\/';/, '');
config = config.replace(/base: basePath,/, "base: '/',");

// Remove Replit plugins
const replitPluginsRegex = /\/\/\s*Replit-only plugins[\s\S]*?\.\.\.\(isReplit[\s\S]*?\]\s*:\s*\[\]\),[\s\S]*?\]\s*:\s*\[\]\),/g;
config = config.replace(replitPluginsRegex, '');

fs.writeFileSync(configPath, config, 'utf8');
console.log("Updated vite.config.ts");
