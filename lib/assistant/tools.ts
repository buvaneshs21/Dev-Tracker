import { ANALYTICS_RANGES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types";

/**
 * What the assistant can do, as JSON Schema.
 *
 * Two rules govern every definition here:
 *
 *  1. **No tool takes a user id.** Not a userId, not an ownerId, not an
 *     "on behalf of". The caller is always the session user, resolved
 *     server-side from the cookie. A model can't be talked into looking at
 *     someone else's workspace because there is no parameter that would
 *     express it. (`assigneeId` is the one id that appears, and it is checked
 *     against the project's membership before anything is written.)
 *
 *  2. **Writes are declared, not hidden.** WRITE_TOOLS below is the list the
 *     route stops on to ask the user first. Adding a tool that changes data
 *     without adding it there is the one mistake that would matter, so the
 *     executor refuses to run anything it doesn't recognise as one or the
 *     other.
 *
 * Deletion is deliberately absent. A chat interface is the wrong place to
 * destroy data that has no undo.
 */

export const READ_TOOLS = [
  "list_projects",
  "list_tasks",
  "get_task",
  "list_members",
  "get_analytics",
] as const;

export const WRITE_TOOLS = ["create_task", "update_task", "assign_task"] as const;

export type ReadTool = (typeof READ_TOOLS)[number];
export type WriteTool = (typeof WRITE_TOOLS)[number];
export type ToolName = ReadTool | WriteTool;

export function isWriteTool(name: string): name is WriteTool {
  return (WRITE_TOOLS as readonly string[]).includes(name);
}

export function isKnownTool(name: string): name is ToolName {
  return (
    (READ_TOOLS as readonly string[]).includes(name) || isWriteTool(name)
  );
}

/**
 * Plain JSON Schema, deliberately not a provider's tool type.
 *
 * Every model vendor accepts JSON Schema for function parameters, so keeping
 * the definitions neutral means switching provider touches one adapter file
 * rather than all eight tools.
 */
export type ToolSpec = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
};

/** Only tools the user's role actually allows are offered. */
export function toolsFor(canWrite: boolean): ToolSpec[] {
  return canWrite ? TOOLS : TOOLS.filter((tool) => !isWriteTool(tool.name));
}

export const TOOLS: ToolSpec[] = [
  {
    name: "list_projects",
    description:
      "List the projects the user can see, with progress, task counts, member count, their role, and dates. Use this first when a question mentions a project by name, so you can resolve the name to an id.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [...(["active", "completed", "archived"] as const)],
          description: "Optional filter. Omit to get every project.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "list_tasks",
    description:
      "List tasks, newest first. Every filter is optional and they combine. Use overdueOnly for 'what's late', dueBefore for 'due this week'. Returns at most `limit` tasks (default 50).",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Restrict to one project. Get the id from list_projects.",
        },
        status: { type: "string", enum: [...TASK_STATUSES] },
        priority: { type: "string", enum: [...TASK_PRIORITIES] },
        assigneeId: {
          type: "string",
          description:
            "Restrict to tasks assigned to one person. Get the id from list_members. Use 'me' for the current user.",
        },
        dueBefore: {
          type: "string",
          description: "ISO date (YYYY-MM-DD). Tasks due on or before this day.",
        },
        dueAfter: {
          type: "string",
          description: "ISO date (YYYY-MM-DD). Tasks due on or after this day.",
        },
        overdueOnly: {
          type: "boolean",
          description:
            "Only tasks past their due date and not yet completed. Ignores dueBefore/dueAfter.",
        },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get_task",
    description:
      "Everything about one task: description, assignee, who assigned it, subtasks, daily work log with hours, links, and attachment names. Use it when the user asks about a specific task in depth — list_tasks is enough for counts and summaries.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "From list_tasks." },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_members",
    description:
      "Who is on a project, with their role. Use it to resolve a person's name to an id before filtering or assigning.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "From list_projects." },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_analytics",
    description:
      "Aggregate statistics for the user's own tasks over a period: totals by status and priority, completion rate, per-project progress, overdue and on-time rates. Use it for 'how am I doing' questions rather than counting list_tasks yourself.",
    parameters: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: [...ANALYTICS_RANGES],
          description: "Defaults to 30d.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },

  // --- writes: the route stops and asks before any of these run -----------
  {
    name: "create_task",
    description:
      "Create a task. Requires confirmation from the user before it takes effect, so state plainly what you are about to create.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        projectId: {
          type: "string",
          description: "Omit for a personal task with no project.",
        },
        priority: { type: "string", enum: [...TASK_PRIORITIES] },
        dueDate: { type: "string", description: "ISO date (YYYY-MM-DD)." },
        startDate: { type: "string", description: "ISO date (YYYY-MM-DD)." },
        assigneeId: {
          type: "string",
          description:
            "Must be a member of the project. Get the id from list_members.",
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "update_task",
    description:
      "Change a task's title, description, status, priority or dates. Only the fields you pass are changed. Requires confirmation from the user.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: [...TASK_STATUSES] },
        priority: { type: "string", enum: [...TASK_PRIORITIES] },
        dueDate: {
          type: "string",
          description: "ISO date (YYYY-MM-DD), or empty string to clear it.",
        },
        startDate: {
          type: "string",
          description: "ISO date (YYYY-MM-DD), or empty string to clear it.",
        },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  },
  {
    name: "assign_task",
    description:
      "Hand a task to someone. They must already be a member of the task's project. Requires confirmation from the user.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        assigneeId: {
          type: "string",
          description: "From list_members on the task's project.",
        },
      },
      required: ["taskId", "assigneeId"],
      additionalProperties: false,
    },
  },
];

/**
 * A one-line, human-readable description of a pending write.
 *
 * This is what the user actually reads before clicking Confirm, so it's built
 * from the tool input rather than from anything the model wrote in prose — the
 * sentence and the action can't drift apart.
 */
export function describeWrite(name: string, input: Record<string, unknown>): string {
  const str = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string) : undefined;

  switch (name) {
    case "create_task": {
      const bits = [`Create task "${str("title") ?? "Untitled"}"`];
      if (str("priority")) bits.push(`priority ${str("priority")}`);
      if (str("dueDate")) bits.push(`due ${str("dueDate")}`);
      if (str("assigneeId")) bits.push("with an assignee");
      return bits.join(" · ");
    }

    case "update_task": {
      const changed = [
        "title",
        "description",
        "status",
        "priority",
        "dueDate",
        "startDate",
      ].filter((key) => key in input);

      return changed.length
        ? `Update the task's ${changed.join(", ")}`
        : "Update the task";
    }

    case "assign_task":
      return "Reassign this task";

    default:
      return `Run ${name}`;
  }
}
