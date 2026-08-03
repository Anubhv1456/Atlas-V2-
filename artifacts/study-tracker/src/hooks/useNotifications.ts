import { useState, useCallback } from 'react';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, triggerSpacedRepetitionNotification } from '@/lib/pwaAndNotifications';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings());
  const { toast } = useToast();

  const toggleNotif = useCallback(
    (key: keyof NotificationSettings, value: boolean) => {
      const newSettings = { ...notifSettings, [key]: value };
      setNotifSettings(newSettings);
      saveNotificationSettings(newSettings);
    },
    [notifSettings]
  );

  const testNotification = useCallback(async () => {
    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') {
        toast({ title: 'Permission denied', description: 'Please enable notifications in your browser settings.' });
        return;
      }
    }
    triggerSpacedRepetitionNotification(true);
  }, [toast]);

  return { notifSettings, toggleNotif, testNotification };
}
