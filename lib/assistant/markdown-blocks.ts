/**
 * Block and inline parsing for assistant answers.
 *
 * Kept separate from the React component so it can be tested directly: it has
 * to cope with *incomplete* input, because answers stream in and `**Ship the
 * do` arrives before its closing marker. Unmatched markers stay literal and
 * resolve on the next chunk.
 */

export type Bullet = { depth: number; text: string };

export type Block =
  | { kind: "list"; items: Bullet[] }
  | { kind: "para"; lines: string[] }
  | { kind: "heading"; text: string };

/** Matches `* item`, `- item` and `1. item`, capturing the indent. */
const BULLET = /^(\s*)(?:[*-]|\d+\.)\s+(.*)$/;

/** `# `, `## `, `### ` — the model uses these to head a section. */
const HEADING = /^#{1,6}\s+(.*)$/;

/**
 * Inline syntax, longest-first so `**bold**` never matches as two italics.
 *
 * Italic is strict about spacing — no whitespace just inside the markers —
 * because the loose form turns arithmetic like `2 * 3 * 4` into emphasis.
 * Markdown itself requires this for the same reason.
 */
const INLINE = /(\*\*[^*\n]+\*\*|\*(?![\s*])[^*\n]*[^\s*]\*|`[^`\n]+`)/g;

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string };

export function splitInline(text: string): InlineToken[] {
  const pieces = text.split(INLINE);
  const tokens: InlineToken[] = [];

  pieces.forEach((piece, index) => {
    if (piece === "") return;

    // With a single capturing group, split() alternates: even indices are the
    // literal text between matches, odd indices are the matches themselves.
    //
    // Classifying by content instead — "does it start and end with *?" — is
    // wrong, because literal text can look exactly like a match. "* spaced *"
    // is deliberately NOT italic (Markdown forbids the inner spaces), yet it
    // starts and ends with an asterisk, so sniffing marked it up anyway.
    if (index % 2 === 0) {
      tokens.push({ kind: "text", text: piece });
      return;
    }

    if (piece.startsWith("**")) {
      tokens.push({ kind: "bold", text: piece.slice(2, -2) });
    } else if (piece.startsWith("`")) {
      tokens.push({ kind: "code", text: piece.slice(1, -1) });
    } else {
      tokens.push({ kind: "italic", text: piece.slice(1, -1) });
    }
  });

  return tokens;
}

export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let openParagraph = false;

  for (const line of text.split("\n")) {
    // Checked before bullets: `#` can't start a list, and a heading always
    // stands alone.
    const heading = HEADING.exec(line);

    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] });
      openParagraph = false;
      continue;
    }

    const bullet = BULLET.exec(line);

    if (bullet) {
      const item: Bullet = {
        // One level of nesting is all the model produces; deeper indents are
        // clamped rather than growing the margin without limit.
        depth: Math.min(Math.floor(bullet[1].length / 2), 1),
        text: bullet[2],
      };

      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });

      openParagraph = false;
      continue;
    }

    if (line.trim() === "") {
      // A blank line closes whatever block was open, without creating one.
      openParagraph = false;
      continue;
    }

    const last = blocks[blocks.length - 1];
    if (openParagraph && last?.kind === "para") last.lines.push(line);
    else {
      blocks.push({ kind: "para", lines: [line] });
      openParagraph = true;
    }
  }

  return blocks;
}
