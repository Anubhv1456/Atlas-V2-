import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Subject, StudySystem } from '@/db/database';
import { setFocus } from '@/db/hooks';
import {
  sortSystemsByRevisionPriority,
  isRevisionDue,
  daysOverdue,
} from '@/db/revisionEngine';
import { ScoreLogModal } from '@/components/ScoreLogModal';
import { toast as sonnerToast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { EmptyStateGraphic } from '@/components/EmptyStateGraphic';
import {
  BarChart3,
  TrendingUp,
  Award,
  Plus,
  Trash2,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Target,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Analytics() {
  const { toast } = useToast();
  const scoreLogs = useLiveQuery(() => db.scoreLogs.orderBy('timestamp').toArray(), []) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const systems = useLiveQuery(() => db.systems.toArray(), []) || [];

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
      return { avgPercentage: 0, totalLogs: 0, targetPassRate: 0, totalSubjectsCovered: 0 };
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
      await db.scoreLogs.delete(id);
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-36 pt-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" /> Performance & Test Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Retention Analytics</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Track test score trends, PYQ accuracy, and system mastery performance over time.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 gap-2 font-semibold shadow-md text-xs sm:text-sm rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Log Score
        </Button>
      </div>

      {/* Actionable Priority Recommendation Banner */}
      {studyRecommendation && (
        <div className="bg-card border border-primary/25 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3" /> Priority Study Recommendation
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${studyRecommendation.badgeColor}`}>
                {studyRecommendation.badge}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {studyRecommendation.title} <span className="text-xs font-normal text-muted-foreground">({studyRecommendation.subjectName})</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {studyRecommendation.reason}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetRecommendationAsPrimary(studyRecommendation.system)}
              className="rounded-xl font-semibold text-xs border-primary/30 hover:bg-primary/10 text-primary"
            >
              Set as Primary Focus
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards: 3 High-Signal Real Performance Metrics (Condensed 3-Column Horizontal Grid) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Average Test Accuracy */}
        <div className="bg-card border border-border/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="truncate">Average</span>
            </span>
            <Badge className={`text-[9px] sm:text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
              stats.avgPercentage >= 75
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              {stats.avgPercentage >= 75 ? 'Above' : 'Below'}
            </Badge>
          </div>

          <div className="my-1.5 sm:my-3">
            <p className="text-xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground truncate">
              {stats.avgPercentage}%
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {stats.totalLogs} recorded tests
            </p>
          </div>

          <div className="pt-1.5 sm:pt-2 border-t border-border/40 flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground">
            <span className="truncate">Target</span>
            <span className="font-mono font-bold text-foreground shrink-0 ml-1">75.0%</span>
          </div>
        </div>

        {/* Card 2: Benchmark Success Rate */}
        <div className="bg-card border border-border/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-emerald-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              <span className="truncate">Pass Rate</span>
            </span>
            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5 shrink-0 whitespace-nowrap">
              ≥ 75%
            </Badge>
          </div>

          <div className="my-1.5 sm:my-3">
            <p className="text-xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {stats.targetPassRate}%
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
              Met target score
            </p>
          </div>

          <div className="pt-1.5 sm:pt-2 border-t border-border/40 flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground">
            <span className="truncate">Logged</span>
            <span className="font-mono font-bold text-foreground shrink-0 ml-1">{stats.totalLogs}</span>
          </div>
        </div>

        {/* Card 3: Active Subjects */}
        <div className="bg-card border border-border/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-indigo-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
              <span className="truncate">Subjects</span>
            </span>
            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-mono text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/5 px-1.5 py-0.5 shrink-0 whitespace-nowrap">
              Active
            </Badge>
          </div>

          <div className="my-1.5 sm:my-3">
            <p className="text-xl sm:text-3xl font-extrabold font-mono tracking-tight text-indigo-600 dark:text-indigo-400 truncate">
              {stats.totalSubjectsCovered}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
              With score history
            </p>
          </div>

          <div className="pt-1.5 sm:pt-2 border-t border-border/40 flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground">
            <span className="truncate">Total</span>
            <span className="font-mono font-bold text-foreground shrink-0 ml-1">{subjects.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Filter className="w-4 h-4 text-primary" /> Filter Results & Chart Density
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Type Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Category</span>
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val as any)}>
              <SelectTrigger className="w-full text-xs h-9 bg-muted/30 border-border/80">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="revision">System Revisions</SelectItem>
                <SelectItem value="pyq">PYQ Tests</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Subject</span>
            <Select value={selectedSubjectId} onValueChange={(val) => {
              setSelectedSubjectId(val);
              setSelectedSystemId('all');
            }}>
              <SelectTrigger className="w-full text-xs h-9 bg-muted/30 border-border/80">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">System</span>
            <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
              <SelectTrigger className="w-full text-xs h-9 bg-muted/30 border-border/80">
                <SelectValue placeholder="All Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {availableSystems.map(sys => (
                  <SelectItem key={sys.id} value={String(sys.id)}>{sys.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Density Limit Dropdown */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Chart Density</span>
            <Select value={densityLimit} onValueChange={setDensityLimit}>
              <SelectTrigger className="w-full text-xs h-9 bg-muted/30 border-border/80 font-medium">
                <SelectValue placeholder="Last 10 Results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Last 10 Results (Default)</SelectItem>
                <SelectItem value="20">Last 20 Results</SelectItem>
                <SelectItem value="50">Last 50 Results</SelectItem>
                <SelectItem value="all">All History</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Search</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search notes/titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-muted/30 border-border/80"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Score Progress Over Time
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Showing {chartData.length} entries ({densityLimit === 'all' ? 'All entries' : `Last ${densityLimit}`})
              </p>
            </div>

            <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary w-fit">
              Target Benchmark: 75%
            </Badge>
          </div>

          {chartData.length === 0 ? (
            <EmptyStateGraphic
              icon={BarChart3}
              title="No Score Logs Recorded"
              description="Log your revision results or PYQ test marks to render your retention and progress curves."
              action={
                <Button onClick={() => setIsModalOpen(true)} size="sm" className="text-xs gap-1.5 rounded-xl shadow-xs">
                  <Plus className="w-3.5 h-3.5" /> Log First Score
                </Button>
              }
              className="h-72 border-none bg-muted/20"
            />
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                    unit="%"
                  />
                  <Tooltip
                    wrapperStyle={{ outline: 'none', zIndex: 50 }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-2.5 rounded-2xl shadow-xl text-xs space-y-1.5 max-w-[240px]">
                            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                              <span className="font-bold text-foreground truncate">{data.title}</span>
                              <Badge className="text-[10px] py-0 px-1.5 rounded-md shrink-0">{data.type}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium">{data.fullDate}</p>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="font-medium text-muted-foreground">Score: {data.scoreStr}</span>
                              <span className="font-bold font-mono tabular-nums text-primary text-sm">{data.percentage}%</span>
                            </div>
                            {data.notes && (
                              <p className="text-[11px] text-muted-foreground bg-muted/60 p-2 rounded-xl italic break-words">
                                "{data.notes}"
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={75} stroke="rgba(16, 185, 129, 0.6)" strokeDasharray="4 4" label={{ value: 'Target (75%)', fill: '#10b981', fontSize: 10, fontWeight: 600 }} />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#scoreAreaGrad)"
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* System Breakdown Bar Chart */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              System Average Comparison
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">Average accuracy per system</p>
          </div>

          {systemBreakdownData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl p-6 text-center">
              <p className="text-xs text-muted-foreground font-medium">No system test data available</p>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemBreakdownData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                  <Tooltip
                    wrapperStyle={{ outline: 'none', zIndex: 50 }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-3 rounded-xl text-xs space-y-1 shadow-lg max-w-[220px]">
                            <p className="font-bold truncate">{data.fullName}</p>
                            <p className="text-muted-foreground font-mono tabular-nums">Average Score: <strong className="text-primary">{data.average}%</strong></p>
                            <p className="text-[10px] text-muted-foreground">Based on {data.count} log(s)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="average" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Score History Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Score History Log
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              Detailed list of recorded test and revision scores
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {displayLogs.length} Records
          </Badge>
        </div>

        {displayLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No score records match your search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-medium">
                  <th className="pb-2 pl-2">Date</th>
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Percentage</th>
                  <th className="pb-2">Notes</th>
                  <th className="pb-2 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {displayLogs.map((log) => {
                  const subName = subjectMap.get(log.subjectId)?.name;
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pl-2 font-mono text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        <div>
                          <span>{log.title}</span>
                          {subName && (
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              {subName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            log.type === 'revision'
                              ? 'border-blue-500/30 text-blue-500 bg-blue-500/5'
                              : 'border-purple-500/30 text-purple-500 bg-purple-500/5'
                          }`}
                        >
                          {log.type}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono font-medium">
                        {log.score} / {log.total}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${getPercentageColorBadge(log.percentage)}`}>
                          {log.percentage}%
                        </span>
                      </td>
                      <td className="py-3 max-w-xs truncate text-muted-foreground text-[11px]">
                        {log.notes || '—'}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => log.id && handleDeleteLog(log.id)}
                          className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Score Log Modal */}
      <ScoreLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
