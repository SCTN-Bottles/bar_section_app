import { supabase } from "@/lib/supabase";
import type { BeverageOption, BeverageType } from "@/types/venue";

const devDb = supabase.schema("sctn-dev");

type BeverageRow = {
  id: string;
  name: string;
  type: string;
  price: number | string;
};

function toBeverage(row: BeverageRow): BeverageOption {
  if (row.type !== "bottle" && row.type !== "keg") {
    throw new Error(`Unknown beverage type: ${row.type}`);
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type as BeverageType,
    price: Number(row.price),
  };
}

export async function getBeverageOptions(venueName: string): Promise<BeverageOption[]> {
  const { data: venue, error: venueError } = await devDb
    .from("venues")
    .select("id")
    .eq("slug", venueName.toLowerCase())
    .single();

  if (venueError) throw venueError;

  const { data, error } = await devDb
    .from("beverage_options")
    .select("id, name, type, price")
    .eq("venue_id", venue.id)
    .order("type")
    .order("name");

  if (error) throw error;
  return (data as BeverageRow[]).map(toBeverage);
}

export async function saveBeverageOptions(
  venueId: string,
  original: BeverageOption[],
  beverages: BeverageOption[],
): Promise<BeverageOption[]> {
  const existing = new Map(original.map((item) => [item.id, item]));
  const keptIds = new Set(beverages.map((item) => item.id));

  for (const beverage of beverages) {
    if (!existing.has(beverage.id)) {
      const { error } = await devDb.from("beverage_options").insert({
        venue_id: venueId,
        name: beverage.name,
        type: beverage.type,
        price: beverage.price,
      });
      if (error) throw error;
      continue;
    }

    const previous = existing.get(beverage.id)!;
    if (
      previous.name === beverage.name &&
      previous.type === beverage.type &&
      previous.price === beverage.price
    ) continue;

    const { error } = await devDb
      .from("beverage_options")
      .update({ name: beverage.name, type: beverage.type, price: beverage.price })
      .eq("venue_id", venueId)
      .eq("id", beverage.id);
    if (error) throw error;
  }

  const removedIds = [...existing.keys()].filter((id) => !keptIds.has(id));
  if (removedIds.length > 0) {
    const { error } = await devDb
      .from("beverage_options")
      .delete()
      .eq("venue_id", venueId)
      .in("id", removedIds);
    if (error) throw error;
  }

  const { data: updated, error: updatedError } = await devDb
    .from("beverage_options")
    .select("id, name, type, price")
    .eq("venue_id", venueId)
    .order("type")
    .order("name");
  if (updatedError) throw updatedError;
  return (updated as BeverageRow[]).map(toBeverage);
}
