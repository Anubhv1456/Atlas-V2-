const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'return await db.pyqYears.update(id, { year: year.trim() });',
  'return await db.pyqYears.update(id, { year: year.trim(), updatedAt: new Date() });'
);
content = content.replace(
  'await db.pyqYears.update(id, { completed, completedAt });',
  'await db.pyqYears.update(id, { completed, completedAt, updatedAt: new Date() });'
);

fs.writeFileSync(file, content);
