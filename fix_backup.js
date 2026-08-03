const fs = require('fs');
let path = 'artifacts/study-tracker/src/db/backup.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const scoreLogs = await db.scoreLogs.toArray();',
  'const scoreLogs = await db.scoreLogs.toArray();\n  const uiPreferences = await db.uiPreferences.toArray();'
);

content = content.replace(
  'return { subjects, systems, history, pyqYears, scoreLogs };',
  'return { subjects, systems, history, pyqYears, scoreLogs, uiPreferences };'
);

content = content.replace(
  'scoreLogs?: T.ScoreLog[];',
  'scoreLogs?: T.ScoreLog[];\n  uiPreferences?: T.UIPreference[];'
);

content = content.replace(
  "db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs",
  "db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs, db.uiPreferences"
);

content = content.replace(
  "await db.scoreLogs.clear();",
  "await db.scoreLogs.clear();\n    await db.uiPreferences.clear();"
);

let insertUiPrefs = `
    if (data.uiPreferences?.length) {
      await db.uiPreferences.bulkAdd(
        data.uiPreferences.map((p: any) => ({
          ...p,
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        })),
      );
    }
  });`;

content = content.replace('  });', insertUiPrefs);

fs.writeFileSync(path, content);
