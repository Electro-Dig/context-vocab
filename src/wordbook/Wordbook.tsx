import { useEffect, useMemo, useState } from 'react';
import { deleteWordEntry, getWordEntries, updateFamiliarity } from '../shared/storage';
import type { Familiarity, WordEntry } from '../shared/types';
import {
  buildReviewQueue,
  buildSourceGroups,
  FAMILIARITY_LABELS,
  filterWordEntries,
  formatEntrySourceLabel,
  groupEntriesByDate,
  maskEntrySentence,
  removeEntryById,
  summarizeEntries
} from './wordbook-utils';

const familiarityOrder: Familiarity[] = ['unknown', 'familiar', 'known'];

export function Wordbook() {
  const [entries, setEntries] = useState<WordEntry[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [activeSourceKey, setActiveSourceKey] = useState('all');
  const [reviewEntryId, setReviewEntryId] = useState<string | null>(null);
  const [reviewRevealed, setReviewRevealed] = useState(false);

  useEffect(() => {
    void reloadEntries();
  }, []);

  async function reloadEntries() {
    setEntries(await getWordEntries());
  }

  async function markFamiliarity(id: string, familiarity: Familiarity) {
    await updateFamiliarity(id, familiarity);
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, familiarity, updatedAt: new Date().toISOString() } : entry
      )
    );
    setStatus(`已标记：${FAMILIARITY_LABELS[familiarity]}`);
    if (reviewEntryId === id) setReviewEntryId(null);
    setReviewRevealed(false);
  }

  async function removeFavorite(entry: WordEntry) {
    await deleteWordEntry(entry.id);
    setEntries((current) => removeEntryById(current, entry.id));
    if (reviewEntryId === entry.id) {
      setReviewEntryId(null);
      setReviewRevealed(false);
    }
    setStatus(`已取消收藏：${entry.term}`);
  }

  function pickRandomReview() {
    const pool = buildReviewQueue(entries, entries.length);
    if (pool.length === 0) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setReviewEntryId(next.id);
    setReviewRevealed(false);
  }

  const sourceGroups = useMemo(() => buildSourceGroups(entries), [entries]);
  const sourceEntries = useMemo(() => {
    if (activeSourceKey === 'all') return entries;
    return sourceGroups.find((group) => group.key === activeSourceKey)?.entries || [];
  }, [activeSourceKey, entries, sourceGroups]);
  const filteredEntries = useMemo(() => filterWordEntries(sourceEntries, query), [sourceEntries, query]);
  const groupedEntries = useMemo(() => groupEntriesByDate(filteredEntries), [filteredEntries]);
  const summary = useMemo(() => summarizeEntries(entries), [entries]);
  const reviewQueue = useMemo(() => buildReviewQueue(entries), [entries]);
  const activeReview = useMemo(
    () => entries.find((entry) => entry.id === reviewEntryId) || reviewQueue[0],
    [entries, reviewEntryId, reviewQueue]
  );

  return (
    <main className="wordbook-page">
      <header className="hero">
        <div>
          <p className="eyebrow">Context Vocab</p>
          <h1>生词本</h1>
          <p className="muted">管理已收藏的语境词义，保留来源、此处含义和记忆钩子。</p>
        </div>
        <div className="summary-card" aria-label="生词统计">
          <strong>{summary.total}</strong>
          <span>全部</span>
          <span>初识 {summary.unknown}</span>
          <span>识别 {summary.familiar}</span>
          <span>掌握 {summary.known}</span>
        </div>
      </header>

      <section className="toolbar">
        <label>
          <span>搜索词、释义、原句</span>
          <input
            value={query}
            placeholder="commitment / 长期投入"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button onClick={() => void reloadEntries()}>刷新</button>
      </section>

      {status ? <p className="status">{status}</p> : null}

      <section className="review-board" aria-label="今日复习">
        <div className="review-card">
          <div className="review-card-head">
            <span>今日复习</span>
            <strong>{reviewQueue.length}</strong>
          </div>
          {activeReview ? (
            <>
              <p className="review-source">{formatEntrySourceLabel(activeReview, 46)}</p>
              <p className="review-prompt">{maskEntrySentence(activeReview)}</p>
              {reviewRevealed ? (
                <div className="review-answer">
                  <h2>{activeReview.term}</h2>
                  <p><b>此处含义</b>{activeReview.meaningInContext}</p>
                  {activeReview.notThisMeaning ? <p><b>易混淆</b>{activeReview.notThisMeaning}</p> : null}
                  {activeReview.memoryHook ? <blockquote>{activeReview.memoryHook}</blockquote> : null}
                </div>
              ) : null}
              <footer className="review-actions">
                <button onClick={() => setReviewRevealed((value) => !value)}>
                  {reviewRevealed ? '收起答案' : '显示答案'}
                </button>
                <button onClick={pickRandomReview}>随机回忆</button>
                {reviewRevealed
                  ? familiarityOrder.map((value) => (
                      <button key={value} onClick={() => void markFamiliarity(activeReview.id, value)}>
                        {FAMILIARITY_LABELS[value]}
                      </button>
                    ))
                  : null}
              </footer>
            </>
          ) : (
            <p className="muted">暂无待复习词。新的初识或识别词会出现在这里。</p>
          )}
        </div>
        <div className="source-shelf">
          <div className="source-shelf-head">
            <span>来源回看</span>
            {activeSourceKey !== 'all' ? <button onClick={() => setActiveSourceKey('all')}>清除</button> : null}
          </div>
          <button
            className={activeSourceKey === 'all' ? 'source-chip active' : 'source-chip'}
            onClick={() => setActiveSourceKey('all')}
          >
            <strong>全部来源</strong>
            <span>{entries.length} 个词</span>
          </button>
          {sourceGroups.slice(0, 6).map((group) => (
            <button
              key={group.key}
              className={activeSourceKey === group.key ? 'source-chip active' : 'source-chip'}
              onClick={() => setActiveSourceKey(group.key)}
            >
              <strong>{group.host}</strong>
              <span>{group.count} 个词 · {group.label}</span>
            </button>
          ))}
        </div>
      </section>

      {activeSourceKey !== 'all' ? (
        <section className="active-filter">
          <span>正在查看：{sourceGroups.find((group) => group.key === activeSourceKey)?.host}</span>
          <button onClick={() => setActiveSourceKey('all')}>显示全部</button>
        </section>
      ) : null}

      <section className="entries" aria-live="polite">
        {filteredEntries.length === 0 ? (
          <article className="empty-card">
            <h2>暂无匹配记录</h2>
            <p>在英文网页划选词或短语，点击“收藏”后会出现在这里。</p>
          </article>
        ) : (
          groupedEntries.map((group) => (
            <section className="date-group" key={group.dateKey}>
              <h2>{group.title}</h2>
              {group.entries.map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <div className="entry-head">
                    <div>
                      <h2>{entry.term}</h2>
                      <p className="meta">
                        {entry.language} · {new Date(entry.createdAt).toLocaleString()}
                      </p>
                      <a
                        className="source-link"
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={entry.sourceTitle || entry.sourceUrl}
                      >
                        {formatEntrySourceLabel(entry)}
                      </a>
                    </div>
                    <div className="entry-head-actions">
                      <button
                        className="favorite-button"
                        aria-label={`取消收藏 ${entry.term}`}
                        title={`取消收藏 ${entry.term}`}
                        onClick={() => void removeFavorite(entry)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M12 3.6l2.54 5.15 5.68.82-4.11 4.01.97 5.66L12 16.56 6.92 19.24l.97-5.66-4.11-4.01 5.68-.82L12 3.6z"></path>
                        </svg>
                      </button>
                      <span className={`badge ${entry.familiarity}`}>{FAMILIARITY_LABELS[entry.familiarity]}</span>
                    </div>
                  </div>

                  {entry.dictionaryMeaning ? <p className="dictionary"><b>词典义</b>{entry.dictionaryMeaning}</p> : null}
                  <p className="meaning"><b>此处含义</b>{entry.meaningInContext}</p>
                  {entry.notThisMeaning ? <p className="boundary"><b>易混淆</b>{entry.notThisMeaning}</p> : null}
                  <p className="explain">{entry.contextExplanation}</p>
                  {entry.memoryHook ? <blockquote>{entry.memoryHook}</blockquote> : null}
                  {entry.naturalTranslation ? <p className="translation"><b>自然译法</b>{entry.naturalTranslation}</p> : null}
                  <p className="source-sentence">{entry.originalSentence}</p>

                  <footer className="entry-actions">
                    {familiarityOrder.map((value) => (
                      <button
                        key={value}
                        className={entry.familiarity === value ? 'active' : ''}
                        onClick={() => void markFamiliarity(entry.id, value)}
                      >
                        {FAMILIARITY_LABELS[value]}
                      </button>
                    ))}
                  </footer>
                </article>
              ))}
            </section>
          ))
        )}
      </section>
    </main>
  );
}
