import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { initAuth, googleSignIn, googleSignOut, uploadToDrive, downloadFromDrive, getValidTokenSync, getAccessToken, syncWithDrive } from '@/lib/driveSync';

const LS_KEY = 'atlas_last_backup';

export function useCloudSync() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, _token) => setUser(u),
      () => setUser(null)
    );
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      const res = await googleSignIn();
      if (res) setUser(res.user);
    } catch (e: any) {
      toast({ title: 'Login Failed', description: e.message, variant: 'destructive' });
    }
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    try {
      await googleSignOut();
      setUser(null);
    } catch (e: any) {
      toast({ title: 'Logout Failed', description: e.message, variant: 'destructive' });
    }
  }, [toast]);

  const _ensureToken = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        token = res?.accessToken || null;
      } catch (e: any) {
        toast({ title: 'Authentication Required', description: 'Please try signing in again.', variant: 'destructive' });
        return null;
      }
    }
    return token;
  };

  const handleManualSync = useCallback(async () => {
    const token = await _ensureToken();
    if (!token) return;
    
    setSyncing(true);
    try {
      const { stats } = await syncWithDrive(token);
      toast({
        title: 'Cloud Sync Completed! ⚡',
        description: `Last-Write-Wins Merge: ${stats.inserted} added, ${stats.updated} updated (${stats.totalMerged} total records synchronized).`,
      });
      const now = new Date().toISOString();
      localStorage.setItem(LS_KEY, now);
    } catch (e: any) {
      toast({ title: 'Sync Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  const handleForceUpload = useCallback(async () => {
    const token = await _ensureToken();
    if (!token) return;

    setSyncing(true);
    try {
      await uploadToDrive(token);
      toast({ title: 'Upload Successful', description: 'Your local data has been forcefully uploaded to Google Drive.' });
      const now = new Date().toISOString();
      localStorage.setItem(LS_KEY, now);
    } catch (e: any) {
      toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  const handleForceDownload = useCallback(async () => {
    if (!confirm('This will replace your local data with the cloud backup. Are you sure?')) return;
    const token = await _ensureToken();
    if (!token) return;

    setSyncing(true);
    try {
      await downloadFromDrive(token);
      toast({ title: 'Success', description: 'Data restored from Cloud.' });
    } catch (e: any) {
      toast({ title: 'Restore Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  return {
    user,
    syncing,
    handleSignIn,
    handleSignOut,
    handleManualSync,
    handleForceUpload,
    handleForceDownload
  };
}
