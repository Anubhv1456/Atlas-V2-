const fs = require('fs');
const file = './artifacts/study-tracker/src/components/SystemCard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '.filter(h => h.taskKey === \'qbankDone\')',
  '.filter(h => h.taskKey === \'qbankDone\' && !h.deletedAt)'
);
content = content.replace(
  '.filter(h => h.taskKey === \'contentCompleted\')',
  '.filter(h => h.taskKey === \'contentCompleted\' && !h.deletedAt)'
);

fs.writeFileSync(file, content);
