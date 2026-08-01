import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StudySystem, Subject } from '@/db/database';
import { SearchIcon, ChevronRight, BookOpen, Layers, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  focusType: 'primary' | 'secondary' | null;
  systems: StudySystem[];
  subjects: Subject[];
  onSelectSystem: (systemId: number) => void;
  onSelectSubject: (subjectId: number) => void;
}

export function FocusDialog({
  open,
  onOpenChange,
  title,
  focusType,
  systems,
  subjects,
  onSelectSystem,
  onSelectSubject,
}: FocusDialogProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'subjects' | 'systems'>('all');

  const q = query.trim().toLowerCase();

  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      if (!q) return true;
      return sub.name.toLowerCase().includes(q);
    });
  }, [subjects, q]);

  const filteredSystems = useMemo(() => {
    return systems.filter(sys => {
      if (!q) return true;
      const subName = subjects.find(s => s.id === sys.subjectId)?.name.toLowerCase() || '';
      return sys.name.toLowerCase().includes(q) || subName.includes(q);
    });
  }, [systems, subjects, q]);

  const handleSubjectClick = (subId: number) => {
    onSelectSubject(subId);
    onOpenChange(false);
    setQuery('');
  };

  const handleSystemClick = (sysId: number) => {
    onSelectSystem(sysId);
    onOpenChange(false);
    setQuery('');
  };

  const showSubjects = activeTab === 'all' || activeTab === 'subjects';
  const showSystems = activeTab === 'all' || activeTab === 'systems';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setQuery('');
        setActiveTab('all');
      }
    }}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl mx-4 w-[calc(100%-2rem)] max-h-[85vh] flex flex-col p-0 overflow-hidden border border-border shadow-xl">
        <div className="p-5 pb-3 border-b border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Target className={cn(
                "w-5 h-5",
                focusType === 'primary' ? "text-primary" : "text-amber-500"
              )} />
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative w-full mt-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search subjects or topics..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted/50 border border-border focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-foreground"
            />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-1">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeTab === 'all'
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer",
                activeTab === 'subjects'
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              <BookOpen className="w-3 h-3" /> Subjects ({subjects.length})
            </button>
            <button
              onClick={() => setActiveTab('systems')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer",
                activeTab === 'systems'
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              <Layers className="w-3 h-3" /> Topics ({systems.length})
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="overflow-y-auto p-4 space-y-5 flex-1">
          {/* Subjects Section */}
          {showSubjects && filteredSubjects.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Core Subjects
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">Whole subject focus</span>
              </div>
              <div className="grid gap-2">
                {filteredSubjects.map(sub => {
                  const subSystems = systems.filter(s => s.subjectId === sub.id);
                  const totalSys = subSystems.length;
                  const completedSys = subSystems.filter(s => s.contentCompleted && s.qbankDone).length;
                  const percent = totalSys > 0 ? Math.round((completedSys / totalSys) * 100) : 0;
                  const isCurrentFocus = sub.focus === focusType;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => sub.id && handleSubjectClick(sub.id)}
                      className={cn(
                        "w-full p-3.5 rounded-xl border text-left transition-all group flex items-center justify-between cursor-pointer",
                        isCurrentFocus
                          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                          : "bg-card hover:bg-muted/40 border-border/80 hover:border-primary/30"
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {sub.name}
                          </span>
                          {isCurrentFocus && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                              Active Focus
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs text-muted-foreground">
                            {totalSys} topics • {completedSys}/{totalSys} completed
                          </div>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden border border-border/40 shrink-0">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        Select Subject <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Systems/Topics Section */}
          {showSystems && filteredSystems.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" /> Individual Topics / Systems
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">Specific topic focus</span>
              </div>
              <div className="grid gap-1.5">
                {filteredSystems.slice(0, activeTab === 'systems' ? 50 : 20).map(sys => {
                  const subject = subjects.find(s => s.id === sys.subjectId);
                  const isDone = sys.contentCompleted && sys.qbankDone;
                  const isCurrentFocus = sys.focus === focusType;

                  return (
                    <button
                      key={sys.id}
                      onClick={() => sys.id && handleSystemClick(sys.id)}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all group flex items-center justify-between cursor-pointer",
                        isCurrentFocus
                          ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30"
                          : "bg-card hover:bg-muted/40 border-border/60 hover:border-amber-500/30"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            {sys.name}
                          </span>
                          {isDone && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {subject?.name}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-amber-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {((showSubjects && filteredSubjects.length === 0) && (showSystems && filteredSystems.length === 0)) && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-medium">No matching subjects or systems found.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
