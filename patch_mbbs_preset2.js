const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/lib/mbbs-preset.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `const sysId = await db.systems.add({
            subjectId,
            name: topic,
            updatedAt: new Date(),
            nextRevisionDate: null,
            revisionState: 'idle' as const,
            contentInitialized: false,
            contentUnitsTotal: 0,
            contentUnitsCompleted: 0,
            contentCompleted: false,
            completionDate: null,
            revisionCount: 0,
            lastRevisionDate: null,
            currentRevisionInterval: null,
            decayFactor: 1.0,
            isLengthy: false,
            revisionStartedAt: null,
            revisionLastCheckInDate: null,
            revisionDaysLogged: 0,
            revisionProgressPercent: 0
          });`;

const replacement = `const sysId = await db.systems.add({
            subjectId,
            name: topic,
            updatedAt: new Date(),
            nextRevisionDate: null,
            revisionState: 'idle' as const,
            contentInitialized: false,
            contentUnitsTotal: 0,
            contentUnitsCompleted: 0,
            contentCompleted: false,
            completionDate: null,
            revisionCount: 0,
            lastRevisionDate: null,
            currentRevisionInterval: null,
            decayFactor: 1.0,
            isLengthy: false,
            revisionStartedAt: null,
            revisionLastCheckInDate: null,
            revisionDaysLogged: 0,
            revisionProgressPercent: 0,
            qbankDone: false,
            weakAreas: '',
            status: 'Average'
          } as any);`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Done");
