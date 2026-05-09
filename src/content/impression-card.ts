import type { Familiarity, WordEntry } from '../shared/types';

const CARD_ID = 'context-vocab-impression-card';
const FAMILIARITY_LABELS: Record<Familiarity, string> = {
  unknown: '初识',
  familiar: '识别',
  known: '掌握'
};
const CARD_MARGIN = 12;

export interface EntryCardCallbacks {
  isSaved: boolean;
  onSave: (value: Familiarity) => void | Promise<void>;
  onUnsave?: () => void | Promise<void>;
  onFamiliarity: (value: Familiarity) => void | Promise<void>;
  onClose?: () => void;
  display?: Partial<EntryCardDisplay>;
  timing?: EntryCardTiming;
}

export interface EntryCardDisplay {
  showCurrentExample: boolean;
  showMemoryHook: boolean;
  showFamiliarityControl: boolean;
  showConfusingMeaning: boolean;
  showExtraPanel: boolean;
}

export interface EntryCardTiming {
  elapsedMs?: number;
  cached?: boolean;
}

let cleanupFns: Array<() => void> = [];

const DEFAULT_DISPLAY: EntryCardDisplay = {
  showCurrentExample: false,
  showMemoryHook: true,
  showFamiliarityControl: false,
  showConfusingMeaning: true,
  showExtraPanel: false
};

