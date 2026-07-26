import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ progress, className, barClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={cn("w-full bg-muted rounded-full overflow-hidden h-2", className)}>
      <div 
        className={cn(
          "h-full bg-primary transition-all duration-500 ease-out rounded-full", 
          barClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
