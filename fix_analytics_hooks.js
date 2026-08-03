const fs = require('fs');
const path = require('path');

const filePath = 'artifacts/study-tracker/src/pages/Analytics.hooks.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Imports to add
const importsToAdd = `import { filterScoreLogs, applyDensityLimit, calculateAnalyticsStats, formatChartData, calculateSystemBreakdown } from '@/lib/analyticsUtils';\n`;
if (!content.includes('analyticsUtils')) {
    content = content.replace("import { useLiveQuery } from 'dexie-react-hooks';", importsToAdd + "import { useLiveQuery } from 'dexie-react-hooks';");
}

// Replace filteredLogs
const filteredLogsRegex = /const filteredLogs = useMemo\(\(\) => \{[\s\S]+?return result;\n  \}, \[scoreLogs, selectedType, selectedSubjectId, selectedSystemId, searchQuery\]\);/;
content = content.replace(filteredLogsRegex, `const filteredLogs = useMemo(() => {
    return filterScoreLogs(scoreLogs, selectedType, selectedSubjectId, selectedSystemId, searchQuery);
  }, [scoreLogs, selectedType, selectedSubjectId, selectedSystemId, searchQuery]);`);

// Replace displayLogs
const displayLogsRegex = /const displayLogs = useMemo\(\(\) => \{[\s\S]+?return filteredLogs\.slice\(-limit\);\n  \}, \[filteredLogs, densityLimit\]\);/;
content = content.replace(displayLogsRegex, `const displayLogs = useMemo(() => {
    return applyDensityLimit(filteredLogs, densityLimit);
  }, [filteredLogs, densityLimit]);`);

// Replace stats
const statsRegex = /const stats = useMemo\(\(\) => \{[\s\S]+?return \{[\s\S]+?totalSubjectsCovered: subIds\.size,\n    \};\n  \}, \[filteredLogs\]\);/;
content = content.replace(statsRegex, `const stats = useMemo(() => {
    return calculateAnalyticsStats(filteredLogs);
  }, [filteredLogs]);`);

// Replace chartData
const chartDataRegex = /const chartData = useMemo\(\(\) => \{[\s\S]+?\}\);\n  \}, \[displayLogs, subjectMap\]\);/;
content = content.replace(chartDataRegex, `const chartData = useMemo(() => {
    return formatChartData(displayLogs, subjectMap);
  }, [displayLogs, subjectMap]);`);

// Replace systemBreakdownData
const breakdownRegex = /const systemBreakdownData = useMemo\(\(\) => \{[\s\S]+?\}\)\)\n      \.sort\(\(a, b\) => b\.average - a\.average\)\n      \.slice\(0, 8\); \/\/ Top 8 systems\n  \}, \[filteredLogs, systemMap, subjectMap\]\);/;
content = content.replace(breakdownRegex, `const systemBreakdownData = useMemo(() => {
    return calculateSystemBreakdown(filteredLogs, systemMap, subjectMap);
  }, [filteredLogs, systemMap, subjectMap]);`);

fs.writeFileSync(filePath, content);
