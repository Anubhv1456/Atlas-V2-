const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const history = await db.history.orderBy('completedAt').reverse().toArray();",
  "const history = await db.history.orderBy('completedAt').reverse().toArray().then(res => res.filter(h => !h.deletedAt));"
);

// Check delete functions
content = content.replace(
  '    await db.history.where(\'subjectId\').equals(id).delete();\n    await db.systems.where(\'subjectId\').equals(id).delete();\n    await db.pyqYears.where(\'subjectId\').equals(id).delete();\n    await db.subjects.delete(id);',
  '    await db.history.where(\'subjectId\').equals(id).modify({ deletedAt: new Date(), updatedAt: new Date() });\n    await db.systems.where(\'subjectId\').equals(id).modify({ deletedAt: new Date(), updatedAt: new Date() });\n    await db.pyqYears.where(\'subjectId\').equals(id).modify({ deletedAt: new Date(), updatedAt: new Date() });\n    await db.subjects.update(id, { deletedAt: new Date(), updatedAt: new Date() });'
);

content = content.replace(
  '    await db.history.where(\'systemId\').equals(id).delete();\n    await db.systems.delete(id);',
  '    await db.history.where(\'systemId\').equals(id).modify({ deletedAt: new Date(), updatedAt: new Date() });\n    await db.systems.update(id, { deletedAt: new Date(), updatedAt: new Date() });'
);

content = content.replace(
  '    await db.history.delete(id);',
  '    await db.history.update(id, { deletedAt: new Date(), updatedAt: new Date() });'
);

content = content.replace(
  '  return await db.pyqYears.delete(id);',
  '  return await db.pyqYears.update(id, { deletedAt: new Date(), updatedAt: new Date() });'
);

content = content.replace(
  '      if (entry.id) await db.history.delete(entry.id);',
  '      if (entry.id) await db.history.update(entry.id, { deletedAt: new Date(), updatedAt: new Date() });'
);

fs.writeFileSync(file, content);
