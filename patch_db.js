const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/database.ts';
let code = fs.readFileSync(file, 'utf8');

const uiPrefInterface = `
export interface UIPreference {
  id: string; // 'subject:1' or 'system:2'
  type: 'subject' | 'system';
  entityId: number;
  order?: number;
  focus?: 'primary' | 'secondary' | null;
  updatedAt: Date;
}
`;

if (!code.includes('UIPreference')) {
  code = code.replace("export interface Subject {", uiPrefInterface + "\nexport interface Subject {");
}

code = code.replace("  order?: number;", "  order?: number; // kept for TS type compatibility only");
code = code.replace("  focus?: 'primary' | 'secondary' | null;", "  focus?: 'primary' | 'secondary' | null; // kept for TS type compatibility only");
code = code.replace("  order: number;", "  order?: number;");
code = code.replace("  focus: 'primary' | 'secondary' | null;", "  focus?: 'primary' | 'secondary' | null;");

if (!code.includes('uiPreferences: Dexie.Table<UIPreference, string>;')) {
  code = code.replace('scoreLogs: Dexie.Table<ScoreLog, number>;', 'scoreLogs: Dexie.Table<ScoreLog, number>;\n  uiPreferences: Dexie.Table<UIPreference, string>;');
}

if (!code.includes('v12: move order and focus to uiPreferences')) {
  const v12 = `    // v12: move order and focus to uiPreferences
    this.version(12).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, revisionState',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp',
      uiPreferences: 'id, type, entityId',
    }).upgrade(async tx => {
      const prefs: any[] = [];
      await tx.table('subjects').toCollection().modify((sub: any) => {
        if (sub.id) {
          prefs.push({
            id: 'subject:' + sub.id,
            type: 'subject',
            entityId: sub.id,
            order: sub.order,
            focus: sub.focus ?? null,
            updatedAt: new Date()
          });
        }
        delete sub.order;
        delete sub.focus;
      });

      await tx.table('systems').toCollection().modify((sys: any) => {
        if (sys.id) {
          prefs.push({
            id: 'system:' + sys.id,
            type: 'system',
            entityId: sys.id,
            order: sys.order,
            focus: sys.focus ?? null,
            updatedAt: new Date()
          });
        }
        delete sys.order;
        delete sys.focus;
      });

      if (prefs.length > 0) {
        await tx.table('uiPreferences').bulkAdd(prefs);
      }
    });

  }
`;
  code = code.replace("  }\n}\n\nexport const db = new AtlasDB();", v12 + "\n}\n\nexport const db = new AtlasDB();");
}

fs.writeFileSync(file, code);
