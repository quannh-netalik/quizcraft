/** A bold key letter as written in the answer: `**B)**` or `**B.**`. */
export const KEY_LETTER_RE = /^([A-Z])[).]$/;

/**
 * Give the answer body structure the CSS can style (classes only, text untouched):
 * a "**B.** option text" paragraph becomes an .eq-key row whose letter is an
 * .eq-key-letter badge (data-letter="B"); a lone "**Why not the others**" line
 * becomes an .eq-sub heading and the list after it an .eq-sub-list.
 */
export function decorateBody(body: HTMLElement): void {
  if (body.dataset.eqDeco) return;
  body.dataset.eqDeco = "1";
  for (const p of body.querySelectorAll<HTMLElement>(":scope > p")) splitKeyLines(p);
  for (const p of body.querySelectorAll<HTMLElement>(":scope > p")) {
    const first = p.firstElementChild as HTMLElement | null;
    const lead = first?.tagName === "STRONG" ? (first.textContent?.trim() ?? "") : "";
    if (/^why not the others/i.test(lead) && p.textContent?.trim() === lead) {
      p.classList.add("eq-sub");
      const list = p.nextElementSibling;
      if (list?.tagName === "UL" || list?.tagName === "OL") list.classList.add("eq-sub-list");
      continue;
    }
    const m = KEY_LETTER_RE.exec(lead);
    if (!first || !m?.[1]) continue;
    // only when the letter opens the line, not when it is bold text further in
    if (!p.textContent?.trimStart().startsWith(first.textContent?.trimStart() ?? "")) continue;
    p.classList.add("eq-key");
    first.classList.add("eq-key-letter");
    first.dataset.letter = m[1];
    const rest = createSpan({ cls: "eq-key-text" });
    while (first.nextSibling) rest.append(first.nextSibling);
    p.append(rest);
  }
}

/**
 * Letters of the correct options, in the order the key lines list them.
 * Always the markdown letters: after a shuffle the text shows the dealt letter,
 * data-eq-orig the one the options are graded by.
 */
export function keyLetters(qa: HTMLElement): string[] {
  const out: string[] = [];
  for (const s of qa.querySelectorAll<HTMLElement>(".eq-qa-body strong")) {
    const letter = s.dataset.eqOrig ?? KEY_LETTER_RE.exec(s.textContent?.trim() ?? "")?.[1];
    if (letter && !out.includes(letter)) out.push(letter);
  }
  return out;
}

/**
 * Show each key letter under its letter after a shuffle. `map` goes from the
 * markdown letter to the displayed one; data-eq-orig keeps the markdown letter
 * so the key can be relabelled again on the next deal.
 */
export function relabelKey(qa: HTMLElement, map: ReadonlyMap<string, string>): void {
  for (const s of qa.querySelectorAll<HTMLElement>(".eq-qa-body strong")) {
    if (!s.dataset.eqOrig) {
      const m = /^([A-Z])([).])$/.exec(s.textContent?.trim() ?? "");
      if (!m?.[1] || !m[2]) continue;
      s.dataset.eqOrig = m[1];
      s.dataset.eqSep = m[2];
    }
    const shown = map.get(s.dataset.eqOrig) ?? s.dataset.eqOrig;
    s.textContent = shown + (s.dataset.eqSep ?? ".");
    if (s.dataset.letter) s.dataset.letter = shown; // .eq-key-letter badge
  }
}

const isKey = (n: Node | undefined): boolean =>
  n?.nodeName === "STRONG" && KEY_LETTER_RE.test(n.textContent?.trim() ?? "");

/**
 * Multi-select keys sit on consecutive lines, which Markdown renders as one <p>
 * with <br>s. Split such a paragraph so every key line gets its own badge.
 */
function splitKeyLines(p: HTMLElement): void {
  const nodes = [...p.childNodes];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const br = nodes[i];
    if (br?.nodeName !== "BR") continue;
    let j = i + 1;
    while (j < nodes.length && nodes[j]?.nodeType === Node.TEXT_NODE && !nodes[j]?.textContent?.trim()) j++;
    if (!isKey(nodes[j])) continue;
    const line = createEl("p");
    while (br.nextSibling) line.append(br.nextSibling);
    if (line.firstChild?.nodeType === Node.TEXT_NODE && !line.firstChild.textContent?.trim()) line.firstChild.remove();
    br.remove();
    p.after(line);
  }
}
