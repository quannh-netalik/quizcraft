import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, mergeSettings } from "../../src/settings/settings";

describe("mergeSettings", () => {
  test.each([[undefined], [null], ["junk"], [42]])("falls back to the defaults for %p", (saved) => {
    expect(mergeSettings(saved)).toEqual({ ...DEFAULT_SETTINGS });
  });

  test("keeps saved values over the defaults", () => {
    expect(mergeSettings({ shuffleOptions: false })).toEqual({ ...DEFAULT_SETTINGS, shuffleOptions: false });
  });

  test("drops unknown keys and wrong types", () => {
    expect(mergeSettings({ rememberLanguage: "no", extra: true })).toEqual({ ...DEFAULT_SETTINGS });
  });
});
