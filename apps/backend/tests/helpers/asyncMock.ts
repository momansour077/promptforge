/** Adapt synchronous test doubles to promise APIs, preserving rejected throws. */
export const asAsync = <Args extends unknown[], Result>(
  implementation: (...args: Args) => Result
): ((...args: Args) => Promise<Result>) =>
  (...args) => Promise.resolve().then(() => implementation(...args));
