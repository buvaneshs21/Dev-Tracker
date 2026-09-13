# DevTrack — architecture and design notes

A written account of what this project is, how it is put together, and where it
is weak. Intended for review: the last two sections list the known gaps and the
decisions most worth arguing with, because those are where a reviewer adds more
than a reading of the code would.

Roughly 23,000 lines across 213 TypeScript files.

---

## 1. What it is

A collaborative project and task tracker. A user signs up, creates projects,
files tasks into them, invites teammates with roles, assigns work, logs daily
progress against a task, attaches files, and gets a dashboard, calendar and
analytics over all of it. Task changes and notifications propagate live to
other people's open browsers. A chat assistant answers questions about the
data and can create or change tasks with confirmation.

| | |
|---|---|
| Framework | Next.js 16.2.4, App Router, Turbopack |
| Runtime | React 19.2, Node 24 |
| Database | MongoDB Atlas via Mongoose 9 |
| Auth | JWT in an httpOnly cookie, bcryptjs |
| Styling | Tailwind v4 |
| Realtime | Socket.IO 4.8, standalone relay process |
| Assistant | Google Gemini (`@google/genai`) |
| Storage | Pluggable driver — local disk or S3/R2 |

Notable Next 16 specifics: `middleware.ts` is now **`proxy.ts`** and must export
a function named `proxy`; it defaults to the Node runtime, which is why
`jsonwebtoken` works inside it. `params` and `searchParams` are Promises and
must be awaited. `cookies()` is async.

---

## 2. Running it

```bash
npm run dev          # app + realtime relay
npm run dev:app      # app alone — live views fall back to polling
npm run db:check     # diagnose the database connection
npm run build && npm start
```

`.env.local`:

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | Atlas seed-list URI (see §12 on `mongodb+srv`) |
| `JWT_SECRET` | yes | signs session cookies **and** socket tokens |
| `GEMINI_API_KEY` | no | enables the assistant; absent hides the button |
| `GEMINI_MODEL` | no | defaults to `gemini-3.5-flash` |
| `NEXT_PUBLIC_SOCKET_URL` | no | relay address for the browser |
| `REALTIME_URL` | no | relay address for the server |
| `REALTIME_EMIT_SECRET` | no | shared secret, server-to-server only |
| `REALTIME_PORT`, `REALTIME_ALLOWED_ORIGIN` | no | relay config |
| `S3_*` | no | object storage; falls back to local disk |

Every optional group degrades rather than breaks: no relay means polling, no
API key means no assistant button, no S3 means local disk.

---

## 3. Layout

```
app/
  (auth)/login, (auth)/signup     public
  dashboard, tasks, projects,     authenticated pages
  calendar, analytics, settings/*
  tasks/[taskId], projects/[projectId]
  invitations/[token]
  api/                            30 route handlers

lib/
  auth.ts, session.ts             token signing and reading
  permissions.ts                  DB-backed authorisation (server only)
  roles.ts                        the pure role→permission matrix (client-safe)
  tasks.ts, projects.ts, members.ts, invitations.ts
  task-detail.ts, subtasks.ts, daily-updates.ts, task-links.ts, attachments.ts
  analytics.ts, calendar.ts, notifications.ts, assignment.ts
  mongodb.ts                      connection cache
  model.ts                        HMR-safe model registration
  realtime/  events.ts, emit.ts   the realtime contract and outbound bridge
  assistant/ tools.ts, execute.ts, chat.ts, suggest.ts, markdown-blocks.ts
  storage/   index.ts, local.ts, s3.ts

models/                           11 Mongoose schemas
components/                       12 feature folders
realtime/server.mts               standalone Socket.IO relay
proxy.ts                          route gating
```

The `lib/` layer holds all data access and authorisation. Route handlers are
thin: parse, authorise, call a lib function, serialise. Server components call
the same lib functions directly rather than fetching their own API.

---

## 4. The security model

This is the spine of the codebase, and the part most worth scrutinising.

### Sessions

