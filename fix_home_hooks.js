const fs = require('fs');
const filePath = 'artifacts/study-tracker/src/pages/Home.hooks.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("determineFocusSystems(subjects, systems, now);", "determineFocusSystems(subjects, systems, new Date());");

fs.writeFileSync(filePath, content);
