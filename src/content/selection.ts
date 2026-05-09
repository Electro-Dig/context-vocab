export interface SelectionContext {
  term: string;
  sentence: string;
  passageText: string;
  surroundingText?: string;
}

export function isValidSelectedTerm(term: string): boolean {
  const trimmed = term.trim();
  return trimmed.length > 0 && trimmed.length <= 80 && !/[\r\n]/.test(trimmed);
}

export function extractSentenceAroundSelection(containerText: string, selectedTerm: string): string {
  const normalizedText = containerText.replace(/\s+/g, ' ').trim();
  const index = normalizedText.toLowerCase().indexOf(selectedTerm.trim().toLowerCase());
  if (index < 0) return normalizedText.slice(0, 240);

  const sentenceBoundaryChars = ['.', '!', '?', '。', '！', '？'];
  let start = 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (sentenceBoundaryChars.includes(normalizedText[i])) {
      start = i + 1;
      break;
    }
  }

  let end = normalizedText.length;
  for (let i = index + selectedTerm.length; i < normalizedText.length; i += 1) {
    if (sentenceBoundaryChars.includes(normalizedText[i])) {
      end = i + 1;
      break;
    }
  }

  return normalizedText.slice(start, end).trim();
}

export function extractPassageAroundSelection(containerText: string, selectedTerm: string, maxLength = 360): string {
  const normalizedText = containerText.replace(/\s+/g, ' ').trim();
  if (normalizedText.length <= maxLength) return normalizedText;

  const sentences = splitIntoSentences(normalizedText);
  const selectedIndex = sentences.findIndex((sentence) =>
    sentence.toLowerCase().includes(selectedTerm.trim().toLowerCase())
  );
  if (selectedIndex < 0) return normalizedText.slice(0, maxLength).trim();

  let result = sentences[selectedIndex];
  for (const index of [selectedIndex + 1, selectedIndex - 1]) {
    const candidate = sentences[index];
    if (!candidate) continue;
    const next = index < selectedIndex ? `${candidate} ${result}` : `${result} ${candidate}`;
    if (next.length <= maxLength) result = next;
  }

  return result.length <= maxLength ? result : result.slice(0, maxLength).trim();
}

export function getSelectionContext(): SelectionContext | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const term = selection.toString().trim();
  if (!isValidSelectedTerm(term)) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
  const containerText = getContextContainerText(element, term);

  return {
    term,
    sentence: extractSentenceAroundSelection(containerText, term),
    passageText: extractPassageAroundSelection(containerText, term),
    surroundingText: containerText.replace(/\s+/g, ' ').trim().slice(0, 500)
  };
}

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
}

function getContextContainerText(element: Element | null, term: string): string {
  if (!element) return term;

  const semantic = element.closest('p, li, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6');
  const semanticText = semantic?.textContent?.replace(/\s+/g, ' ').trim();
  if (semanticText?.toLowerCase().includes(term.toLowerCase())) return semanticText;

  let current: Element | null = element;
  let best = element.textContent?.replace(/\s+/g, ' ').trim() || term;
  while (current && current !== document.body) {
    const text = current.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (text.toLowerCase().includes(term.toLowerCase()) && text.length > best.length && text.length <= 700) {
      best = text;
    }
    if (text.length > 700) break;
    current = current.parentElement;
  }

  return best;
}