`POST /api/auth/login` verifies a bcrypt hash and sets a JWT in an httpOnly,
sameSite cookie. `lib/session.ts` reads it; nothing else reads the raw cookie.

`proxy.ts` gates pages: `GUEST_ONLY` (`/`, `/login`, `/signup`) redirects
authenticated users to the dashboard; `PROTECTED` redirects anonymous ones to
login and clears a dead cookie. **The proxy is not the security boundary** —
API routes bypass it entirely, so every handler re-checks the session itself.

### Authorisation

Two files, deliberately split:

- **`lib/roles.ts`** — the pure `role → permission` matrix. Imports no models,
  so client components can use it to decide which buttons to render.
- **`lib/permissions.ts`** — the database-backed checks. Server only.

The split exists because client components importing `roleCan` from
`permissions.ts` pulled Mongoose into the browser bundle and broke the build
with 18 module-not-found errors (`async_hooks`, `dns`, `tls`…). Anything the
client renders is a *mirror* of a rule that is enforced again server-side.

Roles: `owner` > `admin` > `member` > `viewer`. `Project.ownerId` is the source
of truth for ownership — the owner resolves to `owner` whether or not a
membership row exists, so projects created before collaboration shipped still
work without a migration, and there can never be two owners.

### Task access

`resolveTaskAccess(taskId, userId)` in `lib/tasks.ts` is the single path:

1. Your own task → full control.
2. Otherwise, a task in a project you belong to → your project role decides.
3. Otherwise → `null`.

Callers turn `null` into **404, never 403**, so task and project ids cannot be
probed for existence. `lib/task-guard.ts` applies this uniformly across the
nine task sub-resource routes.

### Socket tokens

Socket tokens are signed with the same `JWT_SECRET` as session cookies, so they
carry a `scope: "realtime"` claim and `lib/auth.ts` rejects **any** token
carrying a scope as a session:

```ts
if (decoded.scope) return null;   // a scoped token is not a login
```

Without that, a leaked socket token would work as a session cookie — it has a
`userId`, which was all the check used to require.

---

## 5. Data model

Eleven collections. Relationships are by ObjectId reference; there are no
embedded documents beyond preference blobs.

```
User ──owns──> Project ──has──> ProjectMember ──> User
                  │
                  └──has──> Task ──> Subtask, DailyUpdate, Attachment, TaskLink
                  │
                  └──has──> ProjectInvitation

User ──has──> UserPreferences, Notification
```

Three schema decisions worth noting:

**`Task.projectId` is nullable.** Tasks existed before projects did. Null means
a personal task, and old rows read back correctly with no backfill.

**`Task.assigneeId` is nullable and resolves to the creator.** Added when
assignment shipped. `effectiveAssigneeId()` returns `assigneeId ?? userId`,
which is exactly what every pre-existing task already meant — so the field
landed without touching a single document. `assignedById`/`assignedAt` are
stamped only on a genuine change of hands; re-selecting the current assignee
does not rewrite history, and assigning to yourself records no assigner.

**Notifications snapshot their text.** `title`, `body` and `actorName` are
written at creation rather than joined on read, because a notification is a
record of something that happened and must survive the task being renamed or
deleted. Deleting a task deletes its notifications — an entry that navigates to
a 404 is worse than no entry.

### Model registration

`lib/model.ts` wraps registration:

```ts
if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
  mongoose.deleteModel(name);
}
```

The conventional `mongoose.models.X || mongoose.model(...)` guard has a bad
failure mode under hot reload: after a schema edit the guard finds the *stale*
registration and keeps it, so writes to a newly added field are **silently
dropped** — strict mode discards unknown paths, the update returns 200, and
nothing persists. This cost a debugging session and is now impossible.

### Connection handling

`lib/mongodb.ts` caches the connect promise on `globalThis`, drops it when the
connection behind it has died, and never caches a rejected promise. The naive
version — `if (readyState === 1) return; await connect()` — fires a connect per
concurrent request and never recovers from a dropped socket, which surfaces as
`Operation "x" buffering timed out after 10000ms` and looks like a database
fault when it is a client one.

---

## 6. Request lifecycle

