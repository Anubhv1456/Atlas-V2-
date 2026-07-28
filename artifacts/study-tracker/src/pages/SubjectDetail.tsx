import { useState, useMemo } from 'react';
import { useParams, Link, useLocation, useSearch } from 'wouter';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  useSubject, useSystemsBySubject, usePYQsBySubject,
  addSystem, updateSubject, deleteSubject, updateSystemsOrder,
  addPYQYear, updatePYQYear, deletePYQYear, togglePYQYear,
} from '@/db/hooks';
import { SystemCard } from '@/components/SystemCard';
import { AddDialog } from '@/components/AddDialog';
import { ProgressBar } from '@/components/ProgressBar';
import { PYQYear } from '@/db/database';
import { ScoreLogModal } from '@/components/ScoreLogModal';
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Edit2,
  LayoutList, Lock, Check, BookOpen, Award,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudySystem } from '@/db/database';
import { cn } from '@/lib/utils';

type StageKey = 'contentCompleted' | 'qbankDone';

// ── PYQ section component ──────────────────────────────────────────────────────

interface PYQSectionProps {
  subjectId:   number;
  subjectName: string;
  years:       PYQYear[];
}

function PYQSection({ subjectId, subjectName, years }: PYQSectionProps) {
  const [expanded,    setExpanded]    = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [addValue,    setAddValue]    = useState('');
  const [editTarget,  setEditTarget]  = useState<PYQYear | null>(null);
  const [editValue,   setEditValue]   = useState('');
  const [pyqToDelete, setPyqToDelete] = useState<PYQYear | null>(null);
  const [showPYQDeleteConfirm, setShowPYQDeleteConfirm] = useState(false);
  const [scoreModalPyq, setScoreModalPyq]                 = useState<PYQYear | null>(null);

  const completed = years.filter(y => y.completed).length;
  const total     = years.length;

  const handleAdd = async () => {
    const v = addValue.trim();
    if (!v) return;
    await addPYQYear(subjectId, v);
    setAddValue(''); setShowAdd(false);
  };

  const handleEditSave = async () => {
    if (!editTarget || !editValue.trim()) return;
    await updatePYQYear(editTarget.id!, editValue.trim());
    setEditTarget(null); setEditValue('');
  };

  const handlePYQDeleteClick = (year: PYQYear) => {
    setPyqToDelete(year);
    setShowPYQDeleteConfirm(true);
  };
  const handlePYQDeleteConfirm = async () => {
    if (pyqToDelete) {
      setShowPYQDeleteConfirm(false);
      await deletePYQYear(pyqToDelete.id!);
      setPyqToDelete(null);
    }
  };

  const handleToggle = (year: PYQYear) => {
    const wasCompleted = year.completed;
    togglePYQYear(year.id!, subjectId, subjectName, year.year, wasCompleted);
    if (!wasCompleted) {
      setScoreModalPyq(year);
    }
  };

  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors focus:outline-none"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold shrink-0" />
            <p className="font-semibold text-foreground text-sm">PYQs</p>
          </div>
          <p className={cn(
            'text-xs mt-0.5',
            total === 0
              ? 'text-muted-foreground'
              : completed === total
                ? 'text-primary dark:text-gold font-medium'
                : 'text-muted-foreground',
          )}>
            {total === 0
              ? 'No years added yet'
              : completed === total
                ? `${total} / ${total} Years Completed`
                : `${completed} / ${total} Years Completed`}
          </p>
        </div>
      </button>

      {/* Expanded body */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-2">
            {years.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                No years added yet. Add one to get started.
              </p>
            ) : (
              years.map(year => (
                <div key={year.id} className="flex items-center gap-3 py-1.5">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(year)}
                    className={cn(
                      'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150',
                      year.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-muted-foreground/30 hover:border-primary',
                    )}
                  >
                    {year.completed && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {/* Year label */}
                  <span className={cn(
                    'flex-1 text-sm font-medium',
                    year.completed ? 'line-through text-muted-foreground' : 'text-foreground',
                  )}>
                    {year.year}
                  </span>

                  {/* Log PYQ Score */}
                  <button
                    onClick={() => setScoreModalPyq(year)}
                    title="Log PYQ Score"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-muted transition-colors"
                  >
                    <Award className="w-3.5 h-3.5 text-primary" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => { setEditTarget(year); setEditValue(year.year); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handlePYQDeleteClick(year)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}

            {/* Add year inline */}
            {showAdd ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  autoFocus
                  value={addValue}
                  onChange={e => setAddValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setAddValue(''); } }}
                  placeholder="e.g. 2024"
                  className="flex-1 h-9 text-sm bg-muted/50 border-transparent focus-visible:ring-primary"
                />
                <Button size="sm" onClick={handleAdd} disabled={!addValue.trim()} className="rounded-xl h-9 px-4">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddValue(''); }} className="rounded-xl h-9">Cancel</Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full mt-1 flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors py-1"
              >
                <Plus className="w-4 h-4" />Add Year
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit year dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[320px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle className="text-xl font-semibold">Edit Year</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input
              autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); }}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editValue.trim()} className="rounded-xl font-semibold px-8">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── PYQ Delete confirmation dialog ─────────────────────────────────── */}
      <Dialog open={showPYQDeleteConfirm} onOpenChange={setShowPYQDeleteConfirm}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Delete PYQ</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{pyqToDelete?.year}</span>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPYQDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handlePYQDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Score log modal for PYQ year ────────────────────────────────────── */}
      <ScoreLogModal
        isOpen={Boolean(scoreModalPyq)}
        onClose={() => setScoreModalPyq(null)}
        initialType="pyq"
        initialSubjectId={subjectId}
        initialPyqYearId={scoreModalPyq?.id}
        initialTitle={scoreModalPyq ? `${subjectName} - ${scoreModalPyq.year} PYQ` : `${subjectName} PYQ`}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'Strong', label: 'Strong', color: 'bg-green-500' },
  { key: 'Average', label: 'Average', color: 'bg-yellow-500' },
  { key: 'Weak', label: 'Weak', color: 'bg-red-500' }
];

