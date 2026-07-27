import { Link } from 'wouter';
import { Subject, StudySystem } from '@/db/database';
import { ProgressBar } from './ProgressBar';
import { ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectCardProps {
  subject: Subject;
  systems: StudySystem[];
  dragHandleProps?: any;
}

export function SubjectCard({ subject, systems, dragHandleProps }: SubjectCardProps) {
  const totalTasks = systems.length * 2;
  const completedTasks = systems.reduce((acc, sys) => {
    let done = 0;
    if (sys.contentCompleted) done++;
    if (sys.qbankDone) done++;
    return acc + done;
  }, 0);

  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="group flex items-center w-full bg-card transition-all rounded-xl border border-border hover:border-primary/40">
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="p-4 pr-1 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0"
          aria-label="Drag to reorder subject"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      <Link href={`/subjects/${subject.id}`} className={cn("flex-1 block p-5 select-none", dragHandleProps && "pl-2")}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-xl leading-tight text-foreground">{subject.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground font-mono">{progress}%</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </div>
        </div>

        <ProgressBar progress={progress} className="h-1" />

        <div className="mt-4 flex justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>{systems.length} systems</span>
          <span className="font-mono text-xs">{completedTasks}/{totalTasks} tasks</span>
        </div>
      </Link>
    </div>
  );
}
