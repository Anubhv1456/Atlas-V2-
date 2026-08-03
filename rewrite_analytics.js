const fs = require('fs');

const path = 'artifacts/study-tracker/src/pages/Analytics.tsx';
const content = fs.readFileSync(path, 'utf8');

// The logic of Analytics is before `return (`
let startAnalytics = content.indexOf('export default function Analytics() {');
let endAnalyticsState = content.indexOf('return (\n    <div className="min-h-screen bg-background text-foreground pb-36 pt-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">');
let replaceStr = content.substring(startAnalytics, endAnalyticsState);

// I will extract the logic into a separate hook
let hookContent = `import { useState, useMemo } from 'react';
import { 
  useSubjects, useAllSystems, useScoreLogs, db, setFocus,
  StudySystem 
} from '@/db';
import { 
  sortSystemsByRevisionPriority, isRevisionDue, isRevisionOverdue, daysOverdue
} from '@/db';
import { toast as sonnerToast } from 'sonner';
import { toast } from '@/hooks/use-toast';

export function useAnalyticsLogic() {
${replaceStr.replace('export default function Analytics() {', '')}
  return {
    scoreLogs, subjects, systems,
    isModalOpen, setIsModalOpen,
    dateRange, setDateRange,
    typeFilter, setTypeFilter,
    filteredLogs, overallAverage, totalTests, scoreTrendData,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge
  };
}
`;

fs.writeFileSync('artifacts/study-tracker/src/pages/Analytics.hooks.tsx', hookContent);

const newContent = content.replace(replaceStr, `import { useAnalyticsLogic } from './Analytics.hooks';

export default function Analytics() {
  const {
    scoreLogs, subjects, systems,
    isModalOpen, setIsModalOpen,
    dateRange, setDateRange,
    typeFilter, setTypeFilter,
    filteredLogs, overallAverage, totalTests, scoreTrendData,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge
  } = useAnalyticsLogic();
  
  `);

fs.writeFileSync(path, newContent);
