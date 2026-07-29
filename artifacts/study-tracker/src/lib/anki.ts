import { db } from '@/db/database';

// ── Anki Integration Utilities & Helpers (v1 Architecture) ──────────────────
//
// DESIGN PHILOSOPHY:
// 1. Deck Structure: One deck per subject ONLY (e.g., "Medicine" or "NEET PG::Medicine").
//    NO system subdecks. NO topic subdecks. NO duplicate decks.
// 2. Tags: Fully qualified tags formatted as `<Subject>::<System>` (e.g., `Medicine::Cardiology`).
// 3. Atlas Responsibilities: Syllabus hierarchy, study progress, notes, qbank, weak/strong analysis, revision.
// 4. Anki Responsibilities: Flashcard review engine, FSRS/SM-2 scheduling, review history.
// 5. Review Launch: Tapping a system opens Anki filtered to `deck:"<SubjectDeck>" tag:"<Subject>::<System>"`.

export interface AnkiConfig {
  rootDeck: string; // e.g. "" or "NEET PG"
  rootDeckName?: string; // alias
  separator: string; // e.g. "::"
  autoPromptAfterTask: boolean; // whether to suggest Anki after QBank/Revision
  promptReminders?: boolean; // alias
  confirmedDecks: Record<string, boolean>; // key: `${subjectName}` or `${subjectName}::${systemName}`
  customDeckUrls: Record<string, string>; // optional custom URL overrides
  globalAnkiConfirmed: boolean; // if true, all decks enabled globally
}

const STORAGE_KEY = 'atlas_anki_config';

