import { db } from '@/db/database';

// ── Anki Integration Utilities & Helpers ─────────────────────────────────────

export interface AnkiConfig {
  rootDeck: string; // e.g. "" or "NEET PG"
  rootDeckName?: string; // alias
  separator: string; // e.g. "::"
  autoPromptAfterTask: boolean; // whether to suggest Anki after QBank/Revision
  promptReminders?: boolean; // alias
  confirmedDecks: Record<string, boolean>; // key: `${subjectName}::${systemName}` or `${subjectName}`
  customDeckUrls: Record<string, string>; // optional custom URL overrides
  globalAnkiConfirmed: boolean; // if true, all decks enabled globally
}

const STORAGE_KEY = 'atlas_anki_config';

export const DEFAULT_ANKI_CONFIG: AnkiConfig = {
  rootDeck: '',
  rootDeckName: '',
  separator: '::',
  autoPromptAfterTask: true,
  promptReminders: true,
  confirmedDecks: {},
  customDeckUrls: {},
  globalAnkiConfirmed: false,
};

export function getAnkiConfig(): AnkiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ANKI_CONFIG;
    const parsed = JSON.parse(raw);
    const root = parsed.rootDeck ?? parsed.rootDeckName ?? '';
    const prompt = parsed.autoPromptAfterTask ?? parsed.promptReminders ?? true;
    return {
      ...DEFAULT_ANKI_CONFIG,
      ...parsed,
      rootDeck: root,
      rootDeckName: root,
      autoPromptAfterTask: prompt,
      promptReminders: prompt,
    };
  } catch (e) {
    console.error('Failed to parse Anki config:', e);
    return DEFAULT_ANKI_CONFIG;
  }
}

