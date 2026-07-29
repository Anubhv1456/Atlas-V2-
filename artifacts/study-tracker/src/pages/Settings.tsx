import { useState, useEffect, useRef } from 'react';
import { exportData, importData } from '@/db/database';
import { db } from '@/db/database';
import { Moon, Sun, Share2, Upload, Trash2, ShieldAlert, Clock, RotateCcw, ShieldCheck, RefreshCw, CheckCircle2, Sparkles, ExternalLink, Download, Copy, Check, FolderTree, FileText, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AnkiLogo, AnkiBadge } from '@/components/AnkiLogo';
import { getAnkiConfig, saveAnkiConfig, launchAnkiDeck, generateAnkiDeckHierarchyText, downloadAnkiDeckHierarchyFile } from '@/lib/anki';

import { initAuth, googleSignIn, googleSignOut, uploadToDrive, downloadFromDrive, getAccessToken } from '@/lib/driveSync';
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

  // Anki settings state
  const [ankiConfig, setAnkiConfigState] = useState(() => getAnkiConfig());
  const [showAnkiExportDialog, setShowAnkiExportDialog] = useState(false);
  const [ankiDeckExportData, setAnkiDeckExportData] = useState<{
    deckList: string[];
    fileText: string;
    deckCount: number;
  } | null>(null);
  const [copiedAnkiList, setCopiedAnkiList] = useState(false);

  const handleUpdateAnkiRoot = (val: string) => {
    const updated = saveAnkiConfig({ rootDeckName: val });
    setAnkiConfigState(updated);
  };

  const handleToggleAnkiReminders = (enabled: boolean) => {
    const updated = saveAnkiConfig({ promptReminders: enabled });
    setAnkiConfigState(updated);
  };

  const handleResetAnkiDecks = () => {
    const updated = saveAnkiConfig({ confirmedDecks: {} });
    setAnkiConfigState(updated);
    toast({ title: 'Anki Decks Reset', description: 'All deck verifications have been cleared.' });
  };

  const handleOpenAnkiExport = async () => {
    const data = await generateAnkiDeckHierarchyText();
    setAnkiDeckExportData({
      deckList: data.deckList,
      fileText: data.text,
      deckCount: data.deckCount,
    });
    setShowAnkiExportDialog(true);
  };

  const handleDownloadAnkiFile = async () => {
    const { count } = await downloadAnkiDeckHierarchyFile();
    toast({
      title: 'Anki Deck File Downloaded! 📁',
      description: `Exported ${count} deck path(s) ready for Anki import.`,
    });
  };

  const handleCopyAnkiList = () => {
    if (!ankiDeckExportData) return;
    const textToCopy = ankiDeckExportData.deckList.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedAnkiList(true);
    toast({
      title: 'Copied to Clipboard! 📋',
      description: 'Copied deck hierarchy list to clipboard.',
    });
    setTimeout(() => setCopiedAnkiList(false), 2000);
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

  const handleCloudPush = async () => {
    const token = await getAccessToken();
    if (!token) { toast({ title: 'Not authenticated', variant: 'destructive' }); return; }
    setSyncing(true);
    try {
      await uploadToDrive(token);
      toast({ title: 'Success', description: 'Data synced to Cloud.' });
      
      const now = new Date().toISOString();
      localStorage.setItem(LS_KEY, now);
      setLastBackup(now);
    } catch (e: any) {
      toast({ title: 'Sync Failed', description: e.message, variant: 'destructive' }); return;
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

  // ── Import — step 1: read & preview ─────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
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
    <div className="min-h-[100dvh] bg-background px-4 pt-10 pb-28 max-w-2xl mx-auto flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <div className="text-xs text-muted-foreground">Enable cross-device cloud sync</div>
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
                  onClick={handleCloudPush}
                  disabled={syncing}
                  className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
                    <CloudUpload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Backup to Cloud</div>
                    <div className="text-xs text-muted-foreground">Push local data to Cloud</div>
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
                    <div className="font-semibold text-foreground">Restore from Cloud</div>
                    <div className="text-xs text-muted-foreground">Pull data from Cloud</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Automated Local Backup & Snapshots */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1 mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automated Auto-Snapshots</h2>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 font-mono">
              <ShieldCheck className="w-3 h-3 mr-1" /> Active Safeguard
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
                  <div className="font-semibold text-foreground">Daily Rolling Auto-Snapshots</div>
                  <div className="text-xs text-muted-foreground">Automatically saves local database snapshots every 12 hours</div>
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
                <div className="font-semibold text-foreground">Create Snapshot Now</div>
                <div className="text-xs text-muted-foreground">Force-save an immediate local backup snapshot</div>
              </div>
              <Badge variant="secondary" className="text-xs">Take Snapshot</Badge>
            </button>

            {/* List of Rolling Snapshots */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Recent Rolling Local Snapshots ({autoSnapshots.length}/5)</span>
              </div>

              {autoSnapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No automatic snapshots stored yet. Snapshots will be generated automatically as you study.</p>
              ) : (
                <div className="space-y-2">
                  {autoSnapshots.map((snap) => (
                    <div key={snap.id} className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border/50 text-xs">
                      <div>
                        <div className="font-semibold font-mono text-foreground">
                          {formatLastBackup(snap.timestamp)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {snap.subjectsCount} subjects • {snap.systemsCount} systems • {snap.scoreLogsCount} score logs
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

        {/* ── Anki Integration ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 mt-8">Anki Integration</h2>
          <div className="bg-card rounded-2xl border shadow-sm p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                <AnkiLogo className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm">Unified Daily Review & Subdecks</h3>
                  <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Combines all subdecks into a single collective Daily Anki Review Pass while mapping Atlas subjects and systems to Anki subdecks.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Master Deck Prefix (Optional)</span>
                <span className="text-[11px] text-muted-foreground font-normal">Leave blank for direct <code className="bg-muted px-1 rounded font-mono">Subject::System</code></span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={ankiConfig.rootDeckName}
                  onChange={(e) => handleUpdateAnkiRoot(e.target.value)}
                  placeholder="Optional prefix, e.g. 'NEET PG' or 'AnKing' (or leave blank)"
                  className="rounded-xl bg-muted/40 text-sm h-10"
                />
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Active Deck Hierarchy: {ankiConfig.rootDeckName ? `${ankiConfig.rootDeckName}::Subject::System` : 'Subject::System'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div>
                <div className="font-medium text-xs text-foreground">Post-Task Flashcard Prompt</div>
                <div className="text-[11px] text-muted-foreground">Show 1-click Anki reminder after QBank / Revision</div>
              </div>
              <Switch
                checked={ankiConfig.promptReminders}
                onCheckedChange={handleToggleAnkiReminders}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div>
                <div className="font-medium text-xs text-foreground">Verified Decks</div>
                <div className="text-[11px] text-muted-foreground">
                  {Object.keys(ankiConfig.confirmedDecks || {}).length} system deck(s) setup
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => launchAnkiDeck(ankiConfig.rootDeckName)}
                  className="rounded-xl text-xs h-8 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Anki
                </Button>
                {Object.keys(ankiConfig.confirmedDecks || {}).length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetAnkiDecks}
                    className="rounded-xl text-xs h-8 text-destructive hover:bg-destructive/10"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Export Deck Hierarchy Action */}
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-blue-500" />
                    <span>Export Deck Hierarchy to Anki</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Mirror Atlas subjects & systems as empty Anki subdecks (zero cards created).
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenAnkiExport}
                  className="rounded-xl text-xs h-8 font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export Hierarchy
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Backup */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 mt-8">Backup</h2>
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
                <div className="font-semibold text-foreground">Quick Backup</div>
                <div className="text-xs text-muted-foreground">Share your data to any app or drive</div>
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
                <div className="font-semibold text-foreground">Import Backup</div>
                <div className="text-xs text-muted-foreground">Restore from a previous backup</div>
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
                <div className="text-xs text-destructive/80">Wipes local database completely</div>
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
              This backup will permanently replace everything in your local database.
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

      {/* ── Anki Deck Hierarchy Export Dialog ──────────────────────────── */}
      <Dialog open={showAnkiExportDialog} onOpenChange={setShowAnkiExportDialog}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl mx-4 w-[calc(100%-2rem)] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Anki Deck Hierarchy Export</DialogTitle>
                <DialogDescription className="text-xs">
                  Export deck structure without generating any cards or notes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {ankiDeckExportData && (
            <div className="space-y-4 my-2 overflow-y-auto pr-1">
              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 text-xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground font-medium">
                  <span>Total Generated Decks:</span>
                  <Badge variant="secondary" className="font-mono">{ankiDeckExportData.deckCount} Decks</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Importing this file into Anki creates the exact nested deck & subdeck hierarchy matching your Atlas subjects & systems, without populating any cards.
                </p>
              </div>

              {/* Hierarchy Preview */}
              <div>
                <span className="text-xs font-semibold text-foreground mb-1.5 block">Deck Hierarchy Preview:</span>
                <div className="bg-black/90 text-emerald-400 font-mono text-[11px] p-3 rounded-xl max-h-44 overflow-y-auto space-y-1 border border-border/50 select-all">
                  {ankiDeckExportData.deckList.map((deck, idx) => (
                    <div key={idx} className="truncate">
                      {deck}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs space-y-1.5">
                <span className="font-semibold text-blue-600 dark:text-blue-400 block">How to import into Anki:</span>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                  <li>Download the <code className="bg-muted px-1 rounded font-mono">.txt</code> deck hierarchy file below.</li>
                  <li>Open Anki Desktop, AnkiMobile, or AnkiDroid.</li>
                  <li>Go to <strong>File &rarr; Import</strong> and select the downloaded file.</li>
                  <li>Anki will automatically build the nested subject and system subdecks.</li>
                </ol>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAnkiList}
              className="rounded-xl text-xs h-9 font-medium gap-1.5 sm:w-auto w-full"
            >
              {copiedAnkiList ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAnkiList ? 'Copied List!' : 'Copy Deck List'}
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadAnkiFile}
              className="rounded-xl text-xs h-9 font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 sm:flex-1 w-full"
            >
              <Download className="w-3.5 h-3.5" /> Download Anki File (.txt)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
