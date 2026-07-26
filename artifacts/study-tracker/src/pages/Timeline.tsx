import { useState } from 'react';
import { useHistory, useAllSystems, useSubjects } from '@/db/hooks';
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
import { ChevronLeft, ChevronRight, BookOpen, Layers, CalendarDays, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isRevisionUpcoming, isRevisionOverdue, daysOverdue } from '@/db/revisionEngine';

// ── Map a HistoryEntry → completed TimelineEvent ──────────────────────────────
function historyToEvent(h: HistoryEntry): TimelineEvent {
  const typeMap: Record<string, TimelineEvent['eventType']> = {
    contentDone: 'contentCompleted',
    qbankDone:   'qbankDone',
    pyqsDone:    'pyqsDone',
    revision:    'revisionSystem',
  };
  // PYQ entries store the full label as taskLabel (e.g. "Medicine PYQs 2022")
  // and have no systemName, so use taskLabel directly as entityName.
  const entityName = h.taskKey === 'pyqsDone'
    ? h.taskLabel
    : `${h.systemName} ${h.taskLabel}`;
  return {
    id:          String(h.id ?? `${h.systemId}-${h.taskKey}-${h.completedAt}`),
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
  contentCompleted: { bg: 'bg-transparent border border-sky-500/30',          text: 'text-sky-500',          Icon: BookOpen },
  qbankDone:        { bg: 'bg-transparent border border-violet-500/30',       text: 'text-violet-500',       Icon: Layers   },
  pyqsDone:         { bg: 'bg-transparent border border-[hsl(var(--gold))]/40', text: 'text-[hsl(var(--gold))]', Icon: BookOpen },
  revisionSystem:   { bg: 'bg-transparent border border-primary/30',          text: 'text-primary',          Icon: Clock    },
  revisionSubject:  { bg: 'bg-transparent border border-primary/30',          text: 'text-primary',          Icon: Clock    },
};

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event }: { event: TimelineEvent }) {
  const style = EVENT_STYLE[event.eventType];
  const { Icon } = style;
  const days = event.meta?.daysOverdue as number | undefined;
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm hover:border-primary/20 transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', style.bg)}>
        <Icon className={cn('w-4 h-4', style.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{event.entityName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.subjectName && <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{event.subjectName}</p>}
          {event.status === 'overdue' && days !== undefined && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-destructive shrink-0">{days} day{days !== 1 ? 's' : ''} overdue</p>
          )}
          {event.status === 'upcoming' && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">{format(event.date, 'MMM d')}</p>
          )}
        </div>
      </div>
      {event.status === 'overdue' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconClass, events, emptyText }: {
  title: string; icon: typeof BookOpen; iconClass: string; events: TimelineEvent[]; emptyText: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-4 h-4 shrink-0', iconClass)} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {events.length > 0 && (
          <span className="ml-auto text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{events.length}</span>
        )}
      </div>
      {events.length === 0
        ? <p className="text-sm text-muted-foreground/50 pl-6 italic">{emptyText}</p>
        : <div className="space-y-2 pl-6">{events.map(e => <EventCard key={e.id} event={e} />)}</div>}
    </div>
  );
}

