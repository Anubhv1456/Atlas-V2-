import { ScoreLog } from '@/db';

export function calculateYearScoreMap(scoreLogs: ScoreLog[]) {
  const map = new Map<number, { percentage: number; score: number; total: number; timestamp: Date }>();
  for (const log of scoreLogs) {
    if (log.type === 'pyq' && log.pyqYearId) {
      const existing = map.get(log.pyqYearId);
      if (!existing || new Date(log.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        map.set(log.pyqYearId, {
          percentage: log.percentage,
          score: log.score,
          total: log.total,
          timestamp: log.timestamp,
        });
      }
    }
  }
  return map;
}

export function generateCustomYearRange(endYear: number, span: number, prefix: string) {
  const generated: string[] = [];
  const prefixStr = prefix.trim() ? `${prefix.trim()} ` : '';
  for (let i = 0; i < span; i++) {
    generated.push(`${prefixStr}${endYear - i}`);
  }
  return generated;
}
