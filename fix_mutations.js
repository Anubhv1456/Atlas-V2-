const fs = require('fs');
let path = 'artifacts/study-tracker/src/db/mutations.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'async function updateUIPref(type, entityId, updates) {',
  'async function updateUIPref(type: string, entityId: number, updates: Partial<T.UIPreference>) {'
);

fs.writeFileSync(path, content);
