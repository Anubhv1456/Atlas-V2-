const fs = require('fs');
const file = './artifacts/study-tracker/src/pages/Analytics.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  const scoreLogs = useLiveQuery(() => db.scoreLogs.orderBy(\'timestamp\').toArray(), []) || [];',
  '  const scoreLogs = useLiveQuery(() => db.scoreLogs.orderBy(\'timestamp\').toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];'
);

content = content.replace(
  '  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];',
  '  const subjects = useLiveQuery(() => db.subjects.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];'
);

content = content.replace(
  '  const systems = useLiveQuery(() => db.systems.toArray(), []) || [];',
  '  const systems = useLiveQuery(() => db.systems.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];'
);

fs.writeFileSync(file, content);
