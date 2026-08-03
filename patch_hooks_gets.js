const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '    const entry = await db.history.get(id);\n    if (!entry) return;',
  '    const entry = await db.history.get(id);\n    if (!entry || entry.deletedAt) return;'
);

content = content.replace(
  '  const sys = await db.systems.get(systemId);\n  if (!sys) return;',
  '  const sys = await db.systems.get(systemId);\n  if (!sys || sys.deletedAt) return;'
);

// We need to do this globally for sys = await db.systems.get(systemId)
content = content.replace(
  /  const sys = await db\.systems\.get\(systemId\);\n  if \(\!sys\) return;/g,
  '  const sys = await db.systems.get(systemId);\n  if (!sys || sys.deletedAt) return;'
);

fs.writeFileSync(file, content);
