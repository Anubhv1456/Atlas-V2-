import { db, Subject, StudySystem, PYQYear, ScoreLog, HistoryEntry } from '../db';

import { updateHLC } from './hlc';

function isHLCGreater(remote: string | undefined, local: string | undefined, remoteTime: number, localTime: number): boolean {
  if (remote && local) {
    updateHLC(remote);
    return remote > local;
  }
  return remoteTime > localTime;
}

export interface MergeStats {
  updated: number;
  inserted: number;
  unchanged: number;
  totalMerged: number;
}

export async function mergeData(data: {
  subjects: Subject[];
  systems: StudySystem[];
  history?: HistoryEntry[];
  pyqYears?: PYQYear[];
  scoreLogs?: ScoreLog[];
}): Promise<{ stats: MergeStats }> {
  let updatedCount = 0;
  let insertedCount = 0;
  let unchangedCount = 0;

  await db.transaction('rw', db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs, async () => {
    // 1. Subjects LWW merge
    const localSubjects = await db.subjects.toArray();
    for (const rSub of data.subjects || []) {
      const rTime = new Date(rSub.updatedAt || rSub.createdAt || Date.now()).getTime();
      const match = localSubjects.find(s => s.id === rSub.id || s.name.trim().toLowerCase() === rSub.name.trim().toLowerCase());
      if (match) {
        const lTime = new Date(match.updatedAt || match.createdAt || 0).getTime();
        if (isHLCGreater(rSub.hlc, match.hlc, rTime, lTime)) {
          await db.subjects.put({
            ...rSub,
            id: match.id,
            createdAt: new Date(rSub.createdAt || match.createdAt),
            updatedAt: new Date(rSub.updatedAt || Date.now()),
            deletedAt: rSub.deletedAt ? new Date(rSub.deletedAt) : null,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newSub } = rSub;
        await db.subjects.add({
          ...newSub,
          createdAt: new Date(rSub.createdAt || Date.now()),
          updatedAt: new Date(rSub.updatedAt || Date.now()),
        });
        insertedCount++;
      }
    }

    // 2. Systems LWW merge
    const localSystems = await db.systems.toArray();
    for (const rSys of data.systems || []) {
      const rTime = new Date(rSys.updatedAt || Date.now()).getTime();
      const match = localSystems.find(s => s.id === rSys.id || (s.subjectId === rSys.subjectId && s.name.trim().toLowerCase() === rSys.name.trim().toLowerCase()));
      const cleanedRSys = {
        ...rSys,
        updatedAt: new Date(rSys.updatedAt || Date.now()),
        completionDate: rSys.completionDate ? new Date(rSys.completionDate) : null,
        lastRevisionDate: rSys.lastRevisionDate ? new Date(rSys.lastRevisionDate) : null,
        nextRevisionDate: rSys.nextRevisionDate ? new Date(rSys.nextRevisionDate) : null,
        revisionStartedAt: rSys.revisionStartedAt ? new Date(rSys.revisionStartedAt) : null,
        deletedAt: rSys.deletedAt ? new Date(rSys.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || 0).getTime();
        if (isHLCGreater(rSys.hlc, match.hlc, rTime, lTime)) {
          await db.systems.put({
            ...cleanedRSys,
            id: match.id,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newSys } = cleanedRSys;
        await db.systems.add(newSys);
        insertedCount++;
      }
    }

    // 3. PYQYears merge
    const localPyqs = await db.pyqYears.toArray();
    for (const rPyq of data.pyqYears || []) {
      const rTime = new Date(rPyq.updatedAt || rPyq.completedAt || rPyq.createdAt || Date.now()).getTime();
      const match = localPyqs.find(p => p.id === rPyq.id || (p.subjectId === rPyq.subjectId && p.year.trim().toLowerCase() === rPyq.year.trim().toLowerCase()));
      const cleanedPyq = {
        ...rPyq,
        createdAt: new Date(rPyq.createdAt || Date.now()),
        completedAt: rPyq.completedAt ? new Date(rPyq.completedAt) : null,
        updatedAt: rPyq.updatedAt ? new Date(rPyq.updatedAt) : undefined,
        deletedAt: rPyq.deletedAt ? new Date(rPyq.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || match.completedAt || match.createdAt || 0).getTime();
        if (isHLCGreater(rPyq.hlc, match.hlc, rTime, lTime)) {
          await db.pyqYears.put({
            ...cleanedPyq,
            id: match.id,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newPyq } = cleanedPyq;
        await db.pyqYears.add(newPyq);
        insertedCount++;
      }
    }

    // 4. ScoreLogs merge
    const localScoreLogs = await db.scoreLogs.toArray();
    for (const rLog of data.scoreLogs || []) {
      const rTime = new Date(rLog.updatedAt || rLog.timestamp || Date.now()).getTime();
      const match = localScoreLogs.find(l => l.id === rLog.id || (l.subjectId === rLog.subjectId && l.title === rLog.title && Math.abs(new Date(l.timestamp).getTime() - rTime) < 1000));
      const cleanedLog = {
        ...rLog,
        timestamp: new Date(rLog.timestamp || Date.now()),
        updatedAt: rLog.updatedAt ? new Date(rLog.updatedAt) : undefined,
        deletedAt: rLog.deletedAt ? new Date(rLog.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || match.timestamp || 0).getTime();
        if (isHLCGreater(rLog.hlc, match.hlc, rTime, lTime)) {
          await db.scoreLogs.put({
            ...cleanedLog,
            id: match.id,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newLog } = cleanedLog;
        await db.scoreLogs.add(newLog);
        insertedCount++;
      }
    }

    // 5. History merge
    const localHistory = await db.history.toArray();
    for (const rHist of data.history || []) {
      const rTime = new Date(rHist.updatedAt || rHist.completedAt || Date.now()).getTime();
      const match = localHistory.find(h => h.id === rHist.id || (h.subjectId === rHist.subjectId && h.taskKey === rHist.taskKey && Math.abs(new Date(h.completedAt).getTime() - rTime) < 1000));
      const cleanedHist = {
        ...rHist,
        completedAt: new Date(rHist.completedAt || Date.now()),
        updatedAt: rHist.updatedAt ? new Date(rHist.updatedAt) : undefined,
        deletedAt: rHist.deletedAt ? new Date(rHist.deletedAt) : null,
      };
      if (match) {
        const lTime = new Date(match.updatedAt || match.completedAt || 0).getTime();
        if (isHLCGreater(rHist.hlc, match.hlc, rTime, lTime)) {
          await db.history.put({
            ...cleanedHist,
            id: match.id,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newHist } = cleanedHist;
        await db.history.add(newHist);
        insertedCount++;
      }
    }
  });

  return {
    stats: {
      updated: updatedCount,
      inserted: insertedCount,
      unchanged: unchangedCount,
      totalMerged: updatedCount + insertedCount + unchangedCount,
    },
  };
}
