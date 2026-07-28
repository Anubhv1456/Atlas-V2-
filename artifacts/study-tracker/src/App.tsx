import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { BottomNav } from '@/components/BottomNav';
import { CommandPalette } from '@/components/CommandPalette';
import Home from '@/pages/Home';
import SubjectDetail from '@/pages/SubjectDetail';
import Timeline from '@/pages/Timeline';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import { checkAndRunAutoBackup } from '@/lib/autoBackup';

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
  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <BottomNav />
      <main className="flex-1 w-full relative z-10">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/subjects/:id" component={SubjectDetail} />
          <Route path="/timeline" component={Timeline} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    checkAndRunAutoBackup();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
