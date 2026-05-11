export type Familiarity = 'unknown' | 'familiar' | 'known';

export interface AppSettings {
  extensionEnabled: boolean;
  aiEnabled: boolean;
  provider: 'deepseek';
  deepseekApiKey: string;
  deepseekEndpoint: string;
  deepseekModel: string;
  explanationLanguage: 'zh-CN';
  contextMode: 'sentence' | 'neighboring-sentences';
  temperature: number;
  maxOutputTokens: number;
  autoSaveOnExplain: boolean;
  highlightEnabled: boolean;
  preferCachedExplanations: boolean;
  showCurrentExample: boolean;
  showMemoryHook: boolean;
  showFamiliarityControl: boolean;
  showConfusingMeaning: boolean;
  prepareExtraInfo: boolean;
  cardDisplayVersion: number;
  settingsVersion: number;
}

export interface WordEntry {
  id: string;
  term: string;
  normalizedTerm: string;
  language: string;
  partOfSpeech?: string;
  phonetic?: string;
  dictionaryMeaning?: string;
  meaningInContext: string;
  notThisMeaning?: string;
  contextExplanation: string;
  memoryHook?: string;
  originalSentence: string;
  passageText?: string;
  passageTranslation?: string;
  naturalTranslation?: string;
  sourceUrl: string;
  sourceTitle?: string;
  familiarity: Familiarity;
  encounterCount: number;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageMatchStats {
  url: string;
  total: number;
  unknown: number;
  familiar: number;
  known: number;
  updatedAt: string;
}

export type RuntimeRequest =
  | {
      type: 'EXPLAIN_SELECTION';
      payload: {
        term: string;
        sentence: string;
        passageText?: string;
        surroundingText?: string;
        url: string;
        title?: string;
      };
    }
  | { type: 'SAVE_ENTRY'; payload: { entry: WordEntry; familiarity?: Familiarity } }
  | { type: 'GET_HIGHLIGHT_ENTRIES' }
  | { type: 'UPDATE_FAMILIARITY'; payload: { id: string; familiarity: Familiarity } }
  | { type: 'DELETE_ENTRY'; payload: { id: string } }
  | { type: 'PAGE_MATCH_STATS'; payload: Omit<PageMatchStats, 'updatedAt'> };
