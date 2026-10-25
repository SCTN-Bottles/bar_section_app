"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSections, saveSections } from "@/lib/sections";
import { venueAreaLabels, type Section } from "@/types/venue";

export default function SectionDefaultsEditor({ venueId, venueName, onSaved }: {
  venueId: string;
  venueName: string;
  onSaved: (sections: Section[]) => void;
}) {
  const [original, setOriginal] = useState<Section[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const current = sections.find((section) => section.id === activeId) ?? sections[0];

  useEffect(() => {
    let cancelled = false;
    getSections(venueName).then((loaded) => {
      if (cancelled) return;
      setOriginal(loaded);
      setSections(loaded);
      setActiveId(loaded[0]?.id ?? "");
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError("Section defaults could not be loaded. Please try again.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [venueName, reload]);

  function update(changes: Partial<Section>) {
    setSections((values) => values.map((section) => section.id === current.id ? { ...section, ...changes } : section));
    setNotice("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const invalid = sections.find((section) => !section.name.trim() || !section.description.trim()
      || !Number.isInteger(section.capacity) || section.capacity < 1
      || !Number.isFinite(section.minimumSpend) || section.minimumSpend < 0
      || !Number.isFinite(section.deposit) || section.deposit < 0);
    if (invalid) {
      setActiveId(invalid.id);
      setError("Check each section's name, description, positive capacity, and non-negative prices.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveSections(venueId, venueName, original, sections.map((section) => ({
        ...section, name: section.name.trim(), description: section.description.trim(),
      })));
      setOriginal(saved);
      setSections(saved);
      onSaved(saved);
      setNotice("Section defaults saved.");
    } catch {
      setError("Some defaults could not be saved. Your edits are still here; please try again.");
    } finally { setSaving(false); }
  }

  return <section className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 sm:p-6">
    <h2 className="text-2xl font-semibold">Update Section Defaults</h2>
    <p className="mt-2 text-sm text-neutral-500">Set the default details used when adding sections to new booking dates. Saved daily settings keep their existing values.</p>
    {loading && <p role="status" className="mt-5 text-sm text-neutral-500">Loading section defaults…</p>}
    {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 text-sm">{notice}</p>}
    {!loading && !sections.length && <div className="mt-5">
      <p className="text-sm text-neutral-500">{error ? "" : "No active sections are configured for this venue."}</p>
      {error && <button type="button" onClick={() => { setError(""); setLoading(true); setReload((value) => value + 1); }} className="mt-3 rounded-md border border-neutral-300 px-4 py-2 text-sm">Retry loading defaults</button>}
    </div>}
    {!loading && current && <form onSubmit={save} noValidate className="mt-6">
      <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
        <div role="tablist" aria-label="Default sections" className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => <button key={section.id} id={`default-tab-${section.id}`} type="button" role="tab" aria-selected={current.id === section.id} aria-controls="default-section-panel" onClick={() => setActiveId(section.id)}
            className={`shrink-0 rounded-md border px-4 py-2 text-sm font-semibold ${current.id === section.id ? "border-primary bg-primary text-on-primary" : "border-neutral-300 hover:border-primary"}`}>
            <span className="block text-xs">{venueAreaLabels[section.area]}</span>{section.name}
          </button>)}
        </div>
        <div id="default-section-panel" role="tabpanel" aria-labelledby={`default-tab-${current.id}`} className="rounded-lg border border-neutral-300 bg-neutral-100 p-4">
          <h3 className="text-lg font-semibold">{current.name}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-500">Section name<input value={current.name} onChange={(event) => update({ name: event.target.value })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Availability<select value={current.status} onChange={(event) => update({ status: event.target.value as Section["status"] })} className="input mt-1"><option value="available">Available</option><option value="sold">Sold</option></select></label>
            <label className="text-sm text-neutral-500">Capacity<input type="number" min="1" step="1" value={Number.isNaN(current.capacity) ? "" : current.capacity} onChange={(event) => update({ capacity: event.target.value === "" ? NaN : Number(event.target.value) })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Area<input value={venueAreaLabels[current.area]} disabled className="input mt-1 opacity-60" /></label>
            <label className="text-sm text-neutral-500">Minimum spend ($)<input type="number" min="0" step="0.01" value={Number.isNaN(current.minimumSpend) ? "" : current.minimumSpend} onChange={(event) => update({ minimumSpend: event.target.value === "" ? NaN : Number(event.target.value) })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Deposit ($)<input type="number" min="0" step="0.01" value={Number.isNaN(current.deposit) ? "" : current.deposit} onChange={(event) => update({ deposit: event.target.value === "" ? NaN : Number(event.target.value) })} className="input mt-1" /></label>
          </div>
          <label className="mt-4 block text-sm text-neutral-500">Description<textarea value={current.description} onChange={(event) => update({ description: event.target.value })} className="input mt-1 min-h-24" /></label>
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => { setSections(original); setError(""); setNotice("Unsaved default changes discarded."); }} className="rounded-md border border-neutral-300 px-4 py-3 text-sm">Discard default changes</button>
          <button type="submit" className="rounded-md bg-primary px-6 py-3 font-semibold text-on-primary">{saving ? "Saving…" : "Save section defaults"}</button>
        </div>
      </fieldset>
    </form>}
  </section>;
}
