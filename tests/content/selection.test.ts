import { describe, expect, it } from 'vitest';
import { extractPassageAroundSelection, extractSentenceAroundSelection, isValidSelectedTerm } from '../../src/content/selection';

describe('isValidSelectedTerm', () => {
  it('accepts words and short phrases', () => {
    expect(isValidSelectedTerm('commitment')).toBe(true);
    expect(isValidSelectedTerm('take ownership')).toBe(true);
  });

  it('rejects empty, long, or multiline selections', () => {
    expect(isValidSelectedTerm('')).toBe(false);
    expect(isValidSelectedTerm('a'.repeat(81))).toBe(false);
    expect(isValidSelectedTerm('hello\nworld')).toBe(false);
  });
});

describe('extractPassageAroundSelection', () => {
  it('keeps the containing paragraph when it is concise enough', () => {
    const paragraph =
      'Finally made my own CMY cube using ray-traced-ish internal color mixing, refraction, reflections, colored shadows, and tunable edge highlights.';

    expect(extractPassageAroundSelection(paragraph, 'ray-traced-ish')).toBe(paragraph);
  });

  it('clips long context to a short sentence window around the selected term', () => {
    const passage =
      'Unrelated opening sentence that should not be included. Another setup sentence. The project requires long-term commitment from everyone involved. A closing sentence that is useful. A far away detail that should be trimmed.';

    const result = extractPassageAroundSelection(passage, 'commitment', 130);

    expect(result).toContain('commitment');
    expect(result.length).toBeLessThanOrEqual(130);
    expect(result).not.toContain('Unrelated opening');
    expect(result).not.toContain('far away detail');
  });
});

describe('extractSentenceAroundSelection', () => {
  it('extracts the sentence containing the selected term', () => {
    expect(extractSentenceAroundSelection('First. The project requires long-term commitment. Last.', 'commitment')).toBe(
      'The project requires long-term commitment.'
    );
  });

  it('falls back to a trimmed prefix when the term is not found', () => {
    expect(extractSentenceAroundSelection('  A short paragraph without it.  ', 'missing')).toBe('A short paragraph without it.');
  });
});
