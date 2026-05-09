import type { Familiarity, WordEntry } from '../shared/types';

export interface WordbookSummary {
  total: number;
  unknown: number;
  familiar: number;
  known: number;
}

export interface WordbookDateGroup {
  title: string;
  dateKey: string;
  entries: WordEntry[];
}

export interface SourceGroup {
  key: string;
  host: string;
  label: string;
  count: number;
  latestAt: string;
  entries: WordEntry[];
}

export const FAMILIARITY_LABELS: Record<Familiarity, string> = {
  unknown: '初识',
  familiar: '识别',
  known: '掌握'
};

export function filterWordEntries(entries: WordEntry[], query: string): WordEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  const sorted = [...entries].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  if (!normalizedQuery) return sorted;

  return sorted.filter((entry) => {
    const searchable = [
      entry.term,
      entry.normalizedTerm,
      entry.partOfSpeech,
      entry.phonetic,
      entry.dictionaryMeaning,
      entry.meaningInContext,
      entry.notThisMeaning,
      entry.contextExplanation,
      entry.memoryHook,
      entry.originalSentence,
      entry.naturalTranslation,
      entry.sourceTitle,
      entry.sourceUrl
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function summarizeEntries(entries: WordEntry[]): WordbookSummary {
  return entries.reduce<WordbookSummary>(
    (summary, entry) => ({ ...summary, [entry.familiarity]: summary[entry.familiarity] + 1 }),
    { total: entries.length, unknown: 0, familiar: 0, known: 0 }
  );
}

export function groupEntriesByDate(entries: WordEntry[], now = new Date()): WordbookDateGroup[] {
  const sorted = filterWordEntries(entries, '');
  const todayKey = dateKey(now);
  const groups = new Map<string, WordEntry[]>();

  for (const entry of sorted) {
    const key = dateKey(new Date(entry.createdAt));
    groups.set(key, [...(groups.get(key) || []), entry]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupedEntries]) => ({
      dateKey: key,
      title: `${formatDateTitle(key)}${key === todayKey ? ' · 今天' : ''}`,
      entries: groupedEntries
    }));
}

export function formatEntrySourceLabel(entry: WordEntry, maxLength = 72): string {
  const label = compactText(entry.sourceTitle || getHostname(entry.sourceUrl));
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(1, maxLength - 1))}…`;
}

export function buildReviewQueue(entries: WordEntry[], limit = 5): WordEntry[] {
  const familiarityRank: Record<Familiarity, number> = { unknown: 0, familiar: 1, known: 2 };
  return filterWordEntries(entries, '')
    .filter((entry) => entry.familiarity !== 'known')
    .sort((a, b) => familiarityRank[a.familiarity] - familiarityRank[b.familiarity] || Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
    .slice(0, limit);
}

export function maskEntrySentence(entry: WordEntry): string {
  const sentence = entry.originalSentence.trim();
  if (!sentence) return '';

  const index = sentence.toLowerCase().indexOf(entry.term.toLowerCase());
  if (index < 0) return sentence;
  return `${sentence.slice(0, index)}____${sentence.slice(index + entry.term.length)}`;
}

export function buildSourceGroups(entries: WordEntry[]): SourceGroup[] {
  const groups = new Map<string, WordEntry[]>();

  for (const entry of entries) {
    const key = getHostname(entry.sourceUrl);
    groups.set(key, [...(groups.get(key) || []), entry]);
  }

  return [...groups.entries()]
    .map(([key, groupedEntries]) => {
      const sortedEntries = filterWordEntries(groupedEntries, '');
      const latest = sortedEntries[0];
      return {
        key,
        host: key,
        label: latest ? formatEntrySourceLabel(latest, 42) : key,
        count: sortedEntries.length,
        latestAt: latest?.updatedAt || '',
        entries: sortedEntries
      };
    })
    .sort((a, b) => b.count - a.count || b.latestAt.localeCompare(a.latestAt));
}

export function removeEntryById(entries: WordEntry[], id: string): WordEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function formatDateTitle(key: string): string {
  const [, month, day] = key.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
