import type { AttachmentCategory } from "./attachment-config";

export type { AttachmentCategory };

export const TASK_STATUSES = ["pending", "in-progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Plain, serializable shape handed to client components. */
export type TaskDTO = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** null for tasks that predate projects, or that were never assigned to one. */
  projectId: string | null;
  /**
   * Who the task is *for*, which is not necessarily who created it.
   *
   * Never null in the DTO: a task with no stored assignee resolves to its
   * creator, which is what every task meant before assignment existed. That
   * keeps old rows correct without a migration.
   */
  assigneeId: string;
  /** Who performed the assignment. Null until someone actually hands it over. */
  assignedById: string | null;
  assignedAt: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  completed: "Completed",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    (TASK_PRIORITIES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = ["active", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Colours are stored as tokens, not hex. Tailwind compiles class names
 * statically, so `bg-${hex}` would never produce a class — the token maps to a
 * fixed set of classes in the UI instead.
 */
export const PROJECT_COLORS = [
  "indigo",
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_NAME_MAX = 80;
export const PROJECT_DESCRIPTION_MAX = 500;

export type ProjectDTO = {
  id: string;
  name: string;
  description: string;
  color: ProjectColor;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Derived from the project's tasks — never stored on the document. */
export type ProjectStats = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  /** 0–100, rounded. 0 when the project has no tasks. */
  progress: number;
};

export type ProjectWithStats = ProjectDTO & {
  stats: ProjectStats;
  /** Includes the owner. */
  memberCount: number;
  /** The viewing user's role — drives which controls the UI offers. */
  role: ProjectRole;
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(value)
  );
}

export function isProjectColor(value: unknown): value is ProjectColor {
  return (
    typeof value === "string" &&
    (PROJECT_COLORS as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export type CalendarEventType = "task" | "project";

/** Which date on the source record put this event on the calendar. */
export type CalendarEventKind = "due" | "start" | "deadline";

export type CalendarEvent = {
  /** Unique per event, not per record: one task can appear twice (start + due). */
  id: string;
  type: CalendarEventType;
  kind: CalendarEventKind;
  title: string;
  /** Local "YYYY-MM-DD" — the key the grid buckets on. */
  dayKey: string;
  date: string;
  taskId: string | null;
  projectId: string | null;
  projectName: string | null;
  /** null for tasks with no project; the UI falls back to a neutral colour. */
  projectColor: ProjectColor | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  /** dueDate in the past and not completed. Never true for project deadlines
   *  or completed tasks. */
  overdue: boolean;
};

/** A task on the upcoming list, with the project context it needs to render. */
export type UpcomingTask = TaskDTO & {
  projectName: string | null;
  projectColor: ProjectColor | null;
};

// ---------------------------------------------------------------------------
// Task detail: subtasks, daily updates, attachments, links
// ---------------------------------------------------------------------------

export const SUBTASK_TITLE_MAX = 200;
export const UPDATE_CONTENT_MAX = 5000;
export const LINK_TITLE_MAX = 120;
export const MAX_HOURS_PER_UPDATE = 24;

export type SubtaskDTO = {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
};

export type DailyUpdateDTO = {
  id: string;
  /** Local YYYY-MM-DD, the day the work happened. */
  date: string;
  content: string;
  blocker: string;
  hoursWorked: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentDTO = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: AttachmentCategory;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
  /** Authenticated route, not a public storage URL. */
  url: string;
};

export type TaskLinkDTO = {
  id: string;
  title: string;
  url: string;
  addedById: string;
  createdAt: string;
};

/**
 * Events the Activity Feed will record once it's built.
 *
 * Declared now so services can be wired to emit them without reshaping the
 * data later. Nothing writes these yet — there is deliberately no ActivityLog
 * model or UI in this phase.
 */
export const ACTIVITY_EVENTS = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "DAILY_UPDATE_CREATED",
  "ATTACHMENT_UPLOADED",
  "ATTACHMENT_DELETED",
  "SUBTASK_CREATED",
  "SUBTASK_COMPLETED",
  "LINK_ADDED",
] as const;

export type ActivityEvent = (typeof ACTIVITY_EVENTS)[number];

/** Everything the task detail page renders, gathered server-side. */
export type TaskDetailData = {
  task: TaskDTO;
  subtasks: SubtaskDTO[];
  updates: DailyUpdateDTO[];
  attachments: AttachmentDTO[];
  links: TaskLinkDTO[];
  /** Total hours across all updates — Analytics can consume this later. */
  totalHours: number;
  assigneeName: string;
  /** Who created the task. Always shown — it's a different question. */
  creatorName: string;
  /** Who performed the assignment. Null when nobody has reassigned it. */
  assignedByName: string | null;
  /**
   * People the task can be handed to: the project's members.
   *
   * Empty for a task with no project — there's nobody to hand it to, so the
   * sidebar renders a plain name instead of a picker.
   */
  assignableMembers: ProjectMemberDTO[];
  projectName: string | null;
  projectColor: ProjectColor | null;
  /** Resolved server-side from task ownership or project role. */
  canEdit: boolean;
  canDelete: boolean;
};

// ---------------------------------------------------------------------------
// Settings: profile, preferences
// ---------------------------------------------------------------------------

export const NAME_MAX = 80;
export const BIO_MAX = 280;
export const PASSWORD_MIN = 6;

export type UserProfileDTO = {
  name: string;
  /** Read-only until there's an email verification flow. */
  email: string;
  bio: string;
  /** ISO instant. Falls back to the ObjectId timestamp for older accounts. */
  createdAt: string;
};

export const THEMES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const WEEK_STARTS = ["monday", "sunday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export const WEEK_START_LABELS: Record<WeekStart, string> = {
  monday: "Monday",
  sunday: "Sunday",
};

export type NotificationPreferences = {
  taskUpdates: boolean;
  projectUpdates: boolean;
  teamActivity: boolean;
  calendarReminders: boolean;
};

export type UserPreferencesDTO = {
  theme: ThemeChoice;
  weekStartsOn: WeekStart;
  compactMode: boolean;
  notifications: NotificationPreferences;
};

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  taskUpdates: true,
  projectUpdates: true,
  teamActivity: true,
  calendarReminders: true,
};

export const DEFAULT_PREFERENCES: UserPreferencesDTO = {
  theme: "system",
  weekStartsOn: "monday",
  compactMode: false,
  notifications: DEFAULT_NOTIFICATIONS,
};

export const NOTIFICATION_COPY: Record<
  keyof NotificationPreferences,
  { title: string; description: string }
> = {
  taskUpdates: {
    title: "Task updates",
    description: "When a task you're involved in changes status or is edited.",
  },
  projectUpdates: {
    title: "Project updates",
    description: "When a project you belong to is edited or archived.",
  },
  teamActivity: {
    title: "Team activity",
    description: "When someone joins, leaves, or is invited to your projects.",
  },
  calendarReminders: {
    title: "Calendar reminders",
    description: "Ahead of a task's due date or a project deadline.",
  },
};

export function isTheme(value: unknown): value is ThemeChoice {
  return (
    typeof value === "string" && (THEMES as readonly string[]).includes(value)
  );
}

export function isWeekStart(value: unknown): value is WeekStart {
  return (
    typeof value === "string" &&
    (WEEK_STARTS as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Collaboration: members, roles, invitations
// ---------------------------------------------------------------------------

export const PROJECT_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

/** Owner is never assignable — it follows Project.ownerId. */
export const INVITABLE_ROLES = ["admin", "member", "viewer"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<InvitableRole, string> = {
  admin: "Can edit the project and manage members",
  member: "Can create and edit tasks",
  viewer: "Can view the project and its tasks",
};

export type ProjectPermission =
  | "project:view"
  | "project:edit"
  | "project:delete"
  | "members:manage"
  | "task:create"
  | "task:edit"
  | "task:delete";

export function isProjectRole(value: unknown): value is ProjectRole {
  return (
    typeof value === "string" &&
    (PROJECT_ROLES as readonly string[]).includes(value)
  );
}

export function isInvitableRole(value: unknown): value is InvitableRole {
  return (
    typeof value === "string" &&
    (INVITABLE_ROLES as readonly string[]).includes(value)
  );
}

export type ProjectMemberDTO = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
};

export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export type ProjectInvitationDTO = {
  id: string;
  projectId: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  invitedByName: string | null;
  expiresAt: string;
  createdAt: string;
};

/** What the invitation landing page needs — deliberately no token echoed back. */
export type InvitationPreview = {
  projectName: string;
  projectColor: ProjectColor;
  invitedByName: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  expiresAt: string;
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_COMPLETED",
  "MEMBER_JOINED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Which Settings toggle silences which notification.
 *
 * The preferences UI has shipped for a while with nothing reading it; this is
 * the map that finally gives those switches an effect.
 */
export const NOTIFICATION_PREFERENCE_FOR: Record<
  NotificationType,
  keyof NotificationPreferences
> = {
  TASK_ASSIGNED: "taskUpdates",
  TASK_COMPLETED: "taskUpdates",
  MEMBER_JOINED: "teamActivity",
};

/**
 * The preference keys something actually writes today.
 *
 * Derived from the map above rather than listed by hand, so wiring up a new
 * notification type automatically stops Settings from calling it dormant.
 */
export const LIVE_NOTIFICATION_PREFERENCES: ReadonlySet<
  keyof NotificationPreferences
> = new Set(Object.values(NOTIFICATION_PREFERENCE_FOR));

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  /**
   * Written at creation time rather than joined on read.
   *
   * A notification is a record of something that happened, so it has to survive
   * the task being renamed or deleted — a join would turn it into "Unknown".
   */
  title: string;
  body: string;
  actorName: string;
  taskId: string | null;
  projectId: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationFeed = {
  items: NotificationDTO[];
  unread: number;
};

/** How many the bell menu holds. Older ones simply age out of the panel. */
export const NOTIFICATION_PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const ANALYTICS_RANGES = ["7d", "30d", "month", "3m", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  "3m": "Last 3 months",
  all: "All time",
};

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return (
    typeof value === "string" &&
    (ANALYTICS_RANGES as readonly string[]).includes(value)
  );
}

/** Counts for tasks *created* in the selected period. */
export type AnalyticsOverview = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  /** 0–100, rounded. 0 when there are no tasks. */
  completionRate: number;
};

export type ProductivityPoint = { key: string; label: string; count: number };

export type TaskStatusSlice = {
  status: TaskStatus;
  count: number;
  /** 0–100, rounded. */
  percent: number;
};

export type PrioritySlice = {
  priority: TaskPriority;
  count: number;
  percent: number;
};

export type ProjectPerformanceRow = {
  id: string;
  name: string;
  color: ProjectColor;
  total: number;
  completed: number;
  /** 0–100. 0 for projects with no tasks. */
  progress: number;
};

export type OverdueStats = {
  /** Current state, not period-scoped: overdue is a "right now" fact. */
  overdue: number;
  /** Completed tasks that had a due date. */
  completedWithDueDate: number;
  /** …of which finished on or before it. */
  onTime: number;
  /** null when no completed task ever had a due date. */
  onTimeRate: number | null;
};

export type InsightTone = "positive" | "warning" | "neutral";

export type ProductivityInsight = {
  id: string;
  tone: InsightTone;
  icon: string;
  message: string;
};

export type AnalyticsData = {
  range: AnalyticsRange;
  /** Granularity the productivity chart ended up using. */
  granularity: "day" | "week" | "month";
  overview: AnalyticsOverview;
  productivity: ProductivityPoint[];
  statuses: TaskStatusSlice[];
  priorities: PrioritySlice[];
  projects: ProjectPerformanceRow[];
  overdueStats: OverdueStats;
  insights: ProductivityInsight[];
  /** False when the account has no tasks at all — drives the empty state. */
  hasAnyTasks: boolean;
};
