"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

export default function VendorResetPasswordPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let recoverySessionFound = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        recoverySessionFound = true;
        setHasSession(true);
        setIsCheckingSession(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && !recoverySessionFound) {
        setHasSession(Boolean(session));
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("The passwords don't match.");
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setUpdated(true);
    } catch {
      setError("We couldn't update your password. Please request a new reset link and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-7">
    <p className="text-sm text-neutral-500">SCTN vendor portal</p>
    <h1 className="mt-2 text-3xl font-semibold">Choose a new password</h1>
    {isCheckingSession ? <p className="mt-4 text-sm text-neutral-500">Checking your reset link…</p> : !hasSession ? <div className="mt-4 space-y-3 text-sm text-neutral-600">
      <p>This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
      <Link href="/vendor/login" className="font-medium text-primary underline-offset-4 hover:underline">Back to sign in</Link>
    </div> : updated ? <div className="mt-4 space-y-3 text-sm text-neutral-600">
      <p role="status">Your password has been updated.</p>
      <Link href="/vendor/login" className="font-medium text-primary underline-offset-4 hover:underline">Return to vendor sign in</Link>
    </div> : <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="New password"><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" /></Field>
      <Field label="Confirm new password"><input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input" /></Field>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={isSaving} className="w-full rounded-md bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Updating password…" : "Update password"}</button>
    </form>}
  </div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-neutral-500">{label}{children}</label>;
}
