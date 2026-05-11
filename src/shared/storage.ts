import { DEFAULT_DEEPSEEK_ENDPOINT, DEFAULT_DEEPSEEK_MODEL, STORAGE_KEYS } from './constants';
import type { AppSettings, Familiarity, PageMatchStats, WordEntry } from './types';

const CURRENT_CARD_DISPLAY_VERSION = 2;
const CURRENT_SETTINGS_VERSION = 3;

export const DEFAULT_SETTINGS: AppSettings = {
  extensionEnabled: true,
  aiEnabled: true,
  provider: 'deepseek',
  deepseekApiKey: '',
  deepseekEndpoint: DEFAULT_DEEPSEEK_ENDPOINT,
  deepseekModel: DEFAULT_DEEPSEEK_MODEL,
  explanationLanguage: 'zh-CN',
  contextMode: 'sentence',
  temperature: 0.2,
  maxOutputTokens: 240,
  autoSaveOnExplain: false,
  highlightEnabled: true,
  preferCachedExplanations: true,
  showCurrentExample: false,
  showMemoryHook: true,
  showFamiliarityControl: false,
  showConfusingMeaning: true,
  prepareExtraInfo: false,
  cardDisplayVersion: CURRENT_CARD_DISPLAY_VERSION,
  settingsVersion: CURRENT_SETTINGS_VERSION
};

async function getKey<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get({ [key]: fallback });
  return result[key] as T;
}

async function setKey<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await getKey<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS, {});
  const next = { ...DEFAULT_SETTINGS, ...stored };

  if ((stored.cardDisplayVersion ?? 0) < CURRENT_CARD_DISPLAY_VERSION) {
    next.showCurrentExample = DEFAULT_SETTINGS.showCurrentExample;
    next.showFamiliarityControl = DEFAULT_SETTINGS.showFamiliarityControl;
    next.cardDisplayVersion = CURRENT_CARD_DISPLAY_VERSION;
    await setKey(STORAGE_KEYS.SETTINGS, next);
  }

  if ((stored.settingsVersion ?? 0) < CURRENT_SETTINGS_VERSION) {
    if (!stored.maxOutputTokens || stored.maxOutputTokens === 360) {
      next.maxOutputTokens = DEFAULT_SETTINGS.maxOutputTokens;
    }
    next.settingsVersion = CURRENT_SETTINGS_VERSION;
    await setKey(STORAGE_KEYS.SETTINGS, next);
  }

  return next;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch };
  await setKey(STORAGE_KEYS.SETTINGS, next);
  return next;
}

export async function getWordEntries(): Promise<WordEntry[]> {
  return getKey<WordEntry[]>(STORAGE_KEYS.WORD_ENTRIES, []);
}

export async function upsertWordEntry(entry: WordEntry): Promise<void> {
  const entries = await getWordEntries();
  const index = entries.findIndex((item) => item.id === entry.id);
  const next = [...entries];
  if (index >= 0) {
    next[index] = {
      ...next[index],
      ...entry,
      familiarity: next[index].familiarity,
      encounterCount: Math.max(next[index].encounterCount, entry.encounterCount)
    };
  } else {
    next.unshift(entry);
  }
  await setKey(STORAGE_KEYS.WORD_ENTRIES, next);
}

export async function updateFamiliarity(id: string, familiarity: Familiarity): Promise<void> {
  const entries = await getWordEntries();
  await setKey(
    STORAGE_KEYS.WORD_ENTRIES,
    entries.map((entry) =>
      entry.id === id ? { ...entry, familiarity, updatedAt: new Date().toISOString() } : entry
    )
  );
}

export async function deleteWordEntry(id: string): Promise<void> {
  const entries = await getWordEntries();
  await setKey(
    STORAGE_KEYS.WORD_ENTRIES,
    entries.filter((entry) => entry.id !== id)
  );
}

export async function savePageMatchStats(stats: Omit<PageMatchStats, 'updatedAt'>): Promise<PageMatchStats> {
  const next: PageMatchStats = { ...stats, updatedAt: new Date().toISOString() };
  const allStats = await getKey<Record<string, PageMatchStats>>(STORAGE_KEYS.PAGE_MATCH_STATS, {});
  await setKey(STORAGE_KEYS.PAGE_MATCH_STATS, { ...allStats, [stats.url]: next });
  return next;
}

export async function getPageMatchStats(url: string): Promise<PageMatchStats | undefined> {
  const allStats = await getKey<Record<string, PageMatchStats>>(STORAGE_KEYS.PAGE_MATCH_STATS, {});
  return allStats[url];
}