export const DEFAULT_ANKI_CONFIG: AnkiConfig = {
  rootDeck: 'NEETPG',
  rootDeckName: 'NEETPG',
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
    const root = parsed.rootDeck ?? parsed.rootDeckName ?? 'NEETPG';
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
 * Sanitizes a single name string for use as an Anki tag segment.
 * Trims whitespace, collapses multiple spaces, and removes invalid tag characters.
 */
export function sanitizeTagSegment(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, '_') // Replace whitespace with underscore
    .replace(/["'\\/::]/g, '') // Strip quotes, backslashes, colons
    .replace(/[^a-zA-Z0-9_\-.]/g, ''); // Retain clean alphanumeric characters, underscores, hyphens
}

/**
 * Formats a subject and system into a fully qualified Anki tag: `<Subject>::<System>`
 * Example: ("Medicine", "Cardiology") -> "Medicine::Cardiology"
 */
export function formatSystemTag(subjectName: string, systemName?: string): string {
  const cleanSubject = sanitizeTagSegment(subjectName);
  if (!systemName || !systemName.trim()) {
    return cleanSubject;
  }
  const cleanSystem = sanitizeTagSegment(systemName);
  return `${cleanSubject}::${cleanSystem}`;
}

/**
 * Calculates the exact Subject Deck name for Anki.
 * Under the v1 architecture, there are ONLY Subject-level decks.
 * Example: "Medicine" (if no root deck) or "NEET PG::Medicine"
 */
export function formatDeckName(subjectName: string, _systemNameUnused?: string, customRoot?: string): string {
  const config = getAnkiConfig();
  const root = customRoot !== undefined ? customRoot : config.rootDeck;
  const sep = config.separator || '::';

  const parts: string[] = [];
  if (root && root.trim()) parts.push(root.trim());
  if (subjectName && subjectName.trim()) parts.push(subjectName.trim());

  return parts.join(sep);
}

/**
 * Constructs the Anki search query for filtered review.
 * Example: `deck:"Medicine" tag:"Medicine::Cardiology"` or `deck:"NEET PG::Medicine" tag:"Medicine::Cardiology"`
 */
export function formatAnkiSearchQuery(subjectName: string, systemName?: string, customRoot?: string): string {
  const deck = formatDeckName(subjectName, undefined, customRoot);
  if (!systemName || !systemName.trim()) {
    return `deck:"${deck}"`;
  }
  const tag = formatSystemTag(subjectName, systemName);
  return `deck:"${deck}" tag:"${tag}"`;
}

/**
 * Checks whether a deck has been confirmed/verified by the user.
 */
export function isDeckConfirmed(subjectName: string, systemName?: string): boolean {
  const config = getAnkiConfig();
  if (config.globalAnkiConfirmed) return true;

  const key = systemName ? `${subjectName}::${systemName}` : subjectName;
  return Boolean(config.confirmedDecks[key] || config.confirmedDecks[subjectName]);
}

/**
 * Marks a deck as confirmed in the setup workflow.
 */
export function setDeckConfirmed(subjectName: string, systemName?: string, confirmed = true) {
  const config = getAnkiConfig();
  const key = systemName ? `${subjectName}::${systemName}` : subjectName;
  const updatedConfirmed = { ...config.confirmedDecks, [key]: confirmed, [subjectName]: confirmed };
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
 * Smart Anki Launcher with Filtered Search Query support:
 * Opens Anki targeting: `deck:"<SubjectDeck>" tag:"System::<SystemName>"`
 */
export function launchAnkiDeck(
  subjectNameOrQuery: string,
  systemName?: string,
  fallbackToWeb = true
): { success: boolean; mode: string; searchQuery: string } {
  const config = getAnkiConfig();

  // Determine query
  let searchQuery = '';
  let targetDeck = '';

  if (systemName) {
    targetDeck = formatDeckName(subjectNameOrQuery);
    searchQuery = formatAnkiSearchQuery(subjectNameOrQuery, systemName);
  } else if (subjectNameOrQuery.includes('deck:') || subjectNameOrQuery.includes('tag:')) {
    searchQuery = subjectNameOrQuery;
    targetDeck = subjectNameOrQuery;
  } else {
    targetDeck = formatDeckName(subjectNameOrQuery);
    searchQuery = `deck:"${targetDeck}"`;
  }

  // Check custom URL override
  if (config.customDeckUrls[searchQuery] || config.customDeckUrls[targetDeck]) {
    const url = config.customDeckUrls[searchQuery] || config.customDeckUrls[targetDeck];
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true, mode: 'custom_url', searchQuery };
  }

  const encodedQuery = encodeURIComponent(searchQuery);

  // Detect Mobile OS
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  let primaryUrl = `anki://x-callback-url/search?query=${encodedQuery}`;
  if (isIOS) {
    primaryUrl = `ankimobile://x-callback-url/search?query=${encodedQuery}`;
  } else if (isAndroid) {
    primaryUrl = `ankidroid://search?query=${encodedQuery}`;
  }

  // Fallback direct deck launcher if search query scheme isn't handled by custom handlers
  const start = Date.now();
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  try {
    window.location.href = primaryUrl;
  } catch (err) {
    console.warn('Direct deep link failed, trying window.open:', err);
    window.open(primaryUrl, '_self');
  }

  setTimeout(() => {
    document.body.removeChild(iframe);
    if (Date.now() - start < 1800 && fallbackToWeb) {
      window.open(`https://ankiweb.net/decks?q=${encodeURIComponent(targetDeck)}`, '_blank', 'noopener,noreferrer');
    }
  }, 1000);

  return {
    success: true,
    mode: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
    searchQuery,
  };
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

// ── Subject-Only Anki Deck Hierarchy Helper (Manual Deck List) ───────────────

export async function getAnkiSubjectDeckList(customRoot?: string): Promise<{
  deckList: string[];
  deckCount: number;
}> {
  const rawSubjects = await db.subjects.toArray();
  const subjects = [...rawSubjects].sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));

  const config = getAnkiConfig();
  const root = customRoot !== undefined ? customRoot : (config.rootDeckName?.trim() || config.rootDeck?.trim() || '');

  const deckList: string[] = [];

  // 1. Add Master Root Deck if specified
  if (root && !deckList.includes(root)) {
    deckList.push(root);
  }

  // 2. Add Subject-Level Decks
  subjects.forEach(subject => {
    const subjectDeck = formatDeckName(subject.name, undefined, root);
    if (subjectDeck && !deckList.includes(subjectDeck)) {
      deckList.push(subjectDeck);
    }
  });

  return { deckList, deckCount: deckList.length };
}




