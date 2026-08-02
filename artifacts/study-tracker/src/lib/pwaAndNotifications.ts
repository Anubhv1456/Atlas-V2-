import { db } from '@/db/database';
import { getDailyAnkiPass } from '@/lib/anki';

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // e.g. "09:00"
  notifyAnki: boolean;
  notifyRevisions: boolean;
  lastNotifiedDate?: string; // YYYY-MM-DD
}

const SETTINGS_KEY = 'atlas_notification_settings_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTime: '09:00',
  notifyAnki: true,
  notifyRevisions: true,
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to parse notification settings:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  const current = getNotificationSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('notification-settings-updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
  return updated;
}

/**
 * Queries pending spaced repetition tasks (Anki pass & due system revisions)
 */
export async function getDueSpacedRepetitionTasks(): Promise<{
  ankiPending: boolean;
  dueRevisionsCount: number;
  dueRevisionNames: string[];
}> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Check Anki Pass
  const ankiPass = getDailyAnkiPass(todayStr);
  const ankiPending = !ankiPass.completed;

  // 2. Check Due System Revisions
  const now = new Date();
  const allSystems = await db.systems.toArray();
  const dueSystems = allSystems.filter(sys => {
    if (!sys.nextRevisionDate) return false;
    const nextDate = new Date(sys.nextRevisionDate);
    return nextDate <= now && sys.completionDate !== null;
  });

  return {
    ankiPending,
    dueRevisionsCount: dueSystems.length,
    dueRevisionNames: dueSystems.map(s => s.name).slice(0, 3),
  };
}

/**
 * Triggers a local browser notification for due spaced repetition tasks
 */
export async function triggerSpacedRepetitionNotification(force = false): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this environment.');
    return false;
  }

  try {
    if (Notification.permission === 'denied') return false;
    if (Notification.permission !== 'granted') {
      if (!force) return false;
      const perm = await Notification.requestPermission().catch(() => 'denied');
      if (perm !== 'granted') return false;
    }
  } catch (err) {
    console.warn('Notification permission check suppressed:', err);
    return false;
  }

  const settings = getNotificationSettings();
  if (!settings.enabled && !force) return false;

  const todayStr = new Date().toISOString().split('T')[0];
  if (settings.lastNotifiedDate === todayStr && !force) {
    return false;
  }

  const tasks = await getDueSpacedRepetitionTasks();
  if (!tasks.ankiPending && tasks.dueRevisionsCount === 0 && !force) {
    return false;
  }

  const messages: string[] = [];
  if (tasks.ankiPending && settings.notifyAnki) {
    messages.push('⚡ Anki Daily Review Pass');
  }
  if (tasks.dueRevisionsCount > 0 && settings.notifyRevisions) {
    messages.push(`📖 ${tasks.dueRevisionsCount} Scheduled Revisions (${tasks.dueRevisionNames.join(', ')}${tasks.dueRevisionsCount > 3 ? '...' : ''})`);
  }

  if (messages.length === 0 && !force) return false;

  const title = 'Atlas Spaced Repetition Due Today! 🎯';
  const body = messages.length > 0
    ? `Pending: ${messages.join(' | ')}. Keep up your streak!`
    : 'All caught up! Tap to review your study analytics.';

  // 1. Primary approach for Mobile Chrome / PWA / Android: ServiceWorkerRegistration.showNotification
  if ('serviceWorker' in navigator) {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500))
        ]);
      }

      if (!registration) {
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
        } catch (regErr) {
          console.warn('Failed to register fallback sw.js:', regErr);
        }
      }

      if (registration && registration.showNotification) {
        try {
          await registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: 'atlas-spaced-repetition',
            vibrate: [200, 100, 200],
          } as NotificationOptions);
          saveNotificationSettings({ lastNotifiedDate: todayStr });
          return true;
        } catch (iconError) {
          console.warn('showNotification failed with icon, retrying without icon:', iconError);
          await registration.showNotification(title, {
            body,
            tag: 'atlas-spaced-repetition',
            vibrate: [200, 100, 200],
          } as NotificationOptions);
          saveNotificationSettings({ lastNotifiedDate: todayStr });
          return true;
        }
      }
    } catch (e) {
      console.warn('Service worker showNotification failed:', e);
    }
  }

  // 2. Fallback for Desktop browsers where new Notification() constructor is allowed
  try {
    if (typeof Notification === 'function') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: 'atlas-spaced-repetition',
      });
      saveNotificationSettings({ lastNotifiedDate: todayStr });
      return true;
    }
  } catch (e) {
    console.warn('Direct Notification constructor unavailable or restricted on this browser:', e);
    return false;
  }
  return false;
}

/**
 * PWA Install Prompt store & listeners
 */
let deferredPromptEvent: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPromptEvent = e;
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
}

export function isPwaInstallable(): boolean {
  return !!deferredPromptEvent;
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPromptEvent) return false;
  deferredPromptEvent.prompt();
  const choiceResult = await deferredPromptEvent.userChoice;
  deferredPromptEvent = null;
  window.dispatchEvent(new CustomEvent('pwa-install-completed'));
  return choiceResult.outcome === 'accepted';
}
