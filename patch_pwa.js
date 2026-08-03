const fs = require('fs');
const file = './artifacts/study-tracker/src/lib/pwaAndNotifications.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  const allSystems = await db.systems.toArray();',
  '  const allSystems = await db.systems.toArray().then(res => res.filter(s => !s.deletedAt));'
);

fs.writeFileSync(file, content);
