"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUp,
  Check,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import Markdown from "./Markdown";

type PendingWrite = {
  callId: string;
  tool: string;
  summary: string;
};

/** What the transcript renders. The API history is kept separately, untouched. */
type Bubble =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string };

/**
 * Opaque here on purpose: the provider's own conversation format, carried
 * verbatim between turns. The panel never reads into it and never constructs
 * one — it posts plain text and stores whatever the server hands back, so
 * changing model vendor doesn't touch this file.
 */
type Wire = unknown[];

const SUGGESTIONS = [
  "What's overdue?",
  "What's due this week?",
  "How is the DevTrack project going?",
  "What is everyone working on?",
];

/** What the panel is doing while it waits, in words rather than a spinner. */
const TOOL_LABELS: Record<string, string> = {
  list_projects: "Checking your projects",
  list_tasks: "Looking through tasks",
  get_task: "Reading the task",
  list_members: "Checking who's on the project",
  get_analytics: "Crunching the numbers",
  create_task: "Preparing a new task",
  update_task: "Preparing the change",
  assign_task: "Preparing the reassignment",
};

const describeTools = (names: string[]) => {
  const labels = names.map((name) => TOOL_LABELS[name] ?? "Looking that up");
  return `${labels[0]}${labels.length > 1 ? ` and ${labels.length - 1} more` : ""}…`;
};

export default function AssistantPanel({ onClose }: { onClose: () => void }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [history, setHistory] = useState<Wire>([]);
  const [pending, setPending] = useState<PendingWrite[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Follow the conversation as it grows, including while text streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, pending, busy, suggestions]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Reads the newline-delimited stream.
   *
   * Text arrives in chunks of a few words at a time; each one is appended to
   * the last assistant bubble, which is created on the first chunk rather than
   * up front so a tool-only turn doesn't leave an empty bubble behind.
   */
  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setActivity(null);
    setSuggestions([]);

    let streaming = false;

    const appendDelta = (delta: string) => {
      setBubbles((current) => {
        if (!streaming) return current;

        const last = current[current.length - 1];
        if (last?.role !== "assistant") return current;

        return [
          ...current.slice(0, -1),
          { role: "assistant", text: last.text + delta },
        ];
      });
    };

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : "The assistant is unavailable right now.",
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (line: string) => {
        if (!line.trim()) return;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line);
        } catch {
          return; // A partial line; the next read completes it.
        }

        switch (event.type) {
          case "text": {
            const delta = String(event.delta ?? "");
            if (!delta) return;

            setActivity(null);

            if (!streaming) {
              streaming = true;
              setBubbles((current) => [
                ...current,
                { role: "assistant", text: delta },
              ]);
            } else {
              appendDelta(delta);
            }
            return;
          }

          case "tool":
            setActivity(describeTools((event.names as string[]) ?? []));
            return;

          case "done":
            setHistory(event.history as Wire);
            setSuggestions((event.suggestions as string[]) ?? []);
            setPending(null);
            return;

          case "confirm":
            setHistory(event.history as Wire);
            setPending(event.pending as PendingWrite[]);
            return;

          case "error":
            setError(String(event.error ?? "Something went wrong."));
            return;

          default:
            return;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) handle(line);
      }

      if (buffer) handle(buffer);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
      setActivity(null);
    }
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy || pending) return;

    setInput("");
    setBubbles((current) => [...current, { role: "user", text: question }]);

    // Plain text — the server appends it in whatever shape the provider wants.
    await post({ history, message: question });
  };

  const answer = async (approved: boolean) => {
    if (busy) return;
    setPending(null);

    if (!approved) {
      setBubbles((current) => [
        ...current,
        { role: "user", text: "No — don't do that." },
      ]);
    }

    await post({ history, confirm: { approved } });
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Ask about your work
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {bubbles.length === 0 && (
          <div className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ask about projects, tasks, deadlines or who&apos;s working on
              what. I can also create and update tasks — you&apos;ll confirm
              before anything changes.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {bubbles.map((bubble, index) => (
          <div
            key={index}
            className={bubble.role === "user" ? "flex justify-end" : ""}
          >
            {bubble.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white">
                {bubble.text}
              </div>
            ) : (
              // The model formats its answers, so render the Markdown rather
              // than showing the user the asterisks.
              <Markdown text={bubble.text} />
            )}
          </div>
        ))}

        {busy && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {activity ?? "Thinking…"}
          </div>
        )}

        {/* Built server-side from what the lookups actually returned, so they
            name real projects and people rather than inventing plausible ones. */}
        {suggestions.length > 0 && !busy && !pending && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Built server-side from the tool input, not from the sentence above
            it — so what you approve is what runs. */}
        {pending && !busy && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {pending.length > 1
                ? `${pending.length} changes need your approval`
                : "This will change your data"}
            </p>

            <ul className="mt-2 space-y-1">
              {pending.map((write) => (
                <li
                  key={write.callId}
                  className="text-sm text-amber-900 dark:text-amber-100"
                >
                  {write.summary}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void answer(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Confirm
              </button>

              <button
                type="button"
                onClick={() => void answer(false)}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800/60">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            disabled={busy || Boolean(pending)}
            placeholder={
              pending ? "Confirm or cancel above first…" : "Ask a question…"
            }
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter is a newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            className="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100"
          />

          <button
            type="submit"
            disabled={busy || !input.trim() || Boolean(pending)}
            aria-label="Send"
            className="shrink-0 rounded-lg bg-indigo-600 p-1.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
