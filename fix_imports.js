const fs = require('fs');
const path = require('path');

const directory = 'artifacts/study-tracker/src';

const replacements = [
  { from: /@\/components\/AnkiLogo/g, to: '@/features/revision/AnkiLogo' },
  { from: /@\/components\/ConfidenceDialog/g, to: '@/features/revision/ConfidenceDialog' },
  { from: /@\/components\/DailyAnkiCard/g, to: '@/features/revision/DailyAnkiCard' },
  { from: /@\/components\/dashboard\/ActiveRevisions/g, to: '@/features/dashboard/ActiveRevisions' },
  { from: /@\/components\/dashboard\/OverviewStats/g, to: '@/features/dashboard/OverviewStats' },
  { from: /@\/components\/dashboard\/SubjectsGrid/g, to: '@/features/dashboard/SubjectsGrid' },
  { from: /@\/components\/ScoreLogModal/g, to: '@/features/analytics/ScoreLogModal' },
  { from: /@\/components\/SubjectCard/g, to: '@/features/subjects/SubjectCard' },
  { from: /@\/components\/SystemCard/g, to: '@/features/subjects/SystemCard' },
  { from: /@\/components\/SystemCard\.hooks/g, to: '@/features/subjects/SystemCard.hooks' },
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
