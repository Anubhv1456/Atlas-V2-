const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/syncResolver.ts';
let code = fs.readFileSync(file, 'utf8');

const importsAndHelpers = `import { updateHLC } from '../lib/hlc';

function isHLCGreater(remote: string | undefined, local: string | undefined, remoteTime: number, localTime: number): boolean {
  if (remote && local) {
    updateHLC(remote);
    return remote > local;
  }
  return remoteTime > localTime;
}
`;

code = code.replace("export interface MergeStats {", importsAndHelpers + "\nexport interface MergeStats {");

// Subjects
code = code.replace(
  /const rTime = new Date\(rSub\.updatedAt \|\| rSub\.createdAt \|\| Date\.now\(\)\)\.getTime\(\);\n\s*const match = localSubjects\.find\([\s\S]*?\);\n\s*if \(match\) \{\n\s*const lTime = new Date\(match\.updatedAt \|\| match\.createdAt \|\| 0\)\.getTime\(\);\n\s*if \(rTime > lTime\)/,
  `const rTime = new Date(rSub.updatedAt || rSub.createdAt || Date.now()).getTime();
      const match = localSubjects.find(s => s.id === rSub.id || s.name.trim().toLowerCase() === rSub.name.trim().toLowerCase());
      if (match) {
        const lTime = new Date(match.updatedAt || match.createdAt || 0).getTime();
        if (isHLCGreater(rSub.hlc, match.hlc, rTime, lTime))`
);

// Systems
code = code.replace(
  /const rTime = new Date\(rSys\.updatedAt \|\| Date\.now\(\)\)\.getTime\(\);\n\s*const match = localSystems\.find\([\s\S]*?\);\n\s*const cleanedRSys = \{[\s\S]*?\};\n\s*if \(match\) \{\n\s*const lTime = new Date\(match\.updatedAt \|\| 0\)\.getTime\(\);\n\s*if \(rTime > lTime\)/,
  `const rTime = new Date(rSys.updatedAt || Date.now()).getTime();
      const match = localSystems.find(s => s.id === rSys.id || (s.subjectId === rSys.subjectId && s.name.trim().toLowerCase() === rSys.name.trim().toLowerCase()));
      const cleanedRSys = {
        ...rSys,
        updatedAt: new Date(rSys.updatedAt || Date.now()),
        completionDate: rSys.completionDate ? new Date(rSys.completionDate) : null,
        lastRevisionDate: rSys.lastRevisionDate ? new Date(rSys.lastRevisionDate) : null,
        nextRevisionDate: rSys.nextRevisionDate ? new Date(rSys.nextRevisionDate) : null,
        revisionStartedAt: rSys.revisionStartedAt ? new Date(rSys.revisionStartedAt) : null,
        deletedAt: rSys.deletedAt ? new Date(rSys.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || 0).getTime();
        if (isHLCGreater(rSys.hlc, match.hlc, rTime, lTime))`
);

// PYQYears
code = code.replace(
  /const rTime = new Date\(rPyq\.updatedAt \|\| rPyq\.completedAt \|\| rPyq\.createdAt \|\| Date\.now\(\)\)\.getTime\(\);\n\s*const match = localPyqs\.find\([\s\S]*?\);\n\s*const cleanedPyq = \{[\s\S]*?\};\n\s*if \(match\) \{\n\s*const lTime = new Date\(match\.updatedAt \|\| match\.completedAt \|\| match\.createdAt \|\| 0\)\.getTime\(\);\n\s*if \(rTime > lTime\)/,
  `const rTime = new Date(rPyq.updatedAt || rPyq.completedAt || rPyq.createdAt || Date.now()).getTime();
      const match = localPyqs.find(p => p.id === rPyq.id || (p.subjectId === rPyq.subjectId && p.year.trim().toLowerCase() === rPyq.year.trim().toLowerCase()));
      const cleanedPyq = {
        ...rPyq,
        createdAt: new Date(rPyq.createdAt || Date.now()),
        completedAt: rPyq.completedAt ? new Date(rPyq.completedAt) : null,
        updatedAt: rPyq.updatedAt ? new Date(rPyq.updatedAt) : undefined,
        deletedAt: rPyq.deletedAt ? new Date(rPyq.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || match.completedAt || match.createdAt || 0).getTime();
        if (isHLCGreater(rPyq.hlc, match.hlc, rTime, lTime))`
);

// ScoreLogs
code = code.replace(
  /const rTime = new Date\(rLog\.updatedAt \|\| rLog\.timestamp \|\| Date\.now\(\)\)\.getTime\(\);\n\s*const match = localScoreLogs\.find\([\s\S]*?\);\n\s*const cleanedLog = \{[\s\S]*?\};\n\s*if \(match\) \{\n\s*const lTime = new Date\(match\.updatedAt \|\| match\.timestamp \|\| 0\)\.getTime\(\);\n\s*if \(rTime > lTime\)/,
  `const rTime = new Date(rLog.updatedAt || rLog.timestamp || Date.now()).getTime();
      const match = localScoreLogs.find(l => l.id === rLog.id || (l.subjectId === rLog.subjectId && l.title === rLog.title && Math.abs(new Date(l.timestamp).getTime() - rTime) < 1000));
      const cleanedLog = {
        ...rLog,
        timestamp: new Date(rLog.timestamp || Date.now()),
        updatedAt: rLog.updatedAt ? new Date(rLog.updatedAt) : undefined,
        deletedAt: rLog.deletedAt ? new Date(rLog.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || match.timestamp || 0).getTime();
        if (isHLCGreater(rLog.hlc, match.hlc, rTime, lTime))`
);

// History
code = code.replace(
  /const rTime = new Date\(rHist\.updatedAt \|\| rHist\.completedAt \|\| Date\.now\(\)\)\.getTime\(\);\n\s*const match = localHistory\.find\([\s\S]*?\);\n\s*const cleanedHist = \{[\s\S]*?\};\n\s*if \(match\) \{\n\s*const lTime = new Date\(match\.updatedAt \|\| match\.completedAt \|\| 0\)\.getTime\(\);\n\s*if \(rTime > lTime\)/,
  `const rTime = new Date(rHist.updatedAt || rHist.completedAt || Date.now()).getTime();
      const match = localHistory.find(h => h.id === rHist.id || (h.subjectId === rHist.subjectId && h.taskKey === rHist.taskKey && Math.abs(new Date(h.completedAt).getTime() - rTime) < 1000));
      const cleanedHist = {
        ...rHist,
        completedAt: new Date(rHist.completedAt || Date.now()),
        updatedAt: rHist.updatedAt ? new Date(rHist.updatedAt) : undefined,
        deletedAt: rHist.deletedAt ? new Date(rHist.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || match.completedAt || 0).getTime();
        if (isHLCGreater(rHist.hlc, match.hlc, rTime, lTime))`
);

fs.writeFileSync(file, code);
