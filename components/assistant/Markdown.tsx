"use client";

import { Fragment, type ReactNode } from "react";

import { splitInline, toBlocks } from "@/lib/assistant/markdown-blocks";

/**
 * A deliberately small Markdown renderer for assistant answers.
 *
 * The model writes `**bold**`, bullet lists and the occasional `code` span —
 * nothing else — so a full Markdown library would be a large dependency and a
 * sanitisation surface for three constructs. This builds React elements
 * directly and never touches `dangerouslySetInnerHTML`, so there is no path
 * from model output to injected HTML at all.
 *
 * Parsing lives in lib/assistant/markdown-blocks.ts, where it can be tested
 * against the partial input that streaming produces.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return splitInline(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    if (token.kind === "bold") {
      return (
        <strong key={key} className="font-semibold text-slate-900 dark:text-slate-100">
          {token.text}
        </strong>
      );
    }

    if (token.kind === "italic") {
      return (
        <em key={key} className="italic">
          {token.text}
        </em>
      );
    }

    if (token.kind === "code") {
      return (
        <code
          key={key}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-800"
        >
          {token.text}
        </code>
      );
    }

    return <Fragment key={key}>{token.text}</Fragment>;
  });
}

export default function Markdown({ text }: { text: string }) {
  const blocks = toBlocks(text);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
      {blocks.map((block, index) =>
        block.kind === "heading" ? (
          // Rendered as emphasis rather than a real <h*>: this sits inside a
          // dialog whose heading is "Ask about your work", and nesting model
          // output into the document outline would be wrong.
          <p
            key={index}
            className="pt-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {renderInline(block.text, String(index))}
          </p>
        ) : block.kind === "list" ? (
          <ul key={index} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="flex gap-2"
                style={{ marginLeft: item.depth * 14 }}
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                />
                <span className="min-w-0">
                  {renderInline(item.text, `${index}-${itemIndex}`)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            {/* Joined with a space, not a newline: the model wraps prose
                mid-sentence and honouring those breaks reflows badly in a
                narrow panel. */}
            {renderInline(block.lines.join(" "), String(index))}
          </p>
        ),
      )}
    </div>
  );
}
