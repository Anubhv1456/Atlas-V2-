import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useSubjects, useAllSystems } from '@/db';
import { runSearch } from '@/lib/searchUtils';
import { StudySystem } from '@/db';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Search as SearchIcon,
  BookOpen,
  LayoutList,
  ChevronRight,
  Home as HomeIcon,
  Calendar,
  BarChart3,
  Settings as SettingsIcon,
  Command,
} from 'lucide-react';
import { isRevisionDue, isRevisionOverdue } from '@/db';

interface QuickPage {
  name: string;
  path: string;
  icon: any;
}

const PAGES: QuickPage[] = [
  { name: 'Home Dashboard', path: '/', icon: HomeIcon },
  { name: 'Timeline & Calendar', path: '/timeline', icon: Calendar },
  { name: 'Analytics & Score Logs', path: '/analytics', icon: BarChart3 },
  { name: 'Settings & Data Backup', path: '/settings', icon: SettingsIcon },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [, setLocation] = useLocation();

  const subjects = useSubjects();
  const systems = useAllSystems();

  // Listen for global keyboard shortcut Cmd+K, Ctrl+K, or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        setOpen(true);
      }
    };

    const handleOpenCustom = () => setOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenCustom);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenCustom);
    };
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) {
      return {
        pages: PAGES,
        subjects: subjects.slice(0, 5),
        systems: systems.slice(0, 5).map(sys => {
          const sub = subjects.find(s => s.id === sys.subjectId);
          return { ...sys, subjectName: sub?.name ?? 'Unknown' };
        }),
      };
    }
    const searchRes = runSearch(query, subjects, systems);
    const matchedPages = PAGES.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    return {
      pages: matchedPages,
      subjects: searchRes.subjects,
      systems: searchRes.systems,
    };
  }, [query, subjects, systems]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery('');
    setLocation(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px] p-0 rounded-2xl overflow-hidden gap-0 bg-card border-border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick Search and Commands</DialogTitle>
        </DialogHeader>

        {/* Input Bar */}
        <div className="flex items-center px-4 border-b border-border/80 bg-muted/20">
          <SearchIcon className="w-5 h-5 text-muted-foreground shrink-0 mr-3" />
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search topics, subjects, pages (e.g. 'Cardiology', 'Analytics')..."
            className="border-0 bg-transparent py-6 text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 shadow-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
            <Command className="w-3 h-3" /> K
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4 text-sm">
          {/* Quick Pages */}
          {results.pages.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                Pages & Views
              </div>
              <div className="space-y-1">
                {results.pages.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.path}
                      onClick={() => handleSelect(p.path)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {p.name}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subjects */}
          {results.subjects.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                Subjects
              </div>
              <div className="space-y-1">
                {results.subjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelect(`/subjects/${sub.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-foreground group-hover:text-amber-500 transition-colors">
                        {sub.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-amber-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Systems */}
          {results.systems.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                Systems & Topics
              </div>
              <div className="space-y-1">
                {results.systems.map(sys => {
                  const isOverdue = isRevisionOverdue(sys);
                  const isDue = isRevisionDue(sys);
                  return (
                    <button
                      key={sys.id}
                      onClick={() =>
                        handleSelect(`/subjects/${sys.subjectId}?highlight=${sys.id}`)
                      }
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                          <LayoutList className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground group-hover:text-sky-500 transition-colors truncate">
                            {sys.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {sys.subjectName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wider',
                            sys.status === 'Strong' &&
                              'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
                            sys.status === 'Average' &&
                              'text-amber-500 border-amber-500/30 bg-amber-500/10',
                            sys.status === 'Weak' &&
                              'text-rose-500 border-rose-500/30 bg-rose-500/10'
                          )}
                        >
                          {sys.status}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                            Overdue
                          </span>
                        )}
                        {isDue && !isOverdue && (
                          <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Due Today
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {results.pages.length === 0 &&
            results.subjects.length === 0 &&
            results.systems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No matching results found for "{query}".
              </div>
            )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-muted/40 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Tip: Use <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border">Cmd+K</kbd> or <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border">/</kbd> anywhere to search</span>
          <span>Press <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border">Esc</kbd> to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
