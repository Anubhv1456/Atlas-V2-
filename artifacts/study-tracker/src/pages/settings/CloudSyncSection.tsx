import { Cloud, CloudUpload, CloudDownload, LogOut, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCloudSync } from '@/hooks/useCloudSync';

export function CloudSyncSection() {
  const {
    user,
    syncing,
    handleSignIn,
    handleSignOut,
    handleManualSync,
    handleForceUpload,
    handleForceDownload
  } = useCloudSync();

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 mt-8">Cloud Sync</h2>
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 mt-0.5">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-2">
                Google Drive Sync
                {user && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {user 
                  ? `Signed in as ${user.email}. Your data is safely syncing to your private Google Drive appData folder.` 
                  : 'Sign in to securely sync your study data across devices using your own Google Drive storage.'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pt-1">
            {user ? (
              <>
                <Button 
                  onClick={handleManualSync} 
                  disabled={syncing}
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  disabled={syncing}
                  className="gap-2 text-xs text-muted-foreground hover:text-foreground h-9 px-3"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleSignIn} 
                disabled={syncing}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                Connect Google Drive
              </Button>
            )}
          </div>
        </div>

        {user && (
          <div className="p-4 bg-muted/20 flex gap-2">
             <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceUpload} 
                disabled={syncing}
                className="flex-1 text-xs gap-1.5 h-8 bg-background"
              >
                <CloudUpload className="w-3.5 h-3.5" /> Force Upload
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceDownload} 
                disabled={syncing}
                className="flex-1 text-xs gap-1.5 h-8 bg-background text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <CloudDownload className="w-3.5 h-3.5" /> Force Download
              </Button>
          </div>
        )}
      </div>
    </section>
  );
}
