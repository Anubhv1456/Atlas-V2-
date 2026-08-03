const fs = require('fs');
let path = 'artifacts/study-tracker/src/lib/syncEngine.ts';
let content = fs.readFileSync(path, 'utf8');

// We will overwrite the mergeData function with a new implementation that uses ID mapping.
const newMergeData = `export async function mergeData(data: {
  subjects: Subject[];
  systems: StudySystem[];
  history?: HistoryEntry[];
  pyqYears?: PYQYear[];
  scoreLogs?: ScoreLog[];
}): Promise<{ stats: MergeStats }> {
  let updatedCount = 0;
  let insertedCount = 0;
  let unchangedCount = 0;

  // We need to map remote IDs to local IDs to preserve relationships across devices.
  // Because IndexedDB auto-increment IDs are strictly local, we cannot rely on them matching.
  const subjectIdMap = new Map<number, number>();
  const systemIdMap = new Map<number, number>();
  const pyqYearIdMap = new Map<number, number>();

  await db.transaction('rw', db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs, async () => {
    // 1. Subjects LWW merge
    const localSubjects = await db.subjects.toArray();
    for (const rSub of data.subjects || []) {
      const rTime = new Date(rSub.updatedAt || rSub.createdAt || Date.now()).getTime();
      // Match primarily by name (case-insensitive) to prevent cross-device ID collisions.
      const match = localSubjects.find(s => s.name.trim().toLowerCase() === rSub.name.trim().toLowerCase());
      
      let localId: number;
      if (match) {
        localId = match.id!;
        const lTime = new Date(match.updatedAt || match.createdAt || 0).getTime();
        if (isHLCGreater(rSub.hlc, match.hlc, rTime, lTime)) {
          await db.subjects.put({
            ...rSub,
            id: localId,
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
        // @ts-ignore
        localId = await db.subjects.add({
          ...newSub,
          createdAt: new Date(rSub.createdAt || Date.now()),
          updatedAt: new Date(rSub.updatedAt || Date.now()),
        });
        insertedCount++;
      }
      if (rSub.id) subjectIdMap.set(rSub.id, localId);
    }

    // 2. Systems LWW merge
    const localSystems = await db.systems.toArray();
    for (const rSys of data.systems || []) {
      const mappedSubjectId = subjectIdMap.get(rSys.subjectId);
      if (!mappedSubjectId) continue; // Skip if subject doesn't exist (orphaned)

      const rTime = new Date(rSys.updatedAt || Date.now()).getTime();
      const match = localSystems.find(s => s.subjectId === mappedSubjectId && s.name.trim().toLowerCase() === rSys.name.trim().toLowerCase());
      
      const cleanedRSys = {
        ...rSys,
        subjectId: mappedSubjectId, // Use mapped local ID
        updatedAt: new Date(rSys.updatedAt || Date.now()),
        completionDate: rSys.completionDate ? new Date(rSys.completionDate) : null,
        lastRevisionDate: rSys.lastRevisionDate ? new Date(rSys.lastRevisionDate) : null,
        nextRevisionDate: rSys.nextRevisionDate ? new Date(rSys.nextRevisionDate) : null,
        revisionStartedAt: rSys.revisionStartedAt ? new Date(rSys.revisionStartedAt) : null,
        deletedAt: rSys.deletedAt ? new Date(rSys.deletedAt) : null,
      };

      let localId: number;
      if (match) {
        localId = match.id!;
        const lTime = new Date(match.updatedAt || 0).getTime();
        if (isHLCGreater(rSys.hlc, match.hlc, rTime, lTime)) {
          await db.systems.put({
            ...cleanedRSys,
            id: localId,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newSys } = cleanedRSys;
        // @ts-ignore
        localId = await db.systems.add(newSys);
        insertedCount++;
      }
      if (rSys.id) systemIdMap.set(rSys.id, localId);
    }

    // 3. PYQYears merge
    const localPyqs = await db.pyqYears.toArray();
    for (const rPyq of data.pyqYears || []) {
      const mappedSubjectId = subjectIdMap.get(rPyq.subjectId);
      if (!mappedSubjectId) continue;

      const rTime = new Date(rPyq.updatedAt || rPyq.completedAt || rPyq.createdAt || Date.now()).getTime();
      const match = localPyqs.find(p => p.subjectId === mappedSubjectId && p.year.trim().toLowerCase() === rPyq.year.trim().toLowerCase());
      
      const cleanedPyq = {
        ...rPyq,
        subjectId: mappedSubjectId,
        createdAt: new Date(rPyq.createdAt || Date.now()),
        completedAt: rPyq.completedAt ? new Date(rPyq.completedAt) : null,
        updatedAt: rPyq.updatedAt ? new Date(rPyq.updatedAt) : undefined,
        deletedAt: rPyq.deletedAt ? new Date(rPyq.deletedAt) : null,
      };

      let localId: number;
      if (match) {
        localId = match.id!;
        const lTime = new Date(match.updatedAt || match.completedAt || match.createdAt || 0).getTime();
        if (isHLCGreater(rPyq.hlc, match.hlc, rTime, lTime)) {
          await db.pyqYears.put({
            ...cleanedPyq,
            id: localId,
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        const { id, ...newPyq } = cleanedPyq;
        // @ts-ignore
        localId = await db.pyqYears.add(newPyq);
        insertedCount++;
      }
      if (rPyq.id) pyqYearIdMap.set(rPyq.id, localId);
    }

    // 4. ScoreLogs merge
    const localScoreLogs = await db.scoreLogs.toArray();
    for (const rLog of data.scoreLogs || []) {
      const mappedSubjectId = subjectIdMap.get(rLog.subjectId);
      if (!mappedSubjectId) continue;
      
      const mappedSystemId = rLog.systemId ? systemIdMap.get(rLog.systemId) : undefined;
      const mappedPyqYearId = rLog.pyqYearId ? pyqYearIdMap.get(rLog.pyqYearId) : undefined;

      const rTime = new Date(rLog.updatedAt || rLog.timestamp || Date.now()).getTime();
      const match = localScoreLogs.find(l => l.subjectId === mappedSubjectId && l.title === rLog.title && Math.abs(new Date(l.timestamp).getTime() - rTime) < 1000);
      
      const cleanedLog = {
        ...rLog,
        subjectId: mappedSubjectId,
        systemId: mappedSystemId,
        pyqYearId: mappedPyqYearId,
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
      const mappedSubjectId = subjectIdMap.get(rHist.subjectId);
      if (!mappedSubjectId) continue;
      
      const mappedSystemId = rHist.systemId ? systemIdMap.get(rHist.systemId) : (rHist.systemId === 0 ? 0 : undefined);
      if (rHist.systemId !== 0 && !mappedSystemId) continue;

      const rTime = new Date(rHist.updatedAt || rHist.completedAt || Date.now()).getTime();
      const match = localHistory.find(h => h.subjectId === mappedSubjectId && h.taskKey === rHist.taskKey && Math.abs(new Date(h.completedAt).getTime() - rTime) < 1000);
      
      const cleanedHist = {
        ...rHist,
        subjectId: mappedSubjectId,
        systemId: mappedSystemId || 0,
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
}`;

content = content.replace(/export async function mergeData[\s\S]+?return \{\n    stats: \{\n      updated: updatedCount,\n      inserted: insertedCount,\n      unchanged: unchangedCount,\n      totalMerged: updatedCount \+ insertedCount \+ unchangedCount,\n    \},\n  \};\n}/, newMergeData);

fs.writeFileSync(path, content);