A representative write, `PATCH /api/tasks/[id]`:

```
1. getSession()                    session from httpOnly cookie, or 401
2. parse and validate body         unknown fields ignored, not trusted
3. connectDB()
4. resolveTaskAccess(id, userId)   null → 404
5. access.canEdit                  false → 403
6. destination-project checks      assigning/moving validates the TARGET project
7. Task.findOneAndUpdate           the write
8. emitTaskEvent(...)              AFTER the write, fire-and-forget
9. await notify(...)               awaited, not dropped — see below
10. Response.json(updated)
```

Step 8 is deliberately not awaited: a realtime outage must not fail a task
update. Step 9 **is** awaited, because a serverless function can be frozen the
moment it responds and a dropped promise would silently lose the notification.

---

## 7. Features

**Projects** — CRUD, colour tokens (not hex, because Tailwind compiles classes
statically so `bg-${hex}` never produces a class), status, progress derived
from tasks rather than stored.

**Tasks** — status/priority/dates, plus a detail page with subtasks, a daily
work log with hours, file attachments and related links.

**Collaboration** — email invitations with a 7-day TTL token, four roles,
member management. The invitation is addressed to an email and the invitee's
address comes from their account, never the request, so holding the link is not
enough to accept it.

**Calendar** — month grid of task start/due dates and project deadlines.

**Analytics** — status and priority breakdowns, a productivity series bucketed
three ways from one query, per-project progress, overdue and on-time rates.

**Settings** — profile, account, appearance (full dark mode), notification
preferences, security, danger zone.

**Notifications** — `TASK_ASSIGNED`, `TASK_COMPLETED`, `MEMBER_JOINED`. Never
for your own actions. Gated by the Settings toggles; the two categories nothing
writes yet are labelled "Not sent yet" on the page rather than silently doing
nothing.

---

## 8. Realtime

Three processes:

```
Next.js app ──POST /emit (x-emit-secret)──> relay ──WebSocket──> browsers
```

`realtime/server.mts` is deliberately dumb. It holds **no database connection**
and makes **no authorisation decisions**. The Next app — which already has the
permission layer — computes which projects a user may join and signs that list
into a 15-minute token:

```ts
{ userId, projects: ["65abc", …], scope: "realtime" }
```

The relay verifies the signature and checks a requested room against that list.
`userId` comes from the signature, never from `handshake.auth`.

It also does not understand what it carries. The app POSTs an envelope —
`{ room, channel, payload }` — and the relay forwards it unopened, so adding a
new kind of live update never requires redeploying the always-on process.

Two room kinds: `project:{id}`, gated by the token's list, and `user:{id}`,
joined automatically on connect (no gate is needed — the id came from the
verified signature, so a socket can only land in its own).

**Events apply idempotently on the client** — create upserts, update merges by
id, delete filters. The actor already patched their list from the API response,
so their own event arriving back is a no-op. No "ignore my own events"
bookkeeping and no divergence between actor and observers.

**Everything degrades to polling** when no relay is configured: 3s for a
project's task list, 5s for a task detail page, 30s for the notification bell.
This is what makes a Vercel-only deployment viable — Vercel cannot host the
relay, because a WebSocket lives in one process's memory and serverless
functions are torn down between requests.

---

## 9. The assistant

A chat panel that answers questions about the user's own data by calling tools,
and can write with confirmation.

### Tools

Five read (`list_projects`, `list_tasks`, `get_task`, `list_members`,
`get_analytics`) and three write (`create_task`, `update_task`, `assign_task`).
**There is no delete tool** — a chat interface is the wrong place to destroy
data with no undo.

The security property: **no tool accepts a user id.** The caller is always the
session user, threaded as a parameter of `executeTool(name, input, userId)` from
the cookie. A prompt like *"show me Harry's private tasks"* is not refused by
instruction — it is unexpressible, because no parameter would carry it. Every
tool then runs through the same helpers the REST routes use
(`getAccessibleProjectIds`, `getProjectMembership`, `resolveTaskAccess`,
`canCreateTask`, `resolveAssignee`).

