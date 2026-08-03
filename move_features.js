const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function exec(cmd) {
  console.log(cmd);
  execSync(cmd, { stdio: 'inherit' });
}

// Move Home
exec('mv artifacts/study-tracker/src/pages/Home.tsx artifacts/study-tracker/src/features/dashboard/Home.tsx');
exec('mv artifacts/study-tracker/src/pages/Home.hooks.tsx artifacts/study-tracker/src/features/dashboard/Home.hooks.tsx');
exec('mv artifacts/study-tracker/src/lib/homeUtils.ts artifacts/study-tracker/src/features/dashboard/homeUtils.ts');

// Move SubjectDetail
exec('mv artifacts/study-tracker/src/pages/SubjectDetail.tsx artifacts/study-tracker/src/features/subjects/SubjectDetail.tsx');
exec('mv artifacts/study-tracker/src/pages/SubjectDetail.hooks.ts artifacts/study-tracker/src/features/subjects/SubjectDetail.hooks.ts');
exec('mv artifacts/study-tracker/src/lib/subjectUtils.ts artifacts/study-tracker/src/features/subjects/subjectUtils.ts');

// Move Analytics
exec('mv artifacts/study-tracker/src/pages/Analytics.tsx artifacts/study-tracker/src/features/analytics/Analytics.tsx');
exec('mv artifacts/study-tracker/src/pages/Analytics.hooks.tsx artifacts/study-tracker/src/features/analytics/Analytics.hooks.tsx');
exec('mv artifacts/study-tracker/src/lib/analyticsUtils.ts artifacts/study-tracker/src/features/analytics/analyticsUtils.ts');

// Move Timeline
exec('mv artifacts/study-tracker/src/pages/Timeline.tsx artifacts/study-tracker/src/features/timeline/Timeline.tsx');
exec('mv artifacts/study-tracker/src/pages/Timeline.hooks.tsx artifacts/study-tracker/src/features/timeline/Timeline.hooks.tsx');
exec('mv artifacts/study-tracker/src/lib/timelineUtils.ts artifacts/study-tracker/src/features/timeline/timelineUtils.ts');

