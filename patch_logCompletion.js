const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'export async function logCompletion(entry: Omit<HistoryEntry, \'id\'>) {\n  return await db.history.add(entry);\n}',
  'export async function logCompletion(entry: Omit<HistoryEntry, \'id\'>) {\n  return await db.history.add({ ...entry, updatedAt: new Date() });\n}'
);

fs.writeFileSync(file, content);
