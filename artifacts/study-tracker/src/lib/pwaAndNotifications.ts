import { db } from '@/db';
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
  const allSystems = await db.systems.toArray().then(res => res.filter(s => !s.deletedAt));
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
 * Helper to dispatch a single browser / SW notification
 */
async function dispatchLocalNotification(title: string, options: NotificationOptions): Promise<boolean> {
  // 1. Primary approach for Mobile Chrome / PWA / Android: ServiceWorkerRegistration.showNotification
  if ('serviceWorker' in navigator) {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500)),
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
          await registration.showNotification(title, options);
          return true;
        } catch (iconError) {
          console.warn('showNotification failed with options, retrying without icon:', iconError);
          const { icon, badge, ...simplified } = options as any;
          await registration.showNotification(title, simplified);
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
      new Notification(title, options);
      return true;
    }
  } catch (e) {
    console.warn('Direct Notification constructor unavailable or restricted on this browser:', e);
  }
  return false;
}

/**
 * Triggers separate local browser notifications for Anki daily reviews and scheduled system revisions.
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

  const notificationsToSend: Array<{ title: string; body: string; tag: string }> = [];

  // 1. Separate Anki Notification
  if (settings.notifyAnki) {
    if (tasks.ankiPending) {
      notificationsToSend.push({
        title: '⚡ Anki Daily Review Pass',
        body: "Today's Anki flashcard review is pending. Tap to launch your decks and maintain your streak!",
        tag: 'atlas-anki-notification',
      });
    } else if (force) {
      notificationsToSend.push({
        title: '⚡ Anki Daily Review Pass',
        body: "Today's Anki review is complete. (Test Notification)",
        tag: 'atlas-anki-notification',
      });
    }
  }

  // 2. Separate System Revision Notification
  if (settings.notifyRevisions) {
    if (tasks.dueRevisionsCount > 0) {
      const topicList = tasks.dueRevisionNames.join(', ');
      notificationsToSend.push({
        title: '📖 Scheduled Topic Revisions Due',
        body: `${tasks.dueRevisionsCount} scheduled revision${tasks.dueRevisionsCount > 1 ? 's' : ''} due today: ${topicList}${tasks.dueRevisionsCount > 3 ? '...' : ''}. Tap to review!`,
        tag: 'atlas-revisions-notification',
      });
    } else if (force) {
      notificationsToSend.push({
        title: '📖 Scheduled Topic Revisions Due',
        body: 'All scheduled revisions are up to date! (Test Notification)',
        tag: 'atlas-revisions-notification',
      });
    }
  }

  if (notificationsToSend.length === 0) {
    return false;
  }

  let sentCount = 0;
  for (const notif of notificationsToSend) {
    const sent = await dispatchLocalNotification(notif.title, {
      body: notif.body,
      tag: notif.tag,
      icon: '/logo.svg',
      badge: '/logo.svg',
      vibrate: [200, 100, 200],
    } as NotificationOptions);
    if (sent) sentCount++;
  }

  if (sentCount > 0) {
    saveNotificationSettings({ lastNotifiedDate: todayStr });
  }

  return sentCount > 0;
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
