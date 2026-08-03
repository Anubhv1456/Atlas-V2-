import { useState, useCallback } from 'react';
import { db } from '@/db';

export function useDangerZone() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAll = useCallback(async () => {
    try {
      await db.transaction('rw', db.subjects, db.systems, async () => {
        await db.subjects.clear();
        await db.systems.clear();
      });
      setShowDeleteConfirm(false);
      alert('All data deleted successfully');
      window.location.reload();
    } catch {
      alert('Failed to delete data');
    }
  }, []);

  return { showDeleteConfirm, setShowDeleteConfirm, handleDeleteAll };
}
