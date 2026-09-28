/** Compare whole quoted passages; never treat a shorter excerpt as a duplicate. */
const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
export function appendQuote(notes: string, text: string) {
  const quote = text.trim();
  if (!quote) return { content: notes, added: false };
  const blocks = notes.match(/^>[^\n]*(?:\n>[^\n]*)*/gm) ?? [];
  if (blocks.some(block => normalize(block.replace(/^> ?/gm, "")) === normalize(quote))) {
    return { content: notes, added: false };
  }
  const block = `${quote.split("\n").map(line => `> ${line}`).join("\n")}\n\n我的想法：\n\n`;
  return { content: notes ? `${notes}\n\n${block}` : block, added: true };
}
