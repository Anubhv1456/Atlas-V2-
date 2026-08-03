import Dexie, { Table } from 'dexie';
import * as T from './types';
export class AtlasDB extends Dexie {
  subjects!: Table<T.Subject, number>;
  systems!: Table<T.StudySystem, number>;
  history!: Table<T.HistoryEntry, number>;
  pyqYears!: Table<T.PYQYear, number>;
  scoreLogs!: Table<T.ScoreLog, number>;
  uiPreferences!: Table<T.UIPreference, string>;

  constructor() {
    super('AtlasDB');
    this.version(1).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt',
    });
    this.version(2).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt',
      history: '++id, subjectId, systemId, completedAt',
    });
    // v3: replace binary contentDone with incremental content progress
    this.version(3)
      .stores({
        subjects: '++id, name',
        systems: '++id, subjectId, name, updatedAt',
        history: '++id, subjectId, systemId, completedAt',
      })
      .upgrade(tx => {
        return tx
          .table('systems')
          .toCollection()
          .modify((sys: Record<string, unknown>) => {
            const wasDone = Boolean(sys['contentDone']);
            sys['contentInitialized'] = wasDone;
            sys['contentUnitsTotal'] = wasDone ? 1 : 0;
            sys['contentUnitsCompleted'] = wasDone ? 1 : 0;
            sys['contentCompleted'] = wasDone;
          });
      });
    // v4: add revision engine fields
    this.version(4)
      .stores({
        subjects: '++id, name',
        systems: '++id, subjectId, name, updatedAt, nextRevisionDate',
        history: '++id, subjectId, systemId, completedAt',
      })
      .upgrade(tx => {
        return tx
          .table('systems')
          .toCollection()
          .modify((sys: Record<string, unknown>) => {
            if (!('completionDate' in sys))          sys['completionDate'] = null;
            if (!('revisionCount' in sys))           sys['revisionCount'] = 0;
            if (!('lastRevisionDate' in sys))        sys['lastRevisionDate'] = null;
            if (!('currentRevisionInterval' in sys)) sys['currentRevisionInterval'] = null;
            if (!('nextRevisionDate' in sys))        sys['nextRevisionDate'] = null;
          });
      });
    // v6: add focus field
    this.version(6).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, focus',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
    }).upgrade(tx => {
      return tx
        .table('systems')
        .toCollection()
        .modify((sys: Record<string, unknown>) => {
          if (!('focus' in sys)) sys['focus'] = null;
        });
    });
    // v7: add order field
    this.version(7).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, focus',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
    }).upgrade(tx => {
      let currentOrder = 0;
      let currentSubjectId = -1;
      return tx
        .table('systems')
        .orderBy('subjectId')
        .modify((sys: Record<string, unknown>) => {
          if (sys['subjectId'] !== currentSubjectId) {
            currentSubjectId = sys['subjectId'] as number;
            currentOrder = 0;
          }
          if (!('order' in sys)) {
             sys['order'] = currentOrder++;
          }
        });
    });
    // v8: add order field to subjects
    this.version(8).stores({
      subjects: '++id, name, order',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, focus',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
    }).upgrade(tx => {
      let currentOrder = 0;
      return tx
        .table('subjects')
        .toCollection()
        .modify((sub: Record<string, unknown>) => {
          if (!('order' in sub)) {
            sub['order'] = currentOrder++;
          }
        });
    });
    // v9: add scoreLogs table
    this.version(9).stores({
      subjects: '++id, name, order',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, focus',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp',
    });
    // v10: add system-level decay calibration factor
    this.version(10).stores({
      subjects: '++id, name, order',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, focus',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp',
    }).upgrade(tx => {
      return tx
        .table('systems')
        .toCollection()
        .modify((sys: Record<string, unknown>) => {
          if (!('decayFactor' in sys) || sys['decayFactor'] === undefined || sys['decayFactor'] === null) {
            sys['decayFactor'] = 1.0;
          }
        });
    });

    // v11: add multi-day active revision tracking fields
    this.version(11).stores({
      subjects: '++id, name, order',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, focus, revisionState',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp',
    }).upgrade(tx => {
      return tx
        .table('systems')
        .toCollection()
        .modify((sys: Record<string, unknown>) => {
          if (!('isLengthy' in sys)) sys['isLengthy'] = false;
          if (!('revisionState' in sys)) sys['revisionState'] = 'idle';
          if (!('revisionStartedAt' in sys)) sys['revisionStartedAt'] = null;
          if (!('revisionLastCheckInDate' in sys)) sys['revisionLastCheckInDate'] = null;
          if (!('revisionDaysLogged' in sys)) sys['revisionDaysLogged'] = 0;
          if (!('revisionProgressPercent' in sys)) sys['revisionProgressPercent'] = 0;
        });
    });
    // v12: move order and focus to uiPreferences
    this.version(12).stores({
      subjects: '++id, name',
      systems: '++id, subjectId, name, updatedAt, nextRevisionDate, revisionState',
      history: '++id, subjectId, systemId, completedAt',
      pyqYears: '++id, subjectId',
      scoreLogs: '++id, type, subjectId, systemId, pyqYearId, timestamp',
      uiPreferences: 'id, type, entityId',
    }).upgrade(async tx => {
      const prefs: any[] = [];
      await tx.table('subjects').toCollection().modify((sub: any) => {
        if (sub.id) {
          prefs.push({
            id: 'subject:' + sub.id,
            type: 'subject',
            entityId: sub.id,
            order: sub.order,
            focus: sub.focus ?? null,
            updatedAt: new Date()
          });
        }
        delete sub.order;
        delete sub.focus;
      });

      await tx.table('systems').toCollection().modify((sys: any) => {
        if (sys.id) {
          prefs.push({
            id: 'system:' + sys.id,
            type: 'system',
            entityId: sys.id,
            order: sys.order,
            focus: sys.focus ?? null,
            updatedAt: new Date()
          });
        }
        delete sys.order;
        delete sys.focus;
      });

      if (prefs.length > 0) {
        await tx.table('uiPreferences').bulkAdd(prefs);
      }
    });

  }

}

export const db = new AtlasDB();

// ── Export / Import ────────────────────────────────────────────────────────

