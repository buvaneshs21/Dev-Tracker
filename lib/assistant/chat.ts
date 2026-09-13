import {
  GoogleGenAI,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type Part,
} from "@google/genai";

import { executeTool, userCanWrite } from "./execute";
import { buildSuggestions, type ToolOutcomeRecord } from "./suggest";
import { describeWrite, isWriteTool, toolsFor, type ToolSpec } from "./tools";

/**
 * The assistant's agentic loop, with a confirmation gate on writes.
 *
 * This is the only file that knows which model vendor we use. The tools, the
 * permission checks, the confirmation protocol and the UI are all provider
 * neutral — swapping vendor means rewriting this file and nothing else.
 *
 * A manual loop rather than the SDK's automatic function calling, for one
 * reason: approval here happens *across HTTP requests*. Automatic calling
 * would run every function it chose, including the writes, before returning.
 * So the loop pauses instead, hands the pending writes back to the client, and
 * is resumed by a second request carrying the answer.
 *
 * Reads run unattended; nothing they can do is worth interrupting for.
 */

/**
 * Overridable because model names come and go faster than deployments, and a
 * retired id would otherwise need a code change to fix.
 *
 * Note that `models.list()` is not a reliable guide to what a key may call:
 * it still advertises `gemini-2.5-flash`, which now answers generateContent
 * with "no longer available to new users". The list is a catalogue, not an
 * entitlement — the only real test is a request.
 *
 * Free-tier daily quotas differ sharply between models and the newest are the
 * tightest — `gemini-3.6-flash` allows 20 requests a day, and since one
 * question costs two to four of them that's about five questions before the
 * assistant stops working until midnight. Hence the slightly older default.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

/**
 * Caps a single exchange. Each step is an API call, so a model stuck in a
 * look-up loop would otherwise burn the free tier's daily quota in a minute.
 */
const MAX_STEPS = 8;

export type PendingWrite = {
  callId: string;
  tool: string;
  /** Built from the tool arguments, not the model's prose, so they can't diverge. */
  summary: string;
};

export type ChatResult =
  | {
      status: "done";
      text: string;
      history: Content[];
      /** Grounded in the tool results — see suggest.ts. */
      suggestions: string[];
    }
  | {
      status: "confirm";
      text: string;
      pending: PendingWrite[];
      history: Content[];
    }
  | { status: "error"; error: string };

/**
 * Progress reported while the answer is still being produced.
 *
 * `text` fires per streamed chunk; `tool` fires once per round of lookups, so
 * the panel can say what it's doing instead of showing a spinner for four
 * seconds while the model reads the database.
 */
export type ChatEvents = {
  onText?: (delta: string) => void;
  onTool?: (names: string[]) => void;
};

/**
 * Gemini takes JSON Schema directly via `parametersJsonSchema`, so the neutral
 * ToolSpec passes through untouched — no per-vendor schema dialect to
 * translate into.
 */
function declarationsFor(tools: ToolSpec[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  }));
}

function systemPrompt(userName: string, today: string): string {
  return `You are the assistant inside DevTrack, a project and task tracker. You are helping ${userName}.

Today is ${today}.

You answer questions about their projects, tasks, deadlines, teammates and progress by calling the functions available to you. You can also create, update and reassign tasks — those changes are shown to the user for confirmation before they take effect, so say plainly what you are about to do.

How to work:
- Resolve names to ids before anything else. A question about "the DevTrack project" starts with list_projects; one about "Harry's tasks" starts with list_members.
- Prefer get_analytics over counting list_tasks results yourself when the question is about rates, totals or progress.
- Call several functions at once when they don't depend on each other.

How to answer:
- Be brief and concrete. Lead with the answer, then the supporting detail.
- Use the person's name, never their id. Write dates the way a person would — "Tuesday", "12 Mar" — not ISO strings.
- Ground every claim in a function result. If a function returns nothing, say so plainly rather than guessing; if a question can't be answered with the functions you have, say that too.
- Never invent a task, project, person or date.`;
}

/** Function calls don't always carry an id, so fall back to a stable index. */
const callKey = (call: FunctionCall, index: number) =>
  call.id ?? `${call.name ?? "call"}-${index}`;

/**
 * Pulls the human-readable sentence out of an API error.
 *
 * The SDK throws with the raw JSON body as the message —
 * `{"error":{"code":404,"message":"…","status":"NOT_FOUND"}}` — which is
 * unreadable in a chat bubble but contains exactly the sentence a developer
 * needs. Returns null when it isn't that shape.
 */
function apiMessage(detail: string): string | null {
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } };
    const message = parsed.error?.message;
    return typeof message === "string" && message ? message : null;
  } catch {
    return null;
  }
}

