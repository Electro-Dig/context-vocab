export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function createEntryId(language: string, term: string): string {
  return `${language.trim().toLowerCase()}:${normalizeTerm(term)}`;
}
