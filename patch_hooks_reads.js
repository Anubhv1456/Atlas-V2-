const fs = require('fs');
const file = './artifacts/study-tracker/src/db/hooks.ts';
let content = fs.readFileSync(file, 'utf8');

// Subjects
content = content.replace(
  '  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? [];',
  '  const subjects = useLiveQuery(() => db.subjects.toArray().then(res => res.filter(s => !s.deletedAt))) ?? [];'
);

// Systems
content = content.replace(
  '  return useLiveQuery(() => db.systems.where(\'subjectId\').equals(subjectId).toArray(), [subjectId]) ?? [];',
  '  return useLiveQuery(() => db.systems.where(\'subjectId\').equals(subjectId).toArray().then(res => res.filter(s => !s.deletedAt)), [subjectId]) ?? [];'
);
content = content.replace(
  '  return useLiveQuery(() => db.systems.toArray()) ?? [];',
  '  return useLiveQuery(() => db.systems.toArray().then(res => res.filter(s => !s.deletedAt))) ?? [];'
);

// History
content = content.replace(
  '  return useLiveQuery(() => db.history.orderBy(\'completedAt\').reverse().toArray()) ?? [];',
  '  return useLiveQuery(() => db.history.orderBy(\'completedAt\').reverse().toArray().then(res => res.filter(h => !h.deletedAt))) ?? [];'
);
content = content.replace(
  '      .toArray();',
  '      .toArray().then(res => res.filter(h => !h.deletedAt));'
);

// History date (first)
content = content.replace(
  '  return useLiveQuery(async () => {\n    const entry = await db.history.orderBy(\'completedAt\').first();\n    return entry ? entry.completedAt : null;\n  }, []);',
  '  return useLiveQuery(async () => {\n    const entry = await db.history.orderBy(\'completedAt\').filter(h => !h.deletedAt).first();\n    return entry ? entry.completedAt : null;\n  }, []);'
);

// Focus
content = content.replace(
  '    db.subjects.where(\'focus\').notEqual(null).toArray()',
  '    db.subjects.filter(s => !!s.focus && !s.deletedAt).toArray()'
);

// PYQs
content = content.replace(
  '  return useLiveQuery(\n    () => db.pyqYears.where(\'subjectId\').equals(subjectId).toArray(),\n    [subjectId]\n  ) ?? [];',
  '  return useLiveQuery(\n    () => db.pyqYears.where(\'subjectId\').equals(subjectId).toArray().then(res => res.filter(p => !p.deletedAt)),\n    [subjectId]\n  ) ?? [];'
);
content = content.replace(
  '  return useLiveQuery(() => db.pyqYears.toArray()) ?? [];',
  '  return useLiveQuery(() => db.pyqYears.toArray().then(res => res.filter(p => !p.deletedAt))) ?? [];'
);

fs.writeFileSync(file, content);
