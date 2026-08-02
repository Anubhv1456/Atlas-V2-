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
    console.warn('Notifications not supported in this browser.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
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

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: 'atlas-spaced-repetition',
      });
      saveNotificationSettings({ lastNotifiedDate: todayStr });
      return true;
    } catch (e) {
      console.warn('Service worker notification failed, falling back to Notification API', e);
    }
  }

  new Notification(title, {
    body,
    icon: '/logo.svg',
    tag: 'atlas-spaced-repetition',
  });

  saveNotificationSettings({ lastNotifiedDate: todayStr });
  return true;
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
