import { setIcon } from "obsidian";
import { guard } from "../../lib/dom";
import type { Widget } from "../registry";
import { evaluate, type Expr, FormulaError, parse } from "./formula";

export const CALC_SELECTOR = '.callout[data-callout="calc"]';

/** One body cell of the table, keyed like a spreadsheet cell. */
export interface Cell {
  td: HTMLElement;
  /** The text the note gives the cell. */
  base: string;
  /** Set for `==x==` cells, which the reader can edit. */
  input?: HTMLInputElement;
}

/** Spreadsheet key of a body cell: column letter and 1-based row, `A1` top left. */
export function cellKey(col: number, row: number): string {
  return String.fromCodePoint(65 + col) + String(row + 1);
}

/**
 * A cell's text as a number; anything unreadable counts as 0, like an empty
 * cell. Thousands separators (`1,200`) and a trailing unit (`12 kg`, `5%`)
 * are allowed.
 */
export function toNumber(text: string): number {
  const n = Number.parseFloat(text.replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * How an output cell shows a result: at most 6 decimals, no trailing zeros.
 * Division by zero and the like show an em dash, not "NaN" or "Infinity".
 */
export function formatResult(v: number): string {
  return Number.isFinite(v) ? String(Number(v.toFixed(6))) : "\u2014";
}

/**
 * Formulas from the callout metadata: `[!calc|B7=B2+B6;B8=round(B7/3,2)]`
 * gives B7 = `B2+B6` and B8 = `round(B7/3,2)`. Keys are upper-cased; parts
 * without a key or a formula are skipped.
 */
export function parseFormulas(meta: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of meta.split(";")) {
    const at = part.indexOf("=");
    if (at <= 0) continue;
    const key = part.slice(0, at).trim().toUpperCase();
    const formula = part.slice(at + 1).trim();
    if (key && formula) out.set(key, formula);
  }
  return out;
}

/** Every body cell of `table` by key. The header row is not part of the grid. */
export function readCells(table: HTMLTableElement): Map<string, Cell> {
  const cells = new Map<string, Cell>();
  for (const [r, tr] of [...table.querySelectorAll("tbody tr")].entries()) {
    for (const [k, td] of [...tr.children].entries()) {
      if (!(td instanceof HTMLElement)) continue;
      const key = cellKey(k, r);
      // ==x== renders as <mark>: the reader may change that value
      const mark = td.querySelector("mark");
      const cell: Cell = { td, base: (mark ?? td).textContent?.trim() ?? "" };
      if (mark) {
        cell.input = createEl("input", {
          cls: "eq-calc-in",
          attr: { type: "text", inputmode: "decimal", value: cell.base, "aria-label": key },
        });
        td.empty();
        td.appendChild(cell.input);
      }
      cells.set(key, cell);
    }
  }
  return cells;
}

/**
 * `> [!calc] title` holding a table: a small spreadsheet. Row n, column k of
 * the table body is cell `<letter k><n>`. `==x==` cells become inputs; cells
 * named in the metadata hold formulas and recompute on every edit.
 */
export function setupCalc(box: HTMLElement): void {
  if (box.dataset.eqCalc) return;
  const table = box.querySelector<HTMLTableElement>(":scope > .callout-content table");
  if (!table) return;
  box.dataset.eqCalc = "1";
  box.classList.add("eq-calc");
  const formulas = parseFormulas(box.dataset.calloutMetadata ?? "");
  const cells = readCells(table);
  const compiled = new Map<string, Expr>();
  for (const [key, formula] of formulas) {
    const cell = cells.get(key);
    if (!cell) continue;
    cell.td.addClass("eq-calc-out");
    try {
      compiled.set(key, parse(formula));
    } catch (error) {
      // a formula outside the language keeps the value the note shows
      if (!(error instanceof FormulaError)) throw error;
    }
  }

  // cells being evaluated right now: meeting one again means a cycle (A1=B1, B1=A1)
  const busy = new Set<string>();
  // results of this recalc, so a cell many formulas read is computed once
  const memo = new Map<string, number>();
  const value = (key: string): number => {
    const known = memo.get(key);
    if (known !== undefined) return known;
    const cell = cells.get(key);
    if (!cell) return 0;
    const expr = compiled.get(key);
    // inside a cycle the cell counts as the number the note gives it
    if (!expr || busy.has(key)) return toNumber(cell.input ? cell.input.value : cell.base);
    busy.add(key);
    try {
      const v = evaluate(expr, value);
      memo.set(key, v);
      return v;
    } finally {
      busy.delete(key);
    }
  };
  const recalc = () => {
    memo.clear();
    for (const key of compiled.keys()) cells.get(key)?.td.setText(formatResult(value(key)));
  };
  for (const cell of cells.values()) cell.input?.addEventListener("input", recalc);
  recalc();

  // reset puts every input back to the value the note gives it
  const title = box.querySelector<HTMLElement>(":scope > .callout-title");
  if (!title) return;
  const reset = title.createDiv({ cls: "eq-calc-reset", attr: { "aria-label": "Reset values", role: "button" } });
  setIcon(reset, "rotate-ccw");
  guard(reset, () => {
    for (const cell of cells.values()) if (cell.input) cell.input.value = cell.base;
    recalc();
  });
}

export const calcSheet: Widget = {
  name: "calc",
  selector: CALC_SELECTOR,
  setup: (box) => setupCalc(box),
};
