export function buildContextExplanationPrompt(input: {
  term: string;
  sentence: string;
  passageText?: string;
  surroundingText?: string;
  includePassageTranslation?: boolean;
}): string {
  const shouldTranslatePassage = Boolean(input.includePassageTranslation && input.passageText);
  const jsonFields = [
    'dictionary_meaning',
    'meaning_in_context',
    'not_this_meaning',
    'context_explanation',
    'memory_hook',
    'natural_translation',
    ...(shouldTranslatePassage ? ['passage_translation'] : []),
    'detected_language'
  ].join(', ');

  return [
    `词或短语：${input.term}`,
    `原句：${input.sentence}`,
    shouldTranslatePassage ? `语境原文：${input.passageText}` : '',
    input.surroundingText ? `补充上下文：${input.surroundingText}` : '',
    '',
    '任务：为中文母语者生成简洁、专业、非口语化的英文语境词义卡。',
    '要求：',
    '1. dictionary_meaning：给出“词典义”式直译含义，风格接近专业词典释义；不要编造具体词典来源。',
    '2. meaning_in_context：给出当前语境中的准确含义，短语不超过 18 个汉字。',
    '3. not_this_meaning：用“并非……”说明容易误解的边界。',
    '4. context_explanation：1 句说明为什么在此处取该含义。',
    '5. memory_hook：1 个简短记忆线索，可使用词根、搭配或场景联想。',
    '6. natural_translation：给出原句的自然中文译法。',
    shouldTranslatePassage
      ? '7. passage_translation：翻译整段语境原文；保持自然、完整，但不要添加原文没有的信息。'
      : '',
    '仅返回 JSON，不要 Markdown，不要前后缀。',
    `JSON 字段：${jsonFields}。`
  ]
    .filter(Boolean)
    .join('\n');
}
