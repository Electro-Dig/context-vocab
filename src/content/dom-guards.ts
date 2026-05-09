const CARD_ID = 'context-vocab-impression-card';

export function shouldIgnoreSelectionMouseUp(event: MouseEvent): boolean {
  return event.target instanceof Node && Boolean(document.getElementById(CARD_ID)?.contains(event.target));
}
