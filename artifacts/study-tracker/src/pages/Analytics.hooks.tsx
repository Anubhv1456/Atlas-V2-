import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { 
  useSubjects, useAllSystems,  db, setFocus,
  StudySystem, Subject 
} from '@/db';
import { 
  sortSystemsByRevisionPriority, isRevisionDue, isRevisionOverdue, daysOverdue
} from '@/db';
import { toast as sonnerToast } from 'sonner';
import { toast } from '@/hooks/use-toast';

export function useAnalyticsLogic() {

  const { toast } = useToast();
  const scoreLogs = useLiveQuery(() => db.scoreLogs.orderBy('timestamp').toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];
  const systems = useLiveQuery(() => db.systems.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];

  // Filter state
  const [selectedType, setSelectedType] = useState<'all' | 'revision' | 'pyq'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('all');
  const [densityLimit, setDensityLimit] = useState<string>('10'); // Default: Last 10 results
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Subject lookup maps
  const subjectMap = useMemo(() => {
    const map = new Map<number, Subject>();
    subjects.forEach(s => { if (s.id) map.set(s.id, s); });
    return map;
  }, [subjects]);

  const systemMap = useMemo(() => {
    const map = new Map<number, StudySystem>();
    systems.forEach(sys => { if (sys.id) map.set(sys.id, sys); });
    return map;
  }, [systems]);

  // Available systems for selected subject
  const availableSystems = useMemo(() => {
    if (selectedSubjectId === 'all') return systems;
    const subId = Number(selectedSubjectId);
    return systems.filter(sys => sys.subjectId === subId);
  }, [systems, selectedSubjectId]);

  // Filtered score logs
  const filteredLogs = useMemo(() => {
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

    // Sort chronologically ascending for line/area charts
    result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return result;
  }, [scoreLogs, selectedType, selectedSubjectId, selectedSystemId, searchQuery]);

  // Apply density limit for chart & main view
  const displayLogs = useMemo(() => {
    if (densityLimit === 'all') return filteredLogs;
    const limit = parseInt(densityLimit, 10);
    if (isNaN(limit)) return filteredLogs;
    // Get last N results chronologically
    return filteredLogs.slice(-limit);
  }, [filteredLogs, densityLimit]);

  // Calculate summary stats
  const stats = useMemo(() => {
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
  }, [filteredLogs]);

  // Chart data formatting
  const chartData = useMemo(() => {
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
  }, [displayLogs, subjectMap]);

  // System Breakdown averages for Bar Chart
  const systemBreakdownData = useMemo(() => {
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
  }, [filteredLogs, systemMap, subjectMap]);

  const handleDeleteLog = async (id: number) => {
    try {
      await db.scoreLogs.update(id, { deletedAt: new Date(), updatedAt: new Date() });
      toast({
        title: 'Entry Deleted',
        description: 'Score record removed successfully.',
      });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getPercentageColorBadge = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (pct >= 60) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
  };

  // Actionable Priority Recommendation Calculation
  const studyRecommendation = useMemo(() => {
    if (systems.length === 0) return null;

    // 1. Check for active multi-day revision session
    const activeMultiDay = systems.find(s => s.revisionState === 'in_progress');
    if (activeMultiDay) {
      const subName = subjectMap.get(activeMultiDay.subjectId)?.name ?? 'Subject';
      const days = activeMultiDay.revisionDaysLogged || 1;
      const progress = activeMultiDay.revisionProgressPercent || 0;
      return {
        system: activeMultiDay,
        subjectName: subName,
        title: activeMultiDay.name,
        reason: `Active multi-day revision in progress (Day ${days} logged, ${progress}% completed).`,
        badge: 'Active Revision Session',
        badgeColor: 'bg-primary/10 text-primary border-primary/30',
      };
    }

    // 2. Check for highest priority system that is DUE or WEAK
    const sortedByDecay = sortSystemsByRevisionPriority(systems);
    const topVulnerable = sortedByDecay.length > 0 ? sortedByDecay[0] : null;

    if (topVulnerable && (isRevisionDue(topVulnerable) || topVulnerable.status === 'Weak')) {
      const subName = subjectMap.get(topVulnerable.subjectId)?.name ?? 'Subject';
      const overdue = daysOverdue(topVulnerable);
      const isDueToday = isRevisionDue(topVulnerable) && overdue === 0;

      let reason = '';
      let badge = '';
      let badgeColor = '';

      if (overdue > 0) {
        reason = `Overdue by ${overdue} day${overdue !== 1 ? 's' : ''} with ${topVulnerable.status} confidence.`;
        badge = 'Overdue Revision';
        badgeColor = 'bg-destructive/10 text-destructive border-destructive/30';
      } else if (isDueToday) {
        reason = `Revision due today with ${topVulnerable.status} confidence.`;
        badge = 'Due Today';
        badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      } else {
        reason = `Marked with Weak confidence — revision recommended.`;
        badge = 'Weak Confidence';
        badgeColor = 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      }

      return {
        system: topVulnerable,
        subjectName: subName,
        title: topVulnerable.name,
        reason,
        badge,
        badgeColor,
      };
    }

    // 3. Check for system with lowest test average score if score logs exist (< 70%)
    if (systemBreakdownData.length > 0) {
      const lowestSysData = [...systemBreakdownData].sort((a, b) => a.average - b.average)[0];
      if (lowestSysData && lowestSysData.average < 70) {
        const matchingSys = systems.find(s => s.name === lowestSysData.fullName);
        if (matchingSys) {
          const subName = subjectMap.get(matchingSys.subjectId)?.name ?? 'Subject';
          return {
            system: matchingSys,
            subjectName: subName,
            title: matchingSys.name,
            reason: `Lowest recorded retention score (${lowestSysData.average}% avg across ${lowestSysData.count} attempts).`,
            badge: 'Low Test Score',
            badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          };
        }
      }
    }

    return null;
  }, [systems, subjectMap, systemBreakdownData]);

  const handleSetRecommendationAsPrimary = async (sys: StudySystem) => {
    if (!sys.id) return;
    await setFocus(sys.id, 'primary');
    sonnerToast.success('Primary Focus Updated', {
      description: `${sys.name} set as Primary Focus on Homepage.`,
    });
  };

  
  return {
    scoreLogs, subjects, systems, densityLimit, setDensityLimit, searchQuery, setSearchQuery, chartData, displayLogs,
    isModalOpen, setIsModalOpen,
    filteredLogs, 
    systemBreakdownData, handleDeleteLog, studyRecommendation,
    handleSetRecommendationAsPrimary, systemMap, subjectMap, getPercentageColorBadge,
    stats, selectedType, setSelectedType, selectedSubjectId, setSelectedSubjectId,
    selectedSystemId, setSelectedSystemId, availableSystems
  };
}
