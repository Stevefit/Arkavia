export type ChapterRole = "title" | "body" | "closing";

export type MessageSection = {
  text: string;
  role: ChapterRole;
  pullQuote: string | null;
};

const SECTION_DELIMITER = /^[\t ]*---[\t ]*$/m;
const EXPLICIT_QUOTE = /\*\*([^*\n]+)\*\*/;

function paragraphs(text: string) {
  return text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function lastSentence(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return sentences?.at(-1)?.trim() || null;
}

export function parseSections(template: string, name: string): MessageSection[] {
  const chunks = template.split(SECTION_DELIMITER)
    .map((chunk) => chunk.trim().replaceAll("{name}", name))
    .filter(Boolean);

  if (!chunks.length) return [];

  const bodyIndexes = chunks.flatMap((_, index) => index > 0 && index < chunks.length - 1 ? [index] : []);
  const longestBodyIndex = bodyIndexes.reduce((longest, index) => {
    if (longest === -1 || chunks[index].length > chunks[longest].length) return index;
    return longest;
  }, -1);

  return chunks.map((text, index) => {
    const role: ChapterRole = chunks.length === 1
      ? "closing"
      : index === 0
        ? "title"
        : index === chunks.length - 1
          ? "closing"
          : "body";
    const explicitQuote = role === "body" ? text.match(EXPLICIT_QUOTE)?.[1]?.trim() || null : null;
    const automaticQuote = role === "body" && index === longestBodyIndex && paragraphs(text).length > 1
      ? lastSentence(paragraphs(text)[0])
      : null;

    return { text, role, pullQuote: explicitQuote || automaticQuote };
  });
}
