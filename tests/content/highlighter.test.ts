import { describe, expect, it } from 'vitest';
import { computeMatchStats, highlightEntriesInRoot, removeEntryHighlightsInRoot } from '../../src/content/highlighter';
import type { WordEntry } from '../../src/shared/types';

const now = '2026-05-07T00:00:00.000Z';

function word(term: string, familiarity: WordEntry['familiarity'] = 'unknown'): WordEntry {
  return {
    id: `en:${term}`,
    term,
    normalizedTerm: term,
    language: 'en',
    meaningInContext: '释义',
    notThisMeaning: '不是误解意思',
    contextExplanation: '解释',
    memoryHook: '钩子',
    originalSentence: `${term} sentence`,
    sourceUrl: 'https://example.com',
    familiarity,
    encounterCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

describe('highlightEntriesInRoot', () => {
  it('highlights complete words and phrases in normal text', () => {
    document.body.innerHTML = '<p>The project requires long-term commitment and commitment.</p>';
    highlightEntriesInRoot(document.body, [word('long-term commitment'), word('commitment')]);
    expect([...document.querySelectorAll('.context-vocab-highlight')].map((el) => el.textContent)).toEqual([
      'long-term commitment',
      'commitment'
    ]);
  });

  it('does not highlight partial words', () => {
    document.body.innerHTML = '<p>This app is not an apple.</p>';
    highlightEntriesInRoot(document.body, [word('app')]);
    expect(document.querySelectorAll('.context-vocab-highlight')).toHaveLength(1);
    expect(document.querySelector('.context-vocab-highlight')?.textContent).toBe('app');
  });

  it('skips code and input-like areas', () => {
    document.body.innerHTML = '<pre>commitment</pre><textarea>commitment</textarea><p>commitment</p>';
    highlightEntriesInRoot(document.body, [word('commitment')]);
    expect(document.querySelectorAll('.context-vocab-highlight')).toHaveLength(1);
  });

  it('skips the active explanation card', () => {
    document.body.innerHTML = '<p>commitment outside.</p><div id="context-vocab-impression-card">commitment inside card</div>';
    highlightEntriesInRoot(document.body, [word('commitment')]);
    expect([...document.querySelectorAll('.context-vocab-highlight')].map((el) => el.textContent)).toEqual([
      'commitment'
    ]);
  });

  it('removes highlights for a single unsaved entry without changing page text', () => {
    document.body.innerHTML = '<p>commitment and ownership</p>';
    highlightEntriesInRoot(document.body, [word('commitment'), word('ownership')]);

    removeEntryHighlightsInRoot(document.body, 'en:commitment');

    expect(document.body.textContent).toBe('commitment and ownership');
    expect([...document.querySelectorAll('.context-vocab-highlight')].map((el) => el.textContent)).toEqual([
      'ownership'
    ]);
  });
});

describe('computeMatchStats', () => {
  it('counts matched entries by familiarity', () => {
    const stats = computeMatchStats('commitment plus ownership', [word('commitment'), word('ownership', 'familiar'), word('missing', 'known')]);
    expect(stats).toEqual({ total: 2, unknown: 1, familiar: 1, known: 0 });
  });
});