`assigneeId` is the one id that appears, and it is validated against the
project's membership before anything is written.

### The confirmation gate

Approval happens **across HTTP requests**, which is why this is a manual
agentic loop rather than the SDK's automatic function calling — a web server
cannot hold a request open waiting for a browser click.

```
question → reads run freely → model wants a write
                                    │
        server pauses the whole turn, returns the pending writes
                                    │
        second request carries the answer → loop resumes
```

Two details:

- The sentence the user approves is built **from the tool arguments**
  (`describeWrite`), not from the model's prose, so what it *says* it will do
  and what would actually run cannot drift apart.
- **Confirming is consent, not authority.** On resume, `executeTool` re-checks
  every permission from scratch.

The *entire* turn pauses, not just the writes, because a turn's tool results
must arrive together. Reads alongside a write simply run on resume, which is
harmless since they change nothing.

### Streaming and suggestions

The route returns newline-delimited JSON (simpler than SSE, since the client
uses `fetch` not `EventSource`) with four event types: `text`, `tool`, `done`
/`confirm`, `error`. The `tool` event lets the panel say *"Looking through
tasks…"* instead of spinning while the model reads the database.

Reassembling a streamed turn is non-obvious: naively joining the text drops
`thoughtSignature`, which Gemini 3.x uses to carry reasoning between steps.
`mergeParts` merges only adjacent plain-text parts and keeps everything else
verbatim.

Follow-up suggestions are **derived server-side from the tool results**, not
requested from the model. That costs nothing, adds no latency, cannot
hallucinate a project that does not exist, and does not spend the free tier's
request quota.

### Provider coupling

Only `lib/assistant/chat.ts` knows the vendor. `execute.ts` (all the permission
scoping) has zero provider references, tool definitions are plain JSON Schema,
and the browser posts plain text and treats the history as opaque. Switching
vendor is one file. This was proven in practice — the implementation was built
against Anthropic and moved to Gemini by rewriting that file alone.

### Markdown

The model formats its answers. `lib/assistant/markdown-blocks.ts` parses the
subset it produces (bold, italic, code, bullets with one level of nesting,
headings) and `Markdown.tsx` builds React elements — **never
`dangerouslySetInnerHTML`**, so there is no path from model output to injected
HTML. It has to survive incomplete input, since text streams in mid-token;
unmatched markers stay literal and resolve on the next chunk.

---

## 10. Storage

`lib/storage/index.ts` defines a `StorageDriver` interface; `selectDriver()`
picks S3 when `S3_BUCKET` is set, otherwise local disk. Files never go in
MongoDB — only metadata. Uploads are written outside `public/` and served
through an authenticated route, and S3 downloads use 60-second presigned URLs
issued only after the request is authorised against the owning task.

`lib/attachment-config.ts` holds a MIME allow-list with per-category size caps
and verifies the extension matches the declared MIME type.

---

## 11. Testing

There is no unit-test framework. Testing is end-to-end against a real server
and a real database, plus type-stripped unit tests for pure functions.

| Suite | Checks | What it covers |
|---|---|---|
| Assistant tools | 45 | scoping, write permissions, endpoint guards |
| Assignment + notifications + push | 37 | assignment, notifications, live delivery |
| Assignment detail | 22 | reassignment, assigner provenance, rendering |
| Realtime | 23 | tokens, room authorisation, event propagation |
| Live notification push | 10 | socket delivery with polling disabled |
| Page smoke | 23 | all 14 authenticated pages render |
| Markdown parser | 30 | inline syntax, streaming prefixes, round-trip |
| Suggestions | 12 | grounding, dedupe, write-gating |

The e2e suites register throwaway users with prefixed emails (`rt-`, `as-`,
`ld-`…), exercise real HTTP, and clean up by resolving those users' ids and
deleting only rows tied to them.

Security assertions are explicit rather than implied: a non-member sees no
projects, tasks, members or analytics; cannot filter by a project id they lack;
cannot create, update or reassign in someone's project; cannot assign work to a
non-member; gets 404 rather than 403; unknown and delete tools are refused.

