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

export type BinOp = "+" | "-" | "*" | "/" | "^";

/**
 * round/ceil/floor take an optional number of digits, like a spreadsheet:
 * `round(3.14159, 2)` is 3.14, `ceil(12, -1)` is 20.
 */
const FUNCTIONS = {
  round: Math.round,
  ceil: Math.ceil,
  floor: Math.floor,
} as const;

export type FnName = keyof typeof FUNCTIONS;

const isFn = (name: string): name is FnName => Object.hasOwn(FUNCTIONS, name);

function applyFn(name: FnName, x: number, digits = 0): number {
  const scale = 10 ** Math.trunc(digits);
  return FUNCTIONS[name](x * scale) / scale;
}

/** Parsed formula. */
export type Expr =
  | { kind: "num"; value: number }
  | { kind: "ref"; key: string }
  | { kind: "neg"; arg: Expr }
  | { kind: "bin"; op: BinOp; left: Expr; right: Expr }
  | { kind: "call"; name: FnName; args: Expr[] };

/**
 * Parse a formula. Grammar, loosest first:
 *
 *     expr  := term (("+" | "-") term)*
 *     term  := unary (("*" | "/") unary)*
 *     unary := ("-" | "+") unary | power
 *     power := atom ("^" unary)?
 *     atom  := number | ref | name "(" expr ("," expr)? ")" | "(" expr ")"
 */
export function parse(src: string): Expr {
  const tokens = tokenize(src);
  let i = 0;
  const isOp = (...ops: string[]): string | undefined => {
    const t = tokens[i];
    return t?.kind === "op" && ops.includes(t.op) ? t.op : undefined;
  };
  const expect = (op: string): void => {
    if (!isOp(op)) throw new FormulaError(`expected "${op}" in ${src}`);
    i++;
  };

  const atom = (): Expr => {
    const t = tokens[i++];
    if (t?.kind === "num") return { kind: "num", value: t.value };
    if (t?.kind === "ref") return { kind: "ref", key: t.key };
    if (t?.kind === "name") {
      if (!isFn(t.name)) throw new FormulaError(`unknown function ${t.name} in ${src}`);
      expect("(");
      const args = [expr()];
      if (isOp(",")) {
        i++;
        args.push(expr());
      }
      expect(")");
      return { kind: "call", name: t.name, args };
    }
    if (t?.kind === "op" && t.op === "(") {
      const inner = expr();
      expect(")");
      return inner;
    }
    throw new FormulaError(`unexpected ${t ? JSON.stringify(t) : "end"} in ${src}`);
  };
  // right-associative: 2^3^2 is 2^(3^2); the exponent may carry a sign (2^-1)
  const power = (): Expr => {
    const left = atom();
    if (!isOp("^")) return left;
    i++;
    return { kind: "bin", op: "^", left, right: unary() };
  };
  const unary = (): Expr => {
    const op = isOp("-", "+");
    if (!op) return power();
    i++;
    const arg = unary();
    return op === "-" ? { kind: "neg", arg } : arg;
  };
  const binary = (next: () => Expr, ...ops: BinOp[]) => (): Expr => {
    let left = next();
    for (let op = isOp(...ops); op; op = isOp(...ops)) {
      i++;
      left = { kind: "bin", op: op as BinOp, left, right: next() };
    }
    return left;
  };
  const term = binary(unary, "*", "/");
  const expr = binary(term, "+", "-");

  const out = expr();
  if (i < tokens.length) throw new FormulaError(`unexpected trailing input in ${src}`);
  return out;
}

/** Value of a cell, by key. */
export type Lookup = (key: string) => number;

/** Value of `e`, reading cells through `lookup`. Division by zero gives Infinity or NaN. */
export function evaluate(e: Expr, lookup: Lookup): number {
  switch (e.kind) {
    case "num":
      return e.value;
    case "ref":
      return lookup(e.key);
    case "neg":
      return -evaluate(e.arg, lookup);
    case "bin": {
      const a = evaluate(e.left, lookup);
      const b = evaluate(e.right, lookup);
      if (e.op === "+") return a + b;
      if (e.op === "-") return a - b;
      if (e.op === "*") return a * b;
      if (e.op === "/") return a / b;
      return a ** b;
    }
    case "call": {
      const [x, digits] = e.args.map((a) => evaluate(a, lookup));
      return applyFn(e.name, x ?? Number.NaN, digits);
    }
  }
}
