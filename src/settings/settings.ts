/** Everything the reader can change in Settings → Quizcraft. Stored in data.json. */
export interface QuizcraftSettings {
  /** Deal multiple-choice options in random order. */
  shuffleOptions: boolean;
  /** Open code editors on the language picked last, across notes and restarts. */
  rememberLanguage: boolean;
}

export const DEFAULT_SETTINGS: Readonly<QuizcraftSettings> = {
  shuffleOptions: true,
  rememberLanguage: true,
};

/**
 * Saved data merged over the defaults. Unknown keys and values of the wrong
 * type are dropped, so a hand-edited or older data.json cannot break loading.
 */
export function mergeSettings(saved: unknown): QuizcraftSettings {
  const out: QuizcraftSettings = { ...DEFAULT_SETTINGS };
  if (typeof saved !== "object" || saved === null) return out;
  const data = saved as Record<string, unknown>;
  for (const key of Object.keys(out) as (keyof QuizcraftSettings)[]) {
    const value = data[key];
    if (typeof value === typeof out[key]) out[key] = value as boolean;
  }
  return out;
}
