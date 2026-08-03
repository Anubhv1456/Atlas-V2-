import { format, isSameDay } from 'date-fns';
import { HistoryEntry, StudySystem, TimelineEvent, daysOverdue } from '@/db';

export function historyToEvent(h: HistoryEntry): TimelineEvent {
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

export function systemToRevisionEvent(
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

export function buildActivityHeatmap(history: HistoryEntry[]) {
  const activityByDay = new Map<string, number>();
  history.forEach(h => {
    const d = format(new Date(h.completedAt), 'yyyy-MM-dd');
    activityByDay.set(d, (activityByDay.get(d) || 0) + 1);
  });
  return activityByDay;
}

export function groupPastEntries(pastEntries: TimelineEvent[]) {
  const pastGrouped: { date: Date; events: TimelineEvent[] }[] = [];
  pastEntries.forEach(event => {
    const existing = pastGrouped.find(g => isSameDay(g.date, event.date));
    if (existing) existing.events.push(event);
    else pastGrouped.push({ date: event.date, events: [event] });
  });
  pastGrouped.sort((a, b) => b.date.getTime() - a.date.getTime());
  return pastGrouped;
}
