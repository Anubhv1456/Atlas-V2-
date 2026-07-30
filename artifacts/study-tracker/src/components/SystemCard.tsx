import { useEffect, useRef, useState } from 'react';
import { StudySystem, SystemStatus } from '@/db/database';
import { updateSystem, deleteSystem, logCompletion, recordInitialEvaluation, completeRevision } from '@/db/hooks';
import { ProgressBar } from './ProgressBar';
import { ConfidenceDialog } from './ConfidenceDialog';
import { ScoreLogModal } from './ScoreLogModal';
import { ChevronDown, Trash2, Check, RotateCcw, Clock, GripVertical, CheckCircle2, Award, Sliders, MoreVertical, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, formatDistanceToNow } from 'date-fns';
import { isRevisionDue, isRevisionOverdue, daysOverdue, getRetrievability, getRetrievabilityHealth, DECAY_CALIBRATION_PRESETS, getSystemDecayFactor } from '@/db/revisionEngine';
import { calculateSystemProgress } from '@/lib/progress';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface SystemCardProps {
  system: StudySystem;
  subjectName: string;
  highlighted?: boolean;
  dragHandleProps?: any;
}

// ── Circular progress ring ────────────────────────────────────────────────────
function ContentCircle({ pct }: { pct: number }) {
  const r = 9;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="11" cy="11" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground/25" />
      {pct > 0 && (
        <circle cx="11" cy="11" r={r} fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className="text-primary transition-all duration-300" />
      )}
    </svg>
  );
}