---

## 12. Known gaps and weak spots

Listed because a reviewer's time is better spent here than rediscovering them.

**The e2e suite runs against the production database.** There is no separate
test database. Cleanup is scoped by email prefix, but an unscoped delete in a
cleanup script has already destroyed real data once in this project's history.
A `MONGO_URI_TEST` that the suite refuses to run without is the obvious fix and
is not implemented.

**No rate limiting anywhere.** Login, registration and the assistant endpoint
are all unthrottled. Login is the one that matters.

**The S3 driver has never run against real credentials.** It implements the
same interface as the local driver, which is fully covered, but no test has
exercised it. Local disk is what dev and the test suite use.

**The assistant is not covered against a live model in the suite.** The tool
layer is (45 checks, via a temporary session-gated harness), but the model
conversation is verified only by manual live runs, because the test environment
has no API key.

**Personal views were creator-scoped; now assignee-scoped.** The dashboard,
calendar and analytics all matched `{ userId: owner }` — tasks you *created* —
while task lists were membership-scoped, so work assigned to you in someone
else's project was in your task list but absent from your own statistics. All
three now use one shared rule, `myTasksFilter()` in `lib/tasks.ts`: the
effective assignee, guarded by project membership. The consequence worth
knowing is that a task you create and hand to someone else now leaves your
dashboard and analytics — it is their work. Whether "created by me" deserves
its own view is an open product question, not a bug.

**Realtime coverage is partial.** The project task list, the task detail page
and the dashboard counters/upcoming are live; the notification bell is live
everywhere. `/tasks` and the calendar are not. The dashboard is fed by a
`task:mine` channel into the `user:{id}` room, and an event there triggers a
refetch rather than patching state — counters are re-derived from the
database, never adjusted by delta, so they cannot drift. The remaining
server-rendered dashboard sections (chart, weekly goal, recent activity) are
stale until reload.

**Conversation history lives in the browser** and is posted back each turn.
Forging it can mislead the model about what it already saw; it cannot reach
data the user could not otherwise read, because tools re-authorise on every
call. Server-side conversations would be stricter.

**No pagination.** Task and project lists fetch everything. Fine at current
scale, not at ten thousand tasks.

**Two notification categories are wired to nothing.** `projectUpdates` and
`calendarReminders` are saved but never consumed. The UI says so rather than
pretending otherwise.

**No email delivery.** Invitations produce a link that must be shared manually.

**`mongodb+srv://` does not work on the development machine** — the resolver
list is `127.0.0.1` with nothing listening — so the seed-list URI is used
instead. This is environmental, not a code issue, but it explains the URI shape.

**Secrets in `.env.local` were exposed in a chat transcript** and must be
rotated before any deployment. `DEPLOYMENT.md` §1 covers this.

---

## 13. Decisions worth arguing with

**Authorisation is re-derived per request, never cached.** Every task operation
re-reads membership. Correct and simple; more database round trips than a
session-cached permission set.

**`AppLayout` is an async server component that queries on every page render.**
It reads the session and the notification feed so the bell's badge is correct in
the first paint with no mount fetch and no empty flash. The cost is two extra
queries per page render. A client fetch would trade correctness-on-first-paint
for fewer queries.

**404 instead of 403 everywhere.** Prevents id probing; makes debugging
permission problems harder.

**Fire-and-forget realtime emits.** A dropped event means a stale view until the
next poll. The alternative — awaiting the relay — would couple task updates to
the availability of an optional service.

**Suggestions are derived, not generated.** Cheap, grounded and instant, but
noticeably more mechanical than model-written follow-ups.

**A hand-written Markdown subset instead of a library.** ~120 lines and no
injection surface, versus a dependency that handles constructs the model never
emits. Anything outside the subset renders as literal text.

**The relay carries opaque envelopes.** New event types need no relay
redeployment; the relay also cannot validate anything it forwards.

**Everything degrades rather than fails.** No relay, no API key, no S3 — each
falls back silently. This makes a single-command local setup possible and makes
misconfiguration quiet, which cuts both ways.
