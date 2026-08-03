import { Share2, Lock, Upload, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useManualBackup } from '@/hooks/useManualBackup';
import { formatLastBackup } from '@/lib/utils';
import { ProgressBar } from '@/components/ProgressBar';

export function ManualBackupSection() {
  const {
    fileInputRef,
    lastBackup,
    handleQuickBackup,
    handleFileChange,
    
    showEncryptExportModal,
    setShowEncryptExportModal,
    exportPassphrase,
    setExportPassphrase,
    encryptingExport,
    handleEncryptedExport,
    
    importPreview,
    setImportPreview,
    importing,
    handleConfirmImport,
    
    pendingEncryptedPayload,
    setPendingEncryptedPayload,
    importPassphrase,
    setImportPassphrase,
    decryptingImport,
    handleDecryptAndPreview,
    
    cryptoStage,
    cryptoProgress
  } = useManualBackup();

  return (
    <>
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 mt-8">Manual Backup & Restore</h2>
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
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

      {/* Encrypted Export Modal */}
      <Dialog open={showEncryptExportModal} onOpenChange={setShowEncryptExportModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Password-Protected Export</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Create a secure backup locked with a password. You will need this password to restore the file later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground ml-1">Backup Password</label>
              <Input 
                type="password" 
                placeholder="Choose a memorable password" 
                value={exportPassphrase}
                onChange={(e) => setExportPassphrase(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            {encryptingExport && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground px-1">
                  <span>{cryptoStage}</span>
                  <span>{cryptoProgress}%</span>
                </div>
                <ProgressBar progress={cryptoProgress} className="h-1.5" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setShowEncryptExportModal(false)} disabled={encryptingExport} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={handleEncryptedExport} 
              disabled={encryptingExport || exportPassphrase.length < 4}
              className="rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              {encryptingExport ? 'Encrypting...' : 'Export Secure File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Decryption Modal */}
      <Dialog open={!!pendingEncryptedPayload} onOpenChange={(open) => !open && !decryptingImport && setPendingEncryptedPayload(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Unlock Secure Backup</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              This backup file is encrypted. Please enter the password used to lock it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Backup Password" 
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleDecryptAndPreview() }}
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>
             {decryptingImport && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground px-1">
                  <span>{cryptoStage}</span>
                  <span>{cryptoProgress}%</span>
                </div>
                <ProgressBar progress={cryptoProgress} className="h-1.5" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
             <Button variant="ghost" onClick={() => setPendingEncryptedPayload(null)} disabled={decryptingImport} className="rounded-xl">Cancel</Button>
             <Button 
                onClick={handleDecryptAndPreview} 
                disabled={decryptingImport || importPassphrase.length < 1}
                className="rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {decryptingImport ? 'Decrypting...' : 'Unlock File'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={!!importPreview} onOpenChange={(open) => !open && !importing && setImportPreview(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Restore Backup</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Review the contents of this backup before restoring. This will completely overwrite your existing study data.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="bg-muted/40 rounded-xl p-4 my-2 border space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-1">
                <FileText className="w-4 h-4 text-primary" /> Backup Summary
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Date Created</div>
                  <div className="font-mono font-medium">{importPreview.backupDate ? new Date(importPreview.backupDate).toLocaleDateString() : 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Subjects</div>
                  <div className="font-mono font-medium">{importPreview.subjects}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Topics</div>
                  <div className="font-mono font-medium">{importPreview.systems}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">History Logs</div>
                  <div className="font-mono font-medium">{importPreview.history}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setImportPreview(null)} disabled={importing} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirmImport} disabled={importing} className="rounded-xl font-semibold gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4" /> {importing ? 'Restoring...' : 'Confirm Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
