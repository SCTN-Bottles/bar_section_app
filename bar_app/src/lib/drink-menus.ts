import { getBeverageOptions } from "@/lib/beverages";
import { supabase } from "@/lib/supabase";
import type { BeverageOption } from "@/types/venue";

const db = supabase.schema("sctn-dev");
export type DailyDrinkMenu = { date: string; beverages: BeverageOption[]; saved: boolean };

export function validDrinkMenu(value: unknown): value is BeverageOption[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((item) => {
    if (!item || typeof item.id !== "string" || ids.has(item.id)
      || typeof item.name !== "string" || !item.name.trim()
      || !["bottle", "keg"].includes(item.type) || typeof item.price !== "number"
      || !Number.isFinite(item.price) || item.price < 0) return false;
    ids.add(item.id);
    return true;
  });
}

export async function getDailyDrinkMenus(venueId: string, venueName: string, dates: string[]): Promise<DailyDrinkMenu[]> {
  if (!dates.length) return [];
  const { data, error } = await db.from("drink_schedule").select("reservation_date, beverages")
    .eq("venue_id", venueId).in("reservation_date", dates);
  if (error) throw error;
  const rows = new Map((data ?? []).map((row) => [row.reservation_date as string, row.beverages]));
  // Defaults are only needed for dates which do not have a saved snapshot.
  const defaults = dates.some((date) => !rows.has(date)) ? await getBeverageOptions(venueName) : [];
  return dates.map((date) => {
    const beverages = rows.has(date) ? rows.get(date) : defaults;
    if (!validDrinkMenu(beverages)) throw new Error("Invalid drink menu data.");
    return { date, beverages: beverages.map((item) => ({ ...item })), saved: rows.has(date) };
  });
}

export async function saveDailyDrinkMenus(venueId: string, menus: DailyDrinkMenu[]) {
  if (!menus.length || menus.some((menu) => !validDrinkMenu(menu.beverages))) throw new Error("Check all drink names and prices.");
  const { data, error } = await db.from("drink_schedule").upsert(menus.map((menu) => ({
    venue_id: venueId, reservation_date: menu.date,
    beverages: menu.beverages.map((item) => ({ id: item.id, name: item.name.trim(), type: item.type, price: item.price })),
  })), { onConflict: "venue_id,reservation_date" }).select("reservation_date");
  if (error) throw error;
  if (data?.length !== menus.length) throw new Error("Some menus were not saved.");
}
