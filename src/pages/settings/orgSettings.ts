export function normalizeSettingValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  // Supabase already decodes JSONB strings. The fallback keeps compatibility
  // with older rows that may contain an extra JSON-encoded string layer.
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
}
