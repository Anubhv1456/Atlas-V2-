import { Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDangerZone } from '@/hooks/useDangerZone';

export function DangerZoneSection() {
  const { showDeleteConfirm, setShowDeleteConfirm, handleDeleteAll } = useDangerZone();

  return (
    <>
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
    </>
  );
}