type QuotaDetail = { "@type"?: string; violations?: { quotaId?: string; quotaValue?: string }[] };

/**
 * Reads which quota was exhausted out of a RESOURCE_EXHAUSTED error.
 *
 * Google attaches a QuotaFailure detail naming the limit, e.g.
 * `GenerateRequestsPerDayPerProjectPerModel-FreeTier` with value `20`. Without
 * it, a daily exhaustion reads as "try again in a minute" — advice that will
 * still be wrong twelve hours later.
 */
function quotaViolation(
  detail: string,
): { perDay: boolean; value: string | null } | null {
  try {
    const parsed = JSON.parse(detail) as {
      error?: { details?: QuotaDetail[] };
    };

    for (const entry of parsed.error?.details ?? []) {
      if (!entry["@type"]?.includes("QuotaFailure")) continue;

      const violation = entry.violations?.[0];
      if (!violation?.quotaId) continue;

      return {
        perDay: /PerDay/i.test(violation.quotaId),
        value: violation.quotaValue ?? null,
      };
    }
  } catch {
    // Not the shape we expect — fall back to the generic message.
  }

  return null;
}

const partsOf = (content: Content | undefined): Part[] => content?.parts ?? [];

const textOf = (content: Content | undefined): string =>
  partsOf(content)
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text)
    .join("")
    .trim();

const callsIn = (content: Content | undefined): FunctionCall[] =>
  partsOf(content)
    .map((part) => part.functionCall)
    .filter((call): call is FunctionCall => Boolean(call?.name));

/**
 * Runs every function call in one model turn and returns the results as a
 * single user turn.
 *
 * All of a turn's responses have to arrive together, so this collects rather
 * than sending as it goes. `declined` short-circuits execution while still
 * producing a response for every call — a missing one leaves the conversation
 * malformed and the model waiting.
 */
async function runCalls(
  calls: FunctionCall[],
  userId: string,
  declined: boolean,
  record: ToolOutcomeRecord[],
): Promise<Content> {
  const parts = await Promise.all(
    calls.map(async (call): Promise<Part> => {
      const name = call.name!;

      const response =
        declined && isWriteTool(name)
          ? {
              error:
                "The user declined this change. Acknowledge it and do not retry without being asked.",
            }
          : await (async () => {
              const outcome = await executeTool(
                name,
                (call.args ?? {}) as Record<string, unknown>,
                userId,
              );

              // Kept so follow-up suggestions can be built from real data
              // rather than asked for in a second round trip.
              if (outcome.ok) record.push({ name, result: outcome.result });

              return outcome.ok
                ? { output: outcome.result }
                : { error: outcome.error };
            })();

      return {
        functionResponse: {
          ...(call.id ? { id: call.id } : {}),
          name,
          response,
        },
      };
    }),
  );

  return { role: "user", parts };
}

/**
 * Rebuilds one complete turn from the chunks of a stream.
 *
 * The SDK has no aggregation helper, and a naive "join the text" loses parts
 * the model needs back verbatim — `thoughtSignature` on Gemini 3.x carries its
 * reasoning across steps, so dropping it degrades every later turn. Only
 * adjacent plain-text parts are merged; everything else is kept as it arrived.
 */
function mergeParts(incoming: Part[]): Part[] {
  const merged: Part[] = [];

  const isPlainText = (part: Part | undefined) =>
    Boolean(
      part &&
        typeof part.text === "string" &&
        !part.thought &&
        !part.thoughtSignature &&
        !part.functionCall &&
        !part.functionResponse,
    );

  for (const part of incoming) {
    const last = merged[merged.length - 1];

    if (isPlainText(part) && isPlainText(last)) {
      last.text = (last.text ?? "") + (part.text ?? "");
    } else {
      merged.push({ ...part });
    }
  }

  return merged;
}

export type ChatOptions = {
  userId: string;
  userName: string;
  /** The conversation so far, in the provider's own shape. */
  history: Content[];
  /** A new question. Omitted when this request answers a confirmation. */
  message?: string;
  /**
   * Set when this request answers a pending confirmation. The history's last
   * turn is then the paused model turn, and its calls run now — or are
   * refused, if false.
   */
  resume?: { approved: boolean };
};

