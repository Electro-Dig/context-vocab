import { getSettings, savePageMatchStats } from '../shared/storage';
import type { WordEntry } from '../shared/types';

const SKIP_SELECTOR =
  'script, style, textarea, input, button, select, option, pre, code, [contenteditable="true"], #context-vocab-impression-card, .context-vocab-highlight';

interface TextMatch {
  start: number;
  end: number;
  entry: WordEntry;
}

let savedEntries: WordEntry[] = [];
let visibleEntries: WordEntry[] = [];
let observer: MutationObserver | undefined;

export async function initializeHighlighter(): Promise<void> {
  const [settings, response] = await Promise.all([
    getSettings(),
    chrome.runtime.sendMessage({ type: 'GET_HIGHLIGHT_ENTRIES' }) as Promise<{ entries?: WordEntry[] }>
  ]);
  const entries = response?.entries || [];
  setSavedEntries(entries);
  await recordCurrentPageMatchStats();

  if (!settings.extensionEnabled || !settings.highlightEnabled) return;

  highlightEntriesInRoot(document.body, visibleEntries);

  observer?.disconnect();
  observer = new MutationObserver(() => {
    window.setTimeout(() => highlightEntriesInRoot(document.body, visibleEntries), 250);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export async function syncSavedEntryHighlight(entry: WordEntry): Promise<void> {
  const settings = await getSettings();
  setSavedEntries(upsertEntry(savedEntries, entry));
  removeEntryHighlightsInRoot(document.body, entry.id);
  await recordCurrentPageMatchStats();

  if (!settings.extensionEnabled || !settings.highlightEnabled || entry.familiarity === 'known') return;
  highlightEntriesInRoot(document.body, [entry]);
}

export async function removeSavedEntryHighlight(entryId: string): Promise<void> {
  setSavedEntries(savedEntries.filter((entry) => entry.id !== entryId));
  removeEntryHighlightsInRoot(document.body, entryId);
  await recordCurrentPageMatchStats();
}

export function highlightEntriesInRoot(root: ParentNode, entries: WordEntry[]): void {
  if (entries.length === 0) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => highlightTextNode(node, entries));
}

export function removeEntryHighlightsInRoot(root: ParentNode, entryId: string): void {
  root.querySelectorAll<HTMLElement>('.context-vocab-highlight').forEach((highlight) => {
    if (highlight.dataset.entryId !== entryId) return;
    const parent = highlight.parentNode;
    highlight.replaceWith(document.createTextNode(highlight.textContent || ''));
    parent?.normalize();
  });
}

export function computeMatchStats(
  pageText: string,
  entries: WordEntry[]
): { total: number; unknown: number; familiar: number; known: number } {
  const matched = new Set<string>();
  for (const entry of entries) {
    if (findMatches(pageText, [entry]).length > 0) matched.add(entry.id);
  }

  const matchedEntries = entries.filter((entry) => matched.has(entry.id));
  return {
    total: matchedEntries.length,
    unknown: matchedEntries.filter((entry) => entry.familiarity === 'unknown').length,
    familiar: matchedEntries.filter((entry) => entry.familiarity === 'familiar').length,
    known: matchedEntries.filter((entry) => entry.familiarity === 'known').length
  };
}

function highlightTextNode(node: Text, entries: WordEntry[]): void {
  const text = node.textContent || '';
  const matches = findMatches(text, entries);
  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const match of matches) {
    fragment.append(document.createTextNode(text.slice(cursor, match.start)));
    const span = document.createElement('span');
    span.className = 'context-vocab-highlight';
    span.dataset.entryId = match.entry.id;
    span.dataset.familiarity = match.entry.familiarity;
    span.title = match.entry.memoryHook
      ? `${match.entry.meaningInContext}\n${match.entry.memoryHook}`
      : match.entry.meaningInContext;
    span.textContent = text.slice(match.start, match.end);
    fragment.append(span);
    cursor = match.end;
  }
  fragment.append(document.createTextNode(text.slice(cursor)));
  node.parentNode?.replaceChild(fragment, node);
}

function findMatches(text: string, entries: WordEntry[]): TextMatch[] {
  const matches: TextMatch[] = [];
  const sorted = [...entries].sort((a, b) => b.normalizedTerm.length - a.normalizedTerm.length);

  for (const entry of sorted) {
    const needle = entry.normalizedTerm.toLowerCase();
    if (!needle) continue;
    const lowerText = text.toLowerCase();
    let searchStart = 0;
    while (searchStart < lowerText.length) {
      const start = lowerText.indexOf(needle, searchStart);
      if (start < 0) break;
      const end = start + needle.length;
      if (hasWordBoundary(lowerText, start, end) && !matches.some((old) => rangesOverlap(start, end, old.start, old.end))) {
        matches.push({ start, end, entry });
      }
      searchStart = end;
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function hasWordBoundary(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1] : '';
  const after = end < text.length ? text[end] : '';
  return !isAsciiLetter(before) && !isAsciiLetter(after);
}

function isAsciiLetter(char: string): boolean {
  return /^[a-z]$/i.test(char);
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function setSavedEntries(entries: WordEntry[]): void {
  savedEntries = [...entries];
  visibleEntries = savedEntries.filter((entry) => entry.familiarity !== 'known');
}

function upsertEntry(entries: WordEntry[], entry: WordEntry): WordEntry[] {
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index < 0) return [entry, ...entries];
  return entries.map((item) => (item.id === entry.id ? entry : item));
}

async function recordCurrentPageMatchStats(): Promise<void> {
  const pageText = document.body.innerText || document.body.textContent || '';
  const stats = computeMatchStats(pageText, savedEntries);
  await savePageMatchStats({ url: location.href, ...stats });
}
