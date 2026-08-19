import { describe, expect, it } from "vitest";
import { normalizeSettingValue } from "./orgSettings";

describe("normalizeSettingValue", () => {
  it("keeps JSONB strings already decoded by Supabase", () => {
    expect(normalizeSettingValue("America/New_York")).toBe("America/New_York");
  });

  it("unwraps legacy double-encoded string values", () => {
    expect(normalizeSettingValue('"Thrive Agency"')).toBe("Thrive Agency");
  });

  it("ignores non-string values", () => {
    expect(normalizeSettingValue({ value: "USD" })).toBeUndefined();
  });
});
