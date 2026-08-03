const fs = require('fs');
let path = 'artifacts/study-tracker/src/pages/Analytics.hooks.tsx';
let content = fs.readFileSync(path, 'utf8');

const wrongReturn = `  return {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    dateRange, setDateRange,
    typeFilter, setTypeFilter,
    filteredLogs, overallAverage, totalTests, scoreTrendData,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge
  };`;

const correctHookReturn = `  return {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, scoreTrendData,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  };`;

content = content.replace(wrongReturn, correctHookReturn);

// Also add import Subject
content = content.replace("import { db, StudySystem, setFocus } from '@/db';", "import { db, StudySystem, setFocus, Subject } from '@/db';");

fs.writeFileSync(path, content);
