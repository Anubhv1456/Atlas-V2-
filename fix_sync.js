const fs = require('fs');

// Fix useCloudSync.ts
let path = 'artifacts/study-tracker/src/hooks/useCloudSync.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('getValidTokenSync', 'getValidTokenSync, getAccessToken');
content = content.replace('let token = getValidTokenSync();', 'let token = await getAccessToken();');
fs.writeFileSync(path, content);

// Fix App.tsx
path = 'artifacts/study-tracker/src/App.tsx';
content = fs.readFileSync(path, 'utf8');
content = content.replace('getValidTokenSync', 'getValidTokenSync, getAccessToken');
content = content.replace('const token = getValidTokenSync();', 'const token = await getAccessToken();');
fs.writeFileSync(path, content);

