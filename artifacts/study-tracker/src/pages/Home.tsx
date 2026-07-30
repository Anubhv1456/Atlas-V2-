import { useRef, useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSubjects, useAllSystems, addSubject, updateSubject, deleteSubject, useCurrentStreak, setFocus, updateSubjectsOrder, useAllPYQs } from '@/db/hooks';
import { SubjectCard } from '@/components/SubjectCard';
import { EmptyStateGraphic } from '@/components/EmptyStateGraphic';
import { AddDialog } from '@/components/AddDialog';
import { FocusDialog } from '@/components/FocusDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, BookOpen, Layers, Search as SearchIcon, X, ChevronRight, Clock, AlertCircle, Target, XCircle, Activity, ArrowUpRight, CheckCircle, Lightbulb, Lock, Pencil, Flame, Award, Sparkles, TrendingUp, Brain } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { runSearch } from '@/lib/searchUtils';
import { isRevisionDue, isRevisionOverdue, sortSystemsByRevisionPriority, calculateDecayScore, daysOverdue, getRetrievability, getRetrievabilityHealth, getDailyRevisionQueue, getSystemDecayFactor } from '@/db/revisionEngine';
import { format } from 'date-fns';
import { StudySystem, Subject } from '@/db/database';
import { calculateOverallProgress, calculateSubjectProgress } from '@/lib/progress';
import { DailyAnkiCard } from '@/components/DailyAnkiCard';
// ── Inline result sub-components ──────────────────────────────────────────────

function StatusBadge({ sys }: { sys: StudySystem }) {
  const colors = {
    Strong:  'bg-transparent text-[hsl(var(--gold))] border-[hsl(var(--gold))]/50',
    Average: 'bg-transparent text-muted-foreground border-border',
    Weak:    'bg-transparent text-destructive border-destructive/50',
  };
  return (
    <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium border shrink-0', colors[sys.status])}>
      {sys.status}
    </span>
  );
}

