"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getVendorSession } from "@/lib/vendor-auth";
import { supabase } from "@/lib/supabase";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isForgotPassword) {
      setError("");
      setResetRequested(false);
      setIsSendingReset(true);

      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/vendor/reset-password`,
        });

        if (resetError) {
          setError("We couldn't send a reset email right now. Please try again.");
        } else {
          setResetRequested(true);
        }
      } catch {
        setError("We couldn't send a reset email right now. Please try again.");
      } finally {
        setIsSendingReset(false);
      }
      return;
    }

    setError("");
    setIsSigningIn(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("That email and password don't match a vendor account.");
      } else {
        const session = await getVendorSession();
        if (session) {
          router.replace("/");
        } else {
          await supabase.auth.signOut();
          setError("We couldn't verify this account's venue access. Check your assignment and try again.");
        }
      }
    } catch {
      setError("We couldn't sign you in right now. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-7">
    <p className="text-sm text-neutral-500">SCTN vendor portal</p><h1 className="mt-2 text-3xl font-semibold">{isForgotPassword ? "Reset your password" : "Sign in to manage your venue"}</h1>
    <p className="mt-3 text-sm text-neutral-500">{isForgotPassword ? "Enter the email address for your vendor account and we'll send a reset link if it exists." : "Sign in with the email and password provided for your vendor account."}</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Email"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></Field>
      {!isForgotPassword && <Field label="Password"><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" /></Field>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {resetRequested && <p role="status" className="text-sm text-green-800">If a vendor account exists for that email, a password reset link is on its way.</p>}
      <button type="submit" disabled={isSendingReset || isSigningIn} className="w-full rounded-md bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60">{isSendingReset ? "Sending reset link…" : isSigningIn ? "Signing in…" : isForgotPassword ? "Send reset link" : "Sign in"}</button>
    </form>
    <button type="button" onClick={() => { setIsForgotPassword((current) => !current); setError(""); setResetRequested(false); }} className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">{isForgotPassword ? "Back to sign in" : "Forgot password?"}</button>
    <Link href="/" className="mt-6 block w-full rounded-md border border-neutral-300 px-5 py-3 text-center text-sm font-medium hover:border-primary hover:text-primary">Return to Homepage</Link>
  </div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-neutral-500">{label}{children}</label>;
}
