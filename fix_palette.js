const fs = require('fs');
let path = 'artifacts/study-tracker/src/components/CommandPalette.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'systems: systems.slice(0, 5),',
  `systems: systems.slice(0, 5).map(sys => {
          const sub = subjects.find(s => s.id === sys.subjectId);
          return { ...sys, subjectName: sub?.name ?? 'Unknown' };
        }),`
);

fs.writeFileSync(path, content);
