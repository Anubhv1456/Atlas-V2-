import { StudySystem, SystemStatus } from './database';

// ── Configuration ─────────────────────────────────────────────────────────────
// All values are in days. Adjust here to change global behavior.

export const REVISION_CONFIG = {
  INITIAL_INTERVALS: {
    Strong:  25,
    Average: 12,
    Weak:    5,
  } as Record<SystemStatus, number>,
  MULTIPLIERS: {
    Strong:  2.50,
    Average: 1.75,
    Weak:    0.60, // Graceful stability adjustment on struggle
  } as Record<SystemStatus, number>,
  CONFIDENCE_WEIGHTS: {
    Weak:    1.60,
    Average: 1.25,
    Strong:  1.00,
  } as Record<SystemStatus, number>,
  TARGET_RETENTION_DUE: 0.90, // 90% target retrievability at interval due date
  MIN_INTERVAL: 2,
  MAX_INTERVAL: 180,
  DEFAULT_DAILY_LIMIT: 5,
} as const;

export interface DecayPreset {
  factor: number;
  label: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export const DECAY_CALIBRATION_PRESETS: DecayPreset[] = [
  { factor: 0.75, label: 'Slow Decay', icon: '🛡️', badgeClass: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400', description: 'High conceptual retention / sticky memory (Decays ~25% slower)' },
  { factor: 1.00, label: 'Standard', icon: '⚖️', badgeClass: 'text-muted-foreground bg-muted border-border', description: 'Default Ebbinghaus retention curve (1.0x baseline)' },
  { factor: 1.25, label: 'Moderate Decay', icon: '⚡', badgeClass: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400', description: 'Medium volatility / complex topic (Decays ~25% faster)' },
  { factor: 1.50, label: 'Fast Decay', icon: '🔥', badgeClass: 'text-destructive bg-destructive/10 border-destructive/20', description: 'High volatility / dense facts (Decays ~50% faster)' },
];

/** Extract or default system decay factor. */
export function getSystemDecayFactor(sys: StudySystem): number {
  return typeof sys.decayFactor === 'number' && sys.decayFactor > 0 ? sys.decayFactor : 1.0;
}

// ── Core Calculations ─────────────────────────────────────────────────────────

/** Initial interval in days for a given confidence level and decay factor. */
export function getInitialInterval(confidence: SystemStatus): number {
  return REVISION_CONFIG.INITIAL_INTERVALS[confidence] ?? 12;
}

/** Multiplier for a given confidence level. */
export function getMultiplier(confidence: SystemStatus): number {
  return REVISION_CONFIG.MULTIPLIERS[confidence] ?? 1.5;
}

/**
 * Calculate the next memory stability interval after a completed revision.
 * Adjusts for system-level memory decay factor.
 */
export function calculateNextInterval(
  currentInterval: number,
  confidence: SystemStatus,
  decayFactor: number = 1.0
): number {
  const multiplier = getMultiplier(confidence);
  // Faster decay factors (>1.0) adjust multiplier conservatively; slower (<1.0) expand intervals further
  const adjustedMultiplier = multiplier * (1 / Math.sqrt(decayFactor));
  const raw = currentInterval * adjustedMultiplier;
  return Math.round(
    Math.max(REVISION_CONFIG.MIN_INTERVAL, Math.min(REVISION_CONFIG.MAX_INTERVAL, raw))
  );
}

/** Add `days` to a date, returning a new Date (time zeroed to midnight). */
export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/** Today at midnight. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Memory Retrievability Model ───────────────────────────────────────────────

/**
 * Calculate the estimated memory retrievability percentage R(t) in range [0, 100].
 * Based on Target Retention Half-Life model: R(t) = 100 × (0.90)^(t / S)
 * - At t = 0 (review day): R = 100%
 * - At t = S (due date): R = 90%
 * - At t = 2S (overdue): R = 81%
 */
export function getRetrievability(sys: StudySystem, now: Date = today()): number {
  if (!hasRevisionScheduled(sys)) return 100;

  const lastDate = sys.lastRevisionDate
    ? new Date(sys.lastRevisionDate)
    : sys.completionDate
    ? new Date(sys.completionDate)
    : sys.updatedAt
    ? new Date(sys.updatedAt)
    : now;

  const stability = sys.currentRevisionInterval && sys.currentRevisionInterval > 0
    ? sys.currentRevisionInterval
    : getInitialInterval(sys.status);

  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  const l = new Date(lastDate);
  l.setHours(0, 0, 0, 0);

  const daysElapsed = Math.max(0, Math.floor((n.getTime() - l.getTime()) / 86_400_000));
  const decayFactor = getSystemDecayFactor(sys);
  
  // Formula: 100 * (0.90 ^ ((daysElapsed * decayFactor) / stability))
  const retrievability = 100 * Math.pow(REVISION_CONFIG.TARGET_RETENTION_DUE, (daysElapsed * decayFactor) / stability);
  return Math.min(100, Math.max(0, Math.round(retrievability * 10) / 10));
}

/** Categorize retrievability into human-readable recall health. */
export function getRetrievabilityHealth(retrievability: number): {
  label: string;
  status: 'optimal' | 'moderate' | 'risk' | 'critical';
  colorClass: string;
} {
  if (retrievability >= 90) {
    return { label: 'Optimal Recall', status: 'optimal', colorClass: 'text-emerald-600 dark:text-emerald-400' };
  } else if (retrievability >= 80) {
    return { label: 'Moderate Decay', status: 'moderate', colorClass: 'text-amber-600 dark:text-amber-400' };
  } else if (retrievability >= 70) {
    return { label: 'High Risk', status: 'risk', colorClass: 'text-orange-600 dark:text-orange-400' };
  } else {
    return { label: 'Memory Reset', status: 'critical', colorClass: 'text-destructive' };
  }
}

// ── Scheduling ────────────────────────────────────────────────────────────────

/**
 * Schedule the FIRST revision after initial evaluation.
 * Returns the fields that should be written to the system.
 */
export function scheduleFirstRevision(
  confidence: SystemStatus,
  now: Date = today(),
  decayFactor: number = 1.0,
): {
  currentRevisionInterval: number;
  nextRevisionDate: Date;
} {
  const baseInterval = getInitialInterval(confidence);
  const interval = Math.max(REVISION_CONFIG.MIN_INTERVAL, Math.round(baseInterval * (1 / Math.sqrt(decayFactor))));
  return {
    currentRevisionInterval: interval,
    nextRevisionDate: addDays(now, interval),
  };
}

/**
 * Schedule the NEXT revision after a completed revision.
 * Returns the fields that should be written to the system.
 */
export function scheduleNextRevision(
  confidence: SystemStatus,
  currentInterval: number,
  now: Date = today(),
  decayFactor: number = 1.0,
  durationMultiplier: number = 1.0
): {
  currentRevisionInterval: number;
  nextRevisionDate: Date;
  durationMultiplier: number;
} {
  const baseInterval = calculateNextInterval(currentInterval, confidence, decayFactor);
  const calibratedInterval = Math.max(
    REVISION_CONFIG.MIN_INTERVAL,
    Math.min(REVISION_CONFIG.MAX_INTERVAL, Math.round(baseInterval * durationMultiplier))
  );
  return {
    currentRevisionInterval: calibratedInterval,
    nextRevisionDate: addDays(now, calibratedInterval),
    durationMultiplier,
  };
}

/**
 * Calculate logarithmic duration multiplier based on days taken during active multi-day revision.
 * E.g., 1 day = 1.0x, 2 days = 1.25x, 3 days = 1.40x, 4 days = 1.50x, 7+ days = 1.70x-2.0x boost.
 */
export function calculateDurationMultiplier(daysTaken: number): number {
  if (daysTaken <= 1) return 1.0;
  const mult = 1.0 + Math.min(1.0, Math.log2(daysTaken) * 0.25);
  return Math.round(mult * 100) / 100;
}

// ── Multi-Day Active Revision & Queue Pause Helper ────────────────────────────

/** Returns list of systems currently in active multi-day revision. */
export function getActiveRevisionSystems(systems: StudySystem[]): StudySystem[] {
  return systems.filter(sys => sys.revisionState === 'in_progress');
}

/** True if any system is currently in active multi-day revision. */
export function hasActiveRevisionInProgress(systems: StudySystem[]): boolean {
  return getActiveRevisionSystems(systems).length > 0;
}

// ── State Queries & Prioritization ────────────────────────────────────────────

/** True when a system has an initial completion and a scheduled revision. */
export function hasRevisionScheduled(sys: StudySystem): boolean {
  return Boolean(sys.completionDate && sys.nextRevisionDate && sys.contentCompleted && sys.qbankDone);
}

/** True when the next revision date is today or in the past. */
export function isRevisionDue(sys: StudySystem, now: Date = today()): boolean {
  if (!hasRevisionScheduled(sys)) return false;
  const due = new Date(sys.nextRevisionDate!);
  due.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return due <= n;
}

/** True when the next revision date is strictly before today. */
export function isRevisionOverdue(sys: StudySystem, now: Date = today()): boolean {
  if (!hasRevisionScheduled(sys)) return false;
  const due = new Date(sys.nextRevisionDate!);
  due.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return due < n;
}

/** True when the next revision date is exactly today. */
export function isRevisionDueToday(sys: StudySystem, now: Date = today()): boolean {
  return isRevisionDue(sys, now) && !isRevisionOverdue(sys, now);
}

/** Number of days a revision is overdue (0 if not overdue). */
export function daysOverdue(sys: StudySystem, now: Date = today()): number {
  if (!isRevisionOverdue(sys, now)) return 0;
  const due = new Date(sys.nextRevisionDate!);
  due.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return Math.floor((n.getTime() - due.getTime()) / 86_400_000);
}

/** Calculate Knowledge Decay / Debt score for prioritizing revision queue. */
export function calculateDecayScore(sys: StudySystem, now: Date = today()): number {
  if (!hasRevisionScheduled(sys)) return 0;
  
  const retrievability = getRetrievability(sys, now);
  const memoryLoss = 100 - retrievability;
  const weight = REVISION_CONFIG.CONFIDENCE_WEIGHTS[sys.status] ?? 1.0;
  const decayFactor = getSystemDecayFactor(sys);
  const overdue = daysOverdue(sys, now);

  if (isRevisionDue(sys, now)) {
    return Math.round((memoryLoss * weight * decayFactor + overdue * 2) * 10) / 10;
  } else {
    // Small background decay score for upcoming
    return Math.round((memoryLoss * 0.1 * weight * decayFactor) * 10) / 10;
  }
}

/** Sort systems strictly by revision decay priority (highest decay score first). */
export function sortSystemsByRevisionPriority(systems: StudySystem[], now: Date = today()): StudySystem[] {
  return [...systems].sort((a, b) => {
    const scoreA = calculateDecayScore(a, now);
    const scoreB = calculateDecayScore(b, now);
    if (scoreA !== scoreB) return scoreB - scoreA;
    const dateA = a.nextRevisionDate ? new Date(a.nextRevisionDate).getTime() : Infinity;
    const dateB = b.nextRevisionDate ? new Date(b.nextRevisionDate).getTime() : Infinity;
    return dateA - dateB;
  });
}

/** True when the revision is scheduled for a future date (not yet due). */
export function isRevisionUpcoming(sys: StudySystem, now: Date = today()): boolean {
  if (!hasRevisionScheduled(sys)) return false;
  const due = new Date(sys.nextRevisionDate!);
  due.setHours(0, 0, 0, 0);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  return due > n;
}

// ── Backlog Protection & Catch-Up Queue ─────────────────────────────────────

export interface RevisionQueueResult {
  priorityQueue: StudySystem[];
  backlogBuffer: StudySystem[];
  totalDueCount: number;
  overflowCount: number;
  isQueuePaused: boolean;
  activeRevisionCount: number;
}

/**
 * Get daily revision queue with backlog protection cap.
 * Prevents overwhelm when returning from missed study days and prioritizes active multi-day revisions.
 */
export function getDailyRevisionQueue(
  systems: StudySystem[],
  maxDailyLimit: number = REVISION_CONFIG.DEFAULT_DAILY_LIMIT,
  now: Date = today()
): RevisionQueueResult {
  const activeSystems = getActiveRevisionSystems(systems);
  const isQueuePaused = activeSystems.length > 0;

  const allDue = systems.filter(sys => isRevisionDue(sys, now) || sys.revisionState === 'in_progress');
  const sorted = sortSystemsByRevisionPriority(allDue, now);

  // Put in_progress active multi-day systems at the very front of the queue
  const prioritized = [
    ...activeSystems,
    ...sorted.filter(sys => sys.revisionState !== 'in_progress')
  ];

  const priorityQueue = prioritized.slice(0, maxDailyLimit);
  const backlogBuffer = prioritized.slice(maxDailyLimit);

  return {
    priorityQueue,
    backlogBuffer,
    totalDueCount: prioritized.length,
    overflowCount: backlogBuffer.length,
    isQueuePaused,
    activeRevisionCount: activeSystems.length,
  };
}

