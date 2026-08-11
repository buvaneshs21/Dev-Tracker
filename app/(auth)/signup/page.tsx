"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";

export default function Signup() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}) as { error?: string });

      if (!res.ok) {
        setError(
          data.error || `Signup failed (${res.status}). Check the server logs.`,
        );
        setLoading(false);
        return;
      }

      // Register signs the new account in, so go straight to the dashboard.
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 dark:text-indigo-400 transition hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <Field
          label="Name"
          name="name"
          required
          autoComplete="name"
          value={form.name}
          placeholder="Ada Lovelace"
          onChange={handleChange}
        />

        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          placeholder="you@example.com"
          onChange={handleChange}
        />

        <Field
          label="Password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={form.password}
          placeholder="At least 6 characters"
          onChange={handleChange}
        />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
