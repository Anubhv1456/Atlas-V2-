import { useState, useEffect, useRef } from 'react';
import { exportData, importData } from '@/db/database';
import { db } from '@/db/database';
import { Moon, Sun, Share2, Upload, Trash2, ShieldAlert, Clock, RotateCcw, ShieldCheck, RefreshCw, CheckCircle2, Sparkles, FileText, Layers, Lock, KeyRound, Shield, Smartphone, Bell, Download, Check, ExternalLink, Monitor } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { encryptClientData, decryptClientData, isEncryptedPayload, EncryptedPayload } from '@/lib/crypto';
import {
  getNotificationSettings,
  saveNotificationSettings,
  triggerSpacedRepetitionNotification,
  isPwaInstallable,
  promptPwaInstall,
  NotificationSettings,
} from '@/lib/pwaAndNotifications';

import { initAuth, googleSignIn, googleSignOut, uploadToDrive, downloadFromDrive, getAccessToken, syncWithDrive } from '@/lib/driveSync';
import { Cloud, CloudUpload, CloudDownload, LogOut } from 'lucide-react';
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


// ── Last-backup timestamp helpers ──────────────────────────────────────────
const LS_KEY = 'atlas_last_backup';

function formatLastBackup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (d.toDateString() === now.toDateString()) return `Today • ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday • ${time}`;

  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date} • ${time}`;
}

// ── Import preview type ────────────────────────────────────────────────────
interface ImportPreview {
  backupDate: string | null;
  subjects: number;
  systems: number;
  history: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

export default function Settings() {
  const [isDark, setIsDark] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  // Auto-backup state
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState<boolean>(true);
  const [autoSnapshots, setAutoSnapshots] = useState<AutoSnapshot[]>([]);
  const [snapshotToRestore, setSnapshotToRestore] = useState<AutoSnapshot | null>(null);

  // Client-Side Encryption states
  const [showEncryptExportModal, setShowEncryptExportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [encryptingExport, setEncryptingExport] = useState(false);

  const [pendingEncryptedPayload, setPendingEncryptedPayload] = useState<EncryptedPayload | null>(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [decryptingImport, setDecryptingImport] = useState(false);

  const [cryptoStage, setCryptoStage] = useState<string>('');
  const [cryptoProgress, setCryptoProgress] = useState<number>(0);

  // PWA & Notification states
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(isPwaInstallable());
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(
    typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
  );

  useEffect(() => {
    const handlePwaAvail = () => setCanInstallPwa(true);
    const handlePwaDone = () => setCanInstallPwa(false);
    window.addEventListener('pwa-install-available', handlePwaAvail);
    window.addEventListener('pwa-install-completed', handlePwaDone);
    return () => {
      window.removeEventListener('pwa-install-available', handlePwaAvail);
      window.removeEventListener('pwa-install-completed', handlePwaDone);
    };
  }, []);

  const handleToggleNotification = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toast({
            title: 'Notification Permission Denied',
            description: 'Please enable notifications in your browser/device settings to receive daily reminders.',
            variant: 'destructive',
          });
          return;
        }
      }
    }
    const updated = saveNotificationSettings({ enabled });
    setNotifSettings(updated);
    toast({
      title: enabled ? 'Reminders Enabled 🔔' : 'Reminders Disabled',
      description: enabled
        ? 'Atlas will send local browser reminders for pending Anki decks & system revisions.'
        : 'Daily spaced repetition reminders have been turned off.',
    });
  };

  const handleTestNotification = async () => {
    const sent = await triggerSpacedRepetitionNotification(true);
    if (sent) {
      toast({
        title: 'Test Notification Sent! 🚀',
        description: 'Check your device notifications banner.',
      });
    } else {
      toast({
        title: 'Notification Not Sent',
        description: 'Ensure notification permissions are granted in your browser.',
        variant: 'destructive',
      });
    }
  };

  const handlePwaInstallClick = async () => {
    if (canInstallPwa || isPwaInstallable()) {
      const success = await promptPwaInstall();
      if (success) {
        toast({ title: 'PWA Installed! 🎉', description: 'Atlas is now added to your home screen.' });
        return;
      }
    }
    setShowInstallGuideModal(true);
  };


  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => setUser(user),
      () => setUser(null)
    );
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) setUser(res.user);
    } catch (e: any) {
      toast({ title: 'Login Failed', description: e.message, variant: 'destructive' }); return;
    }
  };

  const handleCloudSync = async () => {
    const token = await getAccessToken();
    if (!token) { toast({ title: 'Not authenticated', variant: 'destructive' }); return; }
    setSyncing(true);
    try {
      const { stats } = await syncWithDrive(token);
      toast({
        title: 'Cloud Sync Completed! ⚡',
        description: `Last-Write-Wins Merge: ${stats.inserted} added, ${stats.updated} updated (${stats.totalMerged} total records synchronized).`,
      });
      const now = new Date().toISOString();
      localStorage.setItem(LS_KEY, now);
      setLastBackup(now);
    } catch (e: any) {
      toast({ title: 'Sync Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCloudPull = async () => {
    if (!confirm('This will replace your local data with the cloud backup. Are you sure?')) return;
    const token = await getAccessToken();
    if (!token) { toast({ title: 'Not authenticated', variant: 'destructive' }); return; }
    setSyncing(true);
    try {
      await downloadFromDrive(token);
      toast({ title: 'Success', description: 'Data restored from Cloud.' });
    } catch (e: any) {
      toast({ title: 'Restore Failed', description: e.message, variant: 'destructive' }); return;
    } finally {
      setSyncing(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setLastBackup(localStorage.getItem(LS_KEY));
    setAutoBackupEnabledState(isAutoBackupEnabled());
    setAutoSnapshots(getAutoSnapshots());
  }, []);

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    setAutoBackupEnabledState(enabled);
    toast({
      title: enabled ? 'Auto-Backup Enabled' : 'Auto-Backup Disabled',
      description: enabled
        ? 'Rolling daily snapshots will be automatically created in local storage.'
        : 'Automatic background snapshots turned off.',
    });
  };

  const handleManualSnapshot = async () => {
    const snap = await createAutoSnapshot();
    if (snap) {
      setAutoSnapshots(getAutoSnapshots());
      setLastBackup(snap.timestamp);
      toast({
        title: 'Auto Snapshot Created! 🛡️',
        description: `Saved ${snap.subjectsCount} subjects, ${snap.systemsCount} systems, and ${snap.scoreLogsCount} score logs.`,
      });
    } else {
      toast({
        title: 'Snapshot Empty',
        description: 'No study data found to back up yet.',
      });
    }
  };

  const handleConfirmRestoreSnapshot = async () => {
    if (!snapshotToRestore) return;
    const ok = await restoreAutoSnapshot(snapshotToRestore.id);
    if (ok) {
      toast({
        title: 'Data Restored Successfully!',
        description: 'Your local database was restored from the selected snapshot.',
      });
      setSnapshotToRestore(null);
      setTimeout(() => window.location.reload(), 500);
    } else {
      toast({
        title: 'Restore Failed',
        description: 'Could not restore data from this snapshot.',
        variant: 'destructive',
      });
    }
  };

  // ── Theme ────────────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  // ── Quick Backup ─────────────────────────────────────────────────────────
  const handleQuickBackup = async () => {
    // 1. Generate JSON — if this fails, surface the error.
    let json: string;
    try {
      const data = await exportData();
      json = JSON.stringify(data, null, 2);
    } catch {
      alert('Failed to read your data. Please try again.');
      return;
    }

    const filename = `atlas-backup-${new Date().toISOString().split('T')[0]}.json`;

    // 2. Try native share sheet (Android / iOS).
    //    Chrome on Android only allows a limited set of MIME types for file
    //    sharing — application/json is NOT in that list, so canShare() returns
    //    false and we'd silently fall back to download. Using text/plain (which
    //    JSON is) makes canShare() return true across all Android/iOS browsers
    //    while keeping the .json filename intact.
    //    canShare({ files }) can also throw TypeError on some browsers, so the
    //    whole attempt is in its own try/catch; any failure other than the user
    //    dismissing the sheet falls through to the download fallback.
    let shared = false;
    try {
      const file = new File([json], filename, { type: 'text/plain' });
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: 'Atlas Backup' });
        shared = true;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return; // user cancelled — not an error
      // Any other share failure → fall through to download below
    }

    // 3. Download fallback (desktop, or when share sheet isn't available).
    if (!shared) {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        alert('Failed to save backup. Please try again.');
        return;
      }
    }

    // 4. Record timestamp.
    const now = new Date().toISOString();
    localStorage.setItem(LS_KEY, now);
    setLastBackup(now);
  };

  // ── Encrypted Export Handler ─────────────────────────────────────────────
  const handleEncryptedExport = async () => {
    if (!exportPassphrase || exportPassphrase.length < 4) {
      toast({
        title: 'Passphrase Too Short',
        description: 'Please enter a passphrase at least 4 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setEncryptingExport(true);
    setCryptoProgress(10);
    setCryptoStage('Initializing Web Worker...');

    try {
      const data = await exportData();
      const plainText = JSON.stringify(data, null, 2);
      const encrypted = await encryptClientData(plainText, exportPassphrase, (progress, stage) => {
        setCryptoProgress(progress);
        setCryptoStage(stage);
      });
      const fileContent = JSON.stringify(encrypted, null, 2);

      const filename = `atlas-encrypted-backup-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowEncryptExportModal(false);
      setExportPassphrase('');
      toast({
        title: 'Encrypted Backup Downloaded! 🔒',
        description: 'AES-256-GCM encrypted backup created in Web Worker.',
      });
    } catch (err: any) {
      toast({
        title: 'Encryption Failed',
        description: err.message || 'Could not encrypt backup data.',
        variant: 'destructive',
      });
    } finally {
      setEncryptingExport(false);
      setCryptoProgress(0);
      setCryptoStage('');
    }
  };

  // ── Decrypt Encrypted Import ─────────────────────────────────────────────
  const handleDecryptImport = async () => {
    if (!pendingEncryptedPayload || !importPassphrase) return;
    setDecryptingImport(true);
    setCryptoProgress(10);
    setCryptoStage('Initializing Web Worker...');

    try {
      const decryptedText = await decryptClientData(pendingEncryptedPayload, importPassphrase, (progress, stage) => {
        setCryptoProgress(progress);
        setCryptoStage(stage);
      });
      const data = JSON.parse(decryptedText);
      if (!data.subjects || !data.systems) throw new Error('Invalid format');

      let backupDate: string | null = null;
      if (data.history?.length) {
        const sorted = [...data.history].sort(
          (a: { completedAt: string }, b: { completedAt: string }) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        backupDate = new Date(sorted[0].completedAt).toLocaleDateString([], {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      }

      setImportPreview({
        backupDate,
        subjects: data.subjects.length,
        systems: data.systems.length,
        history: data.history?.length ?? 0,
        raw: data,
      });
      setPendingEncryptedPayload(null);
      setImportPassphrase('');
    } catch (err: any) {
      toast({
        title: 'Decryption Failed ❌',
        description: err.message || 'Incorrect passphrase or corrupted file.',
        variant: 'destructive',
      });
    } finally {
      setDecryptingImport(false);
      setCryptoProgress(0);
      setCryptoStage('');
    }
  };

  // ── Import — step 1: read & preview ─────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (isEncryptedPayload(parsed)) {
        setPendingEncryptedPayload(parsed);
        setImportPassphrase('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const data = parsed;
      if (!data.subjects || !data.systems) throw new Error('Invalid format');

      // Try to extract a backup date from the first history entry or subject
      let backupDate: string | null = null;
      if (data.history?.length) {
        const sorted = [...data.history].sort(
          (a: { completedAt: string }, b: { completedAt: string }) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        backupDate = new Date(sorted[0].completedAt).toLocaleDateString([], {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      } else if (data.subjects?.length) {
        const dates = data.subjects
          .map((s: { updatedAt: string }) => new Date(s.updatedAt))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime());
        if (dates.length) {
          backupDate = dates[0].toLocaleDateString([], {
            year: 'numeric', month: 'short', day: 'numeric',
          });
        }
      }

      setImportPreview({
        backupDate,
        subjects: data.subjects.length,
        systems: data.systems.length,
        history: data.history?.length ?? 0,
        raw: data,
      });
    } catch {
      alert('Could not read this file. Make sure it is a valid Atlas backup.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Import — step 2: confirm & execute ───────────────────────────────────
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      await importData(importPreview.raw);
      setImportPreview(null);
    } catch {
      alert('Import failed. Your existing data was not changed.');
      setImporting(false);
    }
  };

  // ── Delete all ───────────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    try {
      await db.transaction('rw', db.subjects, db.systems, async () => {
        await db.subjects.clear();
        await db.systems.clear();
      });
      setShowDeleteConfirm(false);
      alert('All data deleted successfully');
    } catch {
      alert('Failed to delete data');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-36 max-w-2xl mx-auto flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Settings</h1>
      </header>

      <div className="space-y-6">
        {/* Appearance */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Appearance</h2>
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-foreground">Dark Mode</div>
                    <div className="text-xs text-muted-foreground">Toggle light / dark appearance</div>
                  </div>
                </div>
                <Switch 
                  checked={isDark} 
                  onCheckedChange={toggleTheme} 
                />
              </div>
          </div>
        </section>

        {/* PWA & Mobile Installation */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1 mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App & Offline Experience</h2>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">
              Works Offline
            </Badge>
          </div>
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    Install Atlas App
                    {isStandalone ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-500 border-none">
                        App Installed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-500 border-none">
                        Install Available
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isStandalone
                      ? 'Atlas is running as an app on your device.'
                      : 'Add Atlas to your home screen or desktop to open it quickly, even without internet.'}
                  </div>
                </div>
              </div>

              {!isStandalone && (
                <Button
                  size="sm"
                  onClick={handlePwaInstallClick}
                  className="gap-1.5 text-xs font-semibold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </Button>
              )}
            </div>

            <div className="p-4 bg-muted/20 text-xs space-y-2">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" /> Saved safely on your device
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Your study logs, revision schedules, past exam scores, and flashcard updates work completely offline. Any offline updates will sync automatically when you reconnect.
              </p>
            </div>
          </div>
        </section>

        {/* Local Push Notifications & Daily Reminders */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1 mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Study Reminders</h2>
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 font-medium bg-amber-500/5 px-2 py-0.5 rounded-full">
              Device Alerts
            </Badge>
          </div>
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
            {/* Master Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Daily Study Reminders</div>
                  <div className="text-xs text-muted-foreground">Get friendly reminders on this device for pending flashcards and due reviews</div>
                </div>
              </div>
              <Switch
                checked={notifSettings.enabled}
                onCheckedChange={handleToggleNotification}
              />
            </div>

            {notifSettings.enabled && (
              <>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Flashcard Review Reminders</div>
                      <div className="text-xs text-muted-foreground">Remind me if today's flashcard reviews aren't done yet</div>
                    </div>
                  </div>
                  <Switch
                    checked={notifSettings.notifyAnki}
                    onCheckedChange={(val) => {
                      const updated = saveNotificationSettings({ notifyAnki: val });
                      setNotifSettings(updated);
                    }}
                  />
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Due Topic Revision Reminders</div>
                      <div className="text-xs text-muted-foreground">Remind me when a subject topic is scheduled for review</div>
                    </div>
                  </div>
                  <Switch
                    checked={notifSettings.notifyRevisions}
                    onCheckedChange={(val) => {
                      const updated = saveNotificationSettings({ notifyRevisions: val });
                      setNotifSettings(updated);
                    }}
                  />
                </div>

                <div className="p-4 flex items-center justify-between bg-muted/20">
                  <div>
                    <div className="font-semibold text-foreground text-xs">Test Device Notifications</div>
                    <div className="text-[11px] text-muted-foreground">Send a sample notification to make sure alerts work on your device</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestNotification}
                    className="gap-1.5 text-xs"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Send Test Alert
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        
        {/* Cloud Sync */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 mt-8">Cloud Sync</h2>
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
            {!user ? (
              <button
                onClick={handleGoogleLogin}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Sign in with Google</div>
                  <div className="text-xs text-muted-foreground">Sync your progress across all your devices</div>
                </div>
              </button>
            ) : (
              <>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="font-semibold text-foreground text-sm">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={googleSignOut} className="text-muted-foreground">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                </div>
                <button
                  onClick={handleCloudSync}
                  disabled={syncing}
                  className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      Smart Cloud Sync
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">
                        Auto-Merge
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Seamlessly combine progress from all your devices so nothing is lost</div>
                  </div>
                </button>
                <button
                  onClick={handleCloudPull}
                  disabled={syncing}
                  className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
                    <CloudDownload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Restore Cloud Backup</div>
                    <div className="text-xs text-muted-foreground">Replace current data on this device with your Google Drive backup</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Automated Local Backup & Snapshots */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1 mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automatic Device Backups</h2>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 font-medium bg-emerald-500/5 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" /> Active Safeguard
            </Badge>
          </div>

          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
            {/* Toggle Row */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Automatic Daily Copies</div>
                  <div className="text-xs text-muted-foreground">Saves automatic backup copies on your device twice a day</div>
                </div>
              </div>
              <Switch
                checked={autoBackupEnabled}
                onCheckedChange={handleToggleAutoBackup}
              />
            </div>

            {/* Take Manual Snapshot */}
            <button
              onClick={handleManualSnapshot}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">Save Backup Copy Now</div>
                <div className="text-xs text-muted-foreground">Save an immediate backup copy of your current progress</div>
              </div>
              <Badge variant="secondary" className="text-xs">Save Copy</Badge>
            </button>

            {/* List of Rolling Snapshots */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Saved Device Copies ({autoSnapshots.length}/5)</span>
              </div>

              {autoSnapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No automatic backups saved yet. Copies will be created automatically as you log your study progress.</p>
              ) : (
                <div className="space-y-2">
                  {autoSnapshots.map((snap) => (
                    <div key={snap.id} className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border/50 text-xs">
                      <div>
                        <div className="font-semibold font-mono text-foreground">
                          {formatLastBackup(snap.timestamp)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {snap.subjectsCount} subjects • {snap.systemsCount} topics • {snap.scoreLogsCount} test scores
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSnapshotToRestore(snap)}
                          className="h-8 text-[11px] font-semibold gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-primary" />
                          Restore
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            deleteAutoSnapshot(snap.id);
                            setAutoSnapshots(getAutoSnapshots());
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Backup */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 mt-8">Manual Backup & Restore</h2>
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
            {/* Quick Backup */}
            <button
              onClick={handleQuickBackup}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Quick Export</div>
                <div className="text-xs text-muted-foreground">Save or share a backup file of your study data</div>
              </div>
            </button>

            {/* Encrypted Export */}
            <button
              onClick={() => setShowEncryptExportModal(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  Password-Protected Export
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-indigo-500/10 text-indigo-500 border-none font-semibold font-sans">Protected</Badge>
                </div>
                <div className="text-xs text-muted-foreground">Lock your backup file with a secret password</div>
              </div>
            </button>

            {/* Import Backup */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 bg-secondary rounded-xl text-secondary-foreground">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Restore From File</div>
                <div className="text-xs text-muted-foreground">Restore your study progress from a saved backup file</div>
              </div>
              <input
                type="file"
                accept=".json,application/json"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </button>

            {/* Last Backup — static info row */}
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 bg-muted rounded-xl text-muted-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Last Backup</div>
                <div className="text-xs text-muted-foreground">
                  {lastBackup ? formatLastBackup(lastBackup) : 'No backup yet'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Overview */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1 mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App Security & Safeguards</h2>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 font-medium bg-emerald-500/5 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" /> Active Safeguard
            </Badge>
          </div>
          <div className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-foreground">Web & Connection Security</div>
                <div className="text-muted-foreground mt-0.5">
                  Guards your connection and blocks unauthorized external access to your study data.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t pt-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  Password-Protected Backups
                </div>
                <div className="text-muted-foreground mt-0.5">
                  Uses high-grade encryption to lock backups on your device smoothly without slowing down the app.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t pt-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-foreground">Application Code Shield</div>
                <div className="text-muted-foreground mt-0.5">
                  Hardens the app structure to keep your local data safe against unauthorized tampering.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive/70 mb-3 px-1 mt-8">Danger Zone</h2>
          <div className="bg-destructive/5 border-destructive/20 rounded-2xl border overflow-hidden">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-destructive/10 transition-colors text-left"
            >
              <div className="p-2 bg-destructive/10 rounded-xl text-destructive">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-destructive">Delete All Data</div>
                <div className="text-xs text-destructive/80">Permanently deletes all saved subjects and study progress from this device</div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* ── Import confirmation dialog ───────────────────────────────────── */}
      <Dialog open={!!importPreview} onOpenChange={(open) => { if (!open) setImportPreview(null); }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Replace Current Data?</DialogTitle>
            <DialogDescription className="pt-1">
              This backup file will replace all current study subjects and logs on this device.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="mt-2 bg-muted/50 rounded-xl p-4 space-y-2.5">
              {importPreview.backupDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Backup Date</span>
                  <span className="font-medium text-foreground">{importPreview.backupDate}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subjects</span>
                <span className="font-medium text-foreground">{importPreview.subjects}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Systems</span>
                <span className="font-medium text-foreground">{importPreview.systems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">History Entries</span>
                <span className="font-medium text-foreground">{importPreview.history}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2 mt-4 sm:justify-center">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setImportPreview(null)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-semibold shadow-sm"
              onClick={handleConfirmImport}
              disabled={importing}
            >
              {importing ? 'Importing…' : 'Replace Current Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete-all confirmation dialog ──────────────────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl">Are you absolutely sure?</DialogTitle>
            <DialogDescription className="text-center pt-2">
              This action cannot be undone. This will permanently delete all your subjects, systems, and study progress from your device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-4 sm:justify-center">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handleDeleteAll}>
              Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Auto-Snapshot confirmation dialog ───────────────────── */}
      <Dialog open={!!snapshotToRestore} onOpenChange={(open) => { if (!open) setSnapshotToRestore(null); }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Restore Auto-Snapshot?</DialogTitle>
            <DialogDescription className="pt-1">
              Restoring this snapshot will replace your current study data with the data from{' '}
              <span className="font-semibold text-foreground">
                {snapshotToRestore ? formatLastBackup(snapshotToRestore.timestamp) : ''}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          {snapshotToRestore && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subjects</span>
                <span className="font-medium text-foreground">{snapshotToRestore.subjectsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Systems</span>
                <span className="font-medium text-foreground">{snapshotToRestore.systemsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Score Logs</span>
                <span className="font-medium text-foreground">{snapshotToRestore.scoreLogsCount}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2 mt-4 sm:justify-center">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSnapshotToRestore(null)}>
              Cancel
            </Button>
            <Button className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handleConfirmRestoreSnapshot}>
              Restore Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Encrypted Export Passphrase Dialog ───────────────────────────── */}
      <Dialog open={showEncryptExportModal} onOpenChange={setShowEncryptExportModal}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <div className="mx-auto w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center text-xl">Password-Protected Export</DialogTitle>
            <DialogDescription className="text-center pt-1">
              Enter a password to secure your study backup before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder="Enter password (min 4 chars)"
              value={exportPassphrase}
              onChange={(e) => setExportPassphrase(e.target.value)}
              className="rounded-xl font-mono text-sm"
              disabled={encryptingExport}
              onKeyDown={(e) => e.key === 'Enter' && handleEncryptedExport()}
            />

            {encryptingExport && (
              <div className="space-y-1.5 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                <div className="flex justify-between text-xs font-medium text-indigo-500">
                  <span>{cryptoStage || 'Encrypting...'}</span>
                  <span>{cryptoProgress}%</span>
                </div>
                <div className="w-full bg-indigo-500/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${cryptoProgress}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              🔒 Encrypted directly on your device. Keep this password safe to restore your data.
            </p>
          </div>

          <DialogFooter className="flex-row gap-2 mt-2 sm:justify-center">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => {
                setShowEncryptExportModal(false);
                setExportPassphrase('');
              }}
              disabled={encryptingExport}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-semibold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleEncryptedExport}
              disabled={encryptingExport || !exportPassphrase}
            >
              {encryptingExport ? 'Encrypting…' : 'Export File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Encrypted Import Decryption Dialog ────────────────────────────── */}
      <Dialog open={!!pendingEncryptedPayload} onOpenChange={(open) => { if (!open) setPendingEncryptedPayload(null); }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <div className="mx-auto w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <DialogTitle className="text-center text-xl">Protected Backup Detected</DialogTitle>
            <DialogDescription className="text-center pt-1">
              This backup is locked with a password. Enter your password to unlock and restore it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder="Enter backup password"
              value={importPassphrase}
              onChange={(e) => setImportPassphrase(e.target.value)}
              className="rounded-xl font-mono text-sm"
              disabled={decryptingImport}
              onKeyDown={(e) => e.key === 'Enter' && handleDecryptImport()}
            />

            {decryptingImport && (
              <div className="space-y-1.5 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <div className="flex justify-between text-xs font-medium text-amber-500">
                  <span>{cryptoStage || 'Decrypting...'}</span>
                  <span>{cryptoProgress}%</span>
                </div>
                <div className="w-full bg-amber-500/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${cryptoProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 mt-2 sm:justify-center">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setPendingEncryptedPayload(null)}
              disabled={decryptingImport}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-semibold shadow-sm"
              onClick={handleDecryptImport}
              disabled={decryptingImport || !importPassphrase}
            >
              {decryptingImport ? 'Decrypting…' : 'Unlock Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Install App Guide Dialog ────────────────────────────── */}
      <Dialog open={showInstallGuideModal} onOpenChange={setShowInstallGuideModal}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl mx-4 w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-2">
              <Smartphone className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">Install Atlas App</DialogTitle>
            <DialogDescription className="text-center text-xs pt-1">
              Add Atlas to your home screen or desktop for fast offline access and app performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* If in iframe preview notice */}
            {typeof window !== 'undefined' && window.self !== window.top && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="font-semibold text-amber-500 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4" /> Preview Window Detected
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Browser security prevents direct app installation from inside preview windows. Click below to open Atlas in its own tab, where you can install it in one click!
                </p>
                <Button
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => window.open(window.location.href, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Atlas in New Tab
                </Button>
              </div>
            )}

            {/* Desktop / Chrome / Edge */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-500" /> Desktop (Chrome, Edge, Brave)
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Click the <span className="font-medium text-foreground">Install icon (⬇️ or ⊕)</span> on the right side of your browser address bar, or click Menu (⋮) &rarr; <span className="font-medium text-foreground">Install Atlas App</span>.
              </p>
            </div>

            {/* iPhone / iPad (Safari) */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-500" /> iPhone & iPad (Safari)
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Tap the <span className="font-medium text-foreground">Share button</span> (bottom toolbar) &rarr; Scroll down &rarr; Tap <span className="font-medium text-foreground">Add to Home Screen</span>.
              </p>
            </div>

            {/* Android (Chrome) */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500" /> Android (Chrome)
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Tap the <span className="font-medium text-foreground">Menu button (⋮)</span> in top right &rarr; Tap <span className="font-medium text-foreground">Install App</span> or <span className="font-medium text-foreground">Add to Home screen</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              className="w-full rounded-xl font-semibold"
              onClick={() => setShowInstallGuideModal(false)}
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
