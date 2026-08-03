import { useRef, useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSubjects, useAllSystems, addSubject, updateSubject, deleteSubject, useCurrentStreak, setFocus, setSubjectFocus, updateSubjectsOrder, useAllPYQs } from '@/db';
import { SubjectCard } from '@/features/subjects/SubjectCard';
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
import { isRevisionDue, isRevisionOverdue, sortSystemsByRevisionPriority, calculateDecayScore, daysOverdue, getRetrievability, getRetrievabilityHealth, getDailyRevisionQueue, getSystemDecayFactor } from '@/db';
import { format } from 'date-fns';
import { StudySystem, Subject } from '@/db';
import { calculateOverallProgress, calculateSubjectProgress } from '@/lib/progress';
import { DailyAnkiCard } from '@/features/revision/DailyAnkiCard';
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

  if (isRevisionOverdue(sys)) return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive shrink-0 bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
      <AlertCircle className="w-2.5 h-2.5" />{retrievability}% ({daysOverdue(sys)}d overdue)
    </span>
  );
  if (isRevisionDue(sys)) return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 shrink-0 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
      <Clock className="w-2.5 h-2.5" />{retrievability}% Due today
    </span>
  );
  if (sys.nextRevisionDate) return (
    <span className={cn("flex items-center gap-1 text-[10px] font-semibold shrink-0 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/40", health.colorClass)}>
      <Brain className="w-2.5 h-2.5" />{retrievability}% Recall
    </span>
  );
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

import { OverviewStats } from '@/features/dashboard/OverviewStats';
import { ActiveRevisions } from '@/features/dashboard/ActiveRevisions';
import { SubjectsGrid } from '@/features/dashboard/SubjectsGrid';
import { useHomeLogic } from './Home.hooks';

export default function Home() {
  const {
    subjects, systems, pyqs, streak, greeting,
    primaryFocus, primaryFocusSubject, customPrimarySubject, customPrimarySystem, isAutoPrimary, isPrimaryOverriddenByRevision,
    secondaryFocus, secondaryFocusSubject, customSecondarySubject, customSecondarySystem, isAutoSecondary, isSecondaryOverriddenByRevision,
    secondaryDaysOverdue, dueRevisions, insights,
    showAddSubject, setShowAddSubject,
    subjectToRename, setSubjectToRename, renameSubjectName, setRenameSubjectName,
    subjectToDelete, setSubjectToDelete,
    focusDialogType, setFocusDialogType,
    handleRenameSubjectSave, handleDeleteSubjectConfirm,
    handleSetFocus, goToSystem, goToSubject, handleSubjectDragEnd
  } = useHomeLogic();
return (
    <>
      <div className="min-h-full bg-background px-4 pt-10 pb-36 max-w-2xl mx-auto flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative z-10 flex-1 flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img src="/logo.svg?v=4" alt="Atlas Logo" className="w-12 h-12 rounded-[14px] shadow-sm border border-border/50 object-contain transition-transform hover:scale-105 active:scale-95" />
            <div>
              <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3 h-3" /> Medical Study Tracker
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{greeting}</h1>
            </div>
          </div>

          {/* Quick Search trigger opening CommandPalette */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="shrink-0 h-10 px-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/60 active:scale-95 transition-all text-muted-foreground shadow-sm flex items-center gap-2 group cursor-pointer"
            aria-label="Open search"
            title="Open Quick Search (⌘K or /)"
          >
            <SearchIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground group-hover:text-foreground">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/60">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>
        </header>
            
            <OverviewStats 
              streak={streak}
              overallProgress={calculateOverallProgress(systems)}
              completedTasks={systems.reduce((acc, sys) => acc + (sys.contentCompleted ? 1 : 0) + (sys.qbankDone ? 1 : 0), 0)}
              totalTasks={systems.length * 2}
              strongSystems={systems.filter(s => s.status === 'Strong').length}
              totalSystems={systems.length}
              dueRevisionsCount={dueRevisions.length}
            />

            <ActiveRevisions
              primaryFocus={primaryFocus || null}
              primaryFocusSubject={primaryFocusSubject || null}
              isAutoPrimary={isAutoPrimary}
              isPrimaryOverriddenByRevision={isPrimaryOverriddenByRevision}
              secondaryFocus={secondaryFocus || null}
              secondaryFocusSubject={secondaryFocusSubject || null}
              isAutoSecondary={isAutoSecondary}
              isSecondaryOverriddenByRevision={isSecondaryOverriddenByRevision}
              secondaryDaysOverdue={secondaryDaysOverdue}
              setFocusDialogType={setFocusDialogType}
              setFocus={setFocus}
              setSubjectFocus={setSubjectFocus}
              goToSystem={goToSystem}
              subjects={subjects}
              systems={systems}
              customPrimarySubject={customPrimarySubject}
              customPrimarySystem={customPrimarySystem}
              customSecondarySubject={customSecondarySubject}
              customSecondarySystem={customSecondarySystem}
            />
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



            
            <SubjectsGrid
              subjects={subjects}
              systems={systems}
              setShowAddSubject={setShowAddSubject}
              setSubjectToDelete={setSubjectToDelete}
              setSubjectToRename={setSubjectToRename}
              setRenameSubjectName={setRenameSubjectName}
              handleSubjectDragEnd={handleSubjectDragEnd}
            />
</div>
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
        focusType={focusDialogType}
        systems={systems}
        subjects={subjects}
        onSelectSystem={(systemId) => {
          if (focusDialogType) {
            setFocus(systemId, focusDialogType);
          }
        }}
        onSelectSubject={(subjectId) => {
          if (focusDialogType) {
            setSubjectFocus(subjectId, focusDialogType);
          }
        }}
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
    </>
  );
}
