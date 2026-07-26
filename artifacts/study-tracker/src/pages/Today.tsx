import { useState } from 'react';
import {
  useSubjects, useAllSystems, useAllPYQs,
  updateSystem, logCompletion, completeRevision, togglePYQYear,
} from '@/db/hooks';
import { Subject, StudySystem, SystemStatus, PYQYear } from '@/db/database';
import { ConfidenceDialog } from '@/components/ConfidenceDialog';
import {
  Check, CheckCircle2, Trophy, ChevronDown, ChevronRight,
  RotateCcw, AlertCircle, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isRevisionDue, isRevisionOverdue, daysOverdue } from '@/db/revisionEngine';

// ── Types ──────────────────────────────────────────────────────────────────

type ActionKind = 'revision-overdue' | 'revision-due';

interface ActionItem {
  kind:        ActionKind;
  system:      StudySystem;
  subject:     Subject;
  overdueDays?: number;
}

interface SubjectRow {
  subject:      Subject;
  systems:      StudySystem[];
  pyqYears:     PYQYear[];
  /** Systems with any actionable work (study or revision). */
  pendingSystemCount: number;
  /** True when PYQs are unlocked (all systems done) but not all years complete. */
  pyqsPending:  boolean;
  isComplete:   boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function systemHasAction(sys: StudySystem): boolean {
  return !sys.contentCompleted || !sys.qbankDone || isRevisionDue(sys);
}

// ── Action Required row ────────────────────────────────────────────────────

interface ActionRowProps {
  item:           ActionItem;
  onMarkRevision: (item: ActionItem) => void;
}

function ActionRow({ item, onMarkRevision }: ActionRowProps) {
  const isOverdue = item.kind === 'revision-overdue';
  return (
    <div className={cn(
      'bg-card rounded-2xl border shadow-sm p-3.5 flex items-center gap-3',
      isOverdue && 'border-destructive/30',
    )}>
      <button
        onClick={() => onMarkRevision(item)}
        className={cn(
          'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all duration-150 active:scale-90 group',
          isOverdue
            ? 'border-destructive/40 bg-destructive/5 hover:bg-destructive/15 hover:border-destructive'
            : 'border-amber-400/40 bg-amber-950/5 dark:bg-amber-950/15 hover:bg-amber-950/10 dark:hover:bg-amber-950/25 hover:border-amber-500/50',
        )}
      >
        <RotateCcw className={cn('w-3.5 h-3.5 transition-colors', isOverdue ? 'text-destructive/60 group-hover:text-destructive' : 'text-amber-500/60 group-hover:text-amber-500')} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{item.system.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-semibold', isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400')}>
            Revision
          </span>
          {isOverdue && item.overdueDays !== undefined && (
            <span className="flex items-center gap-0.5 text-[10px] text-destructive">
              <AlertCircle className="w-2.5 h-2.5" />{item.overdueDays}d overdue
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{item.subject.name}</span>
        </div>
      </div>
    </div>
  );
}

// ── System task rows (inside expanded subject) ─────────────────────────────

interface SystemTasksProps {
  sys:            StudySystem;
  subject:        Subject;
  onMarkStudy:    (sys: StudySystem, taskKey: 'contentCompleted' | 'qbankDone') => void;
  onMarkRevision: (sys: StudySystem, subject: Subject) => void;
}

function SystemTasks({ sys, subject, onMarkStudy, onMarkRevision }: SystemTasksProps) {
  const tasks = [
    { key: 'contentCompleted' as const, label: 'Content', done: sys.contentCompleted },
    { key: 'qbankDone'        as const, label: 'QBank',   done: sys.qbankDone },
  ];
  const pendingStudy = tasks.filter(t => !t.done);
  const revDue       = isRevisionDue(sys);
  const revOverdue   = isRevisionOverdue(sys);
  const overdueDays_ = daysOverdue(sys);

  if (pendingStudy.length === 0 && !revDue) return null;

  const stepColors: Record<string, string> = {
    contentCompleted: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    qbankDone:        'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/70 px-1 pt-0.5">{sys.name}</p>
      {pendingStudy.map(task => (
        <div key={task.key} className="bg-card rounded-xl border shadow-sm p-3 flex items-center gap-3">
          <button
            onClick={() => onMarkStudy(sys, task.key)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border-2 border-muted-foreground/25 bg-background hover:border-primary hover:bg-primary/10 active:scale-90 group transition-all duration-150"
          >
            <Check className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-semibold', stepColors[task.key])}>{task.label}</span>
            {task.key === 'contentCompleted' && sys.contentInitialized && !sys.contentCompleted && (
              <span className="text-[11px] text-muted-foreground tabular-nums">{sys.contentUnitsCompleted}/{sys.contentUnitsTotal}</span>
            )}
          </div>
        </div>
      ))}
      {revDue && (
        <div className={cn('bg-card rounded-xl border shadow-sm p-3 flex items-center gap-3', revOverdue && 'border-destructive/30')}>
          <button
            onClick={() => onMarkRevision(sys, subject)}
            className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-150 active:scale-90 group',
              revOverdue
                ? 'border-destructive/40 bg-destructive/5 hover:bg-destructive/15 hover:border-destructive'
                : 'border-amber-400/40 bg-amber-950/5 dark:bg-amber-950/15 hover:bg-amber-950/10 dark:hover:bg-amber-950/25 hover:border-amber-500/50',
            )}
          >
            <RotateCcw className={cn('w-3.5 h-3.5 transition-colors', revOverdue ? 'text-destructive/60 group-hover:text-destructive' : 'text-amber-500/60 group-hover:text-amber-500')} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-semibold', revOverdue ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400')}>
              Revision
            </span>
            {revOverdue && overdueDays_ > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-destructive"><AlertCircle className="w-2.5 h-2.5" />{overdueDays_}d overdue</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PYQ card (inside expanded subject) ────────────────────────────────────

interface PYQCardProps {
  subject:  Subject;
  years:    PYQYear[];
}

function PYQCard({ subject, years }: PYQCardProps) {
  const [expanded, setExpanded] = useState(false);
  const completed = years.filter(y => y.completed).length;
  const total     = years.length;

  const handleToggle = (year: PYQYear) => {
    togglePYQYear(year.id!, subject.id!, subject.name, year.year, year.completed);
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header — tap to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/30 transition-colors focus:outline-none"
      >
        {expanded
          ? <ChevronDown  className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />}
        <BookOpen className="w-3.5 h-3.5 text-gold shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-foreground">PYQs</span>
          <span className="text-[11px] text-muted-foreground ml-2">{completed} / {total} Years Completed</span>
        </div>
      </button>

      {/* Expanded year list */}
      <div className={cn(
        'grid transition-all duration-200 ease-in-out',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-1.5">
            {years.map(year => (
              <button
                key={year.id}
                onClick={() => handleToggle(year)}
                className="w-full flex items-center gap-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors px-1 text-left"
              >
                <div className={cn(
                  'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                  year.completed ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30',
                )}>
                  {year.completed && <Check className="w-3 h-3" />}
                </div>
                <span className={cn('text-xs font-medium', year.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {year.year}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subject row (collapsible) ─────────────────────────────────────────────────

interface SubjectSectionProps {
  row:             SubjectRow;
  expanded:        boolean;
  onToggle:        () => void;
  onMarkStudy:     (sys: StudySystem, taskKey: 'contentCompleted' | 'qbankDone') => void;
  onMarkRevision:  (sys: StudySystem, subject: Subject) => void;
}

function SubjectSection({ row, expanded, onToggle, onMarkStudy, onMarkRevision }: SubjectSectionProps) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  // Collapsed summary text
  const summaryText = (() => {
    if (row.isComplete) return 'Completed';
    if (row.pendingSystemCount === 0 && row.pyqsPending) return 'PYQs Pending';
    if (row.pendingSystemCount > 0 && row.pyqsPending) return `${row.pendingSystemCount} System${row.pendingSystemCount !== 1 ? 's' : ''} + PYQs Pending`;
    return `${row.pendingSystemCount} System${row.pendingSystemCount !== 1 ? 's' : ''} Pending`;
  })();

  const actionableSystems = row.systems.filter(systemHasAction);

  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors focus:outline-none"
      >
        <Chevron className="w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{row.subject.name}</p>
          <p className={cn('text-xs mt-0.5', row.isComplete ? 'text-primary dark:text-gold font-medium' : 'text-muted-foreground')}>
            {summaryText}
          </p>
        </div>
        <Link href={`/subjects/${row.subject.id}`} onClick={e => e.stopPropagation()}>
          <span className="text-[11px] text-primary font-medium hover:underline shrink-0 pr-1">View</span>
        </Link>
      </button>

      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-4">
            {/* System tasks */}
            {actionableSystems.map(sys => (
              <SystemTasks
                key={sys.id}
                sys={sys}
                subject={row.subject}
                onMarkStudy={onMarkStudy}
                onMarkRevision={onMarkRevision}
              />
            ))}

            {/* PYQ card — shown when unlocked + has years + not all done */}
            {row.pyqsPending && row.pyqYears.length > 0 && (
              <PYQCard subject={row.subject} years={row.pyqYears} />
            )}

            {row.isComplete && (
              <p className="text-sm text-muted-foreground text-center py-2">All done — great work!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Today() {
  const subjects = useSubjects();
  const systems  = useAllSystems();
  const allPyqs  = useAllPYQs();

  const [expanded,       setExpanded]       = useState<Record<number, boolean>>({});
  const [initSys,        setInitSys]        = useState<{ sys: StudySystem; subject: Subject; taskKey: 'contentCompleted' | 'qbankDone' } | null>(null);
  const [initValue,      setInitValue]      = useState('');
  const [revTarget,      setRevTarget]      = useState<{ sys: StudySystem; subject: Subject } | null>(null);
  const [showRevDialog,  setShowRevDialog]  = useState(false);

  const toggleSubject = (id: number) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Build Action Required list (revisions only) ────────────────────────────
  const sortedActions: ActionItem[] = [
    ...systems
      .filter(sys => isRevisionOverdue(sys))
      .map(sys => {
        const subject = subjects.find(s => s.id === sys.subjectId);
        if (!subject) return null;
        return { kind: 'revision-overdue' as const, system: sys, subject, overdueDays: daysOverdue(sys) };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.overdueDays ?? 0) - (a!.overdueDays ?? 0)) as ActionItem[],
    ...systems
      .filter(sys => isRevisionDue(sys) && !isRevisionOverdue(sys))
      .map(sys => {
        const subject = subjects.find(s => s.id === sys.subjectId);
        if (!subject) return null;
        return { kind: 'revision-due' as const, system: sys, subject };
      })
      .filter(Boolean)
      .sort((a, b) => a!.system.name.localeCompare(b!.system.name)) as ActionItem[],
  ];

  // ── Build subject rows ─────────────────────────────────────────────────────
  const subjectRows: SubjectRow[] = subjects
    .map(subject => {
      const subSystems  = systems.filter(s => s.subjectId === subject.id);
      const subPyqs     = allPyqs.filter(p => p.subjectId === subject.id);

      const allSystemsDone    = subSystems.length > 0 && subSystems.every(s => s.contentCompleted && s.qbankDone);
      const pendingSystemCount = subSystems.filter(systemHasAction).length;
      const pyqsUnlocked      = allSystemsDone;
      const allPyqsDone       = subPyqs.length > 0 && subPyqs.every(p => p.completed);
      const pyqsPending       = pyqsUnlocked && subPyqs.length > 0 && !allPyqsDone;

      // Subject is complete only when systems + PYQs are all done
      const isComplete =
        subSystems.length > 0 &&
        pendingSystemCount === 0 &&
        (subPyqs.length === 0 || allPyqsDone);

      return {
        subject,
        systems: subSystems,
        pyqYears: subPyqs,
        pendingSystemCount,
        pyqsPending,
        isComplete,
      };
    })
    .sort((a, b) => a.subject.name.localeCompare(b.subject.name));

  const nothingAtAll = sortedActions.length === 0 && subjectRows.length === 0;

  // ── Mark study step done ───────────────────────────────────────────────────
  const markStudyDone = (sys: StudySystem, taskKey: 'contentCompleted' | 'qbankDone') => {
    const subject = subjects.find(s => s.id === sys.subjectId)!;
    if (taskKey === 'contentCompleted') {
      if (!sys.contentInitialized) { setInitValue(''); setInitSys({ sys, subject, taskKey }); return; }
      const newCompleted = sys.contentUnitsCompleted + 1;
      const isNowDone    = newCompleted >= sys.contentUnitsTotal;
      updateSystem(sys.id!, { contentUnitsCompleted: newCompleted, contentCompleted: isNowDone });
      if (isNowDone) {
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
        logCompletion({ subjectId: subject.id!, subjectName: subject.name, systemId: sys.id!, systemName: sys.name, taskKey: 'contentDone', taskLabel: 'Content', completedAt: new Date() });
      }
    } else {
      updateSystem(sys.id!, { qbankDone: true });
      logCompletion({ subjectId: subject.id!, subjectName: subject.name, systemId: sys.id!, systemName: sys.name, taskKey: 'qbankDone', taskLabel: 'QBank', completedAt: new Date() });
    }
  };

  const handleInitSave = () => {
    if (!initSys) return;
    const total = parseInt(initValue, 10);
    if (!total || total <= 0) return;
    updateSystem(initSys.sys.id!, { contentInitialized: true, contentUnitsTotal: total, contentUnitsCompleted: 0, contentCompleted: false });
    setInitSys(null); setInitValue('');
  };

  const openRevDialog    = (sys: StudySystem, subject: Subject) => { setRevTarget({ sys, subject }); setShowRevDialog(true); };
  const markActionRev    = (item: ActionItem)                   => openRevDialog(item.system, item.subject);

  const handleRevisionConfidence = async (confidence: SystemStatus) => {
    setShowRevDialog(false);
    if (!revTarget) return;
    await completeRevision(revTarget.sys.id!, confidence, revTarget.subject.id!, revTarget.subject.name, revTarget.sys.name);
    setRevTarget(null);
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-24 max-w-2xl mx-auto flex flex-col relative">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Today's Focus</h1>
        <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide uppercase">What should you work on right now?</p>
      </header>

      {nothingAtAll ? (
        <div className="text-center py-20 px-4 bg-muted/20 rounded-3xl border border-dashed mt-4 flex flex-col items-center">
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75" />
            <div className="relative bg-primary text-primary-foreground rounded-full p-4 shadow-lg">
              <Trophy className="w-10 h-10" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">All caught up!</h2>
          <p className="text-muted-foreground mb-8 max-w-[280px]">No pending study steps and no revisions due. Take a well-deserved break.</p>
          <Link href="/">
            <button className="bg-card border shadow-sm px-6 py-3 rounded-xl font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />View Dashboard
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Action Required (revisions only) ──────────────────────────── */}
          {sortedActions.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 pl-1">Action Required</h2>
              <div className="space-y-2">
                {sortedActions.map((item, idx) => (
                  <ActionRow key={`${item.kind}-${item.system.id}-${idx}`} item={item} onMarkRevision={markActionRev} />
                ))}
              </div>
            </section>
          )}

          {/* ── Subjects ──────────────────────────────────────────────────── */}
          {subjectRows.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 pl-1">Subjects</h2>
              <div className="space-y-2">
                {subjectRows.map(row => (
                  <SubjectSection
                    key={row.subject.id}
                    row={row}
                    expanded={!!expanded[row.subject.id!]}
                    onToggle={() => toggleSubject(row.subject.id!)}
                    onMarkStudy={markStudyDone}
                    onMarkRevision={openRevDialog}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Content init dialog */}
      <Dialog open={!!initSys} onOpenChange={open => { if (!open) setInitSys(null); }}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle className="text-xl font-semibold">How many content units does this system have?</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input autoFocus type="number" min="1" placeholder="e.g. 15"
              value={initValue} onChange={e => setInitValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInitSave(); } }}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInitSys(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleInitSave} disabled={!initValue || parseInt(initValue, 10) <= 0} className="rounded-xl font-semibold px-8 shadow-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision confidence dialog */}
      <ConfidenceDialog
        open={showRevDialog}
        title="How well do you know this system?"
        subtitle={revTarget ? `Rate your confidence for ${revTarget.sys.name} after this revision.` : undefined}
        onSelect={handleRevisionConfidence}
        onClose={() => { setShowRevDialog(false); setRevTarget(null); }}
      />
    </div>
  );
}
