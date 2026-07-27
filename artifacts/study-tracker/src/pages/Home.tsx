import { useRef, useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSubjects, useAllSystems, addSubject, useCurrentStreak, setFocus, updateSubjectsOrder } from '@/db/hooks';
import { SubjectCard } from '@/components/SubjectCard';
import { AddDialog } from '@/components/AddDialog';
import { FocusDialog } from '@/components/FocusDialog';
import { Plus, BookOpen, Layers, Search as SearchIcon, X, ChevronRight, Clock, AlertCircle, Target, XCircle, Activity, ArrowUpRight, CheckCircle, Lightbulb, Lock, Pencil } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { runSearch } from '@/lib/searchUtils';
import { isRevisionDue, isRevisionOverdue } from '@/db/revisionEngine';
import { format } from 'date-fns';
import { StudySystem } from '@/db/database';
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
  if (isRevisionOverdue(sys)) return (
    <span className="flex items-center gap-0.5 text-[10px] text-destructive font-semibold shrink-0">
      <AlertCircle className="w-2.5 h-2.5" />Overdue
    </span>
  );
  if (isRevisionDue(sys)) return (
    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-500 font-semibold shrink-0">
      <Clock className="w-2.5 h-2.5" />Due today
    </span>
  );
  if (sys.nextRevisionDate) return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
      <Clock className="w-2.5 h-2.5" />{format(new Date(sys.nextRevisionDate), 'MMM d')}
    </span>
  );
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const subjects = useSubjects();
  const streak = useCurrentStreak();
  const systems  = useAllSystems();
  const [, setLocation] = useLocation();
  const [showAddSubject, setShowAddSubject] = useState(false);

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
  const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
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

  // Revisions due or overdue (excluding system currently set as primary focus)
  const dueRevisions = systems.filter(s => 
    s.nextRevisionDate && 
    new Date(s.nextRevisionDate) <= todayEnd &&
    s.id !== primaryFocus?.id
  );

  // Highest priority revision: the one due for the longest (earliest nextRevisionDate)
  dueRevisions.sort((a, b) => new Date(a.nextRevisionDate!).getTime() - new Date(b.nextRevisionDate!).getTime());

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

  // ── Knowledge Insights ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (systems.length === 0 || subjects.length === 0) return [];
    
    // An insight exists to eliminate a decision.
    // If it does not change what the user should do next, it is not an insight.
    
    interface Insight {
      id: string;
      confidence: number;
      icon: JSX.Element;
      text: JSX.Element;
    }
    
    const candidates: Insight[] = [];
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
    
    const overdueSystems = systems.filter(s => isRevisionOverdue(s));
    const dueTomorrowSystems = systems.filter(s => s.nextRevisionDate && new Date(s.nextRevisionDate) > todayEnd && new Date(s.nextRevisionDate) <= tomorrowEnd);
    const allCompletedSystems = systems.filter(s => s.contentCompleted && s.qbankDone);
    
    // 1. REVISIONS & BACKLOG (High Confidence)
    // Mutually exclusive: We only generate ONE revision-related insight.
    if (overdueSystems.length > 0) {
      const overdueCountsBySubject = subjects.map(sub => ({
        sub, count: overdueSystems.filter(s => s.subjectId === sub.id).length
      })).sort((a, b) => b.count - a.count);
      
      const biggestOverdue = overdueCountsBySubject[0];
      
      if (overdueSystems.length === 1) {
        candidates.push({
          id: 'overdue-one',
          confidence: 90,
          icon: <AlertCircle className="w-4 h-4 text-destructive" />,
          text: <span>Clearing today's single overdue revision will completely eliminate your revision backlog.</span>
        });
      } else if (biggestOverdue && biggestOverdue.count > 0 && biggestOverdue.count === overdueSystems.length) {
        candidates.push({
          id: 'overdue-single-subject',
          confidence: 95,
          icon: <AlertCircle className="w-4 h-4 text-destructive" />,
          text: <span><strong className="text-foreground">{biggestOverdue.sub.name}'s</strong> overdue revisions are your highest priority. Clearing them today removes your entire backlog.</span>
        });
      } else if (biggestOverdue && biggestOverdue.count > 0 && biggestOverdue.count / overdueSystems.length >= 0.5) {
        const pct = Math.round((biggestOverdue.count / overdueSystems.length) * 100);
        candidates.push({
          id: 'overdue-dominant',
          confidence: 92,
          icon: <AlertCircle className="w-4 h-4 text-destructive" />,
          text: <span>Completing the overdue revisions in <strong className="text-foreground">{biggestOverdue.sub.name}</strong> will remove {pct}% of your entire backlog.</span>
        });
      } else {
        candidates.push({
          id: 'overdue-many',
          confidence: 88,
          icon: <AlertCircle className="w-4 h-4 text-destructive" />,
          text: <span>Clearing your <strong className="text-foreground">{overdueSystems.length}</strong> overdue revisions should be your highest priority to prevent further memory decay.</span>
        });
      }
    } else if (dueTomorrowSystems.length > 0) {
      candidates.push({
        id: 'due-tomorrow',
        confidence: 75,
        icon: <Clock className="w-4 h-4 text-amber-500" />,
        text: <span>Your <strong className="text-foreground">{dueTomorrowSystems.length}</strong> revision{dueTomorrowSystems.length > 1 ? 's' : ''} due tomorrow should take priority before starting new content.</span>
      });
    }

    // 2. MILESTONES & PROGRESS (Medium-High Confidence)
    // Mutually exclusive: We only generate the single most impactful milestone across all subjects.
    let bestMilestone: Insight | null = null;
    let subjectsAbove75 = 0;
    
    // 3. NEGLECT / INACTIVITY (Medium Confidence)
    // Mutually exclusive: We only highlight the single most neglected subject.
    let worstInactivity: Insight & { days: number } | null = null;
    
    subjects.forEach(sub => {
      const subSystems = systems.filter(s => s.subjectId === sub.id);
      if (subSystems.length === 0) return;
      
      const completeCount = subSystems.filter(s => s.contentCompleted && s.qbankDone).length;
      const total = subSystems.length;
      const pct = completeCount / total;
      const oneMorePct = (completeCount + 1) / total;
      
      if (pct >= 0.75) subjectsAbove75++;
      
      // Milestones
      if (completeCount < total) {
        if (completeCount === total - 1 && total > 1) {
          const incompleteSystem = subSystems.find(s => !(s.contentCompleted && s.qbankDone));
          const candidate: Insight = {
            id: `milestone-100-${sub.id}`,
            confidence: 85,
            icon: <Target className="w-4 h-4 text-primary" />,
            text: <span>You are exactly one system (<strong className="text-foreground">{incompleteSystem?.name}</strong>) away from completely mastering {sub.name}.</span>
          };
          if (!bestMilestone || candidate.confidence > bestMilestone.confidence) bestMilestone = candidate;
        } else if (pct < 0.75 && oneMorePct >= 0.75) {
          const candidate: Insight = {
            id: `milestone-75-${sub.id}`,
            confidence: 75,
            icon: <ArrowUpRight className="w-4 h-4 text-primary" />,
            text: <span>One more completed system will make <strong className="text-foreground">{sub.name}</strong> your {subjectsAbove75 === 0 ? 'first' : 'next'} subject above 75%.</span>
          };
          if (!bestMilestone || candidate.confidence > bestMilestone.confidence) bestMilestone = candidate;
        } else if (pct < 0.5 && oneMorePct >= 0.5) {
          const candidate: Insight = {
            id: `milestone-50-${sub.id}`,
            confidence: 65,
            icon: <ArrowUpRight className="w-4 h-4 text-primary" />,
            text: <span>Completing one more system will bring <strong className="text-foreground">{sub.name}</strong> to exactly half completion.</span>
          };
          if (!bestMilestone || candidate.confidence > bestMilestone.confidence) bestMilestone = candidate;
        }
      }
      
      // Inactivity
      if (pct < 1 && pct > 0) {
        const lastActivity = Math.max(...subSystems.map(s => new Date(s.updatedAt).getTime()));
        const daysInactive = Math.floor((now.getTime() - lastActivity) / (1000 * 3600 * 24));
        if (daysInactive >= 10) {
          if (!worstInactivity || daysInactive > worstInactivity.days) {
            worstInactivity = {
              id: `inactive-${sub.id}`,
              confidence: 80,
              icon: <Clock className="w-4 h-4 text-muted-foreground" />,
              text: <span><strong className="text-foreground">{sub.name}</strong> hasn't been studied for {daysInactive} days. Reviewing it today will prevent knowledge loss.</span>,
              days: daysInactive
            };
          }
        }
      }
    });

    if (bestMilestone) candidates.push(bestMilestone);
    if (worstInactivity) candidates.push(worstInactivity);

    // 4. WEAK / CELEBRATORY (Low Confidence)
    const strongSubjects = subjects.filter(sub => {
      const subSys = systems.filter(s => s.subjectId === sub.id);
      return subSys.length > 0 && subSys.every(s => s.status === 'Strong' && s.contentCompleted && s.qbankDone);
    });
    
    if (strongSubjects.length > 0) {
      const sub = strongSubjects[0];
      candidates.push({
        id: `mastery-${sub.id}`,
        confidence: 45, // Low confidence because it doesn't drive a new action
        icon: <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))]" />,
        text: <span>Through consistent effort, <strong className="text-foreground">{sub.name}</strong> has now become one of your strongest subjects.</span>
      });
    }

    if (overdueSystems.length === 0 && allCompletedSystems.length > 0) {
      candidates.push({
        id: 'consistency',
        confidence: 40,
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        text: <span>You are currently maintaining excellent revision consistency with absolutely no overdue systems.</span>
      });
    }

    // 5. FILTER AND SELECT
    // Confidence < 40: Never generate
    // Confidence 40-69: Don't show unless nothing better exists
    // Confidence 70-89: Show if space exists
    // Confidence 90-100: Must show

    const validCandidates = candidates
      .filter(c => c.confidence >= 40)
      .sort((a, b) => b.confidence - a.confidence);
    
    const finalInsights: Insight[] = [];
    
    for (const insight of validCandidates) {
      if (insight.confidence >= 90) {
        finalInsights.push(insight);
      } else if (insight.confidence >= 70 && finalInsights.length < 2) {
        finalInsights.push(insight);
      } else if (insight.confidence >= 40 && finalInsights.length === 0) {
        finalInsights.push(insight);
      }
    }

    // Cap at 2 insights max to maintain extreme focus and eliminate noise
    return finalInsights.slice(0, 2);
  }, [systems, subjects]);

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
        <header className="mb-10 flex items-center justify-between">
          <div className={cn(
            'transition-all duration-300 flex items-center gap-3',
            searchOpen ? 'opacity-0 scale-95 pointer-events-none w-0 overflow-hidden' : 'opacity-100 scale-100'
          )}>
            <img src="/logo.svg?v=4" alt="Atlas Logo" className="w-12 h-12 rounded-[14px] drop-shadow-md object-contain transition-transform hover:scale-105 active:scale-95" />
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">{greeting}</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide uppercase">
                Current Streak: <span className="text-foreground">{streak} {streak === 1 ? "Day" : "Days"}</span>
              </p>
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
                placeholder="Search library..."
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-card border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans text-foreground"
              />
            </div>
          </div>

          {/* Icon toggle */}
          <button
            onClick={searchOpen ? closeSearch : openSearch}
            className="ml-4 shrink-0 w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
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
            {/* ── Focus for Today ───────────────────────── */}
            <section className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Focus for Today
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

            {/* ── Knowledge Insights ──────────────────────────────────────────────── */}
            {insights.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5" /> Insights
                </h2>
                <div className="grid gap-2">
                  {insights.map((insight) => (
                    <div key={insight.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm">
                      <div className="shrink-0 p-1.5 bg-background rounded-md border border-border/50 shadow-sm">
                        {insight.icon}
                      </div>
                      <p className="text-muted-foreground leading-snug">
                        {insight.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Progress Rings (Quiet Confidence) ───────────────────────── */}
            <section className="mb-12 flex justify-center gap-10">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" className="stroke-primary transition-all duration-1000 ease-in-out" 
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * overallProgress) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono text-foreground">{overallProgress}%</span>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completion</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" style={{ stroke: 'hsl(var(--gold))' }} className="transition-all duration-1000 ease-in-out" 
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={systems.length ? 283 - (283 * strongSystems) / systems.length : 283}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono text-foreground">{systems.length ? Math.round((strongSystems / systems.length) * 100) : 0}%</span>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strong</span>
              </div>
            </section>

            {/* ── Subjects list ─────────────────────────────────────────────── */}
            <section className="flex-1">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Library</h2>
              </div>

              {subjects.length === 0 ? (
                <div className="text-center py-12 px-4 border border-border/50 rounded-xl bg-card/30">
                  <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 opacity-50">
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">The library is empty.</p>
                  <button
                    onClick={() => setShowAddSubject(true)}
                    className="mt-6 text-primary hover:text-primary/80 transition-colors text-sm font-medium tracking-wide uppercase"
                  >
                    + Add Subject
                  </button>
                </div>
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
    </div>
  );
}
