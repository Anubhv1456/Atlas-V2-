import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ScoreLog, Subject, StudySystem } from '@/db/database';
import { setFocus } from '@/db/hooks';
import {
  sortSystemsByRevisionPriority,
  calculateDecayScore,
  isRevisionOverdue,
  daysOverdue,
  hasRevisionScheduled,
  isRevisionDue,
  getRetrievability,
} from '@/db/revisionEngine';
import { ScoreLogModal } from '@/components/ScoreLogModal';
import { useLocation } from 'wouter';
import { toast as sonnerToast } from 'sonner';
import {
  LineChart,
  Line,
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
  CheckCircle2,
  Calendar,
  Layers,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  Activity,
  Clock,
  AlertTriangle,
  RefreshCw,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

    // Sort chronologically ascending for line charts
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
      return { avgPercentage: 0, totalLogs: 0 };
    }

    const totalPct = filteredLogs.reduce((acc, log) => acc + log.percentage, 0);
    const avgPercentage = Math.round((totalPct / filteredLogs.length) * 10) / 10;

    return { avgPercentage, totalLogs: filteredLogs.length };
  }, [filteredLogs]);

  // Spaced Repetition Compliance Metrics
  const complianceMetrics = useMemo(() => {
    const scheduledSystems = systems.filter(sys => hasRevisionScheduled(sys));
    const totalScheduled = scheduledSystems.length;

    if (totalScheduled === 0) {
      return {
        rate: 100,
        totalScheduled: 0,
        onScheduleCount: 0,
        dueTodayCount: 0,
        overdueCount: 0,
        avgRetrievability: 100,
        subjectBreakdown: [],
        statusLabel: 'No Active Revisions',
        statusBadgeClass: 'bg-muted text-muted-foreground border-border',
      };
    }

    let onScheduleCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    let totalRetrievability = 0;

    const subComplianceMap = new Map<number, { total: number; compliant: number; overdue: number }>();

    scheduledSystems.forEach(sys => {
      const isOverdue = isRevisionOverdue(sys);
      const isDueTdy = isRevisionDue(sys) && !isOverdue;
      const retrievability = getRetrievability(sys);
      totalRetrievability += retrievability;

      if (isOverdue) {
        overdueCount += 1;
      } else {
        onScheduleCount += 1;
        if (isDueTdy) dueTodayCount += 1;
      }

      if (sys.subjectId) {
        if (!subComplianceMap.has(sys.subjectId)) {
          subComplianceMap.set(sys.subjectId, { total: 0, compliant: 0, overdue: 0 });
        }
        const entry = subComplianceMap.get(sys.subjectId)!;
        entry.total += 1;
        if (!isOverdue) entry.compliant += 1;
        else entry.overdue += 1;
      }
    });

    const rate = Math.round((onScheduleCount / totalScheduled) * 1000) / 10;
    const avgRetrievability = Math.round((totalRetrievability / totalScheduled) * 10) / 10;

    const subjectBreakdown = Array.from(subComplianceMap.entries()).map(([subId, data]) => {
      const subName = subjectMap.get(subId)?.name || 'Subject';
      const subRate = Math.round((data.compliant / data.total) * 100);
      return {
        subjectId: subId,
        name: subName,
        total: data.total,
        compliant: data.compliant,
        overdue: data.overdue,
        rate: subRate,
      };
    }).sort((a, b) => a.rate - b.rate);

    let statusLabel = 'Revisions Up to Date';
    let statusBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

    if (rate < 60) {
      statusLabel = 'Revisions Overdue';
      statusBadgeClass = 'bg-destructive/10 text-destructive border-destructive/30';
    } else if (rate < 85) {
      statusLabel = 'Revisions Pending';
      statusBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }

    return {
      rate,
      totalScheduled,
      onScheduleCount,
      dueTodayCount,
      overdueCount,
      avgRetrievability,
      subjectBreakdown,
      statusLabel,
      statusBadgeClass,
    };
  }, [systems, subjectMap]);

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
    if (pct >= 80) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    if (pct >= 60) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
  };

  const [, setLocation] = useLocation();

  // Actionable Priority Recommendation Calculation
  const studyRecommendation = useMemo(() => {
    if (systems.length === 0) return null;

    // 1. Check for highest decay/overdue system
    const sortedByDecay = sortSystemsByRevisionPriority(systems);
    const topVulnerable = sortedByDecay.length > 0 ? sortedByDecay[0] : null;

    if (topVulnerable && (calculateDecayScore(topVulnerable) > 0 || topVulnerable.status === 'Weak')) {
      const subName = subjectMap.get(topVulnerable.subjectId)?.name ?? 'Subject';
      const overdue = daysOverdue(topVulnerable);
      const reason = overdue > 0
        ? `Overdue by ${overdue} day${overdue !== 1 ? 's' : ''} with ${topVulnerable.status} confidence.`
        : `Marked with ${topVulnerable.status} confidence — needs active recall review.`;

      return {
        system: topVulnerable,
        subjectName: subName,
        title: topVulnerable.name,
        reason,
        badge: topVulnerable.status === 'Weak' ? 'Weak Confidence' : 'Overdue Revision',
        badgeColor: 'bg-destructive/10 text-destructive border-destructive/30',
      };
    }

    // 2. Check for system with lowest test average score if score logs exist
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
    <div className="min-h-screen bg-background text-foreground pb-28 pt-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" /> Performance & Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Retention Analytics</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Track test scores, revision performance trends, and PYQ accuracy over time.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 gap-2 font-semibold shadow-md text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          Log Score
        </Button>
      </div>

      {/* ── Actionable Priority Recommendation Banner ────────────────── */}
      {studyRecommendation && (
        <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div className="space-y-1.5 pl-2">
            <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 pl-2 md:pl-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetRecommendationAsPrimary(studyRecommendation.system)}
              className="rounded-xl font-semibold text-xs border-primary/30 hover:bg-primary/10 text-primary"
            >
              Set as Primary Focus
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation(`/subjects/${studyRecommendation.system.subjectId}?highlight=${studyRecommendation.system.id}`)}
              className="rounded-xl font-semibold text-xs shadow-sm gap-1"
            >
              Review System <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards: 3 Core Actionable Metrics in Squaricle Bubbles */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
        {/* Card 1: Spaced Repetition Compliance Rate Bubble */}
        <div className="bg-card border border-border/80 rounded-[26px] p-2.5 sm:p-3.5 aspect-square flex flex-col items-center justify-between text-center shadow-xs hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform mt-0.5">
            <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          
          <div className="my-auto py-0.5 space-y-0.5 w-full">
            <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums tracking-tight text-foreground leading-none">
              {complianceMetrics.rate}%
            </p>
            <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate px-1 mt-1">
              Revision
            </p>
          </div>

          <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border max-w-full truncate font-mono tabular-nums ${complianceMetrics.statusBadgeClass}`}>
            {complianceMetrics.onScheduleCount}/{complianceMetrics.totalScheduled}
          </span>
        </div>

        {/* Card 2: Average Score Bubble */}
        <div className="bg-card border border-border/80 rounded-[26px] p-2.5 sm:p-3.5 aspect-square flex flex-col items-center justify-between text-center shadow-xs hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform mt-0.5">
            <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>

          <div className="my-auto py-0.5 space-y-0.5 w-full">
            <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-emerald-500 tracking-tight leading-none">
              {stats.avgPercentage}%
            </p>
            <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate px-1 mt-1">
              Avg Score
            </p>
          </div>

          <span className="text-[9px] sm:text-[10px] font-medium font-mono tabular-nums text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60 max-w-full truncate">
            {stats.totalLogs} logs
          </span>
        </div>

        {/* Card 3: Memory Recall Bubble */}
        <div className="bg-card border border-border/80 rounded-[26px] p-2.5 sm:p-3.5 aspect-square flex flex-col items-center justify-between text-center shadow-xs hover:border-indigo-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform mt-0.5">
            <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>

          <div className="my-auto py-0.5 space-y-0.5 w-full">
            <p className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-indigo-500 tracking-tight leading-none">
              {complianceMetrics.avgRetrievability}%
            </p>
            <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate px-1 mt-1">
              Recall
            </p>
          </div>

          <span className="text-[9px] sm:text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 max-w-full truncate">
            Retrievability
          </span>
        </div>
      </div>

      {/* ── Dedicated Spaced Repetition Compliance Engine Hub ────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Spaced Repetition Compliance Engine
                </h2>
                <Badge className={`text-[11px] font-bold px-2.5 py-0.5 border ${complianceMetrics.statusBadgeClass}`}>
                  {complianceMetrics.statusLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Measures adherence to scheduled system revisions on or before due date, preventing memory decay debt.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/timeline')}
            className="shrink-0 gap-1.5 text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            <Calendar className="w-3.5 h-3.5" />
            View Revision Timeline
          </Button>
        </div>

        {/* Compliance Progress Bar & Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> System Revision Portfolio Compliance
              </span>
              <span className="font-mono font-bold text-primary text-sm">
                {complianceMetrics.rate}% Adherence
              </span>
            </div>

            {/* Multi-segment stacked progress bar */}
            <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-border/60">
              {complianceMetrics.totalScheduled === 0 ? (
                <div className="w-full bg-muted-foreground/20 rounded-full" />
              ) : (
                <>
                  <div
                    style={{ width: `${(complianceMetrics.onScheduleCount / complianceMetrics.totalScheduled) * 100}%` }}
                    className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                    title={`${complianceMetrics.onScheduleCount} Systems On Schedule`}
                  />
                  {complianceMetrics.dueTodayCount > 0 && (
                    <div
                      style={{ width: `${(complianceMetrics.dueTodayCount / complianceMetrics.totalScheduled) * 100}%` }}
                      className="bg-amber-500 h-full transition-all duration-500"
                      title={`${complianceMetrics.dueTodayCount} Systems Due Today`}
                    />
                  )}
                  {complianceMetrics.overdueCount > 0 && (
                    <div
                      style={{ width: `${(complianceMetrics.overdueCount / complianceMetrics.totalScheduled) * 100}%` }}
                      className="bg-destructive h-full rounded-r-full transition-all duration-500"
                      title={`${complianceMetrics.overdueCount} Systems Overdue`}
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                On Schedule: <strong className="text-foreground">{complianceMetrics.onScheduleCount}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Due Today: <strong className="text-foreground">{complianceMetrics.dueTodayCount}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                Overdue (Debt): <strong className="text-foreground">{complianceMetrics.overdueCount}</strong>
              </span>
              <span className="flex items-center gap-1 font-mono">
                Est. Retrievability: <strong className="text-primary">{complianceMetrics.avgRetrievability}%</strong>
              </span>
            </div>
          </div>

          {/* Stat Box */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 text-center space-y-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">
              Compliance Goal
            </span>
            <p className="text-xl font-extrabold font-mono text-primary">≥ 85.0%</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {complianceMetrics.rate >= 85
                ? '✅ Excellent! Your spaced repetition retention curve is protected.'
                : '⚠️ Action needed to clear overdue revisions and avoid memory decay.'}
            </p>
          </div>
        </div>

        {/* Subject-Wise Spaced Compliance Breakdown */}
        {complianceMetrics.subjectBreakdown.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> Subject-Wise Compliance Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {complianceMetrics.subjectBreakdown.map((sub) => (
                <div key={sub.subjectId} className="bg-background border border-border/70 rounded-xl p-3 space-y-2 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground truncate max-w-[140px]">{sub.name}</span>
                    <span className={cn(
                      'font-mono font-bold text-xs px-1.5 py-0.5 rounded border',
                      sub.rate >= 85
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : sub.rate >= 60
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                    )}>
                      {sub.rate}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      style={{ width: `${sub.rate}%` }}
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        sub.rate >= 85 ? 'bg-emerald-500' : sub.rate >= 60 ? 'bg-amber-500' : 'bg-destructive'
                      )}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                    <span>{sub.compliant} of {sub.total} Systems Compliant</span>
                    {sub.overdue > 0 && (
                      <span className="text-destructive font-semibold">{sub.overdue} Overdue</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Density Control Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Filter className="w-4 h-4 text-primary" /> Filter Results & Chart Density
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Type Filter */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Category</span>
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val as any)}>
              <SelectTrigger className="w-full text-xs h-9 bg-background">
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
              <SelectTrigger className="w-full text-xs h-9 bg-background">
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
              <SelectTrigger className="w-full text-xs h-9 bg-background">
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
              <SelectTrigger className="w-full text-xs h-9 bg-background font-medium">
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
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
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
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a855f7" />
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
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              System Average Comparison
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">Average accuracy per system</p>
          </div>

          {systemBreakdownData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl p-6 text-center">
              <p className="text-xs text-muted-foreground font-medium">No system data available</p>
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

      {/* History Log Table */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Score History Table
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
