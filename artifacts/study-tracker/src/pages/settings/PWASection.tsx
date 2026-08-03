import { Smartphone, Download, Check, ExternalLink, Monitor, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePWA } from '@/hooks/usePWA';

export function PWASection() {
  const { isStandalone, handlePwaInstallClick, showInstallGuideModal, setShowInstallGuideModal } = usePWA();

  return (
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

      <Dialog open={showInstallGuideModal} onOpenChange={setShowInstallGuideModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Install Atlas App</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Atlas is a Progressive Web App. You can install it directly from your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Smartphone className="w-4 h-4 text-primary" /> On iOS / Safari
              </h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside ml-1">
                <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              </ol>
            </div>
            <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Monitor className="w-4 h-4 text-indigo-500" /> On Chrome / Android
              </h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside ml-1">
                <li>Tap the <strong>Menu</strong> (three dots) in the top right.</li>
                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
