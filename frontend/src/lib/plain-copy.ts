/** Display-only punctuation cleanup. Stored reports and source records stay intact. */
export function plainCopy<T>(value: T): T {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return value;
    return (value.trim() === "\u2014" ? "Not available"
      : value.replace(/\s*\u2014\s*/g, ", ").replace(/\u2013/g, "-")) as T;
  }
  if (Array.isArray(value)) return value.map(item => plainCopy(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainCopy(item)])) as T;
  }
  return value;
}
