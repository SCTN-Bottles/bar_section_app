"use client";

import { useEffect, useState } from "react";
import {
  dateKey, deleteScheduleDay, getScheduleDates, loadBookingSchedule, offsetDate, saveBookingSchedule, scheduleKey,
  validateSchedule, weekStart, type BookingSlot, type ScheduledSection,
} from "@/lib/booking-schedule";
import { venueAreaLabels, type Venue } from "@/types/venue";
import DrinkMenuEditor from "@/components/vendor/DrinkMenuEditor";
import { useConfirmation } from "@/components/ui/use-confirmation";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const buttonClass = "rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold hover:border-primary disabled:opacity-50";
const selectedClass = " border-primary bg-primary text-on-primary";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export default function WeeklyBookingEditor({ venue, disabled, menuRefreshVersion = 0 }: { venue: Venue; disabled: boolean; menuRefreshVersion?: number }) {
  const { confirm, confirmationDialog } = useConfirmation();
  const [week, setWeek] = useState(() => weekStart(dateKey(new Date())));
  const [days, setDays] = useState<number[]>(venue.bookingCalendar.availableWeekdays);
  const [knownDates, setKnownDates] = useState<string[]>([]);
  const [confirmedDates, setConfirmedDates] = useState<string[]>([]);
  const [sections, setSections] = useState<ScheduledSection[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [menuDirty, setMenuDirty] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [confirmationVersion, setConfirmationVersion] = useState(0);
  const [activeDate, setActiveDate] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [activeSlot, setActiveSlot] = useState<BookingSlot>("night");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [busy, setBusy] = useState<"loading" | "saving" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [weekLoading, setWeekLoading] = useState(true);
  const [weekError, setWeekError] = useState(false);
  const [weekRetry, setWeekRetry] = useState(0);
  const defaultDaysKey = venue.bookingCalendar.availableWeekdays.join(",");

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    // The venue or requested week changed; reset feedback before loading it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekLoading(true);
    setWeekError(false);
    async function loadWeek() {
      try {
        const dates = await getScheduleDates(venue.id, week);
        const loaded = dates.length ? await loadBookingSchedule(venue.id, venue.venueName, dates) : null;
        if (cancelled) return;
        setDays(dates.length ? dates.map((date) => new Date(`${date}T12:00:00`).getDay()) : defaultDaysKey.split(",").filter(Boolean).map(Number));
        setConfirmedDates(dates);
        setKnownDates(dates);
        setSections(loaded?.sections ?? []);
        setDirty(new Set());
        setActiveDate(dates[0] ?? "");
        if (loaded) {
          setSlots(loaded.slots);
          setActiveSlot((slot) => loaded.slots.includes(slot) ? slot : loaded.slots[0]);
          setMessage("Saved days are selected and their settings are loaded.");
        }
      } catch {
        if (!cancelled) setWeekError(true);
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    }
    void loadWeek();
    return () => { cancelled = true; };
  }, [week, venue.id, venue.venueName, defaultDaysKey, disabled, weekRetry]);

  function toggleDay(day: number) {
    if (busy || weekLoading || weekError || menuSaving) return;
    setDays((values) => values.includes(day) ? values.filter((value) => value !== day) : [...values, day]);
    setMessage("");
    setError("");
  }

  const selectedDates = [...days].sort((a, b) => a - b).map((day) => offsetDate(week, day));
  const removedDates = knownDates.filter((date) => !selectedDates.includes(date));
  const canConfirmChanges = selectedDates.every((date) => confirmedDates.includes(date));
  const selectionConfirmed = confirmedDates.length > 0 && selectedDates.join() === confirmedDates.join();
  const visibleSections = sections.filter((section) => section.date === activeDate && section.slot === activeSlot);
  const current = visibleSections.find((section) => section.id === activeSection) ?? visibleSections[0];

  async function changeWeek(value: string) {
    if (!value || value === week) return;
    const next = weekStart(value);
    if (next === week) return;
    if ((dirty.size || menuDirty || removedDates.length) && !await confirm({ title: "Discard unsaved changes?", message: "Discard unsaved section and drink changes and switch weeks?", confirmLabel: "Discard and switch" })) return;
    setMenuDirty(false);
    setWeekLoading(true);
    setKnownDates([]);
    setWeek(next);
    setSections([]);
    setConfirmedDates([]);
    setDirty(new Set());
    setMessage("");
    setError("");
  }

  async function confirmDays() {
    if (busy || !selectedDates.length) return;
    if ((sections.some((section) => dirty.has(scheduleKey(section)) && !selectedDates.includes(section.date))
      || (menuDirty && confirmedDates.some((date) => !selectedDates.includes(date))))
      && !await confirm({ title: "Discard unsaved changes?", message: "Discard unsaved changes for the days you removed?", confirmLabel: "Discard changes" })) return;
    setBusy("loading");
    setError("");
    setMessage("");
    try {
      const loaded = await loadBookingSchedule(venue.id, venue.venueName, selectedDates);
      const drafts = new Map(sections.filter((section) => dirty.has(scheduleKey(section))).map((section) => [scheduleKey(section), section]));
      const nextSections = loaded.sections.map((section) => drafts.get(scheduleKey(section)) ?? section);
      setSections(nextSections);
      setDirty(new Set(nextSections.filter((section) => drafts.has(scheduleKey(section))).map(scheduleKey)));
      setSlots(loaded.slots);
      setActiveSlot((slot) => loaded.slots.includes(slot) ? slot : loaded.slots[0]);
      setKnownDates((values) => [...new Set([...values, ...selectedDates])]);
      setConfirmedDates(selectedDates);
      setConfirmationVersion((value) => value + 1);
      setActiveDate((date) => selectedDates.includes(date) ? date : selectedDates[0]);
      setMessage(nextSections.length ? "Days confirmed. Saved settings are loaded; new dates use section defaults." : "No active sections are configured for this venue.");
    } catch {
      setError("Section settings could not be loaded. Your edits are still here. Try confirming days again.");
    } finally {
      setBusy(null);
    }
  }

  function updateSection(changes: Partial<ScheduledSection>) {
    if (!current) return;
    const key = scheduleKey(current);
    setSections((values) => values.map((section) => scheduleKey(section) === key ? { ...section, ...changes } : section));
    setDirty((values) => new Set(values).add(key));
    setMessage("");
    setError("");
  }

  async function confirmChanges() {
    if (busy || menuSaving || !canConfirmChanges || (!sections.length && !removedDates.length)) return;
    const retainedSections = sections.filter((section) => selectedDates.includes(section.date));
    const invalid = validateSchedule(retainedSections);
    if (invalid) {
      setActiveDate(invalid.date);
      setActiveSection(invalid.id);
      setActiveSlot(invalid.slot);
      setError(`Check the name, description, capacity, prices, and time for ${invalid.name || "this section"} on ${formatDate(invalid.date)}.`);
      return;
    }
    setBusy("saving");
    setError("");
    setMessage("");
    try {
      if (retainedSections.length) await saveBookingSchedule(retainedSections);
      for (const date of removedDates) await deleteScheduleDay(venue.id, date);
      setKnownDates(selectedDates);
      setConfirmedDates(selectedDates);
      setActiveDate((date) => selectedDates.includes(date) ? date : selectedDates[0] ?? "");
      if (!selectedDates.length) setMenuDirty(false);
      setSections((values) => values.filter((section) => selectedDates.includes(section.date)).map((section) => ({ ...section, name: section.name.trim(), description: section.description.trim(), saved: true })));
      setDirty(new Set());
      setMessage(removedDates.length ? `Changes confirmed. Settings deleted for ${removedDates.length} removed day${removedDates.length === 1 ? "" : "s"}.` : `Section settings saved for ${selectedDates.length} day${selectedDates.length === 1 ? "" : "s"}.`);
    } catch {
      setError("Changes could not be saved. Your edits are still here; please try again.");
    } finally {
      setBusy(null);
    }
  }

  return <section aria-labelledby="schedule-heading" className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 sm:p-6">
    {confirmationDialog}
    <h2 id="schedule-heading" className="text-2xl font-semibold">Booking schedule</h2>
    <p className="mt-2 text-sm text-neutral-500">Saved days load automatically. Confirm newly selected days to edit them. Unselecting a day marks its section and drink settings for deletion when you click Confirm changes. Customer reservations are kept.</p>
    {weekLoading && <p role="status" className="mt-3 text-sm">Checking saved days…</p>}
    {weekError && <p role="alert" className="mt-3 text-sm text-red-700">Saved days could not be loaded. <button type="button" onClick={() => setWeekRetry((value) => value + 1)} className="underline">Retry loading week</button></p>}
    <fieldset disabled={Boolean(busy) || menuSaving || disabled || weekLoading || weekError} className="mt-5 space-y-5 disabled:opacity-60">
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" aria-label="Previous week" onClick={() => changeWeek(offsetDate(week, -7))} className={buttonClass}>Previous week</button>
        <label className="block text-sm text-neutral-500">Week starting Sunday
          <input type="date" value={week} onChange={(event) => changeWeek(event.target.value)} className="input mt-1" />
        </label>
        <button type="button" aria-label="Next week" onClick={() => changeWeek(offsetDate(week, 7))} className={buttonClass}>Next week</button>
      </div>
      <p className="text-sm font-medium">{formatDate(week)} – {formatDate(offsetDate(week, 6))}</p>
      <div className="flex flex-wrap gap-2" aria-label="Days to edit">
        {weekdays.map((day, index) => <button key={day} type="button" aria-pressed={days.includes(index)}
          onClick={() => void toggleDay(index)}
          className={buttonClass + (days.includes(index) ? selectedClass : "")}>
          {day}<span className="mt-1 block text-xs">{formatDate(offsetDate(week, index))}</span>
        </button>)}
      </div>
      <button type="button" disabled={!days.length} onClick={confirmDays} className="rounded-md bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-50">
        {busy === "loading" ? "Loading days…" : "Confirm days"}
      </button>
      {!days.length && <p className="text-sm text-neutral-500">Choose at least one day.</p>}
    </fieldset>

    {message && <p role="status" className="mt-5 rounded-md border border-primary px-4 py-3 text-sm">{message}</p>}
    {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
    {confirmedDates.length > 0 && !selectionConfirmed && <p className="mt-5 text-sm text-neutral-500">Confirm your updated days to continue editing. Your current edits are kept until you confirm.</p>}

    {selectionConfirmed && sections.length > 0 && <fieldset disabled={Boolean(busy) || disabled} className="mt-7 space-y-5 disabled:opacity-60">
      <div role="tablist" aria-label="Confirmed booking days" className="flex flex-wrap gap-2">
        {confirmedDates.map((date) => <button key={date} type="button" role="tab" id={`day-${date}`} aria-selected={activeDate === date} aria-controls="booking-day-panel"
          onClick={() => setActiveDate(date)} className={buttonClass + (activeDate === date ? selectedClass : "")}>
          {weekdays[new Date(`${date}T12:00:00`).getDay()]} · {formatDate(date)}
          {sections.some((section) => section.date === date && dirty.has(scheduleKey(section))) ? " *" : ""}
        </button>)}
      </div>
      <div id="booking-day-panel" role="tabpanel" aria-labelledby={`day-${activeDate}`} className="space-y-5">
        {slots.length > 1 && <div className="flex gap-2" aria-label="Booking period">{slots.map((slot) => <button key={slot} type="button" aria-pressed={slot === activeSlot} onClick={() => setActiveSlot(slot)} className={buttonClass + (slot === activeSlot ? selectedClass : "")}>{slot === "day" ? "Daytime" : "Nighttime"}</button>)}</div>}
        <div role="tablist" aria-label="Sections for selected day" className="flex gap-2 overflow-x-auto pb-2">
          {visibleSections.map((section) => <button key={section.id} type="button" role="tab" id={`section-tab-${section.id}`} aria-selected={current?.id === section.id} aria-controls="booking-section-panel"
            onClick={() => setActiveSection(section.id)} className={buttonClass + " shrink-0" + (current?.id === section.id ? selectedClass : "")}>
            <span className="block text-xs">{venueAreaLabels[section.area]}</span>{section.name}{dirty.has(scheduleKey(section)) ? " *" : ""}
          </button>)}
        </div>
        {current && <div id="booking-section-panel" role="tabpanel" aria-labelledby={`section-tab-${current.id}`} className="rounded-lg border border-neutral-300 bg-neutral-100 p-4">
          <h3 className="text-lg font-semibold">{current.name} · {formatDate(current.date)}</h3>
          <p className="mt-1 text-xs text-neutral-500">{current.saved ? "Loaded from saved booking settings" : "Starting from section defaults"}{dirty.has(scheduleKey(current)) ? " · Unsaved changes" : ""}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-neutral-500">Section name<input value={current.name} onChange={(event) => updateSection({ name: event.target.value })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Availability<select value={current.status} onChange={(event) => updateSection({ status: event.target.value as ScheduledSection["status"] })} className="input mt-1"><option value="available">Available</option><option value="sold">Sold</option></select></label>
            <label className="text-sm text-neutral-500">Capacity<input type="number" min="1" step="1" value={Number.isNaN(current.capacity) ? "" : current.capacity} onChange={(event) => updateSection({ capacity: event.target.value === "" ? NaN : Number(event.target.value) })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Reservation time<input type="time" value={current.time} onChange={(event) => updateSection({ time: event.target.value })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Minimum spend ($)<input type="number" min="0" step="0.01" value={Number.isNaN(current.minimumSpend) ? "" : current.minimumSpend} onChange={(event) => updateSection({ minimumSpend: event.target.value === "" ? NaN : Number(event.target.value) })} className="input mt-1" /></label>
            <label className="text-sm text-neutral-500">Deposit ($)<input type="number" min="0" step="0.01" value={Number.isNaN(current.deposit) ? "" : current.deposit} onChange={(event) => updateSection({ deposit: event.target.value === "" ? NaN : Number(event.target.value) })} className="input mt-1" /></label>
          </div>
          <label className="mt-4 block text-sm text-neutral-500">Description<textarea value={current.description} onChange={(event) => updateSection({ description: event.target.value })} className="input mt-1 min-h-24" /></label>
        </div>}
      </div>
    </fieldset>}
    {removedDates.length > 0 && <p role="status" className="mt-5 text-sm">Pending deletion: {removedDates.map(formatDate).join(", ")}. Click Confirm changes to delete these days, or select them again to keep them.</p>}
    {(selectionConfirmed || removedDates.length > 0) && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-300 pt-5">
      <p className="text-sm text-neutral-500">Saves selected sections and deletes days marked for removal. * Unsaved changes.</p>
      <button type="button" disabled={Boolean(busy) || menuSaving || disabled || weekLoading || weekError || !canConfirmChanges} onClick={confirmChanges} className="rounded-md bg-primary px-6 py-3 font-semibold text-on-primary disabled:opacity-50">{busy === "saving" ? "Saving…" : "Confirm changes"}</button>
    </div>}
    {confirmedDates.length > 0 && <fieldset disabled={Boolean(busy) || disabled} hidden={!selectionConfirmed} className="mt-8">
      <DrinkMenuEditor venueId={venue.id} venueName={venue.venueName} dates={confirmedDates}
        refreshVersion={`${menuRefreshVersion}:${confirmationVersion}`}
        activeDate={activeDate} onSelectDate={setActiveDate} onDirtyChange={setMenuDirty} onSavingChange={setMenuSaving} />
    </fieldset>}
  </section>;
}
