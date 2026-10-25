"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isValidVenue, useVenueData } from "@/components/providers/VenueDataProvider";
import { formatBookingTime } from "@/lib/booking-time";
import { saveBeverageOptions } from "@/lib/beverages";
import WeeklyBookingEditor from "@/components/vendor/WeeklyBookingEditor";
import SectionDefaultsEditor from "@/components/vendor/SectionDefaultsEditor";
import { logoutVendor, type VendorSession } from "@/lib/vendor-auth";
import {
  BeverageOption,
  Reservation,
  Venue,
  venueAreaLabels,
} from "@/types/venue";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type VendorDashboardProps = { session: VendorSession };
type NewBeverage = Pick<BeverageOption, "name" | "type" | "price">;

function cloneVenue(venue: Venue) {
  return JSON.parse(JSON.stringify(venue)) as Venue;
}

function createNewBeverage(): NewBeverage {
  return { name: "", type: "bottle", price: 0 };
}

export default function VendorDashboard({ session }: VendorDashboardProps) {
  const router = useRouter();
  const { venues, reservations, hydrated, venueError, beverageError, sectionError, updateVenue } = useVenueData();
  const venue = venues.find((item) => item.venueName.toLowerCase() === session.venueName);
  const [draft, setDraft] = useState<Venue | null>(venue ? cloneVenue(venue) : null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"management" | "defaults" | "reservations">("management");
  const [defaultsOpened, setDefaultsOpened] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDrinkOpen, setIsAddDrinkOpen] = useState(false);
  const [newBeverage, setNewBeverage] = useState<NewBeverage>(createNewBeverage);

  async function logout() {
    const { error } = await logoutVendor();
    if (error) {
      setNotice("We couldn't sign you out. Please try again.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  useEffect(() => {
    if (venue) {
      setDraft((current) => ({ ...cloneVenue(venue), beverages: current?.beverages ?? venue.beverages }));
    }
  }, [venue]);

  if (!hydrated) {
    return <main className="mx-auto max-w-7xl px-6 py-16 text-neutral-500">Loading vendor portal…</main>;
  }

  if (!draft && venue) {
    return <main className="mx-auto max-w-7xl px-6 py-16 text-neutral-500">Loading vendor portal…</main>;
  }

  if (!draft) {
    return <main className="mx-auto max-w-7xl px-6 py-16 text-red-700">{venueError ?? "This venue is not available in the portal."}</main>;
  }

  function updateBeverage(beverageId: string, changes: Partial<BeverageOption>) {
    setDraft((current) => current && {
      ...current,
      beverages: current.beverages.map((beverage) => beverage.id === beverageId ? { ...beverage, ...changes } : beverage),
    });
    setNotice("");
  }

  function openAddBeverage() {
    setNewBeverage(createNewBeverage());
    setIsAddDrinkOpen(true);
  }

  function addBeverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newBeverage.name.trim();
    if (!name || !Number.isFinite(newBeverage.price) || newBeverage.price < 0) return;

    const id = `drink-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDraft((current) => current && {
      ...current,
      beverages: [...current.beverages, { id, ...newBeverage, name }],
    });
    setIsAddDrinkOpen(false);
    setNotice("");
  }

  function removeBeverage(beverageId: string) {
    setDraft((current) => current && {
      ...current,
      beverages: current.beverages.filter((beverage) => beverage.id !== beverageId),
    });
    setNotice("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (!draft || !isValidVenue(draft)) {
      setNotice("Check required names, non-negative prices, and section values before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const beverages = await saveBeverageOptions(session.venueId, venue?.beverages ?? [], draft.beverages);
      setDraft({ ...draft, beverages });
      updateVenue({ ...draft, beverages });
      setNotice("Drink menu saved to the database.");
    } catch {
      setNotice("Some changes could not be saved. Reload the page before trying again.");
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    if (venue) setDraft(cloneVenue(venue));
    setNotice("Unsaved drink changes discarded.");
  }

  return (
    <>
      <header className="venue-header border-b-2">
        <div className="venue-header-content grid w-full items-center gap-2 px-3 py-3 sm:px-4">
          <p className="justify-self-start text-xs text-foreground sm:text-sm">Vendor portal</p>
          <a href="/vendor" className="venue-header-title text-base font-semibold text-foreground sm:text-xl">{venue?.name ?? draft.name}</a>
          <nav aria-label="Vendor portal navigation" className="col-span-3 flex flex-wrap items-center justify-end gap-2 sm:col-span-1 sm:justify-self-end">
            <a href={`/${draft.venueName}`} className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary sm:px-4 sm:text-sm">View reservation site</a>
            <button type="button" onClick={logout} className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary sm:px-4 sm:text-sm">Log out</button>
          </nav>
        </div>
      </header>
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="border-b border-neutral-300 pb-7">
          <h1 className="display-heading">Manage your venue</h1>
          <p className="mt-3 max-w-2xl text-neutral-500">Update the information customers use when reserving sections.</p>
      </div>

      <div className="mt-7 flex flex-wrap gap-2 border-b border-neutral-300" role="tablist" aria-label="Vendor portal views">
        <button
          id="management-tab"
          type="button"
          role="tab"
          aria-selected={activeDashboardTab === "management"}
          aria-controls="management-panel"
          onClick={() => setActiveDashboardTab("management")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "management" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}
        >
          Add or Update Sections
        </button>
        <button id="defaults-tab" type="button" role="tab" aria-selected={activeDashboardTab === "defaults"} aria-controls="defaults-panel"
          onClick={() => { setDefaultsOpened(true); setActiveDashboardTab("defaults"); }}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "defaults" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}>
          Update Section Defaults
        </button>
        <button
          id="reservations-tab"
          type="button"
          role="tab"
          aria-selected={activeDashboardTab === "reservations"}
          aria-controls="reservations-panel"
          onClick={() => setActiveDashboardTab("reservations")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "reservations" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}
        >
          Reservation history
        </button>
      </div>

      <div id="management-panel" role="tabpanel" aria-labelledby="management-tab" hidden={activeDashboardTab !== "management"} className="mt-8 space-y-10">
        {notice && <p role="status" className="rounded-md border border-primary bg-neutral-50 px-4 py-3 text-sm">{notice}</p>}
        {venueError && <p role="alert" className="text-red-700">{venueError}</p>}
        {beverageError && <p role="alert" className="text-red-700">{beverageError}</p>}
        {sectionError && <p role="alert" className="text-red-700">{sectionError}</p>}

        <WeeklyBookingEditor venue={venue ?? draft} disabled={!!venueError || !!sectionError} />

        <form onSubmit={save} className="space-y-6">
        <section aria-labelledby="menu-heading" className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="menu-heading" className="text-2xl font-semibold">Drink menu</h2><p className="mt-2 text-sm text-neutral-500">Prices update throughout the reservation and checkout flow.</p></div>
            <button type="button" onClick={openAddBeverage} className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-on-primary hover:bg-accent">Add drink</button>
          </div>
          <div className="mt-6 space-y-3">
            {draft.beverages.map((beverage) => <BeverageEditor key={beverage.id} beverage={beverage} onChange={updateBeverage} onRemove={removeBeverage} />)}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-12">
          <button type="button" onClick={reset} className="rounded-md border border-neutral-300 px-5 py-3 text-sm hover:border-primary">Discard drink changes</button>
          <button type="submit" disabled={isSaving || !!venueError || !!beverageError || !!sectionError} className="rounded-md bg-primary px-6 py-3 font-semibold text-on-primary hover:bg-accent disabled:opacity-60">{isSaving ? "Saving…" : "Save drink changes"}</button>
        </div>
        </form>
      </div>
      {defaultsOpened && <div id="defaults-panel" role="tabpanel" aria-labelledby="defaults-tab" hidden={activeDashboardTab !== "defaults"} className="mt-8 pb-12">
        <SectionDefaultsEditor venueId={session.venueId} venueName={session.venueName}
          onSaved={(sections) => { if (venue) updateVenue({ ...venue, sections }); }} />
      </div>}
      {activeDashboardTab === "reservations" && (
        <ReservationHistory
          reservations={reservations.filter((reservation) => reservation.venueId === draft.id)}
        />
      )}

      {isAddDrinkOpen && (
        <AddDrinkDialog
          beverage={newBeverage}
          onChange={setNewBeverage}
          onClose={() => setIsAddDrinkOpen(false)}
          onSubmit={addBeverage}
        />
      )}
    </main>
    </>
  );
}

function ReservationHistory({ reservations }: { reservations: Reservation[] }) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [page, setPage] = useState(1);
  const pastReservations = [...reservations].sort(
    (first, second) => new Date(second.reservationDate).getTime() - new Date(first.reservationDate).getTime(),
  );
  const years = [...new Set(pastReservations.map((reservation) => reservation.reservationDate.slice(0, 4)))].sort((first, second) => Number(second) - Number(first));
  const filteredReservations = pastReservations.filter((reservation) => {
    const [year, month] = reservation.reservationDate.split("-");
    return (!selectedMonth || Number(month) === Number(selectedMonth)) && (!selectedYear || year === selectedYear);
  });
  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / 10));
  const currentPage = Math.min(page, totalPages);
  const visibleReservations = filteredReservations.slice((currentPage - 1) * 10, currentPage * 10);
  const hasFilters = Boolean(selectedMonth || selectedYear);

  function changeMonth(value: string) {
    setSelectedMonth(value);
    setPage(1);
  }

  function changeYear(value: string) {
    setSelectedYear(value);
    setPage(1);
  }

  function clearFilters() {
    setSelectedMonth("");
    setSelectedYear("");
    setPage(1);
  }

  return (
    <section id="reservations-panel" role="tabpanel" aria-labelledby="reservations-tab" className="mt-8 space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-semibold">Reservation history</h2>
        <p className="mt-2 text-sm text-neutral-500">Review completed demo reservations, newest first.</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-300 px-5 py-4">
          <div>
            <h3 className="font-semibold">Reservation logs</h3>
            <p className="mt-1 text-sm text-neutral-500">Showing {visibleReservations.length} of {filteredReservations.length} matching reservation{filteredReservations.length === 1 ? "" : "s"}.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-neutral-500">
              Month
              <select value={selectedMonth} onChange={(event) => changeMonth(event.target.value)} className="input mt-1 min-w-36">
                <option value="">All months</option>
                {months.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
              </select>
            </label>
            <label className="text-sm text-neutral-500">
              Year
              <select value={selectedYear} onChange={(event) => changeYear(event.target.value)} className="input mt-1 min-w-28">
                <option value="">All years</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            {hasFilters && <button type="button" onClick={clearFilters} className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:border-primary">Clear filters</button>}
          </div>
        </div>
        {visibleReservations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Section</th>
                  <th className="px-5 py-3 font-medium">Drink sign</th>
                  <th className="px-5 py-3 font-medium">Guests</th>
                  <th className="px-5 py-3 font-medium">Deposit</th>
                </tr>
              </thead>
              <tbody>
                {visibleReservations.map((reservation) => (
                  <tr key={reservation.id} className="border-t border-neutral-300">
                    <td className="px-5 py-4 whitespace-nowrap">{formatReservationDate(reservation.reservationDate)}<span className="block text-xs text-neutral-500">{formatBookingTime(reservation.reservationTime)}</span></td>
                    <td className="px-5 py-4"><span className="block font-medium">{reservation.customerName}</span><span className="block text-xs text-neutral-500">{reservation.customerEmail}</span></td>
                    <td className="px-5 py-4">{reservation.sectionName}<span className="block text-xs text-neutral-500">{venueAreaLabels[reservation.sectionArea]}</span></td>
                    <td className="min-w-40 max-w-64 px-5 py-4 whitespace-pre-wrap [overflow-wrap:anywhere]">{reservation.drinkSignText || "—"}</td>
                    <td className="px-5 py-4">{reservation.guestCount}</td>
                    <td className="px-5 py-4">${reservation.deposit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm text-neutral-500">{hasFilters ? "No reservations match the selected month and year." : "No reservations have been recorded yet."}</p>
        )}

        {filteredReservations.length > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-neutral-300 px-5 py-4 text-sm">
            <span className="text-neutral-500">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="rounded-md border border-neutral-300 px-3 py-2 disabled:cursor-default disabled:opacity-40 hover:border-primary disabled:hover:border-neutral-300">Previous</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} className="rounded-md border border-neutral-300 px-3 py-2 disabled:cursor-default disabled:opacity-40 hover:border-primary disabled:hover:border-neutral-300">Next</button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

function formatReservationDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

function BeverageEditor({ beverage, onChange, onRemove }: { beverage: BeverageOption; onChange: (id: string, changes: Partial<BeverageOption>) => void; onRemove: (id: string) => void }) {
  return <div className="grid gap-3 rounded-lg border border-neutral-300 bg-neutral-100 p-4 md:grid-cols-[1fr_140px_130px_auto]">
    <Field label="Drink name"><input required value={beverage.name} onChange={(event) => onChange(beverage.id, { name: event.target.value })} className="input" /></Field>
    <Field label="Type"><select value={beverage.type} onChange={(event) => onChange(beverage.id, { type: event.target.value as BeverageOption["type"] })} className="input"><option value="bottle">Bottle</option><option value="keg">Keg</option></select></Field>
    <Field label="Price"><input required min="0" type="number" value={beverage.price} onChange={(event) => onChange(beverage.id, { price: Number(event.target.value) })} className="input" /></Field>
    <button type="button" onClick={() => onRemove(beverage.id)} className="self-end rounded-md border border-neutral-300 px-4 py-2 text-sm hover:border-primary">Remove</button>
  </div>;
}

function AddDrinkDialog({
  beverage,
  onChange,
  onClose,
  onSubmit,
}: {
  beverage: NewBeverage;
  onChange: (beverage: NewBeverage) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-drink-title"
        className="w-full max-w-md rounded-xl border border-neutral-300 bg-neutral-50 p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="add-drink-title" className="text-2xl font-semibold">Add a drink</h2>
        <p className="mt-2 text-sm text-neutral-500">Add a bottle or keg to the menu.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Drink name">
            <input
              required
              autoFocus
              value={beverage.name}
              onChange={(event) => onChange({ ...beverage, name: event.target.value })}
              className="input"
            />
          </Field>
          <Field label="Type">
            <select
              value={beverage.type}
              onChange={(event) => onChange({ ...beverage, type: event.target.value as BeverageOption["type"] })}
              className="input"
            >
              <option value="bottle">Bottle</option>
              <option value="keg">Keg</option>
            </select>
          </Field>
          <Field label="Price">
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={beverage.price}
              onChange={(event) => onChange({ ...beverage, price: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:border-primary">Cancel</button>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-accent">Add drink</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-neutral-500">{label}{children}</label>;
}
