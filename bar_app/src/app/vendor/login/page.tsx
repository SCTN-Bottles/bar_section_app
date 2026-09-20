"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getVendorSession, loginMockVendor } from "@/lib/vendor-auth";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@myhouse.demo");
  const [password, setPassword] = useState("owner123");
  const [error, setError] = useState("");

  useEffect(() => { if (getVendorSession()) router.replace("/vendor"); }, [router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMockVendor(email, password)) router.replace("/vendor");
    else setError("That email and password do not match a demo vendor account.");
  }

  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-7">
    <p className="text-sm text-neutral-500">SECTN vendor portal</p><h1 className="mt-2 text-3xl font-semibold">Sign in to manage MyHouse</h1>
    <p className="mt-3 text-sm text-neutral-500">Prototype only — use one of the demo accounts below.</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Email"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></Field>
      <Field label="Password"><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" /></Field>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="w-full rounded-md bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-accent">Sign in</button>
    </form>
    <div className="mt-6 rounded-lg border border-neutral-300 bg-neutral-100 p-4 text-sm"><p className="font-semibold">Demo accounts</p><p className="mt-2 text-neutral-500">Owner: owner@myhouse.demo · owner123</p><p className="mt-1 text-neutral-500">Manager: manager@myhouse.demo · manager123</p></div>
  </div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-neutral-500">{label}{children}</label>;
}
