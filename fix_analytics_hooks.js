const fs = require('fs');
let path = 'artifacts/study-tracker/src/pages/Analytics.hooks.tsx';
let content = fs.readFileSync(path, 'utf8');

const wrongStatsReturn = `        return {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, scoreTrendData, overallAverage: 0, totalTests: 0, dateRange: '', setDateRange: () => {}, typeFilter: '', setTypeFilter: () => {},
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  };`;

const correctStatsReturn = `      return {
        avgPercentage: 0,
        totalLogs: 0,
        targetPassRate: 0,
        totalSubjectsCovered: 0
      };`;

content = content.replace(wrongStatsReturn, correctStatsReturn);

fs.writeFileSync(path, content);
