const fs = require('fs');
const file = './artifacts/study-tracker/src/db/database.ts';
let content = fs.readFileSync(file, 'utf8');

// Subjects merge patch
content = content.replace(
  'const rTime = new Date(rSub.updatedAt || rSub.createdAt || Date.now()).getTime();',
  'const rTime = new Date(rSub.updatedAt || rSub.createdAt || Date.now()).getTime();'
);

content = content.replace(
  '            updatedAt: new Date(rSub.updatedAt || Date.now()),',
  '            updatedAt: new Date(rSub.updatedAt || Date.now()),\n            deletedAt: rSub.deletedAt ? new Date(rSub.deletedAt) : null,'
);
content = content.replace(
  '          updatedAt: new Date(rSub.updatedAt || Date.now()),',
  '          updatedAt: new Date(rSub.updatedAt || Date.now()),\n          deletedAt: rSub.deletedAt ? new Date(rSub.deletedAt) : null,'
);

// Systems LWW merge patch
content = content.replace(
  '        revisionStartedAt: rSys.revisionStartedAt ? new Date(rSys.revisionStartedAt) : null,',
  '        revisionStartedAt: rSys.revisionStartedAt ? new Date(rSys.revisionStartedAt) : null,\n        deletedAt: rSys.deletedAt ? new Date(rSys.deletedAt) : null,'
);

// PYQYears merge patch
content = content.replace(
  '      const rTime = new Date(rPyq.completedAt || rPyq.createdAt || Date.now()).getTime();',
  '      const rTime = new Date(rPyq.updatedAt || rPyq.completedAt || rPyq.createdAt || Date.now()).getTime();'
);
content = content.replace(
  '        completedAt: rPyq.completedAt ? new Date(rPyq.completedAt) : null,',
  '        completedAt: rPyq.completedAt ? new Date(rPyq.completedAt) : null,\n        updatedAt: rPyq.updatedAt ? new Date(rPyq.updatedAt) : undefined,\n        deletedAt: rPyq.deletedAt ? new Date(rPyq.deletedAt) : null,'
);
content = content.replace(
  'const lTime = new Date(match.completedAt || match.createdAt || 0).getTime();',
  'const lTime = new Date(match.updatedAt || match.completedAt || match.createdAt || 0).getTime();'
);

// ScoreLogs merge patch
content = content.replace(
  '      const rTime = new Date(rLog.timestamp || Date.now()).getTime();',
  '      const rTime = new Date(rLog.updatedAt || rLog.timestamp || Date.now()).getTime();'
);
content = content.replace(
  '        timestamp: new Date(rLog.timestamp || Date.now()),',
  '        timestamp: new Date(rLog.timestamp || Date.now()),\n        updatedAt: rLog.updatedAt ? new Date(rLog.updatedAt) : undefined,\n        deletedAt: rLog.deletedAt ? new Date(rLog.deletedAt) : null,'
);
content = content.replace(
  'const lTime = new Date(match.timestamp || 0).getTime();',
  'const lTime = new Date(match.updatedAt || match.timestamp || 0).getTime();'
);

// History merge patch
content = content.replace(
  '      const rTime = new Date(rHist.completedAt || Date.now()).getTime();',
  '      const rTime = new Date(rHist.updatedAt || rHist.completedAt || Date.now()).getTime();'
);
content = content.replace(
  '        completedAt: new Date(rHist.completedAt || Date.now()),',
  '        completedAt: new Date(rHist.completedAt || Date.now()),\n        updatedAt: rHist.updatedAt ? new Date(rHist.updatedAt) : undefined,\n        deletedAt: rHist.deletedAt ? new Date(rHist.deletedAt) : null,'
);
content = content.replace(
  'const lTime = new Date(match.completedAt || 0).getTime();',
  'const lTime = new Date(match.updatedAt || match.completedAt || 0).getTime();'
);

fs.writeFileSync(file, content);
