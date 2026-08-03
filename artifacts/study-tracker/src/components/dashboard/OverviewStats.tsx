import { Flame, TrendingUp, Award, Clock } from 'lucide-react';

interface OverviewStatsProps {
  streak: number;
  overallProgress: number;
  completedTasks: number;
  totalTasks: number;
  strongSystems: number;
  totalSystems: number;
  dueRevisionsCount: number;
}

export function OverviewStats({
  streak,
  overallProgress,
  completedTasks,
  totalTasks,
  strongSystems,
  totalSystems,
  dueRevisionsCount
}: OverviewStatsProps) {
  return (
    <section className="mb-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Streak */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-500 transition-colors">Study Streak</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {streak} <span className="text-xs font-sans font-normal text-muted-foreground">{streak === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Consecutive daily study</div>
          </div>
        </div>

        {/* Overall Completion */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Course Completion</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {overallProgress}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{completedTasks}/{totalTasks} tasks done</div>
          </div>
        </div>

        {/* Strong Systems */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-500 transition-colors">Mastered Topics</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {strongSystems} <span className="text-xs font-sans font-normal text-muted-foreground">/ {totalSystems}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Strong confidence topics</div>
          </div>
        </div>

        {/* Due Revisions */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-sky-500 transition-colors">Revisions Due</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {dueRevisionsCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Reviews scheduled today</div>
          </div>
        </div>
      </div>
    </section>
  );
}
