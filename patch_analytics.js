const fs = require('fs');
const file = './artifacts/study-tracker/src/pages/Analytics.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'await db.scoreLogs.delete(id);',
  'await db.scoreLogs.update(id, { deletedAt: new Date(), updatedAt: new Date() });'
);

// We should also check useLiveQuery for scoreLogs in Analytics
content = content.replace(
  '  const scoreLogs = useLiveQuery(() => db.scoreLogs.orderBy(\'timestamp\').reverse().toArray()) ?? [];',
  '  const scoreLogs = useLiveQuery(() => db.scoreLogs.orderBy(\'timestamp\').reverse().toArray().then(res => res.filter(s => !s.deletedAt))) ?? [];'
);

fs.writeFileSync(file, content);
