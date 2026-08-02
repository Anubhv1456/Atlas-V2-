import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useHistory, useAllSystems, useSubjects, deleteHistoryEntry } from '@/db/hooks';
import { HistoryEntry, StudySystem } from '@/db/database';
import {
  TimelineEvent,
  TimelineFilter,
  TIMELINE_FILTERS,
  eventMatchesFilter,
} from '@/db/timeline';
import {
  format,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, BookOpen, Layers, CalendarDays, Clock, AlertCircle, CheckCircle2, Sparkles, Filter, Activity, TrendingUp, Flame, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { isRevisionUpcoming, isRevisionOverdue, isRevisionDueToday, daysOverdue, sortSystemsByRevisionPriority } from '@/db/revisionEngine';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Map a HistoryEntry → completed TimelineEvent ──────────────────────────────
function historyToEvent(h: HistoryEntry): TimelineEvent {
  const typeMap: Record<string, TimelineEvent['eventType']> = {
    contentDone:     'contentCompleted',
    contentProgress: 'contentCompleted',
    qbankDone:       'qbankDone',
    pyqsDone:        'pyqsDone',
    revision:        'revisionSystem',
  };
  const entityName = h.taskKey === 'pyqsDone'
    ? h.taskLabel
    : `${h.systemName} ${h.taskLabel}`;
  return {
    id:          String(h.id ?? `${h.systemId}-${h.taskKey}-${h.completedAt}`),
    dbHistoryId: h.id,
    eventType:   typeMap[h.taskKey] ?? 'contentCompleted',
    entityName,
    subjectName: h.subjectName,
    date:        new Date(h.completedAt),
    status:      'completed',
  };
}

// ── Map a StudySystem → upcoming / overdue TimelineEvent ─────────────────────
function systemToRevisionEvent(
  sys: StudySystem,
  subjectName: string,
  status: 'upcoming' | 'overdue',
): TimelineEvent {
  const days = daysOverdue(sys);
  return {
    id:          `rev-${sys.id}-${status}`,
    eventType:   'revisionSystem',
    entityName:  `${sys.name} Revision`,
    subjectName,
    date:        new Date(sys.nextRevisionDate!),
    status,
    meta:        status === 'overdue' ? { daysOverdue: days } : undefined,
  };
}

// ── Visual config ─────────────────────────────────────────────────────────────
const EVENT_STYLE: Record<TimelineEvent['eventType'], { bg: string; text: string; Icon: typeof BookOpen }> = {
  contentCompleted: { bg: 'bg-sky-500/10 border-sky-500/20',          text: 'text-sky-500',          Icon: BookOpen },
  qbankDone:        { bg: 'bg-violet-500/10 border-violet-500/20',   text: 'text-violet-500',       Icon: Layers   },
  pyqsDone:         { bg: 'bg-amber-500/10 border-amber-500/20',     text: 'text-amber-500',        Icon: BookOpen },
  revisionSystem:   { bg: 'bg-primary/10 border-primary/20',          text: 'text-primary',          Icon: Clock    },
  revisionSubject:  { bg: 'bg-primary/10 border-primary/20',          text: 'text-primary',          Icon: Clock    },
};

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, onRollback }: { event: TimelineEvent; onRollback?: (id: number) => void }) {
  const style = EVENT_STYLE[event.eventType];
  const { Icon } = style;
  const days = event.meta?.daysOverdue as number | undefined;
  const isDueToday = event.meta?.isDueToday as boolean | undefined;
  return (
    <div className="group bg-card border border-border/80 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-sm hover:border-primary/40 transition-all duration-200">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border', style.bg)}>
        <Icon className={cn('w-4 h-4', style.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{event.entityName}</p>
        <div className="flex items-center gap-2 mt-1">
          {event.subjectName && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 truncate">
              {event.subjectName}
            </span>
          )}
          {event.status === 'overdue' && days !== undefined && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20 shrink-0">
              {days} day{days !== 1 ? 's' : ''} overdue
            </span>
          )}
          {event.status === 'upcoming' && isDueToday && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
              Due Today
            </span>
          )}
          {event.status === 'upcoming' && !isDueToday && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
              {format(event.date, 'MMM d')}
            </span>
          )}
        </div>
      </div>
      {event.status === 'overdue' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
      {event.status === 'upcoming' && isDueToday && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
      {event.status === 'completed' && (
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          {event.dbHistoryId && onRollback && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRollback(event.dbHistoryId!);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Rollback event & revert status"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rollback</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconClass, events, emptyText, onRollback }: {
  title: string; icon: typeof BookOpen; iconClass: string; events: TimelineEvent[]; emptyText: string; onRollback?: (id: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-1.5 rounded-lg bg-muted/80 border border-border/50", iconClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {events.length > 0 && (
          <Badge variant="secondary" className="ml-auto font-mono text-[10px] px-2 py-0.5 font-bold">
            {events.length}
          </Badge>
        )}
      </div>
      {events.length === 0
        ? <p className="text-sm text-muted-foreground/60 pl-8 italic">{emptyText}</p>
        : <div className="space-y-2.5 pl-2">{events.map(e => <EventCard key={e.id} event={e} onRollback={onRollback} />)}</div>}
    </div>
  );
}

// ── Past-day group ────────────────────────────────────────────────────────────
function PastDayGroup({ date, events, onRollback }: { date: Date; events: TimelineEvent[]; onRollback?: (id: number) => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 bg-card border border-border shadow-sm">
          <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-muted-foreground">{format(date, 'EEE')}</span>
          <span className="text-sm font-mono font-bold leading-none mt-1 text-foreground">{format(date, 'd')}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{format(date, 'MMMM d, yyyy')}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{events.length} task{events.length !== 1 ? 's' : ''} completed</p>
        </div>
      </div>
      <div className="space-y-2.5 pl-12">{events.map(e => <EventCard key={e.id} event={e} onRollback={onRollback} />)}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Timeline() {
  const history  = useHistory();
  const systems  = useAllSystems();
  const subjects = useSubjects();
  const [filter, setFilter]       = useState<TimelineFilter>('all');
  const [calDate, setCalDate]     = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pendingRollbackId, setPendingRollbackId] = useState<number | null>(null);

  const handleRollbackRequest = (id: number) => {
    setPendingRollbackId(id);
  };

  const confirmRollback = async () => {
    if (!pendingRollbackId) return;
    try {
      await deleteHistoryEntry(pendingRollbackId);
      toast.success('Event rolled back & status reverted');
    } catch (err) {
      console.error('Failed to rollback history event:', err);
      toast.error('Failed to rollback event');
    } finally {
      setPendingRollbackId(null);
    }
  };

  const now        = new Date();
  const monthStart = startOfMonth(calDate);
  const monthEnd   = endOfMonth(calDate);
  const isCurrentMonth = isSameMonth(calDate, now);

  // Activity map for the heatmap
  const activityByDay = new Map<string, number>();
  history.forEach(h => {
    const d = format(new Date(h.completedAt), 'yyyy-MM-dd');
    activityByDay.set(d, (activityByDay.get(d) || 0) + 1);
  });

  // ── Completed events in the visible month ────────────────────────────────
  const monthCompleted: TimelineEvent[] = history
    .map(historyToEvent)
    .filter(e => e.date >= monthStart && e.date <= monthEnd);

  // ── Upcoming revision events in the visible month ────────────────────────
  const upcomingRevisions: TimelineEvent[] = systems
    .filter(sys => {
      if (!sys.nextRevisionDate) return false;
      const d = new Date(sys.nextRevisionDate);
      return isRevisionUpcoming(sys) && d >= monthStart && d <= monthEnd;
    })
    .map(sys => {
      const sub = subjects.find(s => s.id === sys.subjectId);
      return systemToRevisionEvent(sys, sub?.name ?? '', 'upcoming');
    });

  // ── Overdue revision events — sorted strictly by Decay Score / Priority ──
  const overdueRevisions: TimelineEvent[] = sortSystemsByRevisionPriority(systems.filter(sys => isRevisionOverdue(sys)))
    .map(sys => {
      const sub = subjects.find(s => s.id === sys.subjectId);
      return systemToRevisionEvent(sys, sub?.name ?? '', 'overdue');
    });

  // ── Due Today revision events ─────────────────────────────────────────────
  const dueTodayRevisions: TimelineEvent[] = sortSystemsByRevisionPriority(systems.filter(sys => isRevisionDueToday(sys)))
    .map(sys => {
      const sub = subjects.find(s => s.id === sys.subjectId);
      return {
        id: `rev-${sys.id}-due-today`,
        eventType: 'revisionSystem' as const,
        entityName: `${sys.name} Revision`,
        subjectName: sub?.name ?? '',
        date: new Date(sys.nextRevisionDate!),
        status: 'upcoming' as const,
        meta: { isDueToday: true },
      };
    });

  // ── Apply filter ──────────────────────────────────────────────────────────
  const filtered = (events: TimelineEvent[]) => events.filter(e => {
    const matchesCategory = eventMatchesFilter(e, filter);
    if (!matchesCategory) return false;
    if (selectedDate) return isSameDay(e.date, selectedDate);
    return true;
  });

  // ── Calendar structure ───────────────────────────────────────────────────
  const days     = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = (getDay(monthStart) + 6) % 7;
  const blanks   = Array.from({ length: startDow });

  // ── Section data ──────────────────────────────────────────────────────────
  const todayDue             = (isCurrentMonth && (!selectedDate || isSameDay(now, selectedDate))) ? filtered(dueTodayRevisions) : [];
  const todayCompleted       = (isCurrentMonth && (!selectedDate || isSameDay(now, selectedDate))) ? filtered(monthCompleted).filter(e => isToday(e.date)) : [];
  const todayEvents          = [...todayDue, ...todayCompleted];
  const filteredUpcoming     = filtered(upcomingRevisions);
  const filteredOverdue      = isCurrentMonth ? filtered(overdueRevisions) : [];

  // Past days in the selected month, most recent first
  const pastEntries = filtered(monthCompleted).filter(e => isCurrentMonth ? (!selectedDate ? !isToday(e.date) : true) : true);
  const pastGrouped: { date: Date; events: TimelineEvent[] }[] = [];
  pastEntries.forEach(event => {
    const existing = pastGrouped.find(g => isSameDay(g.date, event.date));
    if (existing) existing.events.push(event);
    else pastGrouped.push({ date: event.date, events: [event] });
  });
  pastGrouped.sort((a, b) => b.date.getTime() - a.date.getTime());

  const everythingEmpty =
    todayEvents.length === 0 && filteredUpcoming.length === 0 &&
    filteredOverdue.length === 0 && pastGrouped.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background px-4 pt-10 pb-36 max-w-2xl mx-auto flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">

      <div className="relative z-10 flex-1 flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold uppercase tracking-wider mb-0.5">
            <Sparkles className="w-3 h-3" /> Active Recall Timeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Timeline</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track daily completed tasks, study activity logs, and upcoming spaced revisions over time.
          </p>
        </header>

        {/* ── KPI Overview Grid ────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Completed */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-500 transition-colors">Completed</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                  {history.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Total tasks logged</div>
              </div>
            </div>

            {/* Monthly Activity */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">{format(calDate, 'MMM')} Activity</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                  {monthCompleted.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">In selected month</div>
              </div>
            </div>

            {/* Due / Overdue */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-500 transition-colors">Attention</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                  {overdueRevisions.length + dueTodayRevisions.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Due or overdue</div>
              </div>
            </div>

            {/* Scheduled Revisions */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-sky-500 transition-colors">Upcoming</span>
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                  {upcomingRevisions.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Revisions this month</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filter chips ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {TIMELINE_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(prev => prev === key ? 'all' : key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all border shadow-sm',
                filter === key
                  ? 'bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20'
                  : 'bg-card text-muted-foreground border-border/80 hover:bg-muted/50 hover:text-foreground'
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Month-on-Month Heatmap Calendar ──────────────────────────────── */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                {format(calDate, 'MMMM yyyy')} Activity Heatmap
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors border border-border/50 bg-background shadow-sm">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                disabled={calDate >= startOfMonth(now)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors border border-border/50 bg-background shadow-sm disabled:opacity-30 disabled:pointer-events-none">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {blanks.map((_, i) => <div key={`b-${i}`} />)}
            {days.map(day => {
              const key        = format(day, 'yyyy-MM-dd');
              const isTdy      = isSameDay(day, now);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const count      = activityByDay.get(key) || 0;
              const isFuture   = day > now && !isSameDay(day, now);

              let bgClass = 'bg-transparent text-foreground hover:bg-muted/40'; 
              if (count === 1) bgClass = 'bg-primary/20 text-foreground hover:bg-primary/30';
              if (count === 2) bgClass = 'bg-primary/40 text-foreground hover:bg-primary/50';
              if (count === 3) bgClass = 'bg-primary/70 text-primary-foreground font-medium hover:bg-primary/80';
              if (count >= 4)  bgClass = 'bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90';

              if (count === 0 && isTdy) {
                 bgClass = 'bg-transparent text-primary font-semibold ring-1 ring-primary ring-inset';
              } else if (isTdy) {
                 bgClass += ' ring-2 ring-primary ring-offset-2 ring-offset-card';
              }
              
              if (isSelected) {
                 bgClass += ' ring-2 ring-ring ring-offset-2 ring-offset-background font-bold scale-105 z-10';
              }

              if (isFuture) {
                 bgClass = 'bg-transparent text-muted-foreground/30 pointer-events-none';
              }

              return (
                <button
                  key={key}
                  disabled={isFuture}
                  onClick={() => setSelectedDate(prev => prev && isSameDay(prev, day) ? null : day)}
                  className={cn(
                    'aspect-square flex items-center justify-center rounded-lg text-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    bgClass
                  )}
                  title={`${format(day, 'MMM d, yyyy')}: ${count} task${count !== 1 ? 's' : ''} completed`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date filter banner */}
        {selectedDate && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl p-3 mb-6 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>Filtering activity for <span className="underline">{format(selectedDate, 'MMMM d, yyyy')}</span></span>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary/10 flex items-center gap-1"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* ── Sections ──────────────────────────────────────────────────────── */}
        <div className="space-y-10">
          {isCurrentMonth && (
            <Section title="Today" icon={CalendarDays} iconClass="text-primary" events={todayEvents} emptyText="No revisions due or activity completed today." onRollback={handleRollbackRequest} />
          )}
          
          {(isCurrentMonth || filteredUpcoming.length > 0) && (
            <Section title="Upcoming" icon={Clock} iconClass="text-amber-500" events={filteredUpcoming} emptyText="No upcoming revisions this month." onRollback={handleRollbackRequest} />
          )}
          
          {isCurrentMonth && (
            <Section title="Overdue" icon={AlertCircle} iconClass="text-destructive" events={filteredOverdue} emptyText="Nothing overdue." onRollback={handleRollbackRequest} />
          )}

          {pastGrouped.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  {isCurrentMonth ? 'Earlier this month' : `Activity in ${format(calDate, 'MMMM')}`}
                  <Badge variant="outline" className="text-[9px] font-normal border-primary/20 text-primary py-0 px-1.5 bg-primary/5">
                    ⚡ Virtualized 60fps
                  </Badge>
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <VirtualizedPastActivity pastGrouped={pastGrouped} onRollback={handleRollbackRequest} />
            </div>
          )}

          {everythingEmpty && (
            <div className="text-center py-14 px-4 bg-card/30 rounded-xl border border-border/50">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 opacity-50">
                <CalendarDays className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1 text-sm">Nothing here yet</p>
              <p className="text-xs text-muted-foreground">
                {filter !== 'all'
                  ? `No ${TIMELINE_FILTERS.find(f => f.key === filter)!.label} events for ${format(calDate, 'MMMM yyyy')}.`
                  : `No activity recorded for ${format(calDate, 'MMMM yyyy')}.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={pendingRollbackId !== null} onOpenChange={(open) => { if (!open) setPendingRollbackId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw className="w-5 h-5" /> Confirm Event Rollback
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this completed event? This will revert the completion status and update your study timeline accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRollback}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              Rollback Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VirtualizedPastActivity({
  pastGrouped,
  onRollback,
}: {
  pastGrouped: { date: Date; events: TimelineEvent[] }[];
  onRollback: (id: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: pastGrouped.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 130,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-y-auto pr-1 rounded-xl border border-border/30 p-2 bg-card/20 space-y-2"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const { date, events } = pastGrouped[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-4"
            >
              <PastDayGroup date={date} events={events} onRollback={onRollback} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

