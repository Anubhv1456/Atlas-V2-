/**
 * Generic Timeline event model.
 *
 * Future prompts will generate Upcoming / Overdue events automatically
 * (e.g. from the revision engine). The Timeline page renders them without
 * caring about the data source — only this shape matters.
 */

export type TimelineEventType =
  | 'contentCompleted'   // content unit progress completed
  | 'qbankDone'          // Q-bank completed
  | 'pyqsDone'           // PYQs completed (future)
  | 'revisionSystem'     // system revision (future)
  | 'revisionSubject';   // subject revision (future)

export type TimelineEventStatus = 'completed' | 'upcoming' | 'overdue';

export interface TimelineEvent {
  /** Unique key for React reconciliation (not persisted). */
  id: string;
  eventType: TimelineEventType;
  /** Human-readable label, e.g. "Cardiology Content" */
  entityName: string;
  /** Subject name — for grouping / display */
  subjectName?: string;
  date: Date;
  status: TimelineEventStatus;
  /** Arbitrary metadata passed through to the renderer. */
  meta?: Record<string, unknown>;
}

// ── Filter categories surfaced in the UI ──────────────────────────────────

export type TimelineFilter = 'all' | 'content' | 'qbank' | 'pyqs' | 'revision';

export const TIMELINE_FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'content',  label: 'Content'  },
  { key: 'qbank',    label: 'QBank'    },
  { key: 'pyqs',     label: 'PYQs'     },
  { key: 'revision', label: 'Revision' },
];

/** Returns true when a TimelineEvent matches the active filter. */
export function eventMatchesFilter(event: TimelineEvent, filter: TimelineFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'content')  return event.eventType === 'contentCompleted';
  if (filter === 'qbank')    return event.eventType === 'qbankDone';
  if (filter === 'pyqs')     return event.eventType === 'pyqsDone';
  if (filter === 'revision') return event.eventType === 'revisionSystem' || event.eventType === 'revisionSubject';
  return false;
}
