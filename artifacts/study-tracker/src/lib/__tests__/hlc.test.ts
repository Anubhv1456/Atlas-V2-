import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateHLC, updateHLC } from '../hlc';

describe('HLC Sync Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1600000000000));
  });

  it('should generate monotonic HLCs', () => {
    const hlc1 = generateHLC();
    const hlc2 = generateHLC();

    expect(hlc1).toBeDefined();
    expect(hlc2).toBeDefined();
    expect(hlc2 > hlc1).toBe(true);
    expect(hlc1.startsWith('001600000000000-0000')).toBe(true);
    expect(hlc2.startsWith('001600000000000-0001')).toBe(true);
  });

  it('should update HLC correctly when remote HLC is newer', () => {
    const newRemoteHLC = '001600000000005-0000-abcd';
    updateHLC(newRemoteHLC);
    
    // next local generation should jump to this time or greater
    const nextHLC = generateHLC();
    const timePart = parseInt(nextHLC.split('-')[0], 10);
    
    // it will be 1600000000005 + 1 or counter increments
    expect(timePart >= 1600000000005).toBe(true);
  });
});
