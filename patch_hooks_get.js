const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  return useLiveQuery(() => db.subjects.get(id), [id]);',
  '  return useLiveQuery(() => db.subjects.get(id).then(sub => sub?.deletedAt ? undefined : sub), [id]);'
);

content = content.replace(
  '  return useLiveQuery(() => db.systems.get(id), [id]);',
  '  return useLiveQuery(() => db.systems.get(id).then(sys => sys?.deletedAt ? undefined : sys), [id]);'
);

fs.writeFileSync(file, content);
