import { describe, expect, test } from "bun:test";
import { setupCard } from "../../src/widgets/quiz/card";
import { gradeOrder, inKeyOrder, orderKey, setupOrder } from "../../src/widgets/quiz/order";
import { callout, click, content } from "../helpers/dom";

const KEY = ["Boil water", "Add tea", "Steep", "Pour"];

/** An order quiz whose steps are listed in `steps` order, set up like the plugin does. */
function quiz(steps: readonly string[] = KEY): HTMLElement {
  const ul = `<ul>${steps.map((s) => `<li>${s}</li>`).join("")}</ul>`;
  const ol = `<ol>${KEY.map((s) => `<li>${s}</li>`).join("")}</ol>`;
  const el = callout("quiz", `<p>Make tea.</p>${ul}<p><mark>Answer</mark></p>${ol}`, { meta: "order" });
  setupCard(el);
  setupOrder(el);
  return el;
}

const tiles = (el: HTMLElement) => [...content(el).querySelectorAll<HTMLElement>(":scope > ul > li")];
const order = (el: HTMLElement) => tiles(el).map((li) => li.dataset.step);

function key(li: HTMLElement, k: string): void {
  li.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

describe("gradeOrder", () => {
  test("marks each position", () => {
    expect(gradeOrder(["Boil water", "Steep", "Add tea", "Pour"], KEY)).toEqual([true, false, false, true]);
  });
});

describe("setupOrder", () => {
  test("reads the numbered key", () => {
    const el = quiz();
    expect(orderKey((el as { eqQa?: HTMLElement }).eqQa)).toEqual(KEY);
  });

  test("never starts solved", () => {
    for (let n = 0; n < 20; n++) {
      const el = quiz();
      expect(inKeyOrder(KEY)(tiles(el))).toBe(false);
    }
  });

  test("ArrowUp and ArrowDown move a tile one place", () => {
    const el = quiz();
    const before = order(el);
    const second = tiles(el)[1]!;
    key(second, "ArrowUp");
    expect(order(el)).toEqual([before[1], before[0], before[2], before[3]]);
    key(second, "ArrowUp");
    expect(order(el)[0]).toBe(before[1]);
    key(second, "ArrowDown");
    expect(order(el)).toEqual(before);
  });

  test("grades positions and resets on Try again", () => {
    const el = quiz();
    // sort the tiles into the key order with the keyboard
    for (const [target, step] of KEY.entries()) {
      const li = tiles(el).find((t) => t.dataset.step === step)!;
      for (let at = tiles(el).indexOf(li); at > target; at--) key(li, "ArrowUp");
    }
    expect(order(el)).toEqual(KEY);
    const btn = el.querySelector<HTMLButtonElement>(".eq-btn")!;
    click(btn);
    expect(el.querySelectorAll(".eq-correct")).toHaveLength(4);
    expect(el.querySelector(".eq-status")!.textContent).toBe("Correct!");
    expect(btn.textContent).toBe("Try again");
    click(btn);
    expect(el.querySelectorAll(".eq-correct, .eq-wrong")).toHaveLength(0);
    expect(inKeyOrder(KEY)(tiles(el))).toBe(false);
  });

  test("reports a partial score", () => {
    const el = quiz();
    click(el.querySelector(".eq-btn")!);
    const right = el.querySelectorAll(".eq-correct").length;
    expect(right).toBeLessThan(4);
    expect(el.querySelector(".eq-status")!.textContent).toBe(`Not quite: ${right} of 4 right`);
  });

  test("keys are ignored after submit", () => {
    const el = quiz();
    const before = order(el);
    click(el.querySelector(".eq-btn")!);
    key(tiles(el)[1]!, "ArrowUp");
    expect(order(el)).toEqual(before);
  });
});
