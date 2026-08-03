import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import { Subject, StudySystem, HistoryEntry, PYQYear, ScoreLog } from './types';
import { SystemStatus } from './types';
import { scheduleFirstRevision, scheduleNextRevision, isRevisionDue, today, sortSystemsByRevisionPriority, calculateDurationMultiplier, getActiveRevisionSystems } from './revisionEngine';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateHLC } from '../lib/hlc';
export function useSubjects() {
  return useLiveQuery(async () => {
    const subjects = await db.subjects.toArray().then(res => res.filter(s => !s.deletedAt));
    const prefs = await db.uiPreferences.where('type').equals('subject').toArray();
    return subjects.map(s => {
      const p = prefs.find(p => p.entityId === s.id);
      return {
        ...s,
        order: p?.order ?? s.id ?? 0,
        focus: p?.focus ?? null
      };
    }).sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));
  }) ?? [];
}

export function useSubject(id: number) {
  return useLiveQuery(async () => {
    const sub = await db.subjects.get(id);
    if (!sub || sub.deletedAt) return undefined;
    const p = await db.uiPreferences.get(`subject:${id}`);
    return {
      ...sub,
      order: p?.order ?? sub.id ?? 0,
      focus: p?.focus ?? null
    };
  }, [id]);
}

export function useSystemsBySubject(subjectId: number) {
  return useLiveQuery(async () => {
    const systems = await db.systems.where('subjectId').equals(subjectId).toArray().then(res => res.filter(s => !s.deletedAt));
    const prefs = await db.uiPreferences.where('type').equals('system').toArray();
    return systems.map(s => {
      const p = prefs.find(p => p.entityId === s.id);
      return {
        ...s,
        order: p?.order ?? s.id ?? 0,
        focus: p?.focus ?? null
      };
    });
  }, [subjectId]) ?? [];
}

export function useAllSystems() {
  return useLiveQuery(async () => {
    const systems = await db.systems.toArray().then(res => res.filter(s => !s.deletedAt));
    const prefs = await db.uiPreferences.where('type').equals('system').toArray();
    return systems.map(s => {
      const p = prefs.find(p => p.entityId === s.id);
      return {
        ...s,
        order: p?.order ?? s.id ?? 0,
        focus: p?.focus ?? null
      };
    });
  }) ?? [];
}

export function useSystem(id: number) {
  return useLiveQuery(async () => {
    const sys = await db.systems.get(id);
    if (!sys || sys.deletedAt) return undefined;
    const p = await db.uiPreferences.get(`system:${id}`);
    return {
      ...sys,
      order: p?.order ?? sys.id ?? 0,
      focus: p?.focus ?? null
    };
  }, [id]);
}

export function useHistory() {
  return useLiveQuery(() => db.history.orderBy('completedAt').reverse().toArray().then(res => res.filter(h => !h.deletedAt))) ?? [];
}

export function useHistoryByMonth(year: number, month: number) {
  return useLiveQuery(() => {
    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 1);
    return db.history
      .where('completedAt')
      .between(start, end, true, false)
      .reverse()
      .toArray().then(res => res.filter(h => !h.deletedAt));
  }, [year, month]) ?? [];
}

export function useEarliestHistoryDate(): Date | null {
  return useLiveQuery(async () => {
    const entry = await db.history.orderBy('completedAt').first();
    return entry ? new Date(entry.completedAt) : null;
  }) ?? null;
}

/** All systems that have a revision due today or overdue. */
export function useRevisionsDue(): StudySystem[] {
  const systems = useLiveQuery(() => db.systems.toArray()) ?? [];
  const now = today();
  return systems.filter(s => isRevisionDue(s, now));
}

/** Systems currently in active multi-day revision. */
export function useActiveRevisions(): StudySystem[] {
  return useLiveQuery(() => db.systems.where('revisionState').equals('in_progress').toArray()) ?? [];
}

/** All PYQ years for a specific subject, ordered by year label. */
export function usePYQsBySubject(subjectId: number): PYQYear[] {
  return useLiveQuery(
    () => db.pyqYears.where('subjectId').equals(subjectId).sortBy('year'),
    [subjectId],
  ) ?? [];
}

/** All PYQ years across all subjects. */
export function useAllPYQs(): PYQYear[] {
  return useLiveQuery(() => db.pyqYears.toArray().then(res => res.filter(p => !p.deletedAt))) ?? [];
}

/** All score logs for a specific subject. */
export function useScoreLogsBySubject(subjectId: number): ScoreLog[] {
  return useLiveQuery(
    () => db.scoreLogs.where('subjectId').equals(subjectId).toArray(),
    [subjectId]
  ) ?? [];
}

// ── Actions ────────────────────────────────────────────────────────────────

export function useCurrentStreak(): number {
  return useLiveQuery(async () => {
    const history = await db.history.orderBy('completedAt').reverse().toArray().then(res => res.filter(h => !h.deletedAt));
    if (history.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const dates = new Set(history.map(entry => {
      const d = new Date(entry.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));

    // Check if there is an entry for today. If not, maybe yesterday?
    let timeToCheck = currentDate.getTime();
    if (!dates.has(timeToCheck)) {
      // Allow streak to continue if they haven't done anything today yet, but did yesterday.
      timeToCheck -= 86400000;
      if (!dates.has(timeToCheck)) {
        return 0; // Missed yesterday and today
      }
    }

    while (dates.has(timeToCheck)) {
      streak++;
      timeToCheck -= 86400000; // Move back one day
    }
    return streak;
  }) ?? 0;
}
