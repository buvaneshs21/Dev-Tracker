"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import SettingsSection from "./SettingsSection";
import FormFeedback, { type Feedback } from "./FormFeedback";
import { primaryButton, settingsInput, settingsLabel } from "./field-styles";
import { BIO_MAX, NAME_MAX, type UserProfileDTO } from "@/lib/types";

export default function ProfileSettings({
  profile,
}: {
  profile: UserProfileDTO;
}) {
  const router = useRouter();

  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const dirty = name !== profile.name || bio !== profile.bio;
  const initial = (profile.name || profile.email || "?")
    .charAt(0)
    .toUpperCase();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !dirty) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFeedback({
          tone: "error",
          message:
            typeof data.error === "string"
              ? data.error
              : "Unable to save changes.",
        });
        return;
      }

      setFeedback({ tone: "success", message: "Profile updated successfully." });
      // The name shows in the navbar and greetings, so refresh the server tree.
      router.refresh();
    } catch {
      setFeedback({
        tone: "error",
        message: "Network error. Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="Profile"
      description="Manage your personal information."
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          >
            {initial}
          </span>

          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Profile picture
            </p>
            {/* No file storage is configured, so an upload control here would
                be a button that can't work. */}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Generated from your name. Photo uploads need file storage, which
              isn&apos;t set up yet.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={settingsLabel}>Full name</span>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={(event) => setName(event.target.value)}
            required
            className={settingsInput}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={settingsLabel}>Email</span>
          <div className="relative">
            <input
              value={profile.email}
              readOnly
              disabled
              aria-describedby="email-note"
              className={`${settingsInput} cursor-not-allowed pr-10 opacity-70`}
            />
            <Lock
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
          </div>
          <span
            id="email-note"
            className="text-xs text-slate-500 dark:text-slate-400"
          >
            Email changes require verification and will be available in a future
            version.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={settingsLabel}>
            Bio{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (optional)
            </span>
          </span>
          <textarea
            rows={3}
            value={bio}
            maxLength={BIO_MAX}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Full stack developer, shipping small things often."
            className={`${settingsInput} resize-y`}
          />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {bio.length}/{BIO_MAX}
          </span>
        </label>

        <FormFeedback feedback={feedback} />

        <div>
          <button
            type="submit"
            disabled={saving || !dirty}
            className={primaryButton}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
