import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { CommandPalette } from '@/components/CommandPalette';
import { PullToRefresh } from '@/components/PullToRefresh';
import { syncWithDrive, getValidTokenSync } from '@/lib/driveSync';
import Home from '@/pages/Home';
import SubjectDetail from '@/pages/SubjectDetail';
import Timeline from '@/pages/Timeline';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import { checkAndRunAutoBackup } from '@/lib/autoBackup';
import { triggerSpacedRepetitionNotification } from '@/lib/pwaAndNotifications';

const queryClient = new QueryClient();

const initTheme = () => {
  if (typeof window !== 'undefined') {
    try {
      const isDark = localStorage.getItem('theme') === 'dark' || !('theme' in localStorage);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.warn('localStorage access denied, fallback to dark theme', e);
      document.documentElement.classList.add('dark');
    }
  }
};
initTheme();

function Router() {
  const [location] = useLocation();

  const handleRefresh = async () => {
    const token = getValidTokenSync();
    if (!token) {
      toast.info('Sign in with Google in Settings to enable Cloud Sync.');
      return;
    }
    try {
      const { stats } = await syncWithDrive(token);
      toast.success('Cloud Sync Completed! ⚡', {
        description: `Merged: ${stats.inserted} added, ${stats.updated} updated.`,
      });
    } catch (e: any) {
      toast.error('Sync failed', { description: e.message });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <BottomNav />
      <div className="flex-1 w-full relative z-10 overflow-x-hidden">
        <PullToRefresh onRefresh={handleRefresh}>
          <motion.main
            key={location}
            initial={{ opacity: 0.8, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="w-full h-full"
          >
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/subjects/:id" component={SubjectDetail} />
              <Route path="/timeline" component={Timeline} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </motion.main>
        </PullToRefresh>
      </div>
    </div>
  );
}


function App() {
  useEffect(() => {
    checkAndRunAutoBackup();
    triggerSpacedRepetitionNotification(false).catch(err => {
      console.warn('Background notification trigger suppressed:', err);
    });

    const handleOffline = () => {
      toast.info('⚡ Offline Mode Active', {
        description: 'Atlas is operating 100% locally from IndexedDB. All updates are saved offline.',
      });
    };

    const handleOnline = () => {
      toast.success('🌐 Connection Restored', {
        description: 'You are back online.',
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL.replace(/\/$/, '') : undefined}>
          <Router />
          <CommandPalette />
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
