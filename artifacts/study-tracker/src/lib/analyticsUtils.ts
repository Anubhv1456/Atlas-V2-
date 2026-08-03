import { format } from 'date-fns';
import { ScoreLog, StudySystem, Subject } from '@/db';

export function filterScoreLogs(
  scoreLogs: ScoreLog[],
  selectedType: string,
  selectedSubjectId: string,
  selectedSystemId: string,
  searchQuery: string
) {
  let result = [...scoreLogs];
  if (selectedType !== 'all') {
    result = result.filter(log => log.type === selectedType);
  }
  if (selectedSubjectId !== 'all') {
    const subId = Number(selectedSubjectId);
    result = result.filter(log => log.subjectId === subId);
  }
  if (selectedSystemId !== 'all') {
    const sysId = Number(selectedSystemId);
    result = result.filter(log => log.systemId === sysId);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(log =>
      log.title.toLowerCase().includes(q) ||
      (log.notes && log.notes.toLowerCase().includes(q))
    );
  }
  result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return result;
}

export function applyDensityLimit(filteredLogs: ScoreLog[], densityLimit: string) {
  if (densityLimit === 'all') return filteredLogs;
  const limit = parseInt(densityLimit, 10);
  if (isNaN(limit)) return filteredLogs;
  return filteredLogs.slice(-limit);
}

export function calculateAnalyticsStats(filteredLogs: ScoreLog[]) {
  if (filteredLogs.length === 0) {
    return {
      avgPercentage: 0,
      totalLogs: 0,
      targetPassRate: 0,
      totalSubjectsCovered: 0
    };
  }
  const totalPct = filteredLogs.reduce((acc, log) => acc + log.percentage, 0);
  const avgPercentage = Math.round((totalPct / filteredLogs.length) * 10) / 10;
  const targetPassed = filteredLogs.filter(log => log.percentage >= 75).length;
  const targetPassRate = Math.round((targetPassed / filteredLogs.length) * 100);
  const subIds = new Set(filteredLogs.map(l => l.subjectId));
  
  return {
    avgPercentage,
    totalLogs: filteredLogs.length,
    targetPassRate,
    totalSubjectsCovered: subIds.size,
  };
}

export function formatChartData(
  displayLogs: ScoreLog[],
  subjectMap: Map<number, Subject>
) {
  return displayLogs.map((log, index) => {
    const dateLabel = format(new Date(log.timestamp), 'MMM d');
    const subName = subjectMap.get(log.subjectId)?.name || '';
    return {
      id: log.id,
      index: index + 1,
      date: dateLabel,
      fullDate: format(new Date(log.timestamp), 'PPP'),
      percentage: log.percentage,
      scoreStr: `${log.score} / ${log.total}`,
      title: log.title,
      type: log.type === 'revision' ? 'System Revision' : 'PYQ Test',
      subjectName: subName,
      notes: log.notes || '',
    };
  });
}

export function calculateSystemBreakdown(
  filteredLogs: ScoreLog[],
  systemMap: Map<number, StudySystem>,
  subjectMap: Map<number, Subject>
) {
  const sysGroup = new Map<string, { totalPct: number; count: number; name: string }>();

  filteredLogs.forEach(log => {
    let keyName = log.title;
    if (log.systemId && systemMap.has(log.systemId)) {
      keyName = systemMap.get(log.systemId)!.name;
    } else if (log.subjectId && subjectMap.has(log.subjectId)) {
      keyName = subjectMap.get(log.subjectId)!.name;
    }

    if (!sysGroup.has(keyName)) {
      sysGroup.set(keyName, { totalPct: 0, count: 0, name: keyName });
    }
    const item = sysGroup.get(keyName)!;
    item.totalPct += log.percentage;
    item.count += 1;
  });

  return Array.from(sysGroup.values())
    .map(item => ({
      name: item.name.length > 18 ? item.name.substring(0, 15) + '...' : item.name,
      fullName: item.name,
      average: Math.round((item.totalPct / item.count) * 10) / 10,
      count: item.count,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 8); // Top 8 systems
}
