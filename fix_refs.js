const fs = require('fs');
const path = require('path');

const directory = 'artifacts/study-tracker/src';

const replacements = [
  { from: /@\/pages\/Home/g, to: '@/features/dashboard/Home' },
  { from: /@\/pages\/SubjectDetail/g, to: '@/features/subjects/SubjectDetail' },
  { from: /@\/pages\/Analytics/g, to: '@/features/analytics/Analytics' },
  { from: /@\/pages\/Timeline/g, to: '@/features/timeline/Timeline' },
  { from: /@\/lib\/homeUtils/g, to: '@/features/dashboard/homeUtils' },
  { from: /@\/lib\/subjectUtils/g, to: '@/features/subjects/subjectUtils' },
  { from: /@\/lib\/analyticsUtils/g, to: '@/features/analytics/analyticsUtils' },
  { from: /@\/lib\/timelineUtils/g, to: '@/features/timeline/timelineUtils' },
  // Local fixes within the moved files
  { from: /'\.\/Home\.hooks'/g, to: "'./Home.hooks'" },
  { from: /'\.\/SubjectDetail\.hooks'/g, to: "'./SubjectDetail.hooks'" },
  { from: /'\.\/Analytics\.hooks'/g, to: "'./Analytics.hooks'" },
  { from: /'\.\/Timeline\.hooks'/g, to: "'./Timeline.hooks'" },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(directory, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
