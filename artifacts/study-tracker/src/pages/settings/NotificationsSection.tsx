import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsSection() {
  const { notifSettings, toggleNotif, testNotification } = useNotifications();

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1 mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Study Reminders</h2>
        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 font-medium bg-amber-500/5 px-2 py-0.5 rounded-full">
          Local Only
        </Badge>
      </div>
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden divide-y">
        <div className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">Spaced Repetition Alerts</div>
              <div className="text-xs text-muted-foreground">Get notified when subjects are due</div>
            </div>
          </div>
          <Switch 
            checked={notifSettings.notifyRevisions} 
            onCheckedChange={(val) => toggleNotif('notifyRevisions', val)} 
          />
        </div>
        
        {notifSettings.notifyRevisions && (
          <div className="p-4 bg-muted/20">
            <Button variant="outline" size="sm" onClick={testNotification} className="w-full text-xs font-medium bg-background">
              Send Test Notification
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
              Notifications are processed entirely on your device. No server is used to schedule or send them.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
