import { ShieldCheck, Sparkles, RefreshCw, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAutoBackup } from '@/hooks/useAutoBackup';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatLastBackup } from '@/lib/utils';

export function AutoBackupSection() {
  const {
    autoBackupEnabled,
    autoSnapshots,
    snapshotToRestore,
    setSnapshotToRestore,
    handleToggleAutoBackup,
    handleManualSnapshot,
    confirmRestoreSnapshot,
    handleDeleteSnapshot
  } = useAutoBackup();

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-3 px-1 mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automatic Device Backups</h2>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 font-medium bg-emerald-500/5 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" /> Active Safeguard
          </Badge>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
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
                        onClick={() => handleDeleteSnapshot(snap.id)}
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

      {/* Snapshot Restore Modal */}
      <Dialog open={!!snapshotToRestore} onOpenChange={() => setSnapshotToRestore(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Restore Device Copy</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Are you sure you want to revert your study progress to <strong>{snapshotToRestore ? formatLastBackup(snapshotToRestore.timestamp) : ''}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-500/10 text-amber-600 p-4 rounded-xl border border-amber-500/20 text-xs my-2 flex gap-3">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">This will <strong>overwrite your current data</strong> with the data from this saved copy. Any revisions or test scores logged after this backup will be lost.</p>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setSnapshotToRestore(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={confirmRestoreSnapshot} className="rounded-xl font-semibold gap-2 shadow-sm">
              <RotateCcw className="w-4 h-4" /> Overwrite Current Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
