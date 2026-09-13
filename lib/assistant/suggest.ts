/**
 * Follow-up questions, derived from what the tools actually returned.
 *
 * The obvious alternative — asking the model for three follow-ups — costs a
 * second round trip per answer and burns the free tier's request quota to
 * produce something it has to invent. The server already holds the real data,
 * so suggestions can name real projects and real people for free, instantly,
 * and without a chance of hallucinating a project that doesn't exist.
 */

export type ToolOutcomeRecord = { name: string; result: unknown };

type ProjectRow = {
  name?: string;
  status?: string;
  tasks?: { total?: number; completed?: number };
};

type TaskRow = { title?: string; overdue?: boolean; assignee?: string | null };
type MemberRow = { name?: string; isYou?: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Case- and punctuation-insensitive, so "Apollo?" matches "apollo". */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, "");

/**
 * The meaningful words of a phrase.
 *
 * Comparison is by word rather than substring because substrings produce
 * nonsense matches on short input — "hi" is inside "this", which silently
 * suppressed every suggestion for anyone who typed a two-letter question.
 * Words under three characters are dropped as noise.
 */
const wordsIn = (value: string): Set<string> =>
  new Set(normalise(value).split(/\s+/).filter((word) => word.length > 2));

export function buildSuggestions(
  outcomes: ToolOutcomeRecord[],
  question: string,
  canWrite: boolean,
): string[] {
  const asked = normalise(question);
  const askedWords = wordsIn(question);
  const suggestions: string[] = [];

  const add = (text: string) => {
    // Never suggest something the user effectively just asked, and never twice.
    const key = normalise(text);
    if (suggestions.length >= 3) return;
    if (suggestions.some((s) => normalise(s) === key)) return;

    // "Effectively the same question" means every meaningful word of the
    // suggestion was already in the question. A confirmation turn carries no
    // question at all, which leaves askedWords empty and lets everything
    // through — as it should.
    const words = wordsIn(text);
    if (
      words.size > 0 &&
      [...words].every((word) => askedWords.has(word))
    ) {
      return;
    }

    suggestions.push(text);
  };

  const resultsFor = (name: string) =>
    outcomes.filter((o) => o.name === name).map((o) => o.result);

  // --- grounded in real names ---------------------------------------------
  for (const result of resultsFor("list_projects")) {
    if (!Array.isArray(result)) continue;

    const projects = result as ProjectRow[];
    const unfinished = projects.filter(
      (p) => p.status === "active" && (p.tasks?.total ?? 0) > 0,
    );

    const target = unfinished[0] ?? projects[0];
    if (target?.name && !asked.includes(normalise(target.name))) {
      add(`How is ${target.name} going?`);
    }
  }

  for (const result of resultsFor("list_members")) {
    if (!Array.isArray(result)) continue;

    const other = (result as MemberRow[]).find((m) => !m.isYou && m.name);
    if (other?.name) add(`What is ${other.name} working on?`);
  }

  for (const result of resultsFor("list_tasks")) {
    if (!isRecord(result) || !Array.isArray(result.tasks)) continue;

    const tasks = result.tasks as TaskRow[];
    const overdue = tasks.find((t) => t.overdue && t.title);

    if (overdue?.title) add(`What's the latest on "${overdue.title}"?`);
    if (tasks.length === 0) add("What have I completed recently?");
  }

  for (const result of resultsFor("get_task")) {
    if (!isRecord(result)) continue;
    const title = typeof result.title === "string" ? result.title : null;

    if (title && canWrite) add(`Mark "${title}" as in progress`);
    if (typeof result.project === "string" && result.project) {
      add(`What else is in ${result.project}?`);
    }
  }

  // --- generic, but only to fill the gaps ---------------------------------
  const fallbacks = [
    "What's due this week?",
    "What's overdue?",
    "How am I doing this month?",
    "What is everyone working on?",
  ];

  for (const fallback of fallbacks) add(fallback);

  return suggestions.slice(0, 3);
}
