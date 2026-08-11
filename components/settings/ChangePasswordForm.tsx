"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import FormFeedback, { type Feedback } from "./FormFeedback";
import { primaryButton, settingsInput, settingsLabel } from "./field-styles";
import { PASSWORD_MIN } from "@/lib/types";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordForm() {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const set = (key: keyof typeof EMPTY, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Mirrors the server rules so obvious problems don't need a round trip.
  const mismatch =
    values.confirmPassword.length > 0 &&
    values.newPassword !== values.confirmPassword;

  const tooShort =
    values.newPassword.length > 0 && values.newPassword.length < PASSWORD_MIN;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || mismatch || tooShort) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFeedback({
          tone: "error",
          message:
            typeof data.error === "string"
              ? data.error
              : "Unable to change your password.",
        });
        return;
      }

      // Clear the fields — leaving a password sitting in the DOM is careless.
      setValues(EMPTY);
      setFeedback({
        tone: "success",
        message: "Password changed successfully.",
      });
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
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={settingsLabel}>Current password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={values.currentPassword}
          onChange={(event) => set("currentPassword", event.target.value)}
          className={settingsInput}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={settingsLabel}>New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          value={values.newPassword}
          onChange={(event) => set("newPassword", event.target.value)}
          aria-invalid={tooShort}
          className={settingsInput}
        />
        {tooShort && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Must be at least {PASSWORD_MIN} characters.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={settingsLabel}>Confirm new password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={(event) => set("confirmPassword", event.target.value)}
          aria-invalid={mismatch}
          className={settingsInput}
        />
        {mismatch && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Passwords don&apos;t match.
          </span>
        )}
      </label>

      <FormFeedback feedback={feedback} />

      <div>
        <button
          type="submit"
          disabled={saving || mismatch || tooShort}
          className={primaryButton}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Updating…" : "Change Password"}
        </button>
      </div>
    </form>
  );
}
