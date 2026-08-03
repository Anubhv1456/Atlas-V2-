const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/database.ts';
let code = fs.readFileSync(file, 'utf8');

// Add hlc?: string to interfaces
const interfaces = ['Subject', 'StudySystem', 'PYQYear', 'HistoryEntry', 'ScoreLog', 'UIPreference'];
for (const intf of interfaces) {
  const regex = new RegExp(`(export interface ${intf} \\{[\\s\\S]*?)(?:\\n\\})`);
  code = code.replace(regex, `$1\n  hlc?: string;\n}`);
}

// Add version 13
const v13 = `    // v13: add hlc for delta sync
    this.version(13).stores({
      subjects: '++id, name, hlc',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, revisionState, hlc',
      history: '++id, subjectId, systemId, completedAt, hlc',
      pyqYears: '++id, subjectId, hlc',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp, hlc',
      uiPreferences: 'id, type, entityId, hlc',
    }).upgrade(async tx => {
      const tables = ['subjects', 'systems', 'history', 'pyqYears', 'scoreLogs', 'uiPreferences'];
      for (const tableName of tables) {
        await tx.table(tableName).toCollection().modify((record: any) => {
          let time = Date.now();
          if (record.updatedAt) time = new Date(record.updatedAt).getTime();
          else if (record.createdAt) time = new Date(record.createdAt).getTime();
          else if (record.timestamp) time = new Date(record.timestamp).getTime();
          else if (record.completedAt) time = new Date(record.completedAt).getTime();
          record.hlc = \`\${time.toString().padStart(15, '0')}-0000\`;
        });
      }
    });

  }
`;
code = code.replace("  }\n}\n\nexport const db = new AtlasDB();", v13 + "\n}\n\nexport const db = new AtlasDB();");

fs.writeFileSync(file, code);
