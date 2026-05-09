import { explainWithDeepSeek } from '../shared/deepseek-client';
import { createEntryId, normalizeTerm } from '../shared/normalize';
import {
  deleteWordEntry,
  getSettings,
  getWordEntries,
  savePageMatchStats,
  updateFamiliarity,
  upsertWordEntry
} from '../shared/storage';
import type { Familiarity, RuntimeRequest, WordEntry } from '../shared/types';

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  void handleRuntimeRequest(request)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
  return true;
});

export async function handleRuntimeRequest(request: RuntimeRequest): Promise<unknown> {
  if (request.type === 'GET_HIGHLIGHT_ENTRIES') return { entries: await getWordEntries() };

  if (request.type === 'SAVE_ENTRY') {
    const entry = withFamiliarity(request.payload.entry, request.payload.familiarity ?? request.payload.entry.familiarity);
    await upsertWordEntry(entry);
    await updateFamiliarity(entry.id, entry.familiarity);
    return { entry, saved: true };
  }

  if (request.type === 'UPDATE_FAMILIARITY') {
    await updateFamiliarity(request.payload.id, request.payload.familiarity);
    return { ok: true };
  }

  if (request.type === 'DELETE_ENTRY') {
    await deleteWordEntry(request.payload.id);
    return { ok: true };
  }

  if (request.type === 'PAGE_MATCH_STATS') {
    await savePageMatchStats(request.payload);
    return { ok: true };
  }

  if (request.type === 'EXPLAIN_SELECTION') {
    const settings = await getSettings();
    if (!settings.extensionEnabled) throw new Error('Context Vocab is disabled');

    const existing = await findExistingEntry(request.payload.term);
    if (settings.preferCachedExplanations && existing) {
      return { entry: existing, saved: true, cached: true };
    }

    if (!settings.aiEnabled) throw new Error('AI explanation is disabled');

    const explanation = await explainWithDeepSeek(
      {
        term: request.payload.term,
        sentence: request.payload.sentence,
        passageText: request.payload.passageText,
        surroundingText: settings.contextMode === 'neighboring-sentences' ? request.payload.surroundingText : undefined,
        includePassageTranslation: settings.prepareExtraInfo
      },
      settings
    );

    const now = new Date().toISOString();
    const id = createEntryId(explanation.detectedLanguage, request.payload.term);
    const entry: WordEntry = {
      id,
      term: request.payload.term,
      normalizedTerm: normalizeTerm(request.payload.term),
      language: explanation.detectedLanguage,
      dictionaryMeaning: explanation.dictionaryMeaning,
      meaningInContext: explanation.meaningInContext,
      notThisMeaning: explanation.notThisMeaning,
      contextExplanation: explanation.contextExplanation,
      memoryHook: explanation.memoryHook,
      originalSentence: request.payload.sentence,
      passageText: request.payload.passageText || request.payload.sentence,
      passageTranslation: explanation.passageTranslation,
      naturalTranslation: explanation.naturalTranslation,
      sourceUrl: request.payload.url,
      sourceTitle: request.payload.title,
      familiarity: existing?.familiarity ?? 'unknown',
      encounterCount: existing?.encounterCount ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    if (settings.autoSaveOnExplain) {
      await saveEntry(entry, entry.familiarity);
      return { entry, saved: true, cached: false };
    }

    return { entry, saved: false, cached: false };
  }

  return { error: 'Unknown request type' };
}

async function findExistingEntry(term: string): Promise<WordEntry | undefined> {
  const normalizedTerm = normalizeTerm(term);
  return (await getWordEntries()).find((entry) => entry.normalizedTerm === normalizedTerm);
}

function withFamiliarity(entry: WordEntry, familiarity: Familiarity): WordEntry {
  const now = new Date().toISOString();
  return { ...entry, familiarity, updatedAt: now, createdAt: entry.createdAt || now };
}

async function saveEntry(entry: WordEntry, familiarity: Familiarity): Promise<void> {
  const next = withFamiliarity(entry, familiarity);
  await upsertWordEntry(next);
  await updateFamiliarity(next.id, familiarity);
}

