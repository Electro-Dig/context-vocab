import type { AppSettings } from './types';
import { buildContextExplanationPrompt } from './prompt';

export interface ExplainInput {
  term: string;
  sentence: string;
  passageText?: string;
  surroundingText?: string;
  includePassageTranslation?: boolean;
}

export interface ExplainResult {
  partOfSpeech?: string;
  phonetic?: string;
  dictionaryMeaning?: string;
  meaningInContext: string;
  notThisMeaning?: string;
  contextExplanation: string;
  memoryHook?: string;
  naturalTranslation?: string;
  passageTranslation?: string;
  detectedLanguage: string;
}

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function extractJsonObject(content: string): Record<string, unknown> {
  const match = content.trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('DeepSeek response did not contain JSON');
  return JSON.parse(match[0]) as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function explainWithDeepSeek(input: ExplainInput, settings: AppSettings): Promise<ExplainResult> {
  if (!settings.deepseekApiKey.trim()) throw new Error('DeepSeek API key is not configured');

  const response = await fetch(settings.deepseekEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.deepseekApiKey}`
    },
    body: JSON.stringify({
      model: settings.deepseekModel,
      messages: [
        { role: 'system', content: '你是专业、简洁的英语语境词义解释器。只返回合法 JSON。' },
        { role: 'user', content: buildContextExplanationPrompt(input) }
      ],
      temperature: settings.temperature,
      max_tokens: settings.maxOutputTokens,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      stream: false
    })
  });

  if (!response.ok) throw new Error(`DeepSeek request failed: ${response.status} ${await response.text()}`);

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek response did not include content');

  const parsed = extractJsonObject(content);
  return {
    partOfSpeech: optionalString(parsed.part_of_speech),
    phonetic: optionalString(parsed.phonetic),
    dictionaryMeaning: optionalString(parsed.dictionary_meaning),
    meaningInContext: optionalString(parsed.meaning_in_context) ?? '',
    notThisMeaning: optionalString(parsed.not_this_meaning),
    contextExplanation: optionalString(parsed.context_explanation) ?? '',
    memoryHook: optionalString(parsed.memory_hook),
    naturalTranslation: optionalString(parsed.natural_translation),
    passageTranslation: optionalString(parsed.passage_translation),
    detectedLanguage: optionalString(parsed.detected_language) ?? 'en'
  };
}
