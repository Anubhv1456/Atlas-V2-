import { describe, it, expect, vi } from 'vitest';
import { calculateDecayScore, isRevisionDue } from '../revisionEngine';
import { StudySystem } from '../types';

describe('Revision Engine - Decay Scoring', () => {
  const mockNow = new Date('2023-10-10T10:00:00.000Z');

  it('should calculate 0 decay score if no revision scheduled', () => {
    const sys = {
      completionDate: null,
      nextRevisionDate: null,
      contentCompleted: false,
      qbankDone: false,
      status: 'Mastered' as const,
    } as StudySystem;
    
    expect(calculateDecayScore(sys, mockNow)).toBe(0);
  });

  it('should calculate higher decay score for overdue systems', () => {
    const overdueSys = {
      completionDate: new Date('2023-09-01'),
      nextRevisionDate: new Date('2023-10-01'), // 9 days overdue
      lastRevisionDate: new Date('2023-09-15'),
      currentRevisionInterval: 15,
      contentCompleted: true,
      qbankDone: true,
      status: 'Weak' as const,
      decayFactor: 1.0
    } as StudySystem;

    const notDueSys = {
      completionDate: new Date('2023-09-01'),
      nextRevisionDate: new Date('2023-10-20'), // not due yet
      lastRevisionDate: new Date('2023-10-05'),
      currentRevisionInterval: 15,
      contentCompleted: true,
      qbankDone: true,
      status: 'Weak' as const,
      decayFactor: 1.0
    } as StudySystem;

    const overdueScore = calculateDecayScore(overdueSys, mockNow);
    const notDueScore = calculateDecayScore(notDueSys, mockNow);

    expect(overdueScore).toBeGreaterThan(notDueScore);
    expect(isRevisionDue(overdueSys, mockNow)).toBe(true);
    expect(isRevisionDue(notDueSys, mockNow)).toBe(false);
  });
});
