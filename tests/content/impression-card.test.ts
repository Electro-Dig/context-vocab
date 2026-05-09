import { describe, expect, it, vi } from 'vitest';
import { calculateCardPosition, formatElapsedTime, removeCard, showEntryCard, showLoadingCard } from '../../src/content/impression-card';
import type { WordEntry } from '../../src/shared/types';

function entry(): WordEntry {
  const now = '2026-05-07T00:00:00.000Z';
  return {
    id: 'en:commitment',
    term: 'commitment',
    normalizedTerm: 'commitment',
    language: 'en',
    partOfSpeech: 'n.',
    phonetic: '/kəˈmɪtmənt/',
    dictionaryMeaning: '承诺；投入；责任',
    meaningInContext: '长期投入',
    notThisMeaning: '并非单纯口头答应。',
    contextExplanation: '强调持续投入。',
    memoryHook: 'commit = 把自己提交进去。',
    originalSentence: 'The project requires commitment.',
    naturalTranslation: '这个项目需要长期投入。',
    passageText: 'The project requires commitment from everyone involved.',
    passageTranslation: '这个项目需要每个人长期投入。',
    sourceUrl: 'https://example.com',
    sourceTitle: 'Example',
    familiarity: 'unknown',
    encounterCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

describe('showEntryCard', () => {
  it('formats elapsed time for the loading state', () => {
    expect(formatElapsedTime(0)).toBe('0.00s');
    expect(formatElapsedTime(1180)).toBe('1.18s');
  });

  it('renders loading elapsed time next to the selected term', () => {
    showLoadingCard(10, 10, 'problem', 1000, () => 2180);

    expect(document.querySelector('.cv-loading-time')?.textContent).toBe('1.18s');
  });

  it('renders compact card with word metadata below the title, star save, and optional panels', () => {
    showEntryCard(10, 10, entry(), {
      isSaved: false,
      onSave: vi.fn(),
      onUnsave: vi.fn(),
      onFamiliarity: vi.fn(),
      timing: { elapsedMs: 1180, cached: false },
      display: {
        showCurrentExample: true,
        showMemoryHook: true,
        showFamiliarityControl: true,
        showConfusingMeaning: true,
        showExtraPanel: true
      }
    });

    expect(document.body.textContent).toContain('词典义');
    expect(document.body.textContent).toContain('n.');
    expect(document.body.textContent).toContain('/kəˈmɪtmənt/');
    expect(document.body.textContent).toContain('易混淆');
    expect(document.body.textContent).toContain('当前例句');
    expect(document.body.textContent).toContain('记忆程度');
    expect(document.body.textContent).not.toContain('完成 1.18s');
    expect(document.body.textContent).toContain('整段翻译');
    expect(document.body.textContent).toContain('这个项目需要每个人长期投入。');
    const saveButton = document.querySelector<HTMLButtonElement>('[data-action="toggle-save"]');
    expect(saveButton?.classList.contains('cv-star')).toBe(true);
    expect(saveButton?.closest('.cv-header')).not.toBeNull();
    expect(saveButton?.closest('.cv-title-row')).not.toBeNull();
    expect(saveButton?.getAttribute('aria-label')).toBe('收藏 commitment');
    expect(document.querySelector('[data-action="speak"]')).toBeNull();
    expect(document.querySelector('.cv-word-meta')).toBeNull();
    expect(document.querySelector('.cv-dictionary .cv-pos-inline')?.textContent).toBe('n.');
    expect(document.querySelector('.cv-dictionary .cv-phonetic-inline')?.textContent).toBe('/kəˈmɪtmənt/');
    expect(document.querySelector('.cv-actions')).toBeNull();
    expect(document.body.textContent).not.toContain('语义边界');
  });

  it('keeps the default card concise', () => {
    showEntryCard(10, 10, entry(), {
      isSaved: false,
      onSave: vi.fn(),
      onUnsave: vi.fn(),
      onFamiliarity: vi.fn()
    });

    expect(document.body.textContent).toContain('词典义');
    expect(document.body.textContent).toContain('此处含义');
    expect(document.body.textContent).toContain('语境说明');
    expect(document.body.textContent).toContain('易混淆');
    expect(document.body.textContent).toContain('记忆钩子');
    expect(document.body.textContent).not.toContain('当前例句');
    expect(document.body.textContent).not.toContain('记忆程度');
    expect(document.body.textContent).not.toContain('整段翻译');
  });

  it('can hide optional modules from settings', () => {
    showEntryCard(10, 10, entry(), {
      isSaved: false,
      onSave: vi.fn(),
      onUnsave: vi.fn(),
      onFamiliarity: vi.fn(),
      display: {
        showCurrentExample: false,
        showMemoryHook: false,
        showFamiliarityControl: false,
        showConfusingMeaning: false,
        showExtraPanel: false
      }
    });

    expect(document.body.textContent).not.toContain('易混淆');
    expect(document.body.textContent).not.toContain('当前例句');
    expect(document.body.textContent).not.toContain('记忆钩子');
    expect(document.body.textContent).not.toContain('记忆程度');
  });

  it('toggles save and unsave through the star button', async () => {
    const onSave = vi.fn(async () => undefined);
    const onUnsave = vi.fn(async () => undefined);

    showEntryCard(10, 10, entry(), {
      isSaved: false,
      onSave,
      onUnsave,
      onFamiliarity: vi.fn()
    });

    document.querySelector<HTMLButtonElement>('[data-action="toggle-save"]')?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-action="toggle-save"]')?.getAttribute('aria-label')).toBe('取消收藏 commitment');
    expect(document.querySelector('[data-action="toggle-save"]')?.classList.contains('is-saved')).toBe(true);

    document.querySelector<HTMLButtonElement>('[data-action="toggle-save"]')?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(onUnsave).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-action="toggle-save"]')?.getAttribute('aria-label')).toBe('收藏 commitment');
    expect(document.querySelector('[data-action="toggle-save"]')?.classList.contains('is-saved')).toBe(false);
  });

  it('places the card above and to the left when selection is near the viewport edge', () => {
    const position = calculateCardPosition(
      780,
      580,
      { width: 320, height: 260 },
      { width: 800, height: 600 }
    );

    expect(position.left).toBeLessThan(780);
    expect(position.top).toBeLessThan(580);
    expect(position.left + 320).toBeLessThanOrEqual(788);
    expect(position.top + 260).toBeLessThanOrEqual(588);
  });

  it('closes via explicit close button', () => {
    showEntryCard(10, 10, entry(), { isSaved: false, onSave: vi.fn(), onUnsave: vi.fn(), onFamiliarity: vi.fn() });
    document.querySelector<HTMLButtonElement>('[data-action="close"]')?.click();
    expect(document.getElementById('context-vocab-impression-card')).toBeNull();
  });

  it('removeCard is idempotent', () => {
    removeCard();
    expect(document.getElementById('context-vocab-impression-card')).toBeNull();
  });
});
