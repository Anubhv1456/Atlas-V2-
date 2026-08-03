import { Link } from 'wouter';
import { Subject, StudySystem } from '@/db';
import { ProgressBar } from './ProgressBar';
import { ChevronRight, GripVertical, BookOpen, CheckCircle2, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { calculateSubjectProgress } from '@/lib/progress';

interface SubjectCardProps {
  subject: Subject;
  systems: StudySystem[];
  dragHandleProps?: any;
  onDelete?: (subject: Subject) => void;
  onRename?: (subject: Subject) => void;
}

export function SubjectCard({ subject, systems, dragHandleProps, onDelete, onRename }: SubjectCardProps) {
  const totalTasks = systems.length * 2;
  const completedTasks = systems.reduce((acc, sys) => {
    let done = 0;
    if (sys.contentCompleted) done++;
    if (sys.qbankDone) done++;
    return acc + done;
  }, 0);

  const progress = calculateSubjectProgress(systems);
  const isFullyComplete = progress === 100 && totalTasks > 0;

  return (
    <div className="group flex items-center w-full bg-card transition-all duration-200 rounded-2xl border border-border/80 hover:border-primary/40 shadow-sm hover:shadow-md overflow-hidden relative p-4 sm:p-5 gap-2">
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="pr-1 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0"
          aria-label="Drag to reorder subject"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/subjects/${subject.id}`} className="block select-none">
          <div className="flex justify-between items-center mb-3 gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className={cn(
                "p-2 rounded-xl border shrink-0 transition-colors",
                isFullyComplete
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              )}>
                {isFullyComplete ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <h3 className="font-semibold text-base sm:text-lg leading-tight text-foreground truncate min-w-0 flex-1 group-hover:text-primary transition-colors">
                {subject.name}
              </h3>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "font-mono tabular-nums text-xs px-2 py-0.5 font-bold border-border/60 shrink-0",
                isFullyComplete && "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
              )}
            >
              {progress}%
            </Badge>
          </div>

          <ProgressBar progress={progress} className="h-1.5 rounded-full" />

          <div className="mt-3 flex justify-between items-center text-[11px] font-medium tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {systems.length} {systems.length === 1 ? 'System' : 'Systems'}
            </span>
            <span className="font-mono tabular-nums text-[11px] text-foreground/80 font-semibold bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-1">
        {(onDelete || onRename) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors focus:outline-none shrink-0"
              aria-label="Subject options"
            >
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              {onRename && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onRename(subject); }}
                  className="gap-2 py-2 cursor-pointer text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Rename
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(subject); }}
                  className="text-destructive focus:text-destructive gap-2 py-2 cursor-pointer text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Link href={`/subjects/${subject.id}`}>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 cursor-pointer" />
        </Link>
      </div>
    </div>
  );
}

