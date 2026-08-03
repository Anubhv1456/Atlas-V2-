import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  useSubjects, useAllSystems, db, deleteHistoryEntry
} from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  sortSystemsByRevisionPriority, isRevisionDueToday, isRevisionOverdue, isRevisionUpcoming, daysOverdue,
  eventMatchesFilter, TimelineEvent, TimelineFilter
} from '@/db';
import { HistoryEntry, StudySystem, useHistory } from '@/db';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameMonth, isSameDay, isToday, addMonths, subMonths 
} from 'date-fns';
import { toast } from 'sonner';

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

export function useTimelineLogic() {

  const [, setLocation] = useLocation();
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

  
  const goToSystem = (subjectId: number, systemId: number) => {
    setLocation(`/subjects/${subjectId}?highlight=${systemId}`);
  };


  // ── Render ────────────────────────────────────────────────────────────────
  
  return {
    history, subjects, systems,
    calDate, setCalDate,
    selectedDate, setSelectedDate,
    filter, setFilter,
    pendingRollbackId, setPendingRollbackId,
    goToSystem, confirmRollback, handleRollbackRequest,
    now, monthStart, monthEnd, isCurrentMonth,
    activityByDay, monthCompleted, upcomingRevisions, overdueRevisions, dueTodayRevisions,
    days, startDow, blanks,
    todayDue, todayCompleted, todayEvents, filteredUpcoming, filteredOverdue,
    pastEntries, pastGrouped, everythingEmpty
  };
}
