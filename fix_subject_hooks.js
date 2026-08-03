const fs = require('fs');

const filePath = 'artifacts/study-tracker/src/pages/SubjectDetail.hooks.ts';
let content = fs.readFileSync(filePath, 'utf8');

const importsToAdd = `import { calculateYearScoreMap, generateCustomYearRange } from '@/lib/subjectUtils';\n`;
if (!content.includes('subjectUtils')) {
    content = content.replace("import { validateNumberOfYears, validateYearInput } from '@/lib/validation';", importsToAdd + "import { validateNumberOfYears, validateYearInput } from '@/lib/validation';");
}

const mapLogicRegex = /const yearScoreMap = useMemo\(\(\) => \{[\s\S]+?return map;\n  \}, \[scoreLogs\]\);/;
content = content.replace(mapLogicRegex, `const yearScoreMap = useMemo(() => {
    return calculateYearScoreMap(scoreLogs);
  }, [scoreLogs]);`);

const generateRangeRegex = /const generated: string\[\] = \[\];\n    const prefixStr = presetPrefix\.trim\(\) \? \`\$\{presetPrefix\.trim\(\)\} \` : '';\n    for \(let i = 0; i < span; i\+\+\) \{\n      generated\.push\(\`\$\{prefixStr\}\$\{end - i\}\`\);\n    \}/;
content = content.replace(generateRangeRegex, `const generated = generateCustomYearRange(end, span, presetPrefix);`);

fs.writeFileSync(filePath, content);