export default function SubjectDetail() {
  const { id }  = useParams<{ id: string }>();
  const search  = useSearch();
  const subjectId = parseInt(id || '0', 10);
  const [, setLocation] = useLocation();

  const subject  = useSubject(subjectId);
  const rawSystems  = useSystemsBySubject(subjectId);
  const pyqYears = usePYQsBySubject(subjectId);

  const systems = useMemo(() => {
    return [...rawSystems].sort((a, b) => (a.order ?? Number.MAX_VALUE) - (b.order ?? Number.MAX_VALUE));
  }, [rawSystems]);

  const [showAddSystem, setShowAddSystem] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [editName,      setEditName]      = useState('');
  const [activeFilter,  setActiveFilter]  = useState<StageKey | null>(null);

  // Read highlight param — passed from search results
  const highlightId = (() => {
    const params = new URLSearchParams(search);
    const v = params.get('highlight');
    return v ? parseInt(v, 10) : null;
  })();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    // We only support reordering when no filter is active to prevent confusion
    if (activeFilter !== null) return;
    
    const items = Array.from(systems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id!,
      order: index
    }));
    
    await updateSystemsOrder(updates);
  };

  if (!subject && id) {
    return <div className="p-8 text-center text-muted-foreground mt-20">Loading or subject not found.</div>;
  }
  if (!subject) return null;

  // Overall progress (2 steps per system)
  const totalTasks     = systems.length * 2;
  const completedTasks = systems.reduce((acc, sys) => {
    let done = 0;
    if (sys.contentCompleted) done++;
    if (sys.qbankDone) done++;
    return acc + done;
  }, 0);
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // PYQ unlock: every system must have content + qbank complete
  const pyqUnlocked = systems.length > 0 && systems.every(s => s.contentCompleted && s.qbankDone);

  const stagePct = (key: StageKey) => {
    if (systems.length === 0) return 0;
    return Math.round((systems.filter(s => s[key]).length / systems.length) * 100);
  };

  const visibleSystems: StudySystem[] = activeFilter
    ? systems.filter(s => !s[activeFilter])
    : systems;

  const handleDonutClick = (key: StageKey) => {
    setActiveFilter(prev => (prev === key ? null : key));
  };

  const handleSaveEdit = async () => {
    if (editName.trim()) {
      await updateSubject(subject.id!, editName.trim());
      setShowEdit(false);
    }
  };

  const handleDelete = () => { setShowDeleteConfirm(true); };
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    await deleteSubject(subject.id!);
    setLocation('/');
  };

  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-28 max-w-2xl mx-auto flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <button className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors focus:outline-none">
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-current" />
                <span className="w-1 h-1 rounded-full bg-current" />
                <span className="w-1 h-1 rounded-full bg-current" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => { setEditName(subject.name); setShowEdit(true); }} className="gap-2 py-3 cursor-pointer">
                <Edit2 className="w-4 h-4" /> Rename Subject
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive gap-2 py-3 cursor-pointer">
                <Trash2 className="w-4 h-4" /> Delete Subject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-6">{subject.name}</h1>

        {/* Overall progress card */}
        <div className="bg-card border shadow-sm p-4 rounded-2xl flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-end mb-2 text-sm">
              <span className="font-semibold text-foreground">Progress</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <ProgressBar progress={progress} className="h-2.5" />
          </div>
          <div className="h-10 w-px bg-border mx-2" />
          <div className="text-center min-w-[3rem]">
            <div className="text-xl font-bold text-foreground leading-none mb-1">{systems.length}</div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Systems</div>
          </div>
        </div>

        {/* ── Progress Rings (Quiet Confidence) ───────────────────────── */}
        {systems.length > 0 && (
          <section className="mt-8 mb-10">
            <div className="flex justify-center gap-10">
              <button 
                onClick={() => handleDonutClick('contentCompleted')} 
                className={cn(
                  "flex flex-col items-center gap-3 transition-all focus:outline-none",
                  activeFilter && activeFilter !== 'contentCompleted' ? 'opacity-40 hover:opacity-70' : 'opacity-100'
                )}
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" className="stroke-primary transition-all duration-1000 ease-in-out" 
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * stagePct('contentCompleted')) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono text-foreground">{stagePct('contentCompleted')}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</span>
                  {activeFilter === 'contentCompleted' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              </button>

              <button 
                onClick={() => handleDonutClick('qbankDone')} 
                className={cn(
                  "flex flex-col items-center gap-3 transition-all focus:outline-none",
                  activeFilter && activeFilter !== 'qbankDone' ? 'opacity-40 hover:opacity-70' : 'opacity-100'
                )}
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" style={{ stroke: 'hsl(var(--gold))' }} className="transition-all duration-1000 ease-in-out" 
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * stagePct('qbankDone')) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono text-foreground">{stagePct('qbankDone')}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QBank</span>
                  {activeFilter === 'qbankDone' && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--gold))' }} />}
                </div>
              </button>
            </div>
            
            {activeFilter && (
              <div className="text-center mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Showing{' '}
                  <span className="font-mono text-foreground">{visibleSystems.length}</span>
                  {' '}system{visibleSystems.length !== 1 ? 's' : ''} without{' '}
                  <span className={cn(
                    "font-semibold",
                    activeFilter === 'contentCompleted' ? 'text-primary' : 'text-[hsl(var(--gold))]'
                  )}>
                    {activeFilter === 'contentCompleted' ? 'Content' : 'QBank'}
                  </span>
                  {' '}— tap again to clear
                </p>
              </div>
            )}
          </section>
        )}
      </header>

      {/* Systems list */}
      <section>
        {systems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-muted/30 rounded-3xl border border-dashed mt-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutList className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No systems yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-[250px] mx-auto">
              Break down {subject.name} into smaller, manageable systems or topics.
            </p>
            <button
              onClick={() => setShowAddSystem(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-sm hover:bg-primary/90 transition-colors"
            >
              Add First System
            </button>
          </div>
        ) : visibleSystems.length === 0 ? (
          <div className="text-center py-12 px-4 bg-muted/30 rounded-3xl border border-dashed">
            <p className="text-foreground font-semibold mb-1">All systems complete</p>
            <p className="text-sm text-muted-foreground">
              Every system has{' '}
              <span className="font-medium" style={{ color: STAGES.find(s => s.key === activeFilter)!.color }}>
                {STAGES.find(s => s.key === activeFilter)!.label}
              </span>{' '}
              done.
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="systems-list" isDropDisabled={activeFilter !== null}>
              {(provided) => (
                <div 
                  className="grid gap-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {visibleSystems.map((system, index) => (
                    <Draggable 
                      key={system.id} 
                      draggableId={String(system.id)} 
                      index={index}
                      isDragDisabled={activeFilter !== null}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(snapshot.isDragging && "opacity-80 z-50")}
                          style={provided.draggableProps.style}
                        >
                          <SystemCard
                            system={system}
                            subjectName={subject.name}
                            highlighted={system.id === highlightId}
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

      {/* ── PYQ Section ─────────────────────────────────────────────────────── */}
      <section className="mt-6">
        {systems.length > 0 && (
          pyqUnlocked ? (
            <PYQSection
              subjectId={subject.id!}
              subjectName={subject.name}
              years={pyqYears}
            />
          ) : (
            <div className="bg-muted/20 rounded-2xl border border-dashed p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">PYQs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete Content and QBank for all systems to unlock PYQs
                </p>
              </div>
            </div>
          )
        )}
      </section>

      {/* FAB */}
      {systems.length > 0 && (
        <button
          onClick={() => setShowAddSystem(true)}
          className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
          aria-label="Add System"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <AddDialog
        open={showAddSystem}
        onOpenChange={setShowAddSystem}
        title="New System"
        placeholder="e.g. Cardiology"
        onSave={(name) => addSystem(subject.id!, name)}
      />

      {/* Rename dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Rename Subject</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEdit(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || editName === subject.name}
              className="rounded-xl font-semibold px-8 shadow-sm"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
