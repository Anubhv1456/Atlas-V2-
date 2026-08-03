const fs = require('fs');
const file = './artifacts/study-tracker/src/db/database.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '            updatedAt: new Date(rSub.updatedAt || Date.now()),\n          deletedAt: rSub.deletedAt ? new Date(rSub.deletedAt) : null,\n            deletedAt: rSub.deletedAt ? new Date(rSub.deletedAt) : null,',
  '            updatedAt: new Date(rSub.updatedAt || Date.now()),\n            deletedAt: rSub.deletedAt ? new Date(rSub.deletedAt) : null,'
);

fs.writeFileSync(file, content);