export function formatElapsedTime(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(2)}s`;
}

export function showLoadingCard(x: number, y: number, term: string, startedAt = Date.now(), now = () => Date.now()): void {
  const card = renderBase(
    x,
    y,
    `<div class="cv-loading-head"><div class="cv-term">${escapeHtml(term)}</div><span class="cv-loading-time">${formatElapsedTime(now() - startedAt)}</span></div><div class="cv-muted">DeepSeek Chat</div>`
  );
  const timeNode = card.querySelector<HTMLElement>('.cv-loading-time');
  const timer = window.setInterval(() => {
    if (timeNode) timeNode.textContent = formatElapsedTime(now() - startedAt);
  }, 100);
  cleanupFns.push(() => window.clearInterval(timer));
}

export function showErrorCard(x: number, y: number, message: string): void {
  renderBase(
    x,
    y,
    `<div class="cv-term">解析失败</div><div class="cv-error">${escapeHtml(message)}</div>`
  );
}

export function showEntryCard(x: number, y: number, entry: WordEntry, callbacks: EntryCardCallbacks): void {
  let selectedFamiliarity = entry.familiarity;
  let saved = callbacks.isSaved;
  const display = { ...DEFAULT_DISPLAY, ...callbacks.display };

  const card = renderBase(
    x,
    y,
    `
    <header class="cv-header">
      <div class="cv-title-stack">
        <div class="cv-title-row">
          <div class="cv-term">${escapeHtml(entry.term)}</div>
          ${renderStarButton(saved, entry.term)}
          ${renderTiming(callbacks.timing)}
        </div>
        ${entry.dictionaryMeaning ? `<div class="cv-dictionary"><span>词典义</span>${escapeHtml(entry.dictionaryMeaning)}</div>` : ''}
      </div>
    </header>

    <section class="cv-block cv-primary-block">
      <div class="cv-label">此处含义</div>
      <div class="cv-meaning">${escapeHtml(entry.meaningInContext)}</div>
    </section>

    ${
      display.showConfusingMeaning && entry.notThisMeaning
        ? `<section class="cv-block"><div class="cv-label">易混淆</div><p>${escapeHtml(entry.notThisMeaning)}</p></section>`
        : ''
    }

    <section class="cv-block">
      <div class="cv-label">语境说明</div>
      <p>${escapeHtml(entry.contextExplanation)}</p>
    </section>

    ${
      display.showMemoryHook && entry.memoryHook
        ? `<section class="cv-block"><div class="cv-label">记忆钩子</div><blockquote>${escapeHtml(entry.memoryHook)}</blockquote></section>`
        : ''
    }

    ${
      display.showCurrentExample
        ? `<section class="cv-block cv-source"><div class="cv-label">当前例句</div><p>${escapeHtml(entry.originalSentence)}</p></section>`
        : ''
    }

    ${display.showExtraPanel ? renderPassagePanel(entry) : ''}

    ${
      display.showFamiliarityControl
        ? `<section class="cv-memory"><div class="cv-label">记忆程度</div><div class="cv-memory-scale" role="group" aria-label="记忆程度">${renderLevelButton('unknown', selectedFamiliarity)}${renderLevelButton('familiar', selectedFamiliarity)}${renderLevelButton('known', selectedFamiliarity)}</div></section>`
        : ''
    }

    <div class="cv-inline-error-slot"></div>
  `
  );

  card.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const actionTarget = target.closest<HTMLElement>('[data-action]');
    const action = actionTarget?.getAttribute('data-action');
    const levelTarget = target.closest<HTMLElement>('[data-level]');
    const level = levelTarget?.getAttribute('data-level') as Familiarity | null;

    if (action === 'close') {
      callbacks.onClose?.();
      removeCard();
      return;
    }

    if (level) {
      selectedFamiliarity = level;
      markSelectedLevel(card, selectedFamiliarity);
      if (saved) void callbacks.onFamiliarity(selectedFamiliarity);
      return;
    }

    if (action === 'toggle-save') {
      const button = actionTarget as HTMLButtonElement;
      button.disabled = true;
      updateStarButton(button, saved, entry.term, true);
      const operation = saved && callbacks.onUnsave ? callbacks.onUnsave() : callbacks.onSave(selectedFamiliarity);
      void Promise.resolve(operation)
        .then(() => {
          saved = !saved;
          button.disabled = false;
          updateStarButton(button, saved, entry.term);
        })
        .catch((error: unknown) => {
          button.disabled = false;
          updateStarButton(button, saved, entry.term);
          showInlineError(card, error instanceof Error ? error.message : String(error));
        });
    }
  });
}

export function removeCard(): void {
  cleanupFns.forEach((cleanup) => cleanup());
  cleanupFns = [];
  document.getElementById(CARD_ID)?.remove();
}

export function calculateCardPosition(
  anchorX: number,
  anchorY: number,
  cardSize: { width: number; height: number },
  viewportSize: { width: number; height: number }
): { left: number; top: number } {
  const maxLeft = Math.max(CARD_MARGIN, viewportSize.width - cardSize.width - CARD_MARGIN);
  const maxTop = Math.max(CARD_MARGIN, viewportSize.height - cardSize.height - CARD_MARGIN);
  const shouldOpenLeft = anchorX + cardSize.width + CARD_MARGIN > viewportSize.width && anchorX > viewportSize.width / 2;
  const shouldOpenAbove =
    anchorY + cardSize.height + CARD_MARGIN > viewportSize.height && anchorY > viewportSize.height / 2;
  const left = shouldOpenLeft ? anchorX - cardSize.width - CARD_MARGIN : anchorX;
  const top = shouldOpenAbove ? anchorY - cardSize.height - CARD_MARGIN : anchorY + CARD_MARGIN;

  return {
    left: clamp(left, CARD_MARGIN, maxLeft),
    top: clamp(top, CARD_MARGIN, maxTop)
  };
}

function renderBase(x: number, y: number, html: string): HTMLDivElement {
  removeCard();
  const card = document.createElement('div');
  card.id = CARD_ID;
  card.style.left = '0';
  card.style.top = '0';
  card.style.visibility = 'hidden';
  card.innerHTML = `
    <button class="cv-close" data-action="close" aria-label="关闭">×</button>
    <div class="cv-card-body">${html}</div>
  `;
  document.body.append(card);
  const rect = card.getBoundingClientRect();
  const position = calculateCardPosition(
    x,
    y,
    { width: rect.width, height: rect.height },
    { width: window.innerWidth, height: window.innerHeight }
  );
  card.style.left = `${position.left}px`;
  card.style.top = `${position.top}px`;
  card.style.visibility = '';
  installDismissHandlers(card);
  return card;
}

function renderStarButton(saved: boolean, term: string): string {
  const label = `${saved ? '取消收藏' : '收藏'} ${term}`;
  return `<button class="cv-star ${saved ? 'is-saved' : ''}" data-action="toggle-save" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" aria-pressed="${saved}">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3.6l2.54 5.15 5.68.82-4.11 4.01.97 5.66L12 16.56 6.92 19.24l.97-5.66-4.11-4.01 5.68-.82L12 3.6z"></path>
    </svg>
  </button>`;
}

function renderTiming(timing?: EntryCardTiming): string {
  if (typeof timing?.elapsedMs !== 'number') return '';
  const label = timing.cached ? '缓存' : '完成';
  return `<span class="cv-timing ${timing.cached ? 'is-cached' : ''}">${label} ${formatElapsedTime(timing.elapsedMs)}</span>`;
}

function updateStarButton(button: HTMLButtonElement, saved: boolean, term: string, pending = false): void {
  const actionLabel = pending ? (saved ? '移除中' : '保存中') : saved ? '取消收藏' : '收藏';
  const label = `${actionLabel} ${term}`;
  button.classList.toggle('is-saved', saved);
  button.classList.toggle('is-pending', pending);
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.setAttribute('aria-pressed', String(saved));
}

function renderLevelButton(value: Familiarity, selected: Familiarity): string {
  return `<button class="cv-level ${value === selected ? 'is-active' : ''}" data-level="${value}" aria-pressed="${value === selected}">${FAMILIARITY_LABELS[value]}</button>`;
}

function renderPassagePanel(entry: WordEntry): string {
  const translation = entry.passageTranslation || entry.naturalTranslation;
  const source = entry.passageText || entry.originalSentence;
  if (!translation && !source) return '';

  return `<section class="cv-block cv-passage">
    <div class="cv-label">整段翻译</div>
    ${translation ? `<p class="cv-passage-translation">${escapeHtml(translation)}</p>` : ''}
    ${source ? `<details><summary>查看语境原文</summary><p class="cv-passage-source">${escapeHtml(source)}</p></details>` : ''}
  </section>`;
}

function markSelectedLevel(card: HTMLElement, selected: Familiarity): void {
  card.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => {
    const isActive = button.dataset.level === selected;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function showInlineError(card: HTMLElement, message: string): void {
  card.querySelector('.cv-inline-error')?.remove();
  const error = document.createElement('div');
  error.className = 'cv-inline-error';
  error.textContent = message;
  card.querySelector('.cv-inline-error-slot')?.append(error);
}

function installDismissHandlers(card: HTMLElement): void {
  const close = () => removeCard();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  const onOutsideMouseDown = (event: MouseEvent) => {
    if (event.target instanceof Node && !card.contains(event.target)) close();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') close();
  };

  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('scroll', close, true);
  window.addEventListener('resize', close);
  window.addEventListener('blur', close);
  document.addEventListener('visibilitychange', onVisibilityChange);
  const timer = window.setTimeout(() => document.addEventListener('mousedown', onOutsideMouseDown, true), 0);

  cleanupFns.push(() => {
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
    window.removeEventListener('blur', close);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('mousedown', onOutsideMouseDown, true);
    window.clearTimeout(timer);
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] || char);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
