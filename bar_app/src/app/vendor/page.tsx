"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import VendorDashboard from "@/components/vendor/VendorDashboard";
import { getVendorSession, VendorSession } from "@/lib/vendor-auth";

export default function VendorPage() {
  const router = useRouter();
  const [session, setSession] = useState<VendorSession | null | undefined>(undefined);

  useEffect(() => {
    const current = getVendorSession();
    if (!current) router.replace("/vendor/login");
    setSession(current);
  }, [router]);

  if (session === undefined) return <main className="mx-auto max-w-7xl px-6 py-16 text-neutral-500">Checking access…</main>;
  if (!session) return null;
  return <VendorDashboard session={session} />;
}
