const fs = require('fs');
const file = './artifacts/study-tracker/src/components/ScoreLogModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];',
  '  const subjects = useLiveQuery(() => db.subjects.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];'
);

content = content.replace(
  '  const systems = useLiveQuery(() => db.systems.toArray(), []) || [];',
  '  const systems = useLiveQuery(() => db.systems.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];'
);

content = content.replace(
  '  const pyqYears = useLiveQuery(() => db.pyqYears.toArray(), []) || [];',
  '  const pyqYears = useLiveQuery(() => db.pyqYears.toArray().then(res => res.filter(p => !p.deletedAt)), []) || [];'
);

fs.writeFileSync(file, content);