// ── Past-day group ────────────────────────────────────────────────────────────
function PastDayGroup({ date, events }: { date: Date; events: TimelineEvent[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center shrink-0 bg-muted/30 border border-border">
          <span className="text-[9px] font-semibold uppercase tracking-wider leading-none text-muted-foreground">{format(date, 'EEE')}</span>
          <span className="text-sm font-mono font-bold leading-none mt-1 text-foreground">{format(date, 'd')}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{format(date, 'MMMM d')}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{events.length} task{events.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="space-y-2 pl-14">{events.map(e => <EventCard key={e.id} event={e} />)}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Timeline() {
  const history  = useHistory();
  const systems  = useAllSystems();
  const subjects = useSubjects();
  const [filter, setFilter]   = useState<TimelineFilter>('all');
  const [calDate, setCalDate] = useState(new Date());

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

  // ── Overdue revision events — all still-outstanding overdue items ─────────
  const overdueRevisions: TimelineEvent[] = systems
    .filter(sys => isRevisionOverdue(sys))
    .map(sys => {
      const sub = subjects.find(s => s.id === sys.subjectId);
      return systemToRevisionEvent(sys, sub?.name ?? '', 'overdue');
    })
    .sort((a, b) => {
      const da = (a.meta?.daysOverdue as number) ?? 0;
      const db_ = (b.meta?.daysOverdue as number) ?? 0;
      return db_ - da; // most overdue first
    });

  // ── Apply filter ──────────────────────────────────────────────────────────
  const filtered = (events: TimelineEvent[]) => events.filter(e => eventMatchesFilter(e, filter));

  // ── Calendar structure ───────────────────────────────────────────────────
  const days     = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = (getDay(monthStart) + 6) % 7;
  const blanks   = Array.from({ length: startDow });

  // ── Section data ──────────────────────────────────────────────────────────
  const todayCompleted       = isCurrentMonth ? filtered(monthCompleted).filter(e => isToday(e.date)) : [];
  const filteredUpcoming     = filtered(upcomingRevisions);
  const filteredOverdue      = isCurrentMonth ? filtered(overdueRevisions) : [];

  // Past days in the selected month (not today), most recent first
  const pastEntries = filtered(monthCompleted).filter(e => isCurrentMonth ? !isToday(e.date) : true);
  const pastGrouped: { date: Date; events: TimelineEvent[] }[] = [];
  pastEntries.forEach(event => {
    const existing = pastGrouped.find(g => isSameDay(g.date, event.date));
    if (existing) existing.events.push(event);
    else pastGrouped.push({ date: event.date, events: [event] });
  });
  pastGrouped.sort((a, b) => b.date.getTime() - a.date.getTime());

  const everythingEmpty =
    todayCompleted.length === 0 && filteredUpcoming.length === 0 &&
    filteredOverdue.length === 0 && pastGrouped.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-28 max-w-2xl mx-auto flex flex-col relative overflow-hidden">


      <div className="relative z-10 flex-1 flex flex-col">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">Timeline</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide uppercase">Your chronological view</p>
          </div>
        </header>

        {/* ── Filter chips ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TIMELINE_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(prev => prev === key ? 'all' : key)}
              className={cn('px-4 py-2 rounded-lg text-[11px] font-medium tracking-wide uppercase transition-all border',
                filter === key ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card text-muted-foreground border-border hover:bg-muted/50')}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Month-on-Month Heatmap Calendar ──────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-10 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors border border-transparent hover:border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              {format(calDate, 'MMMM yyyy')}
            </h2>
            <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              disabled={calDate >= startOfMonth(now)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors border border-transparent hover:border-border disabled:opacity-30 disabled:pointer-events-none">
              <ChevronRight className="w-4 h-4" />
            </button>
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
              const key      = format(day, 'yyyy-MM-dd');
              const isTdy    = isSameDay(day, now);
              const count    = activityByDay.get(key) || 0;
              const isFuture = day > now && !isSameDay(day, now);

              let bgClass = 'bg-transparent text-foreground hover:bg-muted/30'; 
              if (count === 1) bgClass = 'bg-primary/20 text-primary-foreground hover:bg-primary/30';
              if (count === 2) bgClass = 'bg-primary/40 text-primary-foreground hover:bg-primary/50';
              if (count === 3) bgClass = 'bg-primary/70 text-primary-foreground font-medium hover:bg-primary/80';
              if (count >= 4)  bgClass = 'bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90';

              if (count === 0 && isTdy) {
                 bgClass = 'bg-transparent text-primary font-semibold ring-1 ring-primary ring-inset';
              } else if (isTdy) {
                 bgClass += ' ring-2 ring-primary ring-offset-2 ring-offset-card';
              }
              
              if (isFuture) {
                 bgClass = 'bg-transparent text-muted-foreground/30 pointer-events-none';
              }

              return (
                <div key={key} className={cn(
                  'aspect-square flex items-center justify-center rounded-lg text-xs transition-all cursor-default',
                  bgClass
                )}>
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sections ──────────────────────────────────────────────────────── */}
        <div className="space-y-10">
          {isCurrentMonth && (
            <Section title="Today" icon={CalendarDays} iconClass="text-primary" events={todayCompleted} emptyText="Nothing completed today yet." />
          )}
          
          {(isCurrentMonth || filteredUpcoming.length > 0) && (
            <Section title="Upcoming" icon={Clock} iconClass="text-amber-500" events={filteredUpcoming} emptyText="No upcoming revisions this month." />
          )}
          
          {isCurrentMonth && (
            <Section title="Overdue" icon={AlertCircle} iconClass="text-destructive" events={filteredOverdue} emptyText="Nothing overdue." />
          )}

          {pastGrouped.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isCurrentMonth ? 'Earlier this month' : `Activity in ${format(calDate, 'MMMM')}`}
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              {pastGrouped.map(({ date, events }) => (
                <PastDayGroup key={date.toISOString()} date={date} events={events} />
              ))}
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
    </div>
  );
}

