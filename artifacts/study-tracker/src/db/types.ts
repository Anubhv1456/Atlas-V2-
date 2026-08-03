

export interface UIPreference {
  id: string; // 'subject:1' or 'system:2'
  type: 'subject' | 'system';
  entityId: number;
  order?: number; // kept for TS type compatibility only
  focus?: 'primary' | 'secondary' | null; // kept for TS type compatibility only
  updatedAt: Date;
  hlc?: string;
}

export interface Subject {
  id?: number;
  name: string;
  order?: number;
  focus?: 'primary' | 'secondary' | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  hlc?: string;
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
  focus?: 'primary' | 'secondary' | null;

  // ── Ordering ──────────────────────────────────────────────────────────────
  order?: number;

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
  /** Decay Calibration factor (1.0 = standard, >1.0 = faster decay / complex topic, <1.0 = slower decay / high retention). Defaults to 1.0. */
  decayFactor?: number;

  // ── Multi-Day / Lengthy Active Revision fields (v11) ──────────────────────
  /** Flag indicating whether this topic/system is a lengthy, multi-day revision system. */
  isLengthy?: boolean;
  /** Current active revision status: 'idle' | 'in_progress' | 'completed'. Defaults to 'idle'. */
  revisionState?: 'idle' | 'in_progress' | 'completed';
  /** Timestamp when active revision was started. */
  revisionStartedAt?: Date | null;
  /** ISO Date string ('YYYY-MM-DD') when the last daily revision check-in occurred. */
  revisionLastCheckInDate?: string | null;
  /** Number of distinct study days logged during active revision. */
  revisionDaysLogged?: number;
  /** Self-reported or calculated progress percentage (0 - 100) toward completing active revision. */
  revisionProgressPercent?: number;
  deletedAt?: Date | null;
  hlc?: string;
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
  updatedAt?: Date;
  deletedAt?: Date | null;
  hlc?: string;
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
  updatedAt?: Date;
  deletedAt?: Date | null;
  hlc?: string;
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
  updatedAt?: Date;
  deletedAt?: Date | null;
  hlc?: string;
}
