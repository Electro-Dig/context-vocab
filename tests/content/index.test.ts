import { describe, expect, it } from 'vitest';
import { shouldIgnoreSelectionMouseUp } from '../../src/content/dom-guards';

describe('shouldIgnoreSelectionMouseUp', () => {
  it('ignores mouseup events inside the floating card', () => {
    document.body.innerHTML = '<div id="context-vocab-impression-card"><p id="inside">text</p></div><p id="outside">page</p>';
    const inside = document.getElementById('inside')!;
    const outside = document.getElementById('outside')!;

    expect(shouldIgnoreSelectionMouseUp({ target: inside } as unknown as MouseEvent)).toBe(true);
    expect(shouldIgnoreSelectionMouseUp({ target: outside } as unknown as MouseEvent)).toBe(false);
  });
});
