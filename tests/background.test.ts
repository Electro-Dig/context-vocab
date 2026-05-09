import { describe, expect, it, vi } from 'vitest';
import { handleRuntimeRequest } from '../src/background/index';
import { getWordEntries, saveSettings } from '../src/shared/storage';
import type { WordEntry } from '../src/shared/types';

vi.mock('../src/shared/deepseek-client', () => ({
  explainWithDeepSeek: vi.fn(async () => ({
    dictionaryMeaning: '承诺；投入；责任',
    meaningInContext: '长期投入',
    notThisMeaning: '并非单纯的口头答应。',
    contextExplanation: '强调持续投入。',
    memoryHook: 'commit = 把自己提交进去。',
    naturalTranslation: '这个项目需要长期投入。',
    passageTranslation: '这个项目需要长期投入。',
    detectedLanguage: 'en'
  }))
}));

const basePayload = {
  term: 'commitment',
  sentence: 'The project requires long-term commitment.',
  passageText: 'The project requires long-term commitment from everyone involved.',
  url: 'https://example.com',
  title: 'Example'
};

describe('handleRuntimeRequest', () => {
  it('explains selected terms without saving by default', async () => {
    await saveSettings({ deepseekApiKey: 'test-api-key', autoSaveOnExplain: false });
    const response = await handleRuntimeRequest({ type: 'EXPLAIN_SELECTION', payload: basePayload });

    expect(response).toHaveProperty('entry.meaningInContext', '长期投入');
    expect(response).toHaveProperty('entry.dictionaryMeaning', '承诺；投入；责任');
    expect(response).toHaveProperty('entry.passageText', basePayload.passageText);
    expect(response).toHaveProperty('entry.passageTranslation', '这个项目需要长期投入。');
    expect(response).toHaveProperty('saved', false);
    expect(await getWordEntries()).toHaveLength(0);
  });

  it('saves a draft entry only after SAVE_ENTRY', async () => {
    await saveSettings({ deepseekApiKey: 'test-api-key', autoSaveOnExplain: false });
    const response = (await handleRuntimeRequest({ type: 'EXPLAIN_SELECTION', payload: basePayload })) as {
      entry: WordEntry;
      saved: boolean;
    };

    await handleRuntimeRequest({ type: 'SAVE_ENTRY', payload: { entry: response.entry, familiarity: 'familiar' } });

    const savedEntries = await getWordEntries();
    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].familiarity).toBe('familiar');
  });

  it('can still auto-save when the setting is enabled', async () => {
    await saveSettings({ deepseekApiKey: 'test-api-key', autoSaveOnExplain: true });
    const response = await handleRuntimeRequest({ type: 'EXPLAIN_SELECTION', payload: basePayload });

    expect(response).toHaveProperty('saved', true);
    expect((await getWordEntries())[0].notThisMeaning).toBe('并非单纯的口头答应。');
  });

  it('deletes entries via DELETE_ENTRY', async () => {
    await saveSettings({ deepseekApiKey: 'test-api-key', autoSaveOnExplain: true });
    await handleRuntimeRequest({ type: 'EXPLAIN_SELECTION', payload: basePayload });
    await handleRuntimeRequest({ type: 'DELETE_ENTRY', payload: { id: 'en:commitment' } });
    expect(await getWordEntries()).toHaveLength(0);
  });
});
