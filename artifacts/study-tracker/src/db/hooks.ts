import { useLiveQuery } from 'dexie-react-hooks';
import { db, Subject, StudySystem, HistoryEntry, PYQYear } from './database';
import { SystemStatus } from './database';
import { scheduleFirstRevision, scheduleNextRevision, isRevisionDue, today, sortSystemsByRevisionPriority } from './revisionEngine';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useSubjects() {
  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? [];
  return [...subjects].sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));
}

export function useSubject(id: number) {
  return useLiveQuery(() => db.subjects.get(id), [id]);
}

export function useSystemsBySubject(subjectId: number) {
  return useLiveQuery(() => db.systems.where('subjectId').equals(subjectId).toArray(), [subjectId]) ?? [];
}

export function useAllSystems() {
  return useLiveQuery(() => db.systems.toArray()) ?? [];
}

export function useSystem(id: number) {
  return useLiveQuery(() => db.systems.get(id), [id]);
}

export function useHistory() {
  return useLiveQuery(() => db.history.orderBy('completedAt').reverse().toArray()) ?? [];
}

export function useHistoryByMonth(year: number, month: number) {
  return useLiveQuery(() => {
    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 1);
    return db.history
      .where('completedAt')
      .between(start, end, true, false)
      .reverse()
      .toArray();
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

/** All PYQ years for a specific subject, ordered by year label. */
export function usePYQsBySubject(subjectId: number): PYQYear[] {
  return useLiveQuery(
    () => db.pyqYears.where('subjectId').equals(subjectId).sortBy('year'),
    [subjectId],
  ) ?? [];
}

/** All PYQ years across all subjects. */
export function useAllPYQs(): PYQYear[] {
  return useLiveQuery(() => db.pyqYears.toArray()) ?? [];
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function addSubject(name: string) {
  const existingSubjects = await db.subjects.toArray();
  const maxOrder = existingSubjects.reduce((max, sub) => Math.max(max, sub.order ?? 0), -1);
  return await db.subjects.add({
    name,
    order: maxOrder + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateSubjectsOrder(updates: { id: number; order: number }[]) {
  return await db.transaction('rw', db.subjects, async () => {
    for (const update of updates) {
      await db.subjects.update(update.id, { order: update.order, updatedAt: new Date() });
    }
  });
}

export async function updateSubject(id: number, name: string) {
  return await db.subjects.update(id, { name, updatedAt: new Date() });
}

export async function deleteSubject(id: number) {
  await db.transaction('rw', db.subjects, db.systems, db.history, db.pyqYears, async () => {
    await db.history.where('subjectId').equals(id).delete();
    await db.systems.where('subjectId').equals(id).delete();
    await db.pyqYears.where('subjectId').equals(id).delete();
    await db.subjects.delete(id);
  });
}

export async function addSystem(subjectId: number, name: string) {
  const existingSystems = await db.systems.where('subjectId').equals(subjectId).toArray();
  const maxOrder = existingSystems.reduce((max, sys) => Math.max(max, sys.order ?? 0), -1);

  return await db.systems.add({
    subjectId,
    name,
    order: maxOrder + 1,
    contentInitialized: false,
    contentUnitsTotal: 0,
    contentUnitsCompleted: 0,
    contentCompleted: false,
    qbankDone: false,
    weakAreas: '',
    status: 'Average',
    updatedAt: new Date(),
    completionDate: null,
    revisionCount: 0,
    lastRevisionDate: null,
    currentRevisionInterval: null,
    nextRevisionDate: null,
  });
}

export async function updateSystem(id: number, changes: Partial<StudySystem>) {
  return await db.systems.update(id, { ...changes, updatedAt: new Date() });
}

export async function updateSystemsOrder(updates: { id: number; order: number }[]) {
  return await db.transaction('rw', db.systems, async () => {
    for (const update of updates) {
      await db.systems.update(update.id, { order: update.order, updatedAt: new Date() });
    }
  });
}

/** Set focus mode for a system, ensuring only one primary and one secondary exist at a time. */
export async function setFocus(id: number, focus: 'primary' | 'secondary' | null) {
  return await db.transaction('rw', db.systems, async () => {
    if (focus) {
      // Find and unset any existing system with this focus
      const existing = await db.systems.filter(s => s.focus === focus).toArray();
      for (const sys of existing) {
        if (sys.id !== id) {
          await db.systems.update(sys.id!, { focus: null });
        }
      }
    }
    await db.systems.update(id, { focus, updatedAt: new Date() });
  });
}

export async function deleteSystem(id: number) {
  await db.transaction('rw', db.systems, db.history, async () => {
    await db.history.where('systemId').equals(id).delete();
    await db.systems.delete(id);
  });
}

export async function logCompletion(entry: Omit<HistoryEntry, 'id'>) {
  return await db.history.add(entry);
}

export async function deleteHistoryEntry(id: number) {
  return await db.transaction('rw', db.history, db.systems, db.pyqYears, async () => {
    const entry = await db.history.get(id);
    if (!entry) return;

    if (entry.taskKey === 'qbankDone' && entry.systemId) {
      const sys = await db.systems.get(entry.systemId);
      if (sys) {
        await db.systems.update(entry.systemId, {
          qbankDone: false,
          completionDate: null,
          nextRevisionDate: null,
          updatedAt: new Date(),
        });
      }
    } else if ((entry.taskKey === 'contentDone' || entry.taskKey === 'contentProgress') && entry.systemId) {
      const sys = await db.systems.get(entry.systemId);
      if (sys) {
        let newCompletedUnits = sys.contentUnitsCompleted;
        if (entry.taskKey === 'contentDone') {
          if (sys.contentUnitsTotal > 0) {
            newCompletedUnits = Math.max(0, sys.contentUnitsTotal - 1);
          } else {
            newCompletedUnits = 0;
          }
        } else {
          newCompletedUnits = Math.max(0, sys.contentUnitsCompleted - 1);
        }
        await db.systems.update(entry.systemId, {
          contentUnitsCompleted: newCompletedUnits,
          contentCompleted: false,
          completionDate: null,
          nextRevisionDate: null,
          updatedAt: new Date(),
        });
      }
    } else if (entry.taskKey === 'pyqsDone' && entry.subjectId) {
      const pyqs = await db.pyqYears.where('subjectId').equals(entry.subjectId).toArray();
      const matchedPyq = pyqs.find(p => p.completed && entry.taskLabel.includes(p.year));
      if (matchedPyq) {
        await db.pyqYears.update(matchedPyq.id!, {
          completed: false,
          completedAt: null,
        });
      }
    } else if (entry.taskKey === 'revision' && entry.systemId) {
      const sys = await db.systems.get(entry.systemId);
      if (sys) {
        const newRevCount = Math.max(0, (sys.revisionCount ?? 1) - 1);
        const remainingRevisions = await db.history
          .where('systemId')
          .equals(entry.systemId)
          .filter(h => h.id !== id && h.taskKey === 'revision')
          .toArray();

        remainingRevisions.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        let lastRevisionDate: Date | null = null;
        let nextRevisionDate: Date | null = null;

        if (remainingRevisions.length > 0) {
          lastRevisionDate = new Date(remainingRevisions[0].completedAt);
          const previousInterval = sys.currentRevisionInterval ?? 14;
          const scheduled = scheduleNextRevision(sys.status, previousInterval, lastRevisionDate);
          nextRevisionDate = scheduled.nextRevisionDate;
        } else if (sys.completionDate) {
          lastRevisionDate = null;
          const scheduled = scheduleFirstRevision(sys.status, new Date(sys.completionDate));
          nextRevisionDate = scheduled.nextRevisionDate;
        }

        await db.systems.update(entry.systemId, {
          revisionCount: newRevCount,
          lastRevisionDate,
          nextRevisionDate,
          updatedAt: new Date(),
        });
      }
    }

    await db.history.delete(id);
  });
}

// ── PYQ Year actions ───────────────────────────────────────────────────────

/** Add a new year entry to a subject's PYQ section. */
export async function addPYQYear(subjectId: number, year: string) {
  return await db.pyqYears.add({
    subjectId,
    year: year.trim(),
    completed: false,
    completedAt: null,
    createdAt: new Date(),
  });
}

/** Rename a PYQ year entry. */
export async function updatePYQYear(id: number, year: string) {
  return await db.pyqYears.update(id, { year: year.trim() });
}

/** Remove a PYQ year entry and its associated history. */
export async function deletePYQYear(id: number) {
  return await db.pyqYears.delete(id);
}

/**
 * Toggle a PYQ year's completion state.
 * Logs a history entry when marking complete; silently undoes it when unchecking.
 */
export async function togglePYQYear(
  id: number,
  subjectId: number,
  subjectName: string,
  year: string,
  currentlyCompleted: boolean,
) {
  const completed   = !currentlyCompleted;
  const completedAt = completed ? new Date() : null;
  await db.pyqYears.update(id, { completed, completedAt });
  if (completed) {
    await logCompletion({
      subjectId,
      subjectName,
      systemId: 0,
      systemName: '',
      taskKey: 'pyqsDone',
      // taskLabel becomes entityName in Timeline via historyToEvent
      taskLabel: `${subjectName} PYQs ${year}`,
      completedAt: new Date(),
    });
  } else {
    const matching = await db.history
      .where('subjectId')
      .equals(subjectId)
      .filter(h => h.taskKey === 'pyqsDone' && h.taskLabel.includes(year))
      .toArray();
    for (const entry of matching) {
      if (entry.id) await db.history.delete(entry.id);
    }
  }
}

// ── Revision actions ───────────────────────────────────────────────────────

/**
 * Record the initial evaluation after a system is first fully completed.
 * Sets completionDate, confidence (status), and schedules the first revision.
 */
export async function recordInitialEvaluation(
  systemId: number,
  confidence: SystemStatus,
) {
  const sys = await db.systems.get(systemId);
  const decayFactor = sys?.decayFactor ?? 1.0;
  const now = today();
  const { currentRevisionInterval, nextRevisionDate } = scheduleFirstRevision(confidence, now, decayFactor);
  await updateSystem(systemId, {
    status: confidence,
    completionDate: new Date(),
    revisionCount: 0,
    lastRevisionDate: null,
    currentRevisionInterval,
    nextRevisionDate,
    focus: null,
  });

  const formattedDate = format(nextRevisionDate, 'MMM d, yyyy');
  toast.success('Spaced Recall Engine Active', {
    description: `Confidence: ${confidence} • First recall scheduled in ${currentRevisionInterval} days (${formattedDate})`,
  });
}

/**
 * Mark a revision as completed.
 * Increments revisionCount, updates confidence + lastRevisionDate,
 * calculates and schedules the next revision, logs a history entry.
 */
export async function completeRevision(
  systemId: number,
  confidence: SystemStatus,
  subjectId: number,
  subjectName: string,
  systemName: string,
) {
  const sys = await db.systems.get(systemId);
  if (!sys) return;

  const now = today();
  const previousInterval = sys.currentRevisionInterval ?? 12;
  const decayFactor = sys.decayFactor ?? 1.0;
  const { currentRevisionInterval, nextRevisionDate } = scheduleNextRevision(confidence, previousInterval, now, decayFactor);

  await updateSystem(systemId, {
    status: confidence,
    revisionCount: (sys.revisionCount ?? 0) + 1,
    lastRevisionDate: new Date(),
    currentRevisionInterval,
    nextRevisionDate,
  });

  await logCompletion({
    subjectId,
    subjectName,
    systemId,
    systemName,
    taskKey: 'revision',
    taskLabel: 'Revision',
    completedAt: new Date(),
  });

  const delta = currentRevisionInterval - previousInterval;
  const deltaStr = delta >= 0 ? `+${delta}d stability` : `${delta}d adjusted`;
  const formattedDate = format(nextRevisionDate, 'MMM d, yyyy');

  toast.success(`Recall Pass Logged: ${systemName}`, {
    description: `Stability: ${previousInterval}d → ${currentRevisionInterval}d (${deltaStr}) • Target 90% Recall due ${formattedDate}`,
  });
}

export async function clearHistory() {
  return await db.history.clear();
}

export function useCurrentStreak(): number {
  return useLiveQuery(async () => {
    const history = await db.history.orderBy('completedAt').reverse().toArray();
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
