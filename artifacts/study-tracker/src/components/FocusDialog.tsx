import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StudySystem, Subject } from '@/db/database';
import { SearchIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  systems: StudySystem[];
  subjects: Subject[];
  onSelect: (systemId: number) => void;
}

export function FocusDialog({ open, onOpenChange, title, systems, subjects, onSelect }: FocusDialogProps) {
  const [query, setQuery] = useState('');

  const filteredSystems = useMemo(() => {
    if (!query.trim()) return systems.slice(0, 15); // Show first 15 default
    const q = query.toLowerCase();
    return systems.filter(sys => sys.name.toLowerCase().includes(q) || subjects.find(s => s.id === sys.subjectId)?.name.toLowerCase().includes(q)).slice(0, 15);
  }, [query, systems, subjects]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setQuery('');
    }}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)] max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full mt-4">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search systems..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-card border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans text-foreground"
            />
          </div>
        </div>
        <div className="overflow-y-auto p-2 pb-6 px-4 space-y-1">
          {filteredSystems.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">No systems found.</p>
          ) : (
            filteredSystems.map(sys => {
              const subject = subjects.find(s => s.id === sys.subjectId);
              return (
                <button
                  key={sys.id}
                  onClick={() => {
                    if (sys.id) onSelect(sys.id);
                    onOpenChange(false);
                    setQuery('');
                  }}
                  className="w-full p-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-between text-left group"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">{sys.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{subject?.name}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
