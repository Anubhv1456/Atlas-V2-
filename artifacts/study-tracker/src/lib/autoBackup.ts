import { exportData, importData } from '@/db/database';
import { getAccessToken, syncWithDrive } from '@/lib/driveSync';

const SNAPSHOTS_KEY = 'atlas_auto_snapshots_v1';
const ENABLED_KEY = 'atlas_autobackup_enabled';
const LAST_AUTO_CLOUD_SYNC_KEY = 'atlas_last_auto_cloud_sync';
const MAX_SNAPSHOTS = 5;

export interface AutoSnapshot {
  id: string;
  timestamp: string;
  subjectsCount: number;
  systemsCount: number;
  scoreLogsCount: number;
  data: any;
}

export function isAutoBackupEnabled(): boolean {
  try {
    const val = localStorage.getItem(ENABLED_KEY);
    return val === null ? true : val === 'true'; // Default enabled
  } catch {
    return true;
  }
}

export function setAutoBackupEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch (err) {
    console.warn('Unable to persist auto backup preference:', err);
  }
}

export function getAutoSnapshots(): AutoSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse auto snapshots:', err);
    return [];
  }
}

export async function createAutoSnapshot(): Promise<AutoSnapshot | null> {
  try {
    const data = await exportData();
    if (!data || (!data.subjects?.length && !data.systems?.length)) {
      return null; // Empty DB, don't create snapshot
    }

    const newSnapshot: AutoSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toISOString(),
      subjectsCount: data.subjects?.length || 0,
      systemsCount: data.systems?.length || 0,
      scoreLogsCount: data.scoreLogs?.length || 0,
      data,
    };

    const existing = getAutoSnapshots();
    // Prepend new snapshot
    const updated = [newSnapshot, ...existing].slice(0, MAX_SNAPSHOTS);

    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
      localStorage.setItem('atlas_last_backup', newSnapshot.timestamp);
    } catch (quotaErr) {
      // If quota exceeded, trim to 2 snapshots and try again
      const trimmed = [newSnapshot, ...existing.slice(0, 1)];
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
      localStorage.setItem('atlas_last_backup', newSnapshot.timestamp);
    }

    return newSnapshot;
  } catch (err) {
    console.error('Auto snapshot creation failed:', err);
    return null;
  }
}

export async function restoreAutoSnapshot(id: string): Promise<boolean> {
  try {
    const snapshots = getAutoSnapshots();
    const target = snapshots.find(s => s.id === id);
    if (!target || !target.data) return false;

    await importData(target.data);
    return true;
  } catch (err) {
    console.error('Failed to restore auto snapshot:', err);
    return false;
  }
}

export function deleteAutoSnapshot(id: string): void {
  try {
    const snapshots = getAutoSnapshots();
    const updated = snapshots.filter(s => s.id !== id);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete auto snapshot:', err);
  }
}

export async function checkAndRunAutoBackup(): Promise<void> {
  if (!isAutoBackupEnabled()) return;

  const snapshots = getAutoSnapshots();
  const lastSnap = snapshots[0];
  const now = Date.now();

  // Create snapshot if none exists or if older than 12 hours
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  if (!lastSnap || (now - new Date(lastSnap.timestamp).getTime() > TWELVE_HOURS)) {
    await createAutoSnapshot();
  }

  // Auto Cloud Sync if Google Drive token is present
  try {
    const token = await getAccessToken();
    if (token) {
      const lastCloudSync = localStorage.getItem(LAST_AUTO_CLOUD_SYNC_KEY);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (!lastCloudSync || (now - new Date(lastCloudSync).getTime() > TWENTY_FOUR_HOURS)) {
        await syncWithDrive(token);
        localStorage.setItem(LAST_AUTO_CLOUD_SYNC_KEY, new Date().toISOString());
      }
    }
  } catch {
    // Silent fail for background sync
  }
}
