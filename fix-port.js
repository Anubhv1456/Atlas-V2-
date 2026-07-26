const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'artifacts/study-tracker/vite.config.ts');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/export default defineConfig\(\{/, "const port = process.env.PORT ? Number(process.env.PORT) : 3000;\n\nexport default defineConfig({");

fs.writeFileSync(configPath, config, 'utf8');
console.log("Fixed port");
