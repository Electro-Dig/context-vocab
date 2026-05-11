import { describe, expect, it, vi } from 'vitest';
import { explainWithDeepSeek } from '../../src/shared/deepseek-client';
import { DEFAULT_SETTINGS } from '../../src/shared/storage';

describe('explainWithDeepSeek', () => {
  it('calls DeepSeek with concise JSON instructions and parses dictionary metadata', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        part_of_speech: 'n.',
        phonetic: '/kəˈmɪtmənt/',
        dictionary_meaning: '承诺；投入；责任',
        meaning_in_context: '长期投入',
        not_this_meaning: '并非单纯口头答应。',
        context_explanation: '在这里指持续投入时间和精力。',
        memory_hook: 'commit = 把自己提交进去。',
        natural_translation: '这个项目需要长期投入。',
        passage_translation: '这个项目需要每个人长期投入。',
        detected_language: 'en'
      }) } }]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await explainWithDeepSeek(
      {
        term: 'commitment',
        sentence: 'The project requires long-term commitment.',
        passageText: 'The project requires long-term commitment from everyone involved.',
        includePassageTranslation: true
      },
      { ...DEFAULT_SETTINGS, deepseekApiKey: 'test-api-key' }
    );

    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const requestBody = JSON.parse(requestInit.body as string);
    expect(requestBody.max_tokens).toBe(240);
    expect(requestBody.thinking).toEqual({ type: 'disabled' });
    expect(requestBody.response_format).toEqual({ type: 'json_object' });
    expect(requestBody.messages[1].content).toContain('part_of_speech');
    expect(requestBody.messages[1].content).toContain('phonetic');
    expect(requestBody.messages[1].content).toContain('词典义');
    expect(requestBody.messages[1].content).toContain('语境原文');
    expect(result.partOfSpeech).toBe('n.');
    expect(result.phonetic).toBe('/kəˈmɪtmənt/');
    expect(result.dictionaryMeaning).toBe('承诺；投入；责任');
    expect(result.meaningInContext).toBe('长期投入');
    expect(result.passageTranslation).toBe('这个项目需要每个人长期投入。');
  });

  it('times out stalled DeepSeek explanation requests', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = explainWithDeepSeek(
      { term: 'structure', sentence: 'They built logical structures.' },
      { ...DEFAULT_SETTINGS, deepseekApiKey: 'test-api-key' }
    );
    const assertion = expect(pending).rejects.toThrow('DeepSeek request timed out');

    await vi.advanceTimersByTimeAsync(12_000);
    await assertion;
    vi.useRealTimers();
  });

  it('does not request word metadata or passage translation for phrase-only prompts', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        dictionary_meaning: '不同层面的难题',
        meaning_in_context: '不同层面的难题',
        context_explanation: '此处强调问题层次不同。',
        detected_language: 'en'
      }) } }]
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await explainWithDeepSeek(
      { term: 'different problem', sentence: 'Knowing why is a different problem.', passageText: 'Knowing why is a different problem.' },
      { ...DEFAULT_SETTINGS, deepseekApiKey: 'test-api-key' }
    );

    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const requestBody = JSON.parse(requestInit.body as string);
    expect(requestBody.messages[1].content).not.toContain('part_of_speech');
    expect(requestBody.messages[1].content).not.toContain('phonetic');
    expect(requestBody.messages[1].content).not.toContain('passage_translation');
    expect(requestBody.messages[1].content).not.toContain('语境原文');
  });

  it('rejects missing API key', async () => {
    await expect(explainWithDeepSeek({ term: 'x', sentence: 'x' }, DEFAULT_SETTINGS))
      .rejects.toThrow('DeepSeek API key is not configured');
  });
});
