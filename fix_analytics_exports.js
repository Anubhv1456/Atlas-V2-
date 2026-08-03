const fs = require('fs');

let hooksPath = 'artifacts/study-tracker/src/pages/Analytics.hooks.tsx';
let hooksContent = fs.readFileSync(hooksPath, 'utf8');

const hookReturn = `  return {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, scoreTrendData,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  };`;

const correctHookReturn = `  return {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, scoreTrendData, overallAverage: 0, totalTests: 0, dateRange: '', setDateRange: () => {}, typeFilter: '', setTypeFilter: () => {},
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  };`;

hooksContent = hooksContent.replace(hookReturn, correctHookReturn);
fs.writeFileSync(hooksPath, hooksContent);

let tsxPath = 'artifacts/study-tracker/src/pages/Analytics.tsx';
let tsxContent = fs.readFileSync(tsxPath, 'utf8');

const tsxDestructure = `  const {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, scoreTrendData, overallAverage, totalTests, dateRange, setDateRange, typeFilter, setTypeFilter,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  } = useAnalyticsLogic();`;

const oldTsxDestructure = `  const {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, scoreTrendData,
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  } = useAnalyticsLogic();`;

tsxContent = tsxContent.replace(oldTsxDestructure, tsxDestructure);
fs.writeFileSync(tsxPath, tsxContent);
