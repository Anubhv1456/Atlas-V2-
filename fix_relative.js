const fs = require('fs');
const path = require('path');

const directory = 'artifacts/study-tracker/src/features';

const replacements = [
  { from: /'\.\/ProgressBar'/g, to: "'@/components/ProgressBar'" },
  { from: /'\.\/ConfidenceDialog'/g, to: "'@/features/revision/ConfidenceDialog'" },
  { from: /'\.\/ScoreLogModal'/g, to: "'@/features/analytics/ScoreLogModal'" },
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
