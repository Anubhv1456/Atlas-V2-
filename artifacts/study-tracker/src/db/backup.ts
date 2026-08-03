import { db } from './schema';
import * as T from './types';
export async function exportData() {
  const subjects  = await db.subjects.toArray();
  const systems   = await db.systems.toArray();
  const history   = await db.history.toArray();
  const pyqYears  = await db.pyqYears.toArray();
  const scoreLogs = await db.scoreLogs.toArray();
  const uiPreferences = await db.uiPreferences.toArray();
  return { subjects, systems, history, pyqYears, scoreLogs, uiPreferences };
}

export async function importData(data: {
  subjects?: T.Subject[];
  systems: T.StudySystem[];
  history?: T.HistoryEntry[];
  pyqYears?: T.PYQYear[];
  scoreLogs?: T.ScoreLog[];
  uiPreferences?: T.UIPreference[];
}) {
  await db.transaction('rw', [db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs, db.uiPreferences], async () => {
    await db.subjects.clear();
    await db.systems.clear();
    await db.history.clear();
    await db.pyqYears.clear();
    await db.scoreLogs.clear();
    await db.uiPreferences.clear();

    if (data.subjects?.length) {
      await db.subjects.bulkAdd(
        data.subjects.map(s => ({
          ...s,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        })),
      );
    }

    if (data.systems?.length) {
      await db.systems.bulkAdd(
        data.systems.map(s => {
          const base = { ...s, updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date() };
          const old  = s as unknown as Record<string, unknown>;
          if (typeof old['contentDone'] === 'boolean' && !('contentInitialized' in s)) {
            const wasDone = Boolean(old['contentDone']);
            base.contentInitialized    = wasDone;
            base.contentUnitsTotal     = wasDone ? 1 : 0;
            base.contentUnitsCompleted = wasDone ? 1 : 0;
            base.contentCompleted      = wasDone;
          }
          if (!('completionDate' in s))          base.completionDate = null;
          if (!('revisionCount' in s))           base.revisionCount = 0;
          if (!('lastRevisionDate' in s))        base.lastRevisionDate = null;
          if (!('currentRevisionInterval' in s)) base.currentRevisionInterval = null;
          if (!('nextRevisionDate' in s))        base.nextRevisionDate = null;
          if (!('focus' in s))                   base.focus = null;
          if (!('decayFactor' in s) || base.decayFactor === undefined) base.decayFactor = 1.0;
          if (!('isLengthy' in s))               base.isLengthy = false;
          if (!('revisionState' in s))           base.revisionState = 'idle';
          if (!('revisionStartedAt' in s))       base.revisionStartedAt = null;
          if (!('revisionLastCheckInDate' in s)) base.revisionLastCheckInDate = null;
          if (!('revisionDaysLogged' in s))      base.revisionDaysLogged = 0;
          if (!('revisionProgressPercent' in s)) base.revisionProgressPercent = 0;
          if (base.completionDate)    base.completionDate    = new Date(base.completionDate as unknown as string);
          if (base.lastRevisionDate)  base.lastRevisionDate  = new Date(base.lastRevisionDate as unknown as string);
          if (base.nextRevisionDate)  base.nextRevisionDate  = new Date(base.nextRevisionDate as unknown as string);
          if (base.revisionStartedAt) base.revisionStartedAt = new Date(base.revisionStartedAt as unknown as string);
          return base;
        }),
      );
    }

    if (data.history?.length) {
      await db.history.bulkAdd(
        data.history.map(h => ({ ...h, completedAt: h.completedAt ? new Date(h.completedAt) : new Date() })),
      );
    }

    if (data.pyqYears?.length) {
      await db.pyqYears.bulkAdd(
        data.pyqYears.map(p => ({
          ...p,
          createdAt:   p.createdAt ? new Date(p.createdAt) : new Date(),
          completedAt: p.completedAt ? new Date(p.completedAt) : null,
        })),
      );
    }

    if (data.scoreLogs?.length) {
      await db.scoreLogs.bulkAdd(
        data.scoreLogs.map(sl => ({
          ...sl,
          timestamp: sl.timestamp ? new Date(sl.timestamp) : new Date(),
        })),
      );
    }

    if (data.uiPreferences?.length) {
      await db.uiPreferences.bulkAdd(
        data.uiPreferences.map((p: any) => ({
          ...p,
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        })),
      );
    }
  });
}
