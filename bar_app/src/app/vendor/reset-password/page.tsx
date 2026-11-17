"use client";

import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Card } from "@astryxdesign/core/Card";


import ActionButton from "@/components/ui/ActionButton";
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

  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><Card padding={6} elevation="low" className="w-full">
    <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">SCTN vendor portal</Text>
    <Heading level={1} className="mt-2 text-3xl font-semibold">Choose a new password</Heading>
    {isCheckingSession ? <Text as="p" type="supporting" color="secondary" className="mt-4 text-sm text-neutral-500">Checking your reset link…</Text> : !hasSession ? <VStack gap={3} className="mt-4 text-sm text-neutral-600">
      <Text as="p" type="inherit" color="inherit">This reset link is invalid or has expired. Request a new one from the sign-in page.</Text>
      <Link href="/vendor/login" className="font-medium text-primary underline-offset-4 hover:underline">Back to sign in</Link>
    </VStack> : updated ? <VStack gap={3} className="mt-4 text-sm text-neutral-600">
      <Text as="p" type="inherit" color="inherit" role="status">Your password has been updated.</Text>
      <Link href="/vendor/login" className="font-medium text-primary underline-offset-4 hover:underline">Return to vendor sign in</Link>
    </VStack> : <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="New password"><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" /></Field>
      <Field label="Confirm new password"><input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input" /></Field>
      {error && <Text as="p" type="inherit" color="inherit" role="alert" className="text-sm text-red-700">{error}</Text>}
      <ActionButton type="submit" disabled={isSaving} variant="primary" label={isSaving ? "Updating password…" : "Update password"} className="w-full" />
    </form>}
  </Card></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-neutral-500">{label}{children}</label>;
}
