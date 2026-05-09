import { useEffect, useMemo, useState } from 'react';
import { getPageMatchStats, getSettings, getWordEntries, saveSettings } from '../shared/storage';
import type { AppSettings, PageMatchStats } from '../shared/types';

export function Popup() {
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<PageMatchStats | undefined>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const iconUrl = useMemo(() => chrome.runtime.getURL('assets/icons/icon-48.png'), []);

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
      <header className="popup-hero">
        <img src={iconUrl} alt="" />
        <div>
          <p className="eyebrow">Context Vocab</p>
          <h1>语境生词</h1>
        </div>
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
        <section className="quick-settings" aria-label="快捷设置">
          <QuickToggle
            label="启用"
            helper="划词解析"
            checked={settings.extensionEnabled}
            onChange={(value) => void update({ extensionEnabled: value })}
          />
          <QuickToggle
            label="自动收藏"
            helper="解析即入库"
            checked={settings.autoSaveOnExplain}
            onChange={(value) => void update({ autoSaveOnExplain: value })}
          />
          <QuickToggle
            label="高亮"
            helper="标出已收藏"
            checked={settings.highlightEnabled}
            onChange={(value) => void update({ highlightEnabled: value })}
          />
          <QuickToggle
            label="缓存"
            helper="优先本地"
            checked={settings.preferCachedExplanations}
            onChange={(value) => void update({ preferCachedExplanations: value })}
          />
        </section>
      ) : null}

      <button className="primary" onClick={openWordbook}>打开学习仪表盘</button>
      <button className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>DeepSeek API 与功能设置</button>
    </main>
  );
}

function QuickToggle({
  label,
  helper,
  checked,
  onChange
}: {
  label: string;
  helper: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="quick-toggle">
      <span>
        <strong>{label}</strong>
        <small>{helper}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
