import { describe, expect, test } from "bun:test";
import { cellKey, formatResult, parseFormulas, setupCalc } from "../../src/widgets/calc/sheet";
import { callout } from "../helpers/dom";

/** A [!calc] callout whose table body is `rows`; `==x==` cells are given as <mark>. */
function sheet(meta: string, rows: string[][]): HTMLElement {
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  const el = callout("calc", `<table><thead><tr><th></th><th></th></tr></thead><tbody>${body}</tbody></table>`, {
    title: "Budget",
    meta,
  });
  setupCalc(el);
  return el;
}

const cell = (el: HTMLElement, row: number, col: number) =>
  el.querySelectorAll("tbody tr")[row - 1]!.children[col - 1] as HTMLElement;

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("cellKey", () => {
  test("letters columns and counts rows from 1", () => {
    expect(cellKey(0, 0)).toBe("A1");
    expect(cellKey(1, 6)).toBe("B7");
  });
});

describe("parseFormulas", () => {
  test("reads key=formula pairs split by ;", () => {
    expect([...parseFormulas("b7=B2+B6; B8 = round(B7/3,2)")]).toEqual([
      ["B7", "B2+B6"],
      ["B8", "round(B7/3,2)"],
    ]);
  });

  test("skips parts without a key or formula", () => {
    expect([...parseFormulas("=1;B2=;;C3=4")]).toEqual([["C3", "4"]]);
  });
});


describe("formatResult", () => {
  test("trims float noise and trailing zeros", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
    expect(formatResult(2)).toBe("2");
  });

  test("shows an em dash for non-finite values", () => {
    expect(formatResult(Infinity)).toBe("\u2014");
    expect(formatResult(Number.NaN)).toBe("\u2014");
  });
});

/** Two inputs, a total and a weekly figure. */
const rows = () => [
  ["Rent", "<mark>1000</mark>"],
  ["Food", "<mark>400</mark>"],
  ["Total", "1400"],
  ["Per week", "350"],
];

describe("setupCalc", () => {
  test("turns marks into inputs and computes outputs", () => {
    const el = sheet("B3=B1+B2;B4=round(B3/4,1)", rows());
    expect(el.querySelectorAll("input.eq-calc-in")).toHaveLength(2);
    expect(cell(el, 3, 2).textContent).toBe("1400");
    expect(cell(el, 3, 2).classList.contains("eq-calc-out")).toBe(true);
  });

  test("recomputes on input, through chained formulas", () => {
    const el = sheet("B3=B1+B2;B4=round(B3/4,1)", rows());
    type(cell(el, 2, 2).querySelector("input")!, "601");
    expect(cell(el, 3, 2).textContent).toBe("1601");
    expect(cell(el, 4, 2).textContent).toBe("400.3");
  });


  test("keeps the static value of an unsupported formula", () => {
    const el = sheet("B3=SUM(B1:B2)", rows());
    expect(cell(el, 3, 2).textContent).toBe("1400");
  });


});
