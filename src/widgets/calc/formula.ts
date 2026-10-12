// The [!calc] formula language: numbers, cell references (`B2`), + - * / ^,
// parentheses and round/ceil/floor. Parsed by hand instead of handing the
// formula to `new Function`, so a note can never run code.

/** A formula the parser cannot read. The cell keeps the value the note gives it. */
export class FormulaError extends Error {
  override name = "FormulaError";
}

export type Token =
  | { kind: "num"; value: number }
  | { kind: "ref"; key: string }
  | { kind: "name"; name: string }
  | { kind: "op"; op: string };

// one token after optional spaces: number | cell ref | function name | operator
const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z]{1,2}\d+)(?![A-Za-z\d])|([A-Za-z]+)|([-+*/^(),]))/y;

/** Split a formula into tokens. Cell refs are upper-cased, names lower-cased. */
export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let at = 0;
  while (src.slice(at).trim()) {
    TOKEN_RE.lastIndex = at;
    const m = TOKEN_RE.exec(src);
    if (!m) throw new FormulaError(`unexpected "${src.slice(at).trim().charAt(0)}" in ${src}`);
    at = TOKEN_RE.lastIndex;
    const [, num, ref, name, op] = m;
    if (num !== undefined) out.push({ kind: "num", value: Number(num) });
    else if (ref !== undefined) out.push({ kind: "ref", key: ref.toUpperCase() });
    else if (name !== undefined) out.push({ kind: "name", name: name.toLowerCase() });
    else out.push({ kind: "op", op: op ?? "" });
  }
  return out;
}
