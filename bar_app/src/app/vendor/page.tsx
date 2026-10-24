"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import VendorDashboard from "@/components/vendor/VendorDashboard";
import { getVendorSession, type VendorSession } from "@/lib/vendor-auth";

export default function VendorPage() {
  const router = useRouter();
  const [session, setSession] = useState<VendorSession | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    void getVendorSession().then((current) => {
      if (!isMounted) return;
      if (!current) router.replace("/vendor/login");
      setSession(current);
    });
    return () => { isMounted = false; };
  }, [router]);

  if (session === undefined) return <main className="mx-auto max-w-7xl px-6 py-16 text-neutral-500">Checking access…</main>;
  if (!session) return null;
  return <VendorDashboard session={session} />;
}
