"use client";

import { useEffect, useRef, useState } from "react";
import { getBeverageOptions, saveBeverageOptions } from "@/lib/beverages";
import { getDailyDrinkMenus, saveDailyDrinkMenus, validDrinkMenu, type DailyDrinkMenu } from "@/lib/drink-menus";
import type { BeverageOption } from "@/types/venue";
import { useConfirmation } from "@/components/ui/use-confirmation";

type Props = {
  venueId: string; venueName: string; dates?: string[]; activeDate?: string;
  refreshVersion?: string;
  onSelectDate?: (date: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaved?: (beverages: BeverageOption[]) => void;
};

function sameDrinks(first: BeverageOption[], second: BeverageOption[]) {
  return first.length === second.length && first.every((drink, index) => {
    const other = second[index];
    return drink.id === other.id && drink.name === other.name && drink.type === other.type && Object.is(drink.price, other.price);
  });
}

// Rebase an unsaved menu onto new defaults, keeping edits only for surviving drinks.
function refreshDraft(defaults: BeverageOption[], baseline: BeverageOption[], draft: BeverageOption[]) {
  const previous = new Map(baseline.map((drink) => [drink.id, drink]));
  const edited = new Map(draft.map((drink) => [drink.id, drink]));
  const drinks = defaults.flatMap((drink) => {
    const before = previous.get(drink.id);
    const after = edited.get(drink.id);
    if (!before) return [drink];
    if (!after) return []; // Keep a removal made in this day's draft.
    return [{ ...drink,
      name: after.name !== before.name ? after.name : drink.name,
      type: after.type !== before.type ? after.type : drink.type,
      price: !Object.is(after.price, before.price) ? after.price : drink.price,
    }];
  });
  // Drinks added directly to this day are independent of the defaults.
  return [...drinks, ...draft.filter((drink) => !previous.has(drink.id) && !defaults.some((item) => item.id === drink.id))];
}

export default function DrinkMenuEditor({ venueId, venueName, dates, activeDate, refreshVersion = "", onSelectDate, onDirtyChange, onSavingChange, onSaved }: Props) {
  const { confirm, confirmationDialog } = useConfirmation();
  const isDefault = dates === undefined;
  const datesKey = dates?.join(",") ?? "defaults";
  const requestKey = `${datesKey}:${refreshVersion}`;
  const [menus, setMenus] = useState<DailyDrinkMenu[]>([]);
  const [original, setOriginal] = useState<BeverageOption[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const draftRef = useRef({ menus, dirty });
  const baselineRef = useRef<DailyDrinkMenu[]>([]);
  useEffect(() => { draftRef.current = { menus, dirty }; }, [menus, dirty]);
  const [loading, setLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const current = menus.find((menu) => menu.date === (isDefault ? "defaults" : activeDate)) ?? menus[0];

  useEffect(() => {
    let cancelled = false;
    // Reset loading feedback when the requested dates or defaults change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    setNotice("");
    async function load() {
      try {
        const values = datesKey === "defaults"
          ? [{ date: "defaults", beverages: await getBeverageOptions(venueName), saved: true }]
          : await getDailyDrinkMenus(venueId, venueName, datesKey.split(","));
        if (cancelled) return;
        if (datesKey === "defaults") setOriginal(values[0].beverages);
        const { menus: drafts, dirty: changed } = draftRef.current;
        const next = values.map((value) => {
          const draft = drafts.find((item) => item.date === value.date);
          if (!draft || !changed.has(value.date)) return value;
          if (isDefault || (value.saved && draft.saved)) return draft;
          const baseline = baselineRef.current.find((item) => item.date === value.date);
          if (value.saved || draft.saved || !baseline) return value;
          return { ...value, beverages: refreshDraft(value.beverages, baseline.beverages, draft.beverages) };
        });
        baselineRef.current = values;
        setMenus(next);
        setDirty(new Set(next.filter((value, index) => !sameDrinks(value.beverages, values[index].beverages)).map((value) => value.date)));
        setLoadedKey(requestKey);
      } catch {
        if (!cancelled) setError("Drink menus could not be loaded. Please try again.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [venueId, venueName, datesKey, requestKey, retry, isDefault]);

  useEffect(() => { onDirtyChange?.(dirty.size > 0); }, [dirty, onDirtyChange]);
  useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);

  function change(beverages: BeverageOption[]) {
    if (!current) return;
    setMenus((values) => values.map((menu) => menu.date === current.date ? { ...menu, beverages } : menu));
    setDirty((values) => new Set(values).add(current.date));
    setError(""); setNotice("");
  }

  async function save() {
    if (loading || saving || loadedKey !== requestKey) return;
    const invalid = menus.find((menu) => !validDrinkMenu(menu.beverages));
    if (invalid) {
      onSelectDate?.(invalid.date);
      setError("Check all drink names and non-negative prices before saving.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      if (isDefault) {
        const beverages = await saveBeverageOptions(venueId, original, menus[0].beverages);
        setOriginal(beverages);
        setMenus([{ date: "defaults", beverages, saved: true }]);
        onSaved?.(beverages);
      } else {
        await saveDailyDrinkMenus(venueId, menus);
        baselineRef.current = menus.map((menu) => ({ ...menu, saved: true }));
        setMenus((values) => values.map((menu) => ({ ...menu, saved: true })));
      }
      setDirty(new Set());
      setNotice(isDefault ? "Drink menu defaults saved." : `Drink menus saved for ${menus.length} selected day${menus.length === 1 ? "" : "s"}.`);
    } catch { setError("Drink changes could not be saved. Your edits are still here; please try again."); }
    finally { setSaving(false); }
  }

  async function useLatestDefaults() {
    if (!current || saving || loading) return;
    if (dirty.has(current.date) && !await confirm({ title: "Replace unsaved drink edits?", message: "Replace unsaved drink edits for this day with the latest defaults?", confirmLabel: "Replace edits" })) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const beverages = await getBeverageOptions(venueName);
      change(beverages);
      setNotice(`Latest drink defaults loaded for ${current.date}. Click Save drink changes to apply them.`);
    } catch { setError("Drink defaults could not be loaded. Your current menu has been kept."); }
    finally { setSaving(false); }
  }

  return <section aria-label={isDefault ? "Default drink menu editor" : "Daily drink menu editor"} className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 sm:p-6">
    {confirmationDialog}
    <h2 className="text-2xl font-semibold">{isDefault ? "Update Drink Menu Defaults" : "Drink menu"}</h2>
    <p className="mt-2 text-sm text-neutral-500">{isDefault ? "Add, remove, or edit the default drinks used for dates without a saved menu." : `Editing ${current?.date ?? activeDate}. Save drink changes saves the menus for all confirmed days.`}</p>
    {loading && <p role="status" className="mt-4 text-sm">Loading drink menu…</p>}
    {error && <div className="mt-4"><p role="alert" className="text-sm text-red-700">{error}</p>{loadedKey !== requestKey && <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 rounded-md border px-4 py-2">Retry loading menu</button>}</div>}
    {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
    {!loading && loadedKey === requestKey && current && <fieldset disabled={saving} className="mt-5 space-y-4 disabled:opacity-60">
      {!isDefault && <p className="text-xs text-neutral-500">{current.saved ? "Loaded from saved daily menu" : "Starting from drink menu defaults"}{dirty.has(current.date) ? " · Unsaved changes" : ""}</p>}
      {!isDefault && <div className="space-y-2"><p className="text-xs text-neutral-500">Saved daily menus keep their own drink list. Use the latest defaults to replace this day’s list, then save.</p><button type="button" onClick={useLatestDefaults} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Use latest drink defaults</button></div>}
      {current.beverages.map((drink) => <div key={drink.id} className="grid gap-3 rounded-lg border border-neutral-300 bg-neutral-100 p-4 md:grid-cols-[1fr_130px_120px_auto]">
        <label className="text-sm text-neutral-500">Drink name<input value={drink.name} onChange={(event) => change(current.beverages.map((item) => item.id === drink.id ? { ...item, name: event.target.value } : item))} className="input mt-1" /></label>
        <label className="text-sm text-neutral-500">Type<select aria-label="Type" value={drink.type} onChange={(event) => change(current.beverages.map((item) => item.id === drink.id ? { ...item, type: event.target.value as BeverageOption["type"] } : item))} className="input mt-1"><option value="bottle">Bottle</option><option value="keg">Keg</option></select></label>
        <label className="text-sm text-neutral-500">Price ($)<input type="number" min="0" step="0.01" value={Number.isNaN(drink.price) ? "" : drink.price} onChange={(event) => change(current.beverages.map((item) => item.id === drink.id ? { ...item, price: event.target.value === "" ? NaN : Number(event.target.value) } : item))} className="input mt-1" /></label>
        <button type="button" aria-label={`Remove ${drink.name || "drink"}`} onClick={() => change(current.beverages.filter((item) => item.id !== drink.id))} className="self-end rounded-md border border-neutral-300 px-4 py-2 text-sm">Remove</button>
      </div>)}
      {!current.beverages.length && <p className="text-sm text-neutral-500">No drinks on this menu. Add a drink, or save an empty menu.</p>}
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => change([...current.beverages, { id: crypto.randomUUID(), name: "", type: "bottle", price: 0 }])} className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-semibold">Add drink</button>
        <button type="button" onClick={save} className="rounded-md bg-primary px-6 py-3 font-semibold text-on-primary">{saving ? "Saving…" : isDefault ? "Save drink menu defaults" : "Save drink changes"}</button>
      </div>
    </fieldset>}
  </section>;
}
