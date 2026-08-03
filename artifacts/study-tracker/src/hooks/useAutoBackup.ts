import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  getAutoSnapshots,
  createAutoSnapshot,
  restoreAutoSnapshot,
  deleteAutoSnapshot,
  AutoSnapshot,
} from '@/lib/autoBackup';

export function useAutoBackup() {
  const { toast } = useToast();
  const [autoBackupEnabledState, setAutoBackupEnabledState] = useState<boolean>(true);
  const [autoSnapshots, setAutoSnapshots] = useState<AutoSnapshot[]>([]);
  const [snapshotToRestore, setSnapshotToRestore] = useState<AutoSnapshot | null>(null);

  useEffect(() => {
    setAutoBackupEnabledState(isAutoBackupEnabled());
    setAutoSnapshots(getAutoSnapshots());
  }, []);

  const handleToggleAutoBackup = useCallback((val: boolean) => {
    setAutoBackupEnabled(val);
    setAutoBackupEnabledState(val);
  }, []);

  const handleManualSnapshot = useCallback(async () => {
    try {
      await createAutoSnapshot();
      setAutoSnapshots(getAutoSnapshots());
      toast({
        title: 'Snapshot Saved',
        description: 'A backup copy of your data has been saved.',
      });
    } catch (e) {
      toast({
        title: 'Error Saving Snapshot',
        description: String(e),
        variant: 'destructive',
      });
    }
  }, [toast]);

  const confirmRestoreSnapshot = useCallback(async () => {
    if (!snapshotToRestore) return;
    try {
      await restoreAutoSnapshot(snapshotToRestore.id);
      toast({
        title: 'Data Restored',
        description: 'Your progress has been reverted to the selected snapshot.',
      });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {
      toast({
        title: 'Failed to restore',
        description: String(e),
        variant: 'destructive',
      });
    } finally {
      setSnapshotToRestore(null);
    }
  }, [snapshotToRestore, toast]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    deleteAutoSnapshot(id);
    setAutoSnapshots(getAutoSnapshots());
  }, []);

  return {
    autoBackupEnabled: autoBackupEnabledState,
    autoSnapshots,
    snapshotToRestore,
    setSnapshotToRestore,
    handleToggleAutoBackup,
    handleManualSnapshot,
    confirmRestoreSnapshot,
    handleDeleteSnapshot
  };
}
