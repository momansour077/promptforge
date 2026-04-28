export const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

export const estimateTokens = (value: string): number =>
  Math.max(1, Math.ceil(value.trim().length / 4));