export function saveAnkiConfig(config: Partial<AnkiConfig>): AnkiConfig {
  const current = getAnkiConfig();
  const root = config.rootDeck ?? config.rootDeckName ?? current.rootDeck;
  const prompt = config.autoPromptAfterTask ?? config.promptReminders ?? current.autoPromptAfterTask;

  const updated: AnkiConfig = {
    ...current,
    ...config,
    rootDeck: root,
    rootDeckName: root,
    autoPromptAfterTask: prompt,
    promptReminders: prompt,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event so reactive components update immediately
    window.dispatchEvent(new CustomEvent('anki-config-updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save Anki config:', e);
  }
  return updated;
}

/**
 * Calculates the exact Anki deck name for a subject and optional system.
 * Example: "Medicine::Cardiology" (if no root deck) or "NEET PG::Medicine::Cardiology"
 */
export function formatDeckName(subjectName: string, systemName?: string, customRoot?: string): string {
  const config = getAnkiConfig();
  const root = customRoot !== undefined ? customRoot : config.rootDeck;
  const sep = config.separator || '::';

  const parts: string[] = [];
  if (root && root.trim()) parts.push(root.trim());
  if (subjectName && subjectName.trim()) parts.push(subjectName.trim());
  if (systemName && systemName.trim()) parts.push(systemName.trim());

  return parts.join(sep);
}

/**
 * Checks whether a deck has been confirmed/verified by the user.
 */
export function isDeckConfirmed(subjectName: string, systemName?: string): boolean {
  const config = getAnkiConfig();
  if (config.globalAnkiConfirmed) return true;

  const key = systemName ? `${subjectName}::${systemName}` : subjectName;
  return Boolean(config.confirmedDecks[key]);
}

/**
 * Marks a deck as confirmed in the setup workflow.
 */
export function setDeckConfirmed(subjectName: string, systemName?: string, confirmed = true) {
  const config = getAnkiConfig();
  const key = systemName ? `${subjectName}::${systemName}` : subjectName;
  const updatedConfirmed = { ...config.confirmedDecks, [key]: confirmed };
  saveAnkiConfig({ confirmedDecks: updatedConfirmed });
}

/**
 * Marks all systems under a subject as confirmed in one step.
 */
export function setSubjectDecksConfirmed(subjectName: string, systemNames: string[], confirmed = true) {
  const config = getAnkiConfig();
  const updatedConfirmed = { ...config.confirmedDecks };
  updatedConfirmed[subjectName] = confirmed;
  systemNames.forEach(sys => {
    updatedConfirmed[`${subjectName}::${sys}`] = confirmed;
  });
  saveAnkiConfig({ confirmedDecks: updatedConfirmed });
}

/**
 * Smart Anki Launcher:
 * Tries custom URL if provided, or deep link schemes (anki:// or ankimobile:// or ankidroid://),
 * and falls back to opening AnkiWeb decks.
 */
export function launchAnkiDeck(deckName: string, fallbackToWeb = true): { success: boolean; mode: string } {
  const encodedDeck = encodeURIComponent(deckName);

  // Check if custom URL override exists
  const config = getAnkiConfig();
  if (config.customDeckUrls[deckName]) {
    window.open(config.customDeckUrls[deckName], '_blank', 'noopener,noreferrer');
    return { success: true, mode: 'custom_url' };
  }

  // Detect iOS / Android for deep linking
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  let primaryUrl = `anki://x-callback-url/selectdeck?deck=${encodedDeck}`;
  if (isIOS) {
    primaryUrl = `ankimobile://x-callback-url/selectdeck?deck=${encodedDeck}`;
  } else if (isAndroid) {
    primaryUrl = `ankidroid://selectdeck?deck=${encodedDeck}`;
  }

  // Try opening protocol
  const start = Date.now();
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  try {
    // Attempt location redirect for deep link
    window.location.href = primaryUrl;
  } catch (err) {
    console.warn('Direct deep link failed, trying window.open:', err);
    window.open(primaryUrl, '_self');
  }

  // If user stays on page after timeout, trigger fallback if requested
  setTimeout(() => {
    document.body.removeChild(iframe);
    // If browser didn't blur/leave, open AnkiWeb or prompt
    if (Date.now() - start < 1800 && fallbackToWeb) {
      window.open(`https://ankiweb.net/decks?q=${encodedDeck}`, '_blank', 'noopener,noreferrer');
    }
  }, 1000);

  return { success: true, mode: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop' };
}

// ── Daily Anki Review Pass State Management ──────────────────────────────────

export interface DailyAnkiPassState {
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
}

export function getDailyAnkiPass(dateStr?: string): DailyAnkiPassState {
  const today = dateStr || new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem(`atlas_daily_anki_pass_${today}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse Daily Anki Pass:', e);
  }
  return { date: today, completed: false };
}

export function toggleDailyAnkiPass(dateStr?: string): DailyAnkiPassState {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const current = getDailyAnkiPass(today);
  const updated: DailyAnkiPassState = {
    date: today,
    completed: !current.completed,
    completedAt: !current.completed ? new Date().toISOString() : undefined,
  };
  try {
    localStorage.setItem(`atlas_daily_anki_pass_${today}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('daily-anki-pass-updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save Daily Anki Pass:', e);
  }
  return updated;
}

// ── Anki Deck Hierarchy Exporter (No Cards Created) ─────────────────────────

export async function generateAnkiDeckHierarchyText(customRoot?: string): Promise<{
  text: string;
  deckCount: number;
  deckList: string[];
}> {
  // Fix: Dexie store does not index 'order', so we fetch and sort in memory
  const rawSubjects = await db.subjects.toArray();
  const subjects = [...rawSubjects].sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));

  const rawSystems = await db.systems.toArray();
  const systems = [...rawSystems].sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));

  const config = getAnkiConfig();
  const root = customRoot !== undefined ? customRoot : (config.rootDeckName?.trim() || config.rootDeck?.trim() || '');

  const deckList: string[] = [];

  // 1. Add Root Deck if specified
  if (root && !deckList.includes(root)) {
    deckList.push(root);
  }

  // 2. Add Subject and System Decks
  subjects.forEach(subject => {
    // Subject parent deck name
    const subjectDeck = formatDeckName(subject.name, undefined, root);
    if (subjectDeck && !deckList.includes(subjectDeck)) {
      deckList.push(subjectDeck);
    }

    // System subdecks
    const subjectSystems = systems.filter(s => s.subjectId === subject.id);
    subjectSystems.forEach(sys => {
      const systemDeck = formatDeckName(subject.name, sys.name, root);
      if (systemDeck && !deckList.includes(systemDeck)) {
        deckList.push(systemDeck);
      }
    });
  });

  // Anki deck import directive format
  let fileContent = `#separator:tab\n#html:true\n#tags:AtlasDeckStructure\n`;
  deckList.forEach(deck => {
    fileContent += `#deck:${deck}\n`;
  });

  return { text: fileContent, deckCount: deckList.length, deckList };
}

export async function downloadAnkiDeckHierarchyFile(customRoot?: string): Promise<{ count: number; filename: string }> {
  const { text, deckCount } = await generateAnkiDeckHierarchyText(customRoot);
  const filename = `atlas-anki-deck-hierarchy.txt`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { count: deckCount, filename };
}

/**
 * Sends createDeck calls directly to local Anki Desktop via AnkiConnect API (http://127.0.0.1:8765).
 * Creates empty decks in Anki automatically with ZERO cards.
 */
export async function syncDecksToAnkiConnect(deckList: string[]): Promise<{
  success: boolean;
  createdCount: number;
  error?: string;
}> {
  try {
    let createdCount = 0;

    for (const deck of deckList) {
      const response = await fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createDeck',
          version: 6,
          params: { deck },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.result !== null) {
        createdCount++;
      }
    }

    return { success: true, createdCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('AnkiConnect sync failed:', message);
    return {
      success: false,
      createdCount: 0,
      error: message.includes('Failed to fetch')
        ? 'AnkiConnect local service not detected. Make sure Anki Desktop is running with the AnkiConnect add-on (code 2055492159).'
        : message,
    };
  }
}


