export const franc = (input: string): string =>
  /[\u0600-\u06FF]/u.test(input) ? "arb" : "eng";

