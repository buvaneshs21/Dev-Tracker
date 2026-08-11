"use client";

import { useState } from "react";
import { AlertCircle, ExternalLink, Link2, Loader2, Plus, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import { LINK_TITLE_MAX, type TaskLinkDTO } from "@/lib/types";

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500";

export default function TaskLinks({
  taskId,
  initial,
  readOnly,
}: {
  taskId: string;
  initial: TaskLinkDTO[];
  readOnly: boolean;
}) {
  const [links, setLinks] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.url.trim() || saving) return;

    setSaving(true);
    const res = await fetch(`/api/tasks/${taskId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add that link.");
      setSaving(false);
      return;
    }

    setLinks(data.links);
    setForm({ title: "", url: "" });
    setAdding(false);
    setError(null);
    setSaving(false);
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/tasks/${taskId}/links/${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setLinks(data.links);
      setError(null);
    } else {
      setError("Could not remove that link.");
    }
    setBusyId(null);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="Related links"
        subtitle="References that belong with this task"
        action={
          !readOnly && !adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Link
            </button>
          ) : undefined
        }
      />

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {adding && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            autoFocus
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
            placeholder="https://github.com/you/repo/pull/142"
            className={input}
          />
          <input
            value={form.title}
            maxLength={LINK_TITLE_MAX}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Label (optional — defaults to the domain)"
            className={input}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || !form.url.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Adding…" : "Add Link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {links.length === 0 && !adding ? (
        <EmptyState
          compact
          icon={Link2}
          title="No related links yet"
          message="Add a useful reference."
        />
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-3 py-2.5">
              <Link2
                className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />

              <a
                href={link.url}
                target="_blank"
                // noopener/noreferrer on a user-supplied link: without it the
                // destination gets a handle on this window.
                rel="noopener noreferrer nofollow"
                className="min-w-0 flex-1 truncate text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {link.title}
              </a>

              <ExternalLink
                className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
                aria-hidden="true"
              />

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(link.id)}
                  disabled={busyId === link.id}
                  aria-label={`Remove ${link.title}`}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                >
                  {busyId === link.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