export async function runAssistant(
  { userId, userName, history: incoming, message, resume }: ChatOptions,
  events: ChatEvents = {},
): Promise<ChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      status: "error",
      error: "The assistant isn't configured on this server.",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  // Withheld entirely rather than offered-and-refused: a viewer shouldn't be
  // shown a capability the server would reject.
  const canWrite = await userCanWrite(userId);
  const tools = [{ functionDeclarations: declarationsFor(toolsFor(canWrite)) }];

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const history: Content[] = [...incoming];

  if (message) {
    history.push({ role: "user", parts: [{ text: message }] });
  }

  // Every successful lookup this exchange makes, so the follow-up suggestions
  // can be grounded in what was actually found.
  const outcomes: ToolOutcomeRecord[] = [];

  // Resuming: the paused turn's calls run (or don't) before the next request.
  if (resume) {
    const last = history[history.length - 1];
    const calls = callsIn(last);

    if (last?.role !== "model" || calls.length === 0) {
      return { status: "error", error: "There's nothing awaiting confirmation." };
    }

    events.onTool?.(calls.map((call) => call.name!));

    // Approval is consent, not authority: executeTool re-checks every
    // permission regardless of what was confirmed.
    history.push(
      await runCalls(calls, userId, !resume.approved || !canWrite, outcomes),
    );
  }

  try {
    for (let step = 0; step < MAX_STEPS; step += 1) {
      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents: history,
        config: {
          systemInstruction: systemPrompt(userName, today),
          tools,
        },
      });

      const parts: Part[] = [];
      let finishReason: string | undefined;

      for await (const chunk of stream) {
        const candidate = chunk.candidates?.[0];
        finishReason = candidate?.finishReason ?? finishReason;

        for (const part of candidate?.content?.parts ?? []) {
          parts.push(part);

          // Thinking parts are internal; showing them would leak reasoning
          // into the answer.
          if (typeof part.text === "string" && part.text && !part.thought) {
            events.onText?.(part.text);
          }
        }
      }

      if (parts.length === 0) {
        // Usually a safety block — the candidate comes back with a reason and
        // no content at all.
        return {
          status: "error",
          error:
            finishReason === "SAFETY"
              ? "I can't help with that one. Try rephrasing?"
              : "The assistant didn't return an answer. Try again.",
        };
      }

      const content: Content = { role: "model", parts: mergeParts(parts) };
      const calls = callsIn(content);

      if (calls.length === 0) {
        return {
          status: "done",
          text: textOf(content) || "I don't have an answer for that.",
          history: [...history, content],
          suggestions: buildSuggestions(outcomes, message ?? "", canWrite),
        };
      }

      // Append the whole turn — thought signatures included, which the model
      // needs echoed back to keep its own reasoning across steps.
      history.push(content);

      const writes = calls.filter((call) => isWriteTool(call.name!));

      if (writes.length > 0) {
        // Pause the *entire* turn, not just the writes. A turn's function
        // responses have to arrive together, so any reads alongside them wait
        // too — harmless, since reads change nothing and simply run on resume.
        return {
          status: "confirm",
          text: textOf(content),
          pending: writes.map((call, index) => ({
            callId: callKey(call, index),
            tool: call.name!,
            summary: describeWrite(
              call.name!,
              (call.args ?? {}) as Record<string, unknown>,
            ),
          })),
          history,
        };
      }

      // Named so the panel can say "Looking up tasks…" rather than spinning.
      events.onTool?.(calls.map((call) => call.name!));

      history.push(await runCalls(calls, userId, false, outcomes));
    }

    return {
      status: "error",
      error: "That took too many steps. Try asking something narrower.",
    };
  } catch (err) {
    // The SDK surfaces HTTP failures as errors carrying the API's own message.
    // Quota and bad-key failures are the two a self-hosted user will actually
    // hit, and both are fixable — so say which it was rather than "an error".
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[assistant] generateContent failed:", detail);

    if (/API[_ ]?key|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(detail)) {
      return { status: "error", error: "The assistant's API key is missing or invalid." };
    }

    if (/quota|RESOURCE_EXHAUSTED|429|rate/i.test(detail)) {
      // Per-minute and per-day exhaustion look almost identical in the message
      // but call for opposite advice — wait a moment, versus wait until
      // tomorrow or change model. The quota id is what distinguishes them.
      const quota = quotaViolation(detail);

      if (quota?.perDay) {
        return {
          status: "error",
          error: `The free tier's daily quota for ${MODEL} is used up${
            quota.value ? ` (${quota.value} requests/day)` : ""
          }. It resets at midnight Pacific — or set GEMINI_MODEL to a different model.`,
        };
      }

      return {
        status: "error",
        error: "Too many requests just now — wait a minute and try again.",
      };
    }

    if (/not found|NOT_FOUND|404/i.test(detail)) {
      // Google's own message names the replacement model when one is retired
      // — far more useful than anything this code could guess, so pass it on
      // rather than paraphrasing it away.
      const advice = apiMessage(detail);

      return {
        status: "error",
        error: advice
          ? `${advice} (set GEMINI_MODEL to override)`
          : `The model "${MODEL}" isn't available to this key. Set GEMINI_MODEL to one that is.`,
      };
    }

    return { status: "error", error: "The assistant is unavailable right now." };
  }
}
