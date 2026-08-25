# Deploying DevTrack to Vercel

## 1. Rotate both secrets first

Both current values have been exposed in a chat transcript and must not be
reused in production.

- **Atlas password** — Atlas → Database Access → edit `buvaneshs29_db_user` →
  Edit Password → Autogenerate. Rebuild `MONGO_URI` with the new password.
- **`JWT_SECRET`** — generate a fresh one:

  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

  Rotating this invalidates every existing session, which is the point.

## 2. Open the Atlas access list

Serverless functions have rotating egress IPs, so a pinned address will fail
intermittently.

Atlas → Network Access → Add IP Address → **Allow access from anywhere**
(`0.0.0.0/0`). This is only safe because the database user's password is strong
and freshly rotated.

## 3. Create a bucket for attachments

Vercel's filesystem is ephemeral — a file written during one request is gone by
the next — so attachments need object storage. Cloudflare R2 has a free tier and
no egress fees; plain AWS S3 works identically.

**Cloudflare R2:** create a bucket, then an API token with *Object Read & Write*.

**Keep the bucket private.** The app never makes objects public; downloads use
presigned URLs that expire after 60 seconds and are only issued after the
request has been authorised against the owning task.

## 4. Environment variables

Set these in Vercel → Project → Settings → Environment Variables.

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | yes | with the rotated password |
| `JWT_SECRET` | yes | the freshly generated value |
| `STORAGE_DRIVER` | no | `s3` or `local`; defaults to `s3` when `S3_BUCKET` is set |
| `S3_BUCKET` | yes (S3) | bucket name |
| `S3_REGION` | yes (S3) | `auto` for R2, e.g. `eu-west-1` for AWS |
| `S3_ACCESS_KEY_ID` | yes (S3) | |
| `S3_SECRET_ACCESS_KEY` | yes (S3) | |
| `S3_ENDPOINT` | R2/MinIO only | e.g. `https://<account>.r2.cloudflarestorage.com` |
| `S3_FORCE_PATH_STYLE` | R2/MinIO only | `true` |

**Never prefix any of these with `NEXT_PUBLIC_`.** That would ship the
credentials to the browser.

## 4b. Real-time updates (optional)

The app works without this — clients poll when no socket is available (every 3
seconds for a project's task list, every 30 for the notification bell), so
changes still appear without a refresh. Setting it up upgrades that to instant
push.

**Vercel cannot host the socket server.** Serverless functions are short-lived
and cannot hold a WebSocket open. The relay in `realtime/` must run on an
always-on host — Railway, Render, Fly.io or any VPS.

On the realtime host, run `node --env-file=.env realtime/server.mts` with:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | **the same value as the Next app** — it verifies socket tokens |
| `REALTIME_EMIT_SECRET` | any long random string, shared with the Next app |
| `REALTIME_PORT` | often set by the platform |
| `REALTIME_ALLOWED_ORIGIN` | your Vercel URL, e.g. `https://devtrack.vercel.app` |

Then on Vercel:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | public URL of the realtime host (safe to expose — it's just an address) |
| `REALTIME_URL` | same URL, used server-side to relay events |
| `REALTIME_EMIT_SECRET` | must match the realtime host |

The relay holds no database credentials and makes no authorisation decisions:
the Next app signs the list of projects a user may join into a short-lived
token, and the relay only checks the requested room against that list. It also
doesn't understand the payloads it carries — the Next app POSTs `{ room,
channel, payload }` and the relay forwards it unopened, so adding a new kind of
live update never requires redeploying the always-on process.

Two kinds of room are in use: `project:{id}`, gated by that token's list, and
`user:{id}`, joined automatically on connect and used for notifications.

## 5. Deploy

```bash
git add -A
git commit -m "..."
git push origin master
```

Import the repo in Vercel. The build command and output are the Next.js
defaults; no `vercel.json` is needed.

## 6. Verify after deploy

1. Sign up with a new account.
2. Create a project and a task.
3. Open the task → upload an image → confirm the thumbnail renders.
4. **Redeploy, then reload the task** — the image must still be there. If it
   vanishes, `STORAGE_DRIVER` is falling back to `local`; check `S3_BUCKET`.
5. Toggle the theme in Settings → Appearance and reload — it should persist.

## Notes

- **Use a separate database from local development.** The e2e suite is
  destructive and should never point at the deployed database. Consider a second
  Atlas database name in the production `MONGO_URI`.
- **The S3 driver is untested.** It was written against the same interface as
  the local driver, which is fully covered by the e2e suite, but no run has
  exercised it with real credentials. Step 6 above is the real test.
- **Every route is server-rendered.** The root layout reads the session to
  render the saved theme without a flash, which opts the whole app into dynamic
  rendering. Expected, not a misconfiguration.
- **Existing local uploads won't migrate.** Files under `storage/uploads/` stay
  on your machine; anything uploaded before the switch needs re-uploading in
  production.
