import { useRef, useState, useMemo } from 'react';
import { useSubjects, useAllSystems, addSubject, useCurrentStreak, setFocus } from '@/db/hooks';
import { SubjectCard } from '@/components/SubjectCard';
import { AddDialog } from '@/components/AddDialog';
import { FocusDialog } from '@/components/FocusDialog';
import { Plus, BookOpen, Layers, Search as SearchIcon, X, ChevronRight, Clock, AlertCircle, Target, XCircle } from 'lucide-react';
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

  const primaryFocus = systems.find(s => s.focus === 'primary');
  let secondaryFocus = systems.find(s => s.focus === 'secondary');
  let isAutoSecondary = false;

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const dueRevisions = systems.filter(s => 
    s.nextRevisionDate && 
    new Date(s.nextRevisionDate) <= todayEnd &&
    s.id !== primaryFocus?.id
  );

  if (dueRevisions.length > 0) {
    dueRevisions.sort((a, b) => new Date(a.nextRevisionDate!).getTime() - new Date(b.nextRevisionDate!).getTime());
    secondaryFocus = dueRevisions[0];
    isAutoSecondary = true;
  }

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
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-28 max-w-2xl mx-auto flex flex-col relative overflow-hidden">
      <div className="relative z-10 flex-1 flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-10 flex items-center justify-between">
          <div className={cn(
            'transition-all duration-300',
            searchOpen ? 'opacity-0 scale-95 pointer-events-none w-0 overflow-hidden' : 'opacity-100 scale-100'
          )}>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">{greeting}</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide uppercase">
              Current Streak: <span className="text-foreground">{streak} {streak === 1 ? "Day" : "Days"}</span>
            </p>
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
            <section className="mb-12">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Focus for Today
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Primary Focus */}
                <div className="bg-card rounded-2xl border border-primary/20 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Primary Focus</p>
                    {primaryFocus ? (
                      <div className="flex items-start justify-between">
                        <button onClick={() => goToSystem(primaryFocus.subjectId, primaryFocus.id!)} className="text-left group flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {primaryFocus.name}
                          </p>
                        </button>
                        <button
                          onClick={() => setFocus(primaryFocus.id!, null)}
                          className="ml-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          aria-label="Remove primary focus"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
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
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">
                  {isAutoSecondary && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50" />}
                  <div className="p-4">
                    <p className={cn(
                      "text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5",
                      isAutoSecondary ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                    )}>
                      {isAutoSecondary ? (
                        <><Clock className="w-3 h-3" /> Revision Due</>
                      ) : (
                        "Secondary Focus"
                      )}
                    </p>
                    {secondaryFocus ? (
                      <div className="flex items-start justify-between">
                        <button onClick={() => goToSystem(secondaryFocus.subjectId, secondaryFocus.id!)} className="text-left group flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {secondaryFocus.name}
                          </p>
                        </button>
                        {!isAutoSecondary && (
                          <button
                            onClick={() => setFocus(secondaryFocus.id!, null)}
                            className="ml-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            aria-label="Remove secondary focus"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setFocusDialogType('secondary')}
                        className="w-full py-3 mt-1 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Select System
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

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
                <div className="grid gap-3">
                  {subjects.map(subject => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      systems={systems.filter(s => s.subjectId === subject.id)}
                    />
                  ))}
                </div>
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
