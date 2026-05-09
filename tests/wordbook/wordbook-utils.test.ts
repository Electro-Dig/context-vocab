import { describe, expect, it } from 'vitest';
import {
  buildReviewQueue,
  buildSourceGroups,
  filterWordEntries,
  formatEntrySourceLabel,
  groupEntriesByDate,
  maskEntrySentence,
  removeEntryById,
  summarizeEntries
} from '../../src/wordbook/wordbook-utils';
import type { WordEntry } from '../../src/shared/types';

const now = '2026-05-07T00:00:00.000Z';

function entry(
  term: string,
  familiarity: WordEntry['familiarity'],
  updatedAt = now,
  createdAt = updatedAt,
  sourceUrl = 'https://example.com',
  sourceTitle = 'Example'
): WordEntry {
  return {
    id: `en:${term}`,
    term,
    normalizedTerm: term.toLowerCase(),
    language: 'en',
    partOfSpeech: 'n.',
    phonetic: '/test/',
    meaningInContext: `${term} 的语境义`,
    contextExplanation: `${term} 的解释`,
    originalSentence: `A sentence with ${term}.`,
    sourceUrl,
    sourceTitle,
    familiarity,
    encounterCount: 0,
    createdAt,
    updatedAt
  };
}

describe('wordbook helpers', () => {
  it('filters by term, meaning, sentence, and metadata case-insensitively', () => {
    const entries = [entry('commitment', 'unknown'), entry('take ownership', 'familiar')];

    expect(filterWordEntries(entries, 'COMMIT')).toHaveLength(1);
    expect(filterWordEntries(entries, '语境义')).toHaveLength(2);
    expect(filterWordEntries(entries, 'ownership')[0]?.term).toBe('take ownership');
    expect(filterWordEntries(entries, '/test/')).toHaveLength(2);
  });

  it('sorts filtered entries by newest update first', () => {
    const entries = [
      entry('old', 'unknown', '2026-05-06T00:00:00.000Z'),
      entry('new', 'known', '2026-05-07T00:00:00.000Z')
    ];

    expect(filterWordEntries(entries, '').map((item) => item.term)).toEqual(['new', 'old']);
  });

  it('summarizes familiarity counts', () => {
    expect(summarizeEntries([entry('a', 'unknown'), entry('b', 'familiar'), entry('c', 'known')])).toEqual({
      total: 3,
      unknown: 1,
      familiar: 1,
      known: 1
    });
  });

  it('groups entries by created date with today label', () => {
    const groups = groupEntriesByDate([
      entry('today', 'unknown', '2026-05-07T12:00:00.000Z', '2026-05-07T08:00:00.000Z'),
      entry('yesterday', 'unknown', '2026-05-06T12:00:00.000Z', '2026-05-06T08:00:00.000Z')
    ], new Date(2026, 4, 7, 20));

    expect(groups[0].title).toBe('5月7日 · 今天');
    expect(groups[0].entries.map((item) => item.term)).toEqual(['today']);
    expect(groups[1].title).toBe('5月6日');
  });

  it('summarizes long source titles into a compact label', () => {
    const item = {
      ...entry('navigator', 'unknown'),
      sourceTitle:
        'X 上的 Example Author：“A concise source title can still preserve enough context for review...”',
      sourceUrl: 'https://x.com/example/status/123'
    };

    const label = formatEntrySourceLabel(item, 36);
    expect(label).toContain('X 上的 Example Author');
    expect(label.endsWith('…')).toBe(true);
    expect(label.length).toBeLessThanOrEqual(36);
  });

  it('builds a review queue from unknown and familiar entries', () => {
    const queue = buildReviewQueue([
      entry('known', 'known', '2026-05-08T00:00:00.000Z'),
      entry('familiar', 'familiar', '2026-05-05T00:00:00.000Z'),
      entry('unknown', 'unknown', '2026-05-07T00:00:00.000Z')
    ]);

    expect(queue.map((item) => item.term)).toEqual(['unknown', 'familiar']);
  });

  it('masks the reviewed term in its original sentence', () => {
    const item = {
      ...entry('typewriter', 'unknown'),
      originalSentence: 'Claude wrote a typewriter reply.'
    };

    expect(maskEntrySentence(item)).toBe('Claude wrote a ____ reply.');
  });

  it('groups entries by source host for source browsing', () => {
    const groups = buildSourceGroups([
      entry('typewriter', 'unknown', '2026-05-08T13:00:00.000Z', now, 'https://x.com/a', '主页 / X'),
      entry('conference', 'unknown', '2026-05-08T13:02:00.000Z', now, 'https://x.com/b', 'Claude code conference mini vlog! / X'),
      entry('usage', 'known', '2026-05-07T00:00:00.000Z', now, 'https://example.com/post', 'Example')
    ]);

    expect(groups[0]).toMatchObject({
      key: 'x.com',
      host: 'x.com',
      count: 2,
      latestAt: '2026-05-08T13:02:00.000Z'
    });
    expect(groups[0].entries.map((item) => item.term)).toEqual(['conference', 'typewriter']);
  });

  it('removes an entry by id without touching the rest', () => {
    expect(removeEntryById([entry('keep', 'unknown'), entry('drop', 'unknown')], 'en:drop').map((item) => item.term)).toEqual([
      'keep'
    ]);
  });
});
