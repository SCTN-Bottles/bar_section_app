"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDailyDrinkMenus } from "@/lib/drink-menus";
import { getReservationSections } from "@/lib/sections";
import type { BeverageOption, Section } from "@/types/venue";

type DayData = { sections: Section[]; beverages: BeverageOption[] };

export function useReservationDay(venueId: string, venueName: string, date: string | null, slot: "day" | "night") {
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!date) return;
    const refresh = () => setRetry((value) => value + 1);
    // Releases after denial/expiry must reach an already-open section map too.
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    const channel = supabase.channel(`availability-${venueId}-${date}-${slot}`)
      .on("broadcast", { event: "section_unavailable" }, refresh)
      .on("broadcast", { event: "section_available" }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [venueId, date, slot]);
  const key = `${venueId}:${date}:${slot}`;
  const [result, setResult] = useState<{ key: string; data: DayData | null; error: string }>({ key: "", data: null, error: "" });
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    Promise.all([getReservationSections(venueId, date, slot), getDailyDrinkMenus(venueId, venueName, [date])])
      .then(([sections, menus]) => {
        if (!cancelled) setResult({ key, data: { sections, beverages: menus[0].beverages }, error: "" });
      }).catch(() => {
        if (!cancelled) setResult({ key, data: null, error: "Section and drink options could not be loaded for this date. Please try again." });
      });
    return () => { cancelled = true; };
  }, [venueId, venueName, date, slot, key, retry]);
  return {
    data: result.key === key ? result.data : null,
    loading: Boolean(date) && result.key !== key,
    error: result.key === key ? result.error : "",
    retry: () => setRetry((value) => value + 1),
  };
}
