import Dexie, { Table } from 'dexie';

export interface Subject {
  id?: number;
  name: string;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SystemStatus = 'Strong' | 'Average' | 'Weak';

export interface StudySystem {
  id?: number;
  subjectId: number;
  name: string;
  // Content — incremental progress
  contentInitialized: boolean;
  contentUnitsTotal: number;
  contentUnitsCompleted: number;
  contentCompleted: boolean;
  // QBank — binary
  qbankDone: boolean;
  // Notes & metadata
  weakAreas: string;
  // Confidence (Strong / Average / Weak) — doubles as spaced-rep confidence
  status: SystemStatus;
  updatedAt: Date;

  // ── Focus Mode ────────────────────────────────────────────────────────────
  focus: 'primary' | 'secondary' | null;

  // ── Ordering ──────────────────────────────────────────────────────────────
  order: number;

  // ── Revision engine fields (v4) ─────────────────────────────────────────
  /** Set when both contentCompleted and qbankDone first become true. */
  completionDate: Date | null;
  /** How many revisions have been completed. */
  revisionCount: number;
  /** Date of most recent completed revision. */
  lastRevisionDate: Date | null;
  /** Current calculated interval in days. */
  currentRevisionInterval: number | null;
  /** Absolute date the next revision is due. */
  nextRevisionDate: Date | null;
}

/** One year entry under a subject's PYQ section. */
export interface PYQYear {
  id?: number;
  subjectId: number;
  /** User-defined year label, e.g. "2024". */
  year: string;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ScoreLog {
  id?: number;
  type: 'revision' | 'pyq';
  subjectId: number;
  systemId?: number;
  pyqYearId?: number;
  title: string;
  score: number;
  total: number;
  percentage: number;
  timestamp: Date;
  notes?: string;
}

export interface HistoryEntry {
  id?: number;
  subjectId: number;
  subjectName: string;
  /** 0 for subject-level entries (PYQs). */
  systemId: number;
  systemName: string;
  taskKey: string;
  taskLabel: string;
  completedAt: Date;
}

export class AtlasDB extends Dexie {
  subjects!: Table<Subject, number>;
  systems!: Table<StudySystem, number>;
  history!: Table<HistoryEntry, number>;
  pyqYears!: Table<PYQYear, number>;
  scoreLogs!: Table<ScoreLog, number>;

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
  }
}

export const db = new AtlasDB();

// ── Export / Import ────────────────────────────────────────────────────────

export async function exportData() {
  const subjects  = await db.subjects.toArray();
  const systems   = await db.systems.toArray();
  const history   = await db.history.toArray();
  const pyqYears  = await db.pyqYears.toArray();
  const scoreLogs = await db.scoreLogs.toArray();
  return { subjects, systems, history, pyqYears, scoreLogs };
}

export async function importData(data: {
  subjects: Subject[];
  systems: StudySystem[];
  history?: HistoryEntry[];
  pyqYears?: PYQYear[];
  scoreLogs?: ScoreLog[];
}) {
  await db.transaction('rw', db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs, async () => {
    await db.subjects.clear();
    await db.systems.clear();
    await db.history.clear();
    await db.pyqYears.clear();
    await db.scoreLogs.clear();

    if (data.subjects?.length) {
      await db.subjects.bulkAdd(
        data.subjects.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })),
      );
    }

    if (data.systems?.length) {
      await db.systems.bulkAdd(
        data.systems.map(s => {
          const base = { ...s, updatedAt: new Date(s.updatedAt) };
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
          if (base.completionDate)    base.completionDate    = new Date(base.completionDate as unknown as string);
          if (base.lastRevisionDate)  base.lastRevisionDate  = new Date(base.lastRevisionDate as unknown as string);
          if (base.nextRevisionDate)  base.nextRevisionDate  = new Date(base.nextRevisionDate as unknown as string);
          return base;
        }),
      );
    }

    if (data.history?.length) {
      await db.history.bulkAdd(
        data.history.map(h => ({ ...h, completedAt: new Date(h.completedAt) })),
      );
    }

    if (data.pyqYears?.length) {
      await db.pyqYears.bulkAdd(
        data.pyqYears.map(p => ({
          ...p,
          createdAt:   new Date(p.createdAt),
          completedAt: p.completedAt ? new Date(p.completedAt) : null,
        })),
      );
    }

    if (data.scoreLogs?.length) {
      await db.scoreLogs.bulkAdd(
        data.scoreLogs.map(sl => ({
          ...sl,
          timestamp: new Date(sl.timestamp),
        })),
      );
    }
  });
}
