import { useEffect, useState } from 'react';
import { DEFAULT_DEEPSEEK_ENDPOINT, DEFAULT_DEEPSEEK_MODEL } from '../shared/constants';
import { getSettings, saveSettings } from '../shared/storage';
import type { AppSettings } from '../shared/types';

export function Options() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  if (!settings) return <main className="page">加载中...</main>;

  async function update(patch: Partial<AppSettings>) {
    const next = await saveSettings(patch);
    setSettings(next);
    setStatus('已保存');
  }

  async function testConnection() {
    if (!settings) return;
    setStatus('正在测试...');
    try {
      const startedAt = performance.now();
      const current = settings;
      const response = await fetch(current.deepseekEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: current.deepseekModel,
          messages: [
            { role: 'system', content: '只返回合法 JSON。' },
            { role: 'user', content: '返回 {"ok":true}，不要添加其他内容。' }
          ],
          max_tokens: 40,
          thinking: { type: 'disabled' },
          response_format: { type: 'json_object' },
          stream: false
        })
      });
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
      if (!response.ok) {
        setStatus(`连接失败：${response.status}`);
        return;
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content || '';
      JSON.parse(content);
      setStatus(`连接成功，用时 ${elapsed}s`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Context Vocab</p>
        <h1>DeepSeek API</h1>
        <p className="muted">日常开关已移到扩展弹窗；这里保留 API、模型和卡片细节。</p>
      </header>

      <section className="panel">
        <h2>连接</h2>
        <label className="row">
          <span>API Key</span>
          <input
            type="password"
            value={settings.deepseekApiKey}
            placeholder="sk-..."
            onChange={(event) => void update({ deepseekApiKey: event.target.value })}
          />
        </label>
        <label className="row">
          <span>模型</span>
          <input
            value={settings.deepseekModel || DEFAULT_DEEPSEEK_MODEL}
            onChange={(event) => void update({ deepseekModel: event.target.value })}
          />
        </label>
        <div className="grid-2">
          <label className="row">
            <span>Temperature</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(event) => void update({ temperature: Number(event.target.value) })}
            />
          </label>
          <label className="row">
            <span>Max output tokens</span>
            <input
              type="number"
              min="120"
              max="800"
              step="20"
              value={settings.maxOutputTokens}
              onChange={(event) => void update({ maxOutputTokens: Number(event.target.value) })}
            />
          </label>
        </div>
        <details>
          <summary>高级设置</summary>
          <label className="row">
            <span>Endpoint</span>
            <input
              value={settings.deepseekEndpoint || DEFAULT_DEEPSEEK_ENDPOINT}
              onChange={(event) => void update({ deepseekEndpoint: event.target.value })}
            />
          </label>
          <label className="row">
            <span>上下文范围</span>
            <select
              value={settings.contextMode}
              onChange={(event) => void update({ contextMode: event.target.value as AppSettings['contextMode'] })}
            >
              <option value="sentence">仅当前句</option>
              <option value="neighboring-sentences">当前句 + 邻近上下文</option>
            </select>
          </label>
        </details>
        <button className="primary" onClick={() => void testConnection()}>测试连接</button>
        <p className="status">{status}</p>
      </section>

      <details className="panel compact-panel">
        <summary>卡片显示细节</summary>
        <p className="panel-note">默认保持精简，只在划词卡片里显示必要记忆线索。</p>
        <Toggle
          label="当前例句"
          description="在划词卡片中显示触发解析的原句。"
          checked={settings.showCurrentExample}
          onChange={(value) => void update({ showCurrentExample: value })}
        />
        <Toggle
          label="易混淆"
          description="显示容易误解的含义边界。"
          checked={settings.showConfusingMeaning}
          onChange={(value) => void update({ showConfusingMeaning: value })}
        />
        <Toggle
          label="记忆钩子"
          description="显示词根、搭配或场景联想。"
          checked={settings.showMemoryHook}
          onChange={(value) => void update({ showMemoryHook: value })}
        />
        <Toggle
          label="记忆程度"
          description="在卡片中直接标记初识、识别或掌握。"
          checked={settings.showFamiliarityControl}
          onChange={(value) => void update({ showFamiliarityControl: value })}
        />
        <Toggle
          label="整段翻译"
          description="显示词所在短段的中文翻译，并可展开查看语境原文。"
          checked={settings.prepareExtraInfo}
          onChange={(value) => void update({ prepareExtraInfo: value })}
        />
      </details>
    </main>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
