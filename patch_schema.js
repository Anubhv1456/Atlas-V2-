const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/db/schema.ts';
let content = fs.readFileSync(file, 'utf8');

// replace the end of constructor
const target = `    // v12: move order and focus to uiPreferences`;

const replacement = `    // v13: ensure status, qbankDone, weakAreas
    this.version(13).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, revisionState',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp',
      uiPreferences: 'id, type, entityId',
    }).upgrade(tx => {
      return tx
        .table('systems')
        .toCollection()
        .modify((sys: Record<string, unknown>) => {
          if (!sys.status) sys.status = 'Average';
          if (!('qbankDone' in sys) || sys.qbankDone === undefined) sys.qbankDone = false;
          if (!('weakAreas' in sys) || sys.weakAreas === undefined) sys.weakAreas = '';
        });
    });

    // v12: move order and focus to uiPreferences`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Done");
