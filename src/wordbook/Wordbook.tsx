import { useEffect, useMemo, useState } from 'react';
import { deleteWordEntry, getWordEntries, updateFamiliarity } from '../shared/storage';
import type { Familiarity, WordEntry } from '../shared/types';
import {
  buildReviewChoices,
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
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

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
    setSelectedChoiceId(null);
  }

  async function removeFavorite(entry: WordEntry) {
    await deleteWordEntry(entry.id);
    setEntries((current) => removeEntryById(current, entry.id));
    if (reviewEntryId === entry.id) {
      setReviewEntryId(null);
      setReviewRevealed(false);
      setSelectedChoiceId(null);
    }
    setStatus(`已取消收藏：${entry.term}`);
  }

  function pickRandomReview() {
    const pool = buildReviewQueue(entries, entries.length);
    if (pool.length === 0) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setReviewEntryId(next.id);
    setReviewRevealed(false);
    setSelectedChoiceId(null);
  }

  function goNextReview() {
    if (reviewQueue.length === 0) return;
    const currentIndex = activeReview ? reviewQueue.findIndex((entry) => entry.id === activeReview.id) : -1;
    const next = reviewQueue[(currentIndex + 1) % reviewQueue.length] || reviewQueue[0];
    setReviewEntryId(next.id);
    setReviewRevealed(false);
    setSelectedChoiceId(null);
  }

  function chooseReviewOption(choiceId: string) {
    setSelectedChoiceId(choiceId);
    setReviewRevealed(true);
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
  const reviewChoices = useMemo(
    () => (activeReview ? buildReviewChoices(activeReview, entries) : []),
    [activeReview, entries]
  );
  const reviewPosition = activeReview ? Math.max(1, reviewQueue.findIndex((entry) => entry.id === activeReview.id) + 1) : 0;
  const activeSource = sourceGroups.find((group) => group.key === activeSourceKey);

  return (
    <main className="wordbook-page">
      <header className="hero">
        <div>
          <p className="eyebrow">Context Vocab</p>
          <h1>学习仪表盘</h1>
          <p className="muted">管理语境生词、复习上下文，并把收藏变成可回访的学习线索。</p>
        </div>
        <div className="summary-card" aria-label="生词统计">
          <span className="summary-label">收藏总量</span>
          <strong>{summary.total}</strong>
          <div className="summary-breakdown">
            <span><b>{summary.unknown}</b> 初识</span>
            <span><b>{summary.familiar}</b> 识别</span>
            <span><b>{summary.known}</b> 掌握</span>
          </div>
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

      <section className="review-board" aria-label="复习仪表盘">
        <div className="review-card">
          <div className="review-card-head">
            <div>
              <span>今日复习</span>
              <p>选择缺口里最合适的词</p>
            </div>
            <strong>{reviewQueue.length}<small>张</small></strong>
          </div>
          {activeReview ? (
            <>
              <div className="review-meta-row">
                <span>第 {reviewPosition} / {reviewQueue.length} 题</span>
                <span>{formatEntrySourceLabel(activeReview, 46)}</span>
              </div>
              <p className="review-prompt">{maskEntrySentence(activeReview)}</p>
              <div className="review-choices" role="group" aria-label="复习选项">
                {reviewChoices.map((choice, index) => {
                  const isSelected = selectedChoiceId === choice.id;
                  const revealState = reviewRevealed
                    ? choice.correct
                      ? 'correct'
                      : isSelected
                        ? 'wrong'
                        : ''
                    : '';
                  return (
                    <button
                      key={choice.id}
                      className={['review-choice', revealState, isSelected ? 'selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => chooseReviewOption(choice.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                      <span>
                        <b>{choice.term}</b>
                        <small>{choice.meaning}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              {reviewRevealed ? (
                <div className="review-answer">
                  <h2>{activeReview.term}</h2>
                  <p><b>此处含义</b>{activeReview.meaningInContext}</p>
                  {activeReview.notThisMeaning ? <p><b>易混淆</b>{activeReview.notThisMeaning}</p> : null}
                  {activeReview.memoryHook ? <blockquote>{activeReview.memoryHook}</blockquote> : null}
                </div>
              ) : null}
              <footer className="review-actions">
                <button onClick={() => setReviewRevealed(true)}>直接看答案</button>
                <button onClick={goNextReview}>下一张</button>
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
            <span>来源</span>
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
          <span>正在查看：{activeSource?.host}</span>
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
                        {[entry.language, entry.partOfSpeech, entry.phonetic].filter(Boolean).join(' · ')} ·{' '}
                        {new Date(entry.createdAt).toLocaleString()}
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