function RevisionPill({ sys }: { sys: StudySystem }) {
  if (!sys.completionDate) return null;
  const retrievability = getRetrievability(sys);
  const health = getRetrievabilityHealth(retrievability);
  const decayFactor = getSystemDecayFactor(sys);

  if (isRevisionOverdue(sys)) return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive shrink-0 bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
      <AlertCircle className="w-2.5 h-2.5" />{retrievability}% ({daysOverdue(sys)}d overdue)
      {decayFactor !== 1.0 && <span className="opacity-80 font-mono">({decayFactor}x)</span>}
    </span>
  );
  if (isRevisionDue(sys)) return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 shrink-0 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
      <Clock className="w-2.5 h-2.5" />{retrievability}% Due today
      {decayFactor !== 1.0 && <span className="opacity-80 font-mono">({decayFactor}x)</span>}
    </span>
  );
  if (sys.nextRevisionDate) return (
    <span className={cn("flex items-center gap-1 text-[10px] font-semibold shrink-0 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/40", health.colorClass)}>
      <Brain className="w-2.5 h-2.5" />{retrievability}% Recall
      {decayFactor !== 1.0 && <span className="opacity-80 font-mono">({decayFactor}x)</span>}
    </span>
  );
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const subjects = useSubjects();
  const streak = useCurrentStreak();
  const systems  = useAllSystems();
  const pyqs = useAllPYQs();
  const [, setLocation] = useLocation();
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [subjectToRename, setSubjectToRename] = useState<Subject | null>(null);
  const [renameSubjectName, setRenameSubjectName] = useState('');

  const handleDeleteSubjectConfirm = async () => {
    if (subjectToDelete) {
      await deleteSubject(subjectToDelete.id!);
      setSubjectToDelete(null);
    }
  };

  const handleRenameSubjectSave = async () => {
    if (subjectToRename && renameSubjectName.trim()) {
      await updateSubject(subjectToRename.id!, renameSubjectName.trim());
      setSubjectToRename(null);
      setRenameSubjectName('');
    }
  };

  const handleSubjectDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(subjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id!,
      order: index
    }));

    await updateSubjectsOrder(updates);
  };

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]           = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setSearchOpen(true);
    // tiny delay so the input is mounted before we focus
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  // Live search results
  const results = useMemo(
    () => runSearch(query, subjects, systems),
    [query, subjects, systems],
  );

  const hasQuery   = query.trim().length > 0;
  const noResults  = hasQuery && results.subjects.length === 0 && results.systems.length === 0;

  // ── Overall Stats & Greetings ───────────────────────────────────────────────────
  const totalTasks = systems.length * 2;
  const completedTasks = systems.reduce((acc, sys) => {
    let done = 0;
    if (sys.contentCompleted) done++;
    if (sys.qbankDone) done++;
    return acc + done;
  }, 0);
  const overallProgress = calculateOverallProgress(systems);
  const pendingTasks    = totalTasks - completedTasks;
  const strongSystems   = systems.filter(sys => sys.status === 'Strong').length;

  const currentHour = new Date().getHours();
  let greeting = 'Good Evening';
  if (currentHour < 12) greeting = 'Good Morning';
  else if (currentHour < 17) greeting = 'Good Afternoon';

  const [focusDialogType, setFocusDialogType] = useState<'primary' | 'secondary' | null>(null);

  let primaryFocus = systems.find(s => s.focus === 'primary');
  let isAutoPrimary = false;

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Map subject ID to its index in subjects array (which reflects drag-and-drop order)
  const subjectIndexMap = new Map<number, number>();
  subjects.forEach((sub, idx) => {
    if (sub.id !== undefined) {
      subjectIndexMap.set(sub.id, idx);
    }
  });

  const sortSystemsByPriority = (a: StudySystem, b: StudySystem) => {
    const subIdxA = subjectIndexMap.get(a.subjectId) ?? Number.MAX_VALUE;
    const subIdxB = subjectIndexMap.get(b.subjectId) ?? Number.MAX_VALUE;
    if (subIdxA !== subIdxB) return subIdxA - subIdxB;
    return (a.order ?? Number.MAX_VALUE) - (b.order ?? Number.MAX_VALUE);
  };

  const sortedSystemsByPriority = [...systems].sort(sortSystemsByPriority);
  const incompleteSystems = sortedSystemsByPriority.filter(s => !(s.contentCompleted && s.qbankDone));

  if (!primaryFocus && incompleteSystems.length > 0) {
    primaryFocus = incompleteSystems[0];
    isAutoPrimary = true;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  // All revisions due today or overdue
  const allDueRevisions = systems.filter(s => isRevisionDue(s));

  // Revisions due or overdue (excluding system currently set as primary focus)
  const unsortedDueRevisions = systems.filter(s => 
    isRevisionDue(s) &&
    s.id !== primaryFocus?.id
  );

  // Highest priority revision sorted strictly by Knowledge Decay factor & overdue duration
  const dueRevisions = sortSystemsByRevisionPriority(unsortedDueRevisions, now);

  let customSecondary = systems.find(s => s.focus === 'secondary');
  let secondaryFocus: StudySystem | undefined = undefined;
  let isSecondaryOverriddenByRevision = false;
  let isAutoSecondary = false;

  if (dueRevisions.length > 0) {
    // Active revisions override secondary focus and suspend custom selection until completed
    secondaryFocus = dueRevisions[0];
    isSecondaryOverriddenByRevision = true;
    isAutoSecondary = true;
  } else if (customSecondary) {
    // Custom user-selected secondary focus
    secondaryFocus = customSecondary;
    isSecondaryOverriddenByRevision = false;
    isAutoSecondary = false;
  } else {
    // Fallback to top priority incomplete system (excluding primary focus)
    const remainingIncomplete = incompleteSystems.filter(s => s.id !== primaryFocus?.id);
    if (remainingIncomplete.length > 0) {
      secondaryFocus = remainingIncomplete[0];
      isAutoSecondary = true;
      isSecondaryOverriddenByRevision = false;
    }
  }

  // Calculate days overdue for active secondary revision
  let secondaryDaysOverdue = 0;
  if (isSecondaryOverriddenByRevision && secondaryFocus?.nextRevisionDate) {
    const revDate = new Date(secondaryFocus.nextRevisionDate);
    if (revDate < todayStart) {
      const diffTime = todayStart.getTime() - new Date(revDate.getFullYear(), revDate.getMonth(), revDate.getDate()).getTime();
      secondaryDaysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
  }

  // ── Smart Dynamic Knowledge Insights ───────────────────────────────────────
  interface Insight {
    id: string;
    confidence: number;
    badge: string;
    badgeClass: string;
    icon: JSX.Element;
    text: JSX.Element;
    actionLabel?: string;
    onAction?: () => void;
  }

  const insights = useMemo(() => {
    if (systems.length === 0 || subjects.length === 0) return [];

    const candidates: Insight[] = [];
    const now = new Date();

    // 1. KNOWLEDGE DECAY & REVISION DEBT (Highest Priority: 98-100)
    const sortedByDecay = sortSystemsByRevisionPriority(systems, now);
    const topDecaySystem = sortedByDecay[0];
    if (topDecaySystem && calculateDecayScore(topDecaySystem, now) > 0) {
      const sub = subjects.find(s => s.id === topDecaySystem.subjectId);
      const overdue = daysOverdue(topDecaySystem, now);
      const decayScore = calculateDecayScore(topDecaySystem, now);

      candidates.push({
        id: 'decay-critical',
        confidence: 98 + Math.min(decayScore, 2),
        badge: overdue > 0 ? 'CRITICAL DECAY' : 'REVISION DUE',
        badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: <AlertCircle className="w-4 h-4 text-destructive shrink-0" />,
        text: (
          <span>
            <strong className="text-foreground">{topDecaySystem.name}</strong> ({sub?.name}) has accumulated high recall decay ({overdue > 0 ? `${overdue}d overdue` : 'due today'}, {topDecaySystem.status} confidence).
          </span>
        ),
        actionLabel: 'Review Now',
        onAction: () => setLocation(`/subjects/${topDecaySystem.subjectId}?highlight=${topDecaySystem.id}`),
      });
    }

    // 2. PRIMARY FOCUS STEP AWAY (Confidence: 94)
    if (primaryFocus && !(primaryFocus.contentCompleted && primaryFocus.qbankDone)) {
      const sub = subjects.find(s => s.id === primaryFocus.subjectId);
      const missingTask = !primaryFocus.contentCompleted ? 'Content' : 'QBank';
      candidates.push({
        id: 'primary-focus-near',
        confidence: 94,
        badge: 'PRIMARY FOCUS',
        badgeClass: 'bg-primary/10 text-primary border-primary/20',
        icon: <Target className="w-4 h-4 text-primary shrink-0" />,
        text: (
          <span>
            Primary Focus <strong className="text-foreground">{primaryFocus.name}</strong> ({sub?.name}) is 1 task away from mastery ({missingTask} pending).
          </span>
        ),
        actionLabel: 'Complete Task',
        onAction: () => setLocation(`/subjects/${primaryFocus.subjectId}?highlight=${primaryFocus.id}`),
      });
    }

    // 3. SUBJECT COVERAGE IMBALANCE (Confidence: 88)
    const subjectStats = subjects.map(sub => {
      const subSys = systems.filter(s => s.subjectId === sub.id);
      const totalCount = subSys.length;
      const ratio = calculateSubjectProgress(subSys) / 100;
      return { sub, totalCount, ratio };
    }).filter(s => s.totalCount > 0);

    if (subjectStats.length >= 2) {
      subjectStats.sort((a, b) => b.ratio - a.ratio);
      const highest = subjectStats[0];
      const lowest = subjectStats[subjectStats.length - 1];

      if (highest.ratio >= 0.6 && lowest.ratio <= 0.25 && highest.sub.id !== lowest.sub.id) {
        candidates.push({
          id: 'coverage-imbalance',
          confidence: 88,
          badge: 'COVERAGE GAP',
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: <Activity className="w-4 h-4 text-amber-500 shrink-0" />,
          text: (
            <span>
              Study focus is skewed: <strong className="text-foreground">{highest.sub.name}</strong> is {Math.round(highest.ratio * 100)}% complete, while <strong className="text-foreground">{lowest.sub.name}</strong> lags at {Math.round(lowest.ratio * 100)}%.
            </span>
          ),
          actionLabel: `Focus ${lowest.sub.name}`,
          onAction: () => setLocation(`/subjects/${lowest.sub.id}`),
        });
      }
    }

    // 4. PYQ READINESS GAP (Confidence: 84)
    if (pyqs.length > 0) {
      for (const sub of subjects) {
        const subSys = systems.filter(s => s.subjectId === sub.id);
        const subPYQs = pyqs.filter(p => p.subjectId === sub.id);
        if (subSys.length > 0 && subPYQs.length > 0) {
          const sysRatio = calculateSubjectProgress(subSys) / 100;
          const pyqRatio = subPYQs.filter(p => p.completed).length / subPYQs.length;
          if (sysRatio >= 0.5 && pyqRatio <= 0.3) {
            candidates.push({
              id: `pyq-gap-${sub.id}`,
              confidence: 84,
              badge: 'EXAM READINESS',
              badgeClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
              icon: <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />,
              text: (
                <span>
                  You completed {Math.round(sysRatio * 100)}% of <strong className="text-foreground">{sub.name}</strong> topics but solved only {Math.round(pyqRatio * 100)}% of past year papers.
                </span>
              ),
              actionLabel: 'Solve PYQs',
              onAction: () => setLocation(`/subjects/${sub.id}`),
            });
            break;
          }
        }
      }
    }

    // 5. SUBJECT MASTERY MILESTONE (Confidence: 82)
    for (const sub of subjects) {
      const subSys = systems.filter(s => s.subjectId === sub.id);
      if (subSys.length > 1) {
        const incomplete = subSys.filter(s => !(s.contentCompleted && s.qbankDone));
        if (incomplete.length === 1) {
          const target = incomplete[0];
          candidates.push({
            id: `milestone-${sub.id}`,
            confidence: 82,
            badge: 'MASTERY MILESTONE',
            badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            icon: <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />,
            text: (
              <span>
                Only 1 system (<strong className="text-foreground">{target.name}</strong>) left to reach 100% completion in <strong className="text-foreground">{sub.name}</strong>!
              </span>
            ),
            actionLabel: 'Finish Subject',
            onAction: () => setLocation(`/subjects/${sub.id}?highlight=${target.id}`),
          });
          break;
        }
      }
    }

    // 6. PERFECT MOMENTUM & STREAK (Confidence: 70)
    const overdueCount = systems.filter(s => isRevisionOverdue(s)).length;
    if (overdueCount === 0 && streak > 0) {
      candidates.push({
        id: 'perfect-momentum',
        confidence: 70,
        badge: 'PEAK MOMENTUM',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        icon: <Flame className="w-4 h-4 text-amber-500 shrink-0" />,
        text: (
          <span>
            Zero overdue revisions and an active <strong className="text-foreground">{streak}-day streak</strong>! Your memory recall engine is running at peak efficiency.
          </span>
        ),
        actionLabel: 'View Timeline',
        onAction: () => setLocation('/timeline'),
      });
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates.slice(0, 2);
  }, [systems, subjects, pyqs, primaryFocus, streak, setLocation]);

  const handleSetFocus = (systemId: number) => {
    if (focusDialogType) {
      setFocus(systemId, focusDialogType);
    }
  };

  // Navigate to a system (open its parent subject with highlight)
  const goToSystem = (subjectId: number, systemId: number) => {
    closeSearch();
    setLocation(`/subjects/${subjectId}?highlight=${systemId}`);
  };

  const goToSubject = (subjectId: number) => {
    closeSearch();
    setLocation(`/subjects/${subjectId}`);
  };

  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-28 max-w-2xl mx-auto flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative z-10 flex-1 flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-8 flex items-center justify-between">
          <div className={cn(
            'transition-all duration-300 flex items-center gap-3.5',
            searchOpen ? 'opacity-0 scale-95 pointer-events-none w-0 overflow-hidden' : 'opacity-100 scale-100'
          )}>
            <img src="/logo.svg?v=4" alt="Atlas Logo" className="w-12 h-12 rounded-[14px] shadow-sm border border-border/50 object-contain transition-transform hover:scale-105 active:scale-95" />
            <div>
              <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3 h-3" /> Medical Mastery Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{greeting}</h1>
            </div>
          </div>

          {/* Search input — shown when open */}
          <div className={cn(
            'transition-all duration-300 flex-1 flex justify-end',
            searchOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          )}>
            <div className="relative w-full max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }}
                placeholder="Search subjects, systems, or tags..."
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-card border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans text-foreground shadow-sm"
              />
            </div>
          </div>

          {/* Icon toggle */}
          <button
            onClick={searchOpen ? closeSearch : openSearch}
            className="ml-3 shrink-0 w-10 h-10 rounded-xl border border-border/60 bg-card flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground shadow-sm"
            aria-label={searchOpen ? 'Close search' : 'Open search'}
          >
            {searchOpen
              ? <X className="w-5 h-5" />
              : <SearchIcon className="w-5 h-5" />
            }
          </button>
        </header>

        {/* ── Search results ─────────────────────────────────────────────────── */}
        {searchOpen ? (
          <div className="space-y-6 flex-1">
            {!hasQuery && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">Search subjects, systems, or status...</p>
              </div>
            )}

            {noResults && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-medium">No results found.</p>
              </div>
            )}

            {/* Subject results */}
            {results.subjects.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Subjects
                </h3>
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {results.subjects.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => goToSubject(sub.id!)}
                      className="w-full p-4 hover:bg-muted/30 transition-colors flex items-center justify-between text-left group"
                    >
                      <span className="font-medium text-foreground">{sub.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* System results */}
            {results.systems.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Systems
                </h3>
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {results.systems.map(sys => (
                    <button
                      key={sys.id}
                      onClick={() => goToSystem(sys.subjectId, sys.id!)}
                      className="w-full p-4 hover:bg-muted/30 transition-colors flex items-center gap-3 text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{sys.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sys.subjectName}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge sys={sys} />
                        <RevisionPill sys={sys} />
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <>
            {/* ── KPI Overview Grid ────────────────────────────────────────────── */}
            <section className="mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Active Streak */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-500 transition-colors">Study Streak</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Flame className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                      {streak} <span className="text-xs font-sans font-normal text-muted-foreground">{streak === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Consecutive active study</div>
                  </div>
                </div>

                {/* Overall Completion */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Mastery Index</span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                      {overallProgress}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{completedTasks}/{totalTasks} objectives done</div>
                  </div>
                </div>

                {/* Strong Systems */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-500 transition-colors">High Mastery</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                      {strongSystems} <span className="text-xs font-sans font-normal text-muted-foreground">/ {systems.length}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Validated topic systems</div>
                  </div>
                </div>

                {/* Due Revisions */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-sky-500 transition-colors">Spaced Recall</span>
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                      {allDueRevisions.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Pending memory passes</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Focus for Today ───────────────────────── */}
            <section className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Daily High-Yield Focus
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Primary Focus */}
                <div className="bg-card rounded-2xl border border-primary/20 shadow-sm overflow-hidden relative flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5 truncate">
                        {isAutoPrimary ? (
                          <><Target className="w-3 h-3 shrink-0" /> Recommended Focus</>
                        ) : (
                          "Primary Focus"
                        )}
                      </p>
                      {primaryFocus && (
                        <div className="flex items-center gap-1 shrink-0">
                          {!isAutoPrimary ? (
                            <button
                              onClick={() => setFocus(primaryFocus.id!, null)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted/50"
                              title="Remove custom primary focus"
                              aria-label="Remove custom primary focus"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setFocusDialogType('primary')}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted/50"
                              title="Customize primary focus"
                              aria-label="Customize primary focus"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {primaryFocus ? (
                      <button onClick={() => goToSystem(primaryFocus.subjectId, primaryFocus.id!)} className="text-left group w-full">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
                          {primaryFocus.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {subjects.find(s => s.id === primaryFocus.subjectId)?.name}
                        </p>
                      </button>
                    ) : (
                      <button
                        onClick={() => setFocusDialogType('primary')}
                        className="w-full py-3 mt-1 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Select System
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Focus */}
                <div className="bg-card rounded-2xl border border-amber-500/20 shadow-sm overflow-hidden relative flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/80" />

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 truncate">
                        {isSecondaryOverriddenByRevision ? (
                          <Clock className="w-3 h-3 shrink-0" />
                        ) : (
                          <Target className="w-3 h-3 shrink-0" />
                        )}
                        Secondary Focus
                      </p>

                      {secondaryFocus && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* When customization is suspended due to revision, X disappears completely */}
                          {!isSecondaryOverriddenByRevision && (
                            !isAutoSecondary ? (
                              <button
                                onClick={() => setFocus(secondaryFocus.id!, null)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted/50"
                                title="Remove custom secondary focus"
                                aria-label="Remove custom secondary focus"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setFocusDialogType('secondary')}
                                className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-1 rounded-md hover:bg-muted/50"
                                title="Customize secondary focus"
                                aria-label="Customize secondary focus"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {secondaryFocus ? (
                      <button onClick={() => goToSystem(secondaryFocus.subjectId, secondaryFocus.id!)} className="text-left group w-full">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 text-sm leading-snug">
                            {secondaryFocus.name}
                          </p>
                          {isSecondaryOverriddenByRevision && (
                            <span className="shrink-0 text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-semibold border border-amber-500/20">
                              {secondaryDaysOverdue > 0 ? `Overdue ${secondaryDaysOverdue}d` : 'Revision Due'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {subjects.find(s => s.id === secondaryFocus.subjectId)?.name}
                        </p>
                      </button>
                    ) : (
                      <button
                        onClick={() => setFocusDialogType('secondary')}
                        className="w-full py-3 mt-1 border border-dashed border-amber-500/30 rounded-xl text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Select System
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Daily Anki Review Pass ────────────────────────────────────────── */}
            <section className="mb-8">
              <DailyAnkiCard subjects={subjects} systems={systems} />
            </section>

            {/* ── Knowledge Insights ──────────────────────────────────────────────── */}
            {insights.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Strategic Insights
                </h2>
                <div className="grid gap-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border/80 shadow-sm transition-all hover:border-primary/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 p-2 bg-muted/50 rounded-xl border border-border/50">
                          {insight.icon}
                        </div>
                        <div className="space-y-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border inline-block ${insight.badgeClass}`}>
                            {insight.badge}
                          </span>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {insight.text}
                          </p>
                        </div>
                      </div>
                      {insight.actionLabel && insight.onAction && (
                        <button
                          onClick={insight.onAction}
                          className="shrink-0 self-end sm:self-center px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors flex items-center gap-1 border border-primary/20 cursor-pointer"
                        >
                          {insight.actionLabel} <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}



            {/* ── Subjects list ─────────────────────────────────────────────── */}
            <section className="flex-1">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Subject Portfolio
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/40">
                    {subjects.length}
                  </span>
                </div>
              </div>

              {subjects.length === 0 ? (
                <EmptyStateGraphic
                  icon={BookOpen}
                  title="Your Subject Library is Empty"
                  description="Add your first core medical or academic subject to organize topics, systems, and track revision schedules."
                  action={
                    <Button onClick={() => setShowAddSubject(true)} size="sm" className="gap-1.5 rounded-xl shadow-xs">
                      <Plus className="w-4 h-4" /> Add First Subject
                    </Button>
                  }
                />
              ) : (
                <DragDropContext onDragEnd={handleSubjectDragEnd}>
                  <Droppable droppableId="subjects-list">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="grid gap-3"
                      >
                        {subjects.map((subject, index) => (
                          <Draggable
                            key={subject.id}
                            draggableId={String(subject.id)}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <SubjectCard
                                  subject={subject}
                                  systems={systems.filter(s => s.subjectId === subject.id)}
                                  dragHandleProps={provided.dragHandleProps}
                                  onDelete={(sub) => setSubjectToDelete(sub)}
                                  onRename={(sub) => { setSubjectToRename(sub); setRenameSubjectName(sub.name); }}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </section>

            {subjects.length > 0 && (
              <button
                onClick={() => setShowAddSubject(true)}
                className="fixed bottom-24 right-6 w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center hover:bg-primary/20 transition-all z-40 backdrop-blur-sm"
                aria-label="Add Subject"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      <AddDialog
        open={showAddSubject}
        onOpenChange={setShowAddSubject}
        title="New Subject"
        placeholder="e.g. Internal Medicine"
        onSave={addSubject}
      />
      <FocusDialog
        open={focusDialogType !== null}
        onOpenChange={(isOpen) => !isOpen && setFocusDialogType(null)}
        title={`Set ${focusDialogType === 'primary' ? 'Primary' : 'Secondary'} Focus`}
        systems={systems}
        subjects={subjects}
        onSelect={handleSetFocus}
      />

      {/* Rename Subject dialog */}
      <Dialog open={!!subjectToRename} onOpenChange={(open) => { if (!open) setSubjectToRename(null); }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Rename Subject</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              value={renameSubjectName}
              onChange={e => setRenameSubjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameSubjectSave(); }}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubjectToRename(null)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleRenameSubjectSave}
              disabled={!renameSubjectName.trim() || renameSubjectName === subjectToRename?.name}
              className="rounded-xl font-semibold px-8 shadow-sm"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subject confirmation dialog */}
      <Dialog open={!!subjectToDelete} onOpenChange={(open) => { if (!open) setSubjectToDelete(null); }}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Delete Subject</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{subjectToDelete?.name}</strong>?
            </p>
            <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 leading-relaxed font-medium">
              ⚠️ This will permanently delete this subject along with all its systems, task progress, revision schedules, and PYQ records.
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSubjectToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handleDeleteSubjectConfirm}>
              Delete Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
