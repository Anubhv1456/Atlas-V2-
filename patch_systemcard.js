const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/features/subjects/SystemCard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/statusColors\[system\.status\]/g, "statusColors[system.status || 'Average']");
content = content.replace(/{system\.status}/g, "{system.status || 'Average'}");
content = content.replace(/system\.status === 'Strong'/g, "(system.status || 'Average') === 'Strong'");

fs.writeFileSync(file, content);
console.log("Done");
