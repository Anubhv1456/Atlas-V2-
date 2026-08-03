const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await db\.subjects\.update\(sub\.id!, \{ focus: null \}\);/g,
  'await db.subjects.update(sub.id!, { focus: null, updatedAt: new Date() });'
);
content = content.replace(
  /await db\.systems\.update\(sys\.id!, \{ focus: null \}\);/g,
  'await db.systems.update(sys.id!, { focus: null, updatedAt: new Date() });'
);

fs.writeFileSync(file, content);
