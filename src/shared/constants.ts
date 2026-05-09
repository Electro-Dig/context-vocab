export const STORAGE_KEYS = {
  SETTINGS: 'contextVocab.settings',
  WORD_ENTRIES: 'contextVocab.wordEntries',
  PAGE_MATCH_STATS: 'contextVocab.pageMatchStats'
} as const;

export const DEFAULT_DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
