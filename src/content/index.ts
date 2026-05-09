import { showEntryCard, showErrorCard, showLoadingCard } from './impression-card';
import { shouldIgnoreSelectionMouseUp } from './dom-guards';
import { getSelectionContext } from './selection';
import { initializeHighlighter, removeSavedEntryHighlight, syncSavedEntryHighlight } from './highlighter';
import { getSettings } from '../shared/storage';
import type { Familiarity, WordEntry } from '../shared/types';

void initializeHighlighter().catch(() => undefined);

document.addEventListener('mouseup', async (event) => {
  if (shouldIgnoreSelectionMouseUp(event)) return;

  const context = getSelectionContext();
  if (!context) return;

  const settings = await getSettings();
  if (!settings.extensionEnabled) return;

  const mouse = event as MouseEvent;
  const requestStartedAt = performance.now();
  showLoadingCard(mouse.clientX, mouse.clientY, context.term);

  const response = (await chrome.runtime.sendMessage({
    type: 'EXPLAIN_SELECTION',
    payload: { ...context, url: location.href, title: document.title }
  })) as { entry?: WordEntry; saved?: boolean; cached?: boolean; error?: string };
  const elapsedMs = performance.now() - requestStartedAt;

  if (response.error || !response.entry) {
    showErrorCard(mouse.clientX, mouse.clientY, response.error || '未返回解析结果');
    return;
  }

  let entry = response.entry;
  let saved = Boolean(response.saved);
  if (saved) void syncSavedEntryHighlight(entry);

  showEntryCard(mouse.clientX, mouse.clientY, entry, {
    isSaved: saved,
    onSave: async (familiarity: Familiarity) => {
      const saveResponse = (await chrome.runtime.sendMessage({
        type: 'SAVE_ENTRY',
        payload: { entry, familiarity }
      })) as { entry?: WordEntry; saved?: boolean; error?: string };
      if (saveResponse.error) throw new Error(saveResponse.error);
      entry = saveResponse.entry || { ...entry, familiarity };
      saved = Boolean(saveResponse.saved);
      await syncSavedEntryHighlight(entry);
    },
    onUnsave: async () => {
      const deleteResponse = (await chrome.runtime.sendMessage({
        type: 'DELETE_ENTRY',
        payload: { id: entry.id }
      })) as { ok?: boolean; error?: string };
      if (deleteResponse.error) throw new Error(deleteResponse.error);
      saved = false;
      await removeSavedEntryHighlight(entry.id);
    },
    onFamiliarity: async (familiarity: Familiarity) => {
      if (!saved) return;
      await chrome.runtime.sendMessage({ type: 'UPDATE_FAMILIARITY', payload: { id: entry.id, familiarity } });
      entry = { ...entry, familiarity };
      await syncSavedEntryHighlight(entry);
    },
    timing: {
      elapsedMs,
      cached: Boolean(response.cached)
    },
    display: {
      showCurrentExample: settings.showCurrentExample,
      showMemoryHook: settings.showMemoryHook,
      showFamiliarityControl: settings.showFamiliarityControl,
      showConfusingMeaning: settings.showConfusingMeaning,
      showExtraPanel: settings.prepareExtraInfo
    }
  });
});
