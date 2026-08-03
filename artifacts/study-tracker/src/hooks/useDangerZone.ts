import { useState, useCallback } from 'react';
import { db } from '@/db';
import { toast } from 'sonner';

export function useDangerZone() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAll = useCallback(async () => {
    try {
      await db.transaction('rw', db.subjects, db.systems, db.history, db.pyqYears, db.scoreLogs, db.uiPreferences, async () => {
        await db.subjects.clear();
        await db.systems.clear();
        await db.history.clear();
        await db.pyqYears.clear();
        await db.scoreLogs.clear();
        await db.uiPreferences.clear();
      });
      setShowDeleteConfirm(false);
      toast.success('All data deleted successfully');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      toast.error('Failed to delete data');
    }
  }, []);

  return { showDeleteConfirm, setShowDeleteConfirm, handleDeleteAll };
}
