const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/features/subjects/SystemCard.hooks.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/system\.status/g, "(system.status || 'Average')");

fs.writeFileSync(file, content);
console.log("Done");
