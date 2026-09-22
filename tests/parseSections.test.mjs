import assert from "node:assert/strict";
import test from "node:test";
import { parseSections } from "../lib/parseSections.ts";

test("splits delimiter lines, replaces names, drops empty chunks, and assigns roles", () => {
  const sections = parseSections("---\nHai {name}\n\n---\nIsi\n\n---\nPenutup {name}\n---", "Godel");
  assert.deepEqual(sections.map(({ text, role }) => ({ text, role })), [
    { text: "Hai Godel", role: "title" },
    { text: "Isi", role: "body" },
    { text: "Penutup Godel", role: "closing" },
  ]);
});

test("keeps a legacy template as one closing card", () => {
  const sections = parseSections("Hai DJ {name}\n\nPesan lama.", "Rein");
  assert.equal(sections.length, 1);
  assert.equal(sections[0].role, "closing");
  assert.equal(sections[0].text, "Hai DJ Rein\n\nPesan lama.");
});

test("uses an explicit double-asterisk phrase as the pull quote", () => {
  const sections = parseSections("Salam\n---\nMalam yang **tidak terlupakan**.\n\nParagraf kedua.\n---\nPenutup", "DJ");
  assert.equal(sections[1].pullQuote, "tidak terlupakan");
});

test("creates one automatic pull quote from the longest multi-paragraph body", () => {
  const sections = parseSections("Salam\n---\nBagian singkat.\n---\nKalimat pembuka. Kalimat yang dipilih!\n\nParagraf kedua yang membuat bagian ini lebih panjang.\n---\nPenutup", "DJ");
  assert.equal(sections[1].pullQuote, null);
  assert.equal(sections[2].pullQuote, "Kalimat yang dipilih!");
});