// ── SystemCard ────────────────────────────────────────────────────────────────
export function SystemCard({ system, subjectName, highlighted, dragHandleProps }: SystemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Content dialogs
  const [showInitDialog, setShowInitDialog]   = useState(false);
  const [initValue, setInitValue]             = useState('');
  const [showEditContent, setShowEditContent] = useState(false);
  const [editCompleted, setEditCompleted]     = useState('');
  const [editTotal, setEditTotal]             = useState('');

  // Initial evaluation (shown once both tasks complete)
  const [showEvalDialog, setShowEvalDialog]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScoreModal, setShowScoreModal]       = useState(false);
  const [showDecayCalibration, setShowDecayCalibration] = useState(false);

  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue]             = useState(system.name);

  // Guard to prevent re-triggering if already open
  const evalShownRef = useRef(false);

  // Long-press detection for Content row
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress    = useRef(false);

  // ── Auto-expand + scroll when navigated from search ──────────────────────
  useEffect(() => {
    if (highlighted && cardRef.current) {
      setExpanded(true);
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  }, [highlighted]);

  // ── Detect first full completion ──────────────────────────────────────────
  useEffect(() => {
    if (
      system.contentCompleted &&
      system.qbankDone &&
      !system.completionDate &&
      !evalShownRef.current
    ) {
      evalShownRef.current = true;
      setShowEvalDialog(true);
    }
  }, [system.contentCompleted, system.qbankDone, system.completionDate]);

  // Progress
  const progress       = calculateSystemProgress(system);
  const completedCount = (system.contentCompleted ? 1 : 0) + (system.qbankDone ? 1 : 0);
  const contentPct     =
    system.contentInitialized && system.contentUnitsTotal > 0
      ? (system.contentUnitsCompleted / system.contentUnitsTotal) * 100
      : (system.contentCompleted ? 100 : 0);

  // Revision state
  const revisionDue      = isRevisionDue(system);
  const revisionOverdue  = isRevisionOverdue(system);
  const overdueDays      = daysOverdue(system);

  // ── Content tap ───────────────────────────────────────────────────────────
  const handleContentTap = () => {
    if (isLongPress.current) return;
    if (!system.contentInitialized) { setInitValue(''); setShowInitDialog(true); return; }
    if (system.contentCompleted) {
      setEditCompleted(String(system.contentUnitsCompleted));
      setEditTotal(String(system.contentUnitsTotal));
      setShowEditContent(true);
      return;
    }

    const newCompleted = system.contentUnitsCompleted + 1;
    const isNowDone    = newCompleted >= system.contentUnitsTotal;
    updateSystem(system.id!, { contentUnitsCompleted: newCompleted, contentCompleted: isNowDone });

    logCompletion({
      subjectId: system.subjectId,
      subjectName,
      systemId: system.id!,
      systemName: system.name,
      taskKey: isNowDone ? 'contentDone' : 'contentProgress',
      taskLabel: system.contentUnitsTotal > 0 ? `Content (${newCompleted}/${system.contentUnitsTotal})` : 'Content',
      completedAt: new Date(),
    });

    if (isNowDone) {
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#eab308', '#f59e0b', '#d97706'] });
    }
  };

  const handleContentPointerDown = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      setEditCompleted(String(system.contentUnitsCompleted));
      setEditTotal(String(system.contentUnitsTotal));
      setShowEditContent(true);
    }, 500);
  };
  const handleContentPointerUp    = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const handleContentPointerLeave = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // ── Content init / edit ───────────────────────────────────────────────────
  const handleInitSave = () => {
    const total = parseInt(initValue, 10);
    if (!total || total <= 0) return;
    updateSystem(system.id!, { contentInitialized: true, contentUnitsTotal: total, contentUnitsCompleted: 0, contentCompleted: false });
    setShowInitDialog(false); setInitValue('');
  };

  const handleEditSave = () => {
    const total = parseInt(editTotal, 10), completed = parseInt(editCompleted, 10);
    if (isNaN(total) || total <= 0 || isNaN(completed) || completed < 0) return;
    const clamped = Math.min(completed, total);
    const prevCompleted = system.contentUnitsCompleted;
    const isNowDone = clamped >= total;

    updateSystem(system.id!, { contentInitialized: true, contentUnitsTotal: total, contentUnitsCompleted: clamped, contentCompleted: isNowDone });

    if (clamped > prevCompleted) {
      logCompletion({
        subjectId: system.subjectId,
        subjectName,
        systemId: system.id!,
        systemName: system.name,
        taskKey: isNowDone ? 'contentDone' : 'contentProgress',
        taskLabel: `Content (${clamped}/${total})`,
        completedAt: new Date(),
      });
    }

    setShowEditContent(false);
  };

  const handleEditReset = () => {
    updateSystem(system.id!, { contentInitialized: false, contentUnitsTotal: 0, contentUnitsCompleted: 0, contentCompleted: false });
    setShowEditContent(false);
  };

  // ── QBank toggle ──────────────────────────────────────────────────────────
  const toggleQBank = async () => {
    const wasChecked = system.qbankDone;
    if (wasChecked) {
      const historyEntries = await db.history
        .where('systemId')
        .equals(system.id!)
        .filter(h => h.taskKey === 'qbankDone')
        .toArray();
      if (historyEntries.length > 0) {
        historyEntries.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        await deleteHistoryEntry(historyEntries[0].id!);
      } else {
        await updateSystem(system.id!, {
          qbankDone: false,
          completionDate: null,
          nextRevisionDate: null,
        });
      }
    } else {
      updateSystem(system.id!, { qbankDone: true });
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#2563eb', '#1d4ed8'] });
      logCompletion({ subjectId: system.subjectId, subjectName, systemId: system.id!, systemName: system.name, taskKey: 'qbankDone', taskLabel: 'Qbank', completedAt: new Date() });
    }
  };

  // ── Initial evaluation ────────────────────────────────────────────────────
  const handleEvalSelect = async (confidence: SystemStatus) => {
    setShowEvalDialog(false);
    evalShownRef.current = false;
    await recordInitialEvaluation(system.id!, confidence);
  };

  const handleStatusChange = (status: SystemStatus) => updateSystem(system.id!, { status });
  const handleNotesChange  = (e: React.ChangeEvent<HTMLTextAreaElement>) => updateSystem(system.id!, { weakAreas: e.target.value });
  const handleDelete       = () => { setShowDeleteConfirm(true); };
  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    deleteSystem(system.id!);
  };

  const handleRenameSave = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    if (trimmed !== system.name) {
      await updateSystem(system.id!, { name: trimmed });
      toast.success('System Renamed', {
        description: `Renamed to "${trimmed}" successfully.`,
      });
    }
    setShowRenameDialog(false);
  };

  const handleRevisionComplete = async () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#059669', '#047857'] });
    await completeRevision(system.id!, system.status, system.subjectId, subjectName, system.name);
    setShowScoreModal(true);
  };

  const statusColors: Record<SystemStatus, string> = {
    Strong:  'bg-transparent text-[hsl(var(--gold))] border-[hsl(var(--gold))]/50',
    Average: 'bg-transparent text-muted-foreground border-border',
    Weak:    'bg-transparent text-destructive border-destructive/50',
  };

  return (
    <>
      <div ref={cardRef} className={cn(
        'bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300',
        system.status === 'Strong' && 'border-[hsl(var(--gold))]/30',
        revisionOverdue && 'border-destructive/50',
        revisionDue && !revisionOverdue && 'border-amber-500/25',
        highlighted && 'ring-1 ring-primary ring-offset-2 ring-offset-background',
      )}>
        {/* Revision due banner */}
        {revisionDue && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider',
            revisionOverdue
              ? 'bg-destructive/10 text-destructive'
              : 'bg-amber-500/10 text-amber-500',
          )}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {revisionOverdue
              ? `Revision overdue — ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`
              : 'Revision due today'}
          </div>
        )}

        {/* Header */}
        <div className="w-full flex items-center transition-colors min-w-0">
          {dragHandleProps && (
            <div {...dragHandleProps} className="p-2 sm:p-3 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0">
              <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(!expanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpanded(!expanded);
              }
            }}
            className={cn("flex-1 min-w-0 p-3.5 sm:p-4 flex items-center justify-between text-left focus:outline-none hover:bg-muted/10 cursor-pointer select-none", !dragHandleProps && "pl-4")}
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 min-w-0 flex-wrap sm:flex-nowrap">
                <h4 className="font-semibold text-base sm:text-lg leading-tight text-foreground truncate min-w-0">{system.name}</h4>
                <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium border shrink-0', statusColors[system.status])}>
                  {system.status}
                </span>
                {system.focus === 'primary' && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium border border-primary/20 bg-primary/10 text-primary whitespace-nowrap shrink-0">
                    Primary Focus
                  </span>
                )}
                {system.focus === 'secondary' && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium border border-border bg-muted/50 text-muted-foreground whitespace-nowrap shrink-0">
                    Secondary Focus
                  </span>
                )}
                {getSystemDecayFactor(system) !== 1.0 && (
                  <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap shrink-0',
                    getSystemDecayFactor(system) > 1.0 ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  )}>
                    {getSystemDecayFactor(system) > 1.0 ? '⚡' : '🛡️'} {getSystemDecayFactor(system)}x Decay
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <ProgressBar progress={progress} className="flex-1 h-1" />
                <span className="text-[10px] font-mono text-muted-foreground min-w-[3ch] shrink-0">{completedCount}/2</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors focus:outline-none shrink-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameValue(system.name);
                      setShowRenameDialog(true);
                    }}
                    className="gap-2 py-2 cursor-pointer text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="text-destructive focus:text-destructive gap-2 py-2 cursor-pointer text-xs font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className={cn('p-1.5 rounded-full text-muted-foreground transition-transform duration-300 shrink-0', expanded && 'rotate-180')}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Expanded body */}
        <div className={cn('grid transition-all duration-300 ease-in-out', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
          <div className="overflow-hidden">
            <div className="p-4 pt-0 border-t border-border/50 bg-card">
              <div className="grid gap-2 py-4">
                {/* Content row */}
                <div
                  className={cn('flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-left select-none', !system.contentCompleted && 'hover:bg-muted/50 cursor-pointer', system.contentCompleted && 'cursor-default')}
                  onClick={handleContentTap}
                  onPointerDown={handleContentPointerDown}
                  onPointerUp={handleContentPointerUp}
                  onPointerLeave={handleContentPointerLeave}
                  onContextMenu={e => e.preventDefault()}
                >
                  {system.contentCompleted ? <div className="w-[22px] h-[22px] shrink-0" /> : <ContentCircle pct={contentPct} />}
                  <span className={cn('text-sm font-medium flex-1 transition-all duration-500', system.contentCompleted ? 'text-muted-foreground/40 line-through' : 'text-foreground')}>Content</span>
                  {system.contentInitialized && !system.contentCompleted && (
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{system.contentUnitsCompleted}/{system.contentUnitsTotal}</span>
                  )}
                </div>

                {/* QBank row */}
                <button onClick={toggleQBank} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group">
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 border-2', system.qbankDone ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'border-muted-foreground/30 bg-background group-hover:border-primary/50')}>
                    {system.qbankDone && <Check className="w-4 h-4" />}
                  </div>
                  <span className={cn('text-sm font-medium transition-colors duration-200', system.qbankDone ? 'text-muted-foreground line-through' : 'text-foreground')}>Qbank</span>
                </button>
              </div>

              <div className="space-y-4 pt-2">
                {/* Confidence / Status selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Confidence Level</label>
                  <div className="flex gap-2">
                    {(['Strong', 'Average', 'Weak'] as const).map(s => (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className={cn('flex-1 py-2 px-3 text-sm font-medium rounded-xl border transition-all',
                          system.status === s ? statusColors[s] + ' ring-2 ring-offset-2 ring-background ring-offset-transparent shadow-sm' : 'bg-background border-border text-muted-foreground hover:bg-muted')}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── System Memory Decay Calibration (Collapsible) ───────────────────── */}
                <div className="bg-muted/20 border border-border/60 rounded-xl overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setShowDecayCalibration(!showDecayCalibration)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Memory Decay Calibration
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                        getSystemDecayFactor(system) > 1.0
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : getSystemDecayFactor(system) < 1.0
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-primary/20 bg-primary/10 text-primary'
                      )}>
                        {getSystemDecayFactor(system).toFixed(2)}x Speed
                      </span>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', showDecayCalibration && 'rotate-180')} />
                    </div>
                  </button>

                  {showDecayCalibration && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-border/40 space-y-3">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Calibrate memory decay speed for <span className="font-semibold text-foreground">{system.name}</span> based on topic complexity or volatile facts.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {DECAY_CALIBRATION_PRESETS.map((p) => {
                          const isSelected = Math.abs(getSystemDecayFactor(system) - p.factor) < 0.05;
                          return (
                            <button
                              key={p.factor}
                              type="button"
                              onClick={async () => {
                                await updateSystem(system.id!, { decayFactor: p.factor });
                                toast.success(`Decay Calibrated: ${p.label}`, {
                                  description: `${system.name} memory decay rate set to ${p.factor}x.`,
                                });
                              }}
                              className={cn(
                                'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer',
                                isSelected
                                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs ring-1 ring-primary'
                                  : 'bg-background hover:bg-muted/60 border-border text-muted-foreground'
                              )}
                            >
                              <span className="text-base mb-0.5">{p.icon}</span>
                              <span className="text-[11px] font-semibold leading-tight">{p.label}</span>
                              <span className="text-[9px] opacity-75 mt-0.5 font-mono">{p.factor}x</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground font-medium">Fine-tune Decay Factor</span>
                          <span className="font-mono font-semibold text-foreground">{getSystemDecayFactor(system).toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={getSystemDecayFactor(system)}
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value);
                            await updateSystem(system.id!, { decayFactor: val });
                          }}
                          className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground font-medium">
                          <span>0.5x (Sticky Concept)</span>
                          <span>1.0x (Standard)</span>
                          <span>2.0x (Volatile Facts)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Revision details — shown only once revision engine is active */}
                {system.completionDate && (
                  <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spaced Recall Engine</p>
                      {(() => {
                        const ret = getRetrievability(system);
                        const health = getRetrievabilityHealth(ret);
                        return (
                          <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-background/80 shadow-xs', health.colorClass)}>
                            {ret}% Recall • {health.label}
                          </span>
                        );
                      })()}
                    </div>
                    <RevisionRow label="Revisions Completed" value={String(system.revisionCount ?? 0)} />
                    <RevisionRow
                      label="Last Revised"
                      value={system.lastRevisionDate ? formatDistanceToNow(new Date(system.lastRevisionDate), { addSuffix: true }) : 'Never'}
                    />
                    <RevisionRow
                      label="Memory Stability"
                      value={system.currentRevisionInterval ? `${system.currentRevisionInterval} days` : '—'}
                    />
                    <RevisionRow
                      label="Next Recall Due"
                      value={system.nextRevisionDate
                        ? format(new Date(system.nextRevisionDate), 'MMM d, yyyy')
                        : '—'}
                      highlight={revisionDue}
                      highlightClass={revisionOverdue ? 'text-destructive font-semibold' : 'text-amber-500 dark:text-amber-400 font-semibold'}
                    />
                    {revisionDue && (
                      <div className="pt-2">
                        <Button 
                          className="w-full rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                          onClick={handleRevisionComplete}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark Revision Complete
                        </Button>
                      </div>
                    )}

                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl font-semibold text-xs border-border hover:bg-muted"
                        onClick={() => setShowScoreModal(true)}
                      >
                        <Award className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        Log Test / Revision Score
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Weak Areas / Notes</label>
                  <Textarea value={system.weakAreas} onChange={handleNotesChange} placeholder="Note down concepts you struggle with..."
                    className="min-h-[100px] resize-none rounded-xl bg-muted/30 border-transparent focus-visible:bg-background focus-visible:border-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Initial evaluation dialog ─────────────────────────────────────── */}
      <ConfidenceDialog
        open={showEvalDialog}
        title="How well do you know this system?"
        subtitle={`You've completed ${system.name}. Rate your confidence to schedule your first revision.`}
        onSelect={handleEvalSelect}
      />

      {/* ── Content init dialog ───────────────────────────────────────────── */}
      <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle className="text-xl font-semibold">How many content units does this system have?</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input autoFocus type="number" min="1" placeholder="e.g. 15" value={initValue} onChange={e => setInitValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInitSave(); } }}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInitDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleInitSave} disabled={!initValue || parseInt(initValue, 10) <= 0} className="rounded-xl font-semibold px-8 shadow-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog (long press) ──────────────────────────────────────── */}
      <Dialog open={showEditContent} onOpenChange={setShowEditContent}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle className="text-xl font-semibold">Content Progress</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Completed Units</label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl border-border hover:bg-muted font-bold text-lg"
                  onClick={() => setEditCompleted(prev => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                >
                  -
                </Button>
                <Input
                  autoFocus
                  type="number"
                  min="0"
                  value={editCompleted}
                  onChange={e => setEditCompleted(e.target.value)}
                  className="text-lg text-center font-mono py-5 px-3 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl border-border hover:bg-muted font-bold text-lg"
                  onClick={() => setEditCompleted(prev => String(Math.min(parseInt(editTotal, 10) || 999, (parseInt(prev, 10) || 0) + 1)))}
                >
                  +
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Total Units</label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl border-border hover:bg-muted font-bold text-lg"
                  onClick={() => setEditTotal(prev => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={editTotal}
                  onChange={e => setEditTotal(e.target.value)}
                  className="text-lg text-center font-mono py-5 px-3 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl border-border hover:bg-muted font-bold text-lg"
                  onClick={() => setEditTotal(prev => String((parseInt(prev, 10) || 0) + 1))}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button variant="ghost" onClick={() => setShowEditContent(false)} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={handleEditSave} disabled={!editTotal || parseInt(editTotal, 10) <= 0 || editCompleted === '' || parseInt(editCompleted, 10) < 0} className="flex-1 rounded-xl font-semibold shadow-sm">Save</Button>
            </div>
            <Button variant="ghost" onClick={handleEditReset} className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 text-sm">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename system dialog ─────────────────────────────────────────── */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Rename System</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">System Name</label>
            <Input
              autoFocus
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameSave(); } }}
              placeholder="e.g. Cardiology"
              className="text-base py-5 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handleRenameSave} disabled={!renameValue.trim() || renameValue.trim() === system.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ────────────────────────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Delete System</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{system.name}</span>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Score log modal ────────────────────────────────────────────────── */}
      <ScoreLogModal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        initialType="revision"
        initialSubjectId={system.subjectId}
        initialSystemId={system.id}
        initialTitle={`${system.name} Revision Score`}
      />
    </>
  );
}

// ── Small helper for revision detail rows ─────────────────────────────────────
function RevisionRow({ label, value, highlight, highlightClass }: { label: string; value: string; highlight?: boolean; highlightClass?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium text-foreground', highlight && highlightClass)}>{value}</span>
    </div>
  );
}
