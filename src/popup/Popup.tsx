import { useEffect, useState } from 'react';
import { getPageMatchStats, getSettings, getWordEntries, saveSettings } from '../shared/storage';
import type { AppSettings, PageMatchStats } from '../shared/types';

export function Popup() {
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<PageMatchStats | undefined>();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void getWordEntries().then((entries) => setCount(entries.length));
    void getSettings().then(setSettings);
    void chrome.tabs?.query?.({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (url) void getPageMatchStats(url).then(setStats);
    });
  }, []);

  async function update(patch: Partial<AppSettings>) {
    const next = await saveSettings(patch);
    setSettings(next);
  }

  function openWordbook() {
    window.open(chrome.runtime.getURL('src/wordbook/index.html'), '_blank');
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Context Vocab</p>
        <h1>语境生词</h1>
      </header>
      <section className="mini-stats" aria-label="生词统计">
        <div>
          <strong>{count}</strong>
          <span>已收藏</span>
        </div>
        <div>
          <strong>{stats?.total ?? 0}</strong>
          <span>本页遇到</span>
        </div>
      </section>

      {settings ? (
        <section className="quick-settings">
          <QuickToggle
            label="启用"
            checked={settings.extensionEnabled}
            onChange={(value) => void update({ extensionEnabled: value })}
          />
          <QuickToggle
            label="自动收藏"
            checked={settings.autoSaveOnExplain}
            onChange={(value) => void update({ autoSaveOnExplain: value })}
          />
          <QuickToggle
            label="高亮"
            checked={settings.highlightEnabled}
            onChange={(value) => void update({ highlightEnabled: value })}
          />
          <QuickToggle
            label="缓存"
            checked={settings.preferCachedExplanations}
            onChange={(value) => void update({ preferCachedExplanations: value })}
          />
        </section>
      ) : null}

      <button className="primary" onClick={openWordbook}>打开生词本</button>
      <button className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>DeepSeek API</button>
    </main>
  );
}

function QuickToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="quick-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
