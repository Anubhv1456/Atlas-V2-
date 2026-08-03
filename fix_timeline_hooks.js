const fs = require('fs');

const filePath = 'artifacts/study-tracker/src/pages/Timeline.hooks.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Imports to add
const importsToAdd = `import { historyToEvent, systemToRevisionEvent, buildActivityHeatmap, groupPastEntries } from '@/lib/timelineUtils';\n`;
if (!content.includes('timelineUtils')) {
    content = content.replace("import { useLocation } from 'wouter';", importsToAdd + "import { useLocation } from 'wouter';");
}

// Remove historyToEvent and systemToRevisionEvent declarations
content = content.replace(/\/\/ ── Map a HistoryEntry → completed TimelineEvent ──[\s\S]+?return \{\n[\s\S]+?\};\n\}/, '');
content = content.replace(/\/\/ ── Map a StudySystem → upcoming \/ overdue TimelineEvent ──[\s\S]+?return \{\n[\s\S]+?\};\n\}/, '');

// Replace activityByDay mapping
content = content.replace(/\/\/ Activity map for the heatmap[\s\S]+?\}\);/, `const activityByDay = buildActivityHeatmap(history);`);

// Replace pastGrouped sorting
content = content.replace(/const pastGrouped: \{ date: Date; events: TimelineEvent\[\] \}\[\] = \[\];\n  pastEntries\.forEach\(event => \{\n    const existing = pastGrouped\.find\(g => isSameDay\(g\.date, event\.date\)\);\n    if \(existing\) existing\.events\.push\(event\);\n    else pastGrouped\.push\(\{ date: event\.date, events: \[event\] \}\);\n  \}\);\n  pastGrouped\.sort\(\(a, b\) => b\.date\.getTime\(\) - a\.date\.getTime\(\)\);/, `const pastGrouped = groupPastEntries(pastEntries);`);

fs.writeFileSync(filePath, content);
