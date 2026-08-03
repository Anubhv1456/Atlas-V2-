const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '      const existingSubjects = await db.subjects.filter(s => s.focus === focus).toArray();',
  '      const existingSubjects = await db.subjects.filter(s => s.focus === focus && !s.deletedAt).toArray();'
);
content = content.replace(
  '      const existing = await db.systems.filter(s => s.focus === focus).toArray();',
  '      const existing = await db.systems.filter(s => s.focus === focus && !s.deletedAt).toArray();'
);
content = content.replace(
  '      const existingSubjects = await db.subjects.filter(s => s.focus === focus).toArray();',
  '      const existingSubjects = await db.subjects.filter(s => s.focus === focus && !s.deletedAt).toArray();'
);
content = content.replace(
  '      const existingSystems = await db.systems.filter(s => s.focus === focus).toArray();',
  '      const existingSystems = await db.systems.filter(s => s.focus === focus && !s.deletedAt).toArray();'
);
content = content.replace(
  '          .filter(h => h.id !== id && h.taskKey === \'revision\')',
  '          .filter(h => h.id !== id && h.taskKey === \'revision\' && !h.deletedAt)'
);
content = content.replace(
  '      .filter(h => h.taskKey === \'pyqsDone\' && h.taskLabel.includes(year))',
  '      .filter(h => h.taskKey === \'pyqsDone\' && h.taskLabel.includes(year) && !h.deletedAt)'
);

fs.writeFileSync(file, content);
