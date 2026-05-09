import { describe, expect, it } from 'vitest';
import { deleteWordEntry, getSettings, getWordEntries, saveSettings, updateFamiliarity, upsertWordEntry } from '../../src/shared/storage';
import { DEFAULT_DEEPSEEK_MODEL, STORAGE_KEYS } from '../../src/shared/constants';
import type { WordEntry } from '../../src/shared/types';

const now = '2026-05-07T00:00:00.000Z';
const entry: WordEntry = {
  id: 'en:commitment',
  term: 'commitment',
  normalizedTerm: 'commitment',
  language: 'en',
  dictionaryMeaning: '承诺；投入；责任',
  meaningInContext: '长期投入',
  contextExplanation: '强调持续投入时间和精力。',
  originalSentence: 'The project requires long-term commitment.',
  sourceUrl: 'https://example.com',
  familiarity: 'unknown',
  encounterCount: 0,
  createdAt: now,
  updatedAt: now
};

describe('storage', () => {
  it('returns DeepSeek defaults and module display defaults', async () => {
    const settings = await getSettings();
    expect(settings.deepseekModel).toBe(DEFAULT_DEEPSEEK_MODEL);
    expect(settings.autoSaveOnExplain).toBe(false);
    expect(settings.highlightEnabled).toBe(true);
    expect(settings.showCurrentExample).toBe(false);
    expect(settings.showMemoryHook).toBe(true);
    expect(settings.showFamiliarityControl).toBe(false);
    expect(settings.showConfusingMeaning).toBe(true);
    expect(settings.prepareExtraInfo).toBe(false);
    expect(settings.cardDisplayVersion).toBe(2);
  });

  it('migrates older saved display defaults to the concise card', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: {
        deepseekApiKey: 'existing-test-api-key',
        showCurrentExample: true,
        showFamiliarityControl: true
      }
    });

    const settings = await getSettings();
    const stored = (await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)) as Record<string, Partial<typeof settings>>;
    const storedSettings = stored[STORAGE_KEYS.SETTINGS];

    expect(settings.deepseekApiKey).toBe('existing-test-api-key');
    expect(settings.showCurrentExample).toBe(false);
    expect(settings.showFamiliarityControl).toBe(false);
    expect(settings.cardDisplayVersion).toBe(2);
    expect(storedSettings.showCurrentExample).toBe(false);
    expect(storedSettings.showFamiliarityControl).toBe(false);
  });

  it('saves settings and word entries', async () => {
    await saveSettings({ deepseekApiKey: 'test-api-key', autoSaveOnExplain: true, showMemoryHook: false });
    await upsertWordEntry(entry);
    await updateFamiliarity('en:commitment', 'familiar');
    await deleteWordEntry('en:commitment');
    expect((await getSettings()).deepseekApiKey).toBe('test-api-key');
    expect((await getSettings()).showMemoryHook).toBe(false);
    expect(await getWordEntries()).toHaveLength(0);
  });
});
