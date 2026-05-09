import { describe, expect, it } from 'vitest';
import { createEntryId, normalizeTerm } from '../../src/shared/normalize';

describe('normalizeTerm', () => {
  it('trims, lowercases, and collapses spaces', () => {
    expect(normalizeTerm('  Take   Ownership ')).toBe('take ownership');
  });

  it('keeps punctuation inside phrases so technical expressions remain recognizable', () => {
    expect(normalizeTerm(' Long-Term   Commitment ')).toBe('long-term commitment');
  });
});

describe('createEntryId', () => {
  it('creates stable ids', () => {
    expect(createEntryId('EN', ' Commitment ')).toBe('en:commitment');
  });
});
