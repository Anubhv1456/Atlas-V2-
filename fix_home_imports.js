const fs = require('fs');

const path = 'artifacts/study-tracker/src/pages/Home.hooks.tsx';
const content = fs.readFileSync(path, 'utf8');

const newContent = `import { BookOpen, AlertCircle, Target, Activity, Sparkles, Flame } from 'lucide-react';\n` + content;

fs.writeFileSync(path, newContent);
