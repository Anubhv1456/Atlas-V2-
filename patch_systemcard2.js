const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/features/subjects/SystemCard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/system\.status === s \?/g, "(system.status || 'Average') === s ?");

fs.writeFileSync(file, content);
console.log("Done");
