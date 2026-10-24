"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useVenueData } from "@/components/providers/VenueDataProvider";
import { formatBookingTime } from "@/lib/booking-time";
import { logoutVendor, type VendorSession } from "@/lib/vendor-auth";
import {
  BeverageOption,
  Reservation,
  Section,
  Venue,
  VenueArea,
  venueAreaLabels,
  venueAreas,
} from "@/types/venue";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
  const { venues, reservations, hydrated, updateVenue, resetVenues } = useVenueData();
  const venue = venues.find((item) => item.id === session.venueId);
  const [draft, setDraft] = useState<Venue | null>(venue ? cloneVenue(venue) : null);
  const [activeZone, setActiveZone] = useState<VenueArea>(
    venue?.sections.find((section) => section.area)?.area ?? venueAreas[0],
  );
  const [activeDashboardTab, setActiveDashboardTab] = useState<"management" | "reservations">("management");
  const [notice, setNotice] = useState("");
  const [isAddDrinkOpen, setIsAddDrinkOpen] = useState(false);
  const [newBeverage, setNewBeverage] = useState<NewBeverage>(createNewBeverage);

  async function logout() {
    const { error } = await logoutVendor();
    if (error) {
      setNotice("We couldn't sign you out. Please try again.");
      return;
    }
    router.replace("/vendor/login");
    router.refresh();
  }

  useEffect(() => {
    if (venue) {
      setDraft(cloneVenue(venue));
      setActiveZone((currentZone) => {
        if (venue.sections.some((section) => section.area === currentZone)) {
          return currentZone;
        }

        return venue.sections.find((section) => section.area)?.area ?? venueAreas[0];
      });
    }
  }, [venue]);

  if (!hydrated || !draft) {
    return <main className="mx-auto max-w-7xl px-6 py-16 text-neutral-500">Loading vendor portal…</main>;
  }

  function updateSection(sectionId: string, changes: Partial<Section>) {
    setDraft((current) => current && {
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...changes } : section),
    });
    setNotice("");
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

  function toggleWeekday(day: number) {
    if (
      draft!.bookingCalendar.availableWeekdays.length === 1 &&
      draft!.bookingCalendar.availableWeekdays.includes(day)
    ) {
      setNotice("Choose at least one booking day.");
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      const selected = current.bookingCalendar.availableWeekdays;
      const nextDays = selected.includes(day)
        ? selected.filter((value) => value !== day)
        : [...selected, day].sort((a, b) => a - b);
      return { ...current, bookingCalendar: { ...current.bookingCalendar, availableWeekdays: nextDays } };
    });
    setNotice("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !updateVenue(draft)) {
      setNotice("Check required names, non-negative prices, and section values before saving.");
      return;
    }
    setNotice("Changes saved. The reservation site now uses these details in this browser.");
  }

  function reset() {
    resetVenues();
    setNotice("Demo data restored.");
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

      <div className="mt-7 flex gap-2 border-b border-neutral-300" role="tablist" aria-label="Vendor portal views">
        <button
          id="management-tab"
          type="button"
          role="tab"
          aria-selected={activeDashboardTab === "management"}
          aria-controls="management-panel"
          onClick={() => setActiveDashboardTab("management")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "management" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}
        >
          Manage venue
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

      {activeDashboardTab === "management" ? (
      <form id="management-panel" role="tabpanel" aria-labelledby="management-tab" onSubmit={save} className="mt-8 space-y-10">
        {notice && <p role="status" className="rounded-md border border-primary bg-neutral-50 px-4 py-3 text-sm">{notice}</p>}

        <section aria-labelledby="schedule-heading" className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
          <h2 id="schedule-heading" className="text-2xl font-semibold">Booking schedule</h2>
          <p className="mt-2 text-sm text-neutral-500">Set the recurring days and default time shown to guests.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {weekdays.map((day, index) => {
              const selected = draft.bookingCalendar.availableWeekdays.includes(index);
              return <button key={day} type="button" aria-pressed={selected} onClick={() => toggleWeekday(index)} className={`rounded-md border px-4 py-2 text-sm ${selected ? "border-primary bg-primary text-on-primary" : "border-neutral-300"}`}>{day}</button>;
            })}
          </div>
          <label className="mt-5 block max-w-md text-sm text-neutral-500">
            Default reservation time
            <span className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-3 text-foreground">
              <span>
                <span className="block text-xs text-neutral-500">Selected time</span>
                <span className="mt-1 block text-xl font-semibold">{formatBookingTime(draft.bookingCalendar.placeholderTime)}</span>
              </span>
              <input
                required
                type="time"
                value={draft.bookingCalendar.placeholderTime}
                onChange={(event) => {
                  setDraft({ ...draft, bookingCalendar: { ...draft.bookingCalendar, placeholderTime: event.target.value } });
                  setNotice("");
                }}
                className="vendor-time-input rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-foreground focus:border-primary"
                aria-label="Default reservation time"
              />
            </span>
          </label>
        </section>

        <section aria-labelledby="sections-heading" className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
          <h2 id="sections-heading" className="text-2xl font-semibold">Sections</h2>
          <p className="mt-2 text-sm text-neutral-500">Map placement is fixed for this demo.</p>

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Section zones">
            {venueAreas.map((zone, index) => {
              const selected = activeZone === zone;

              function moveTab(direction: number) {
                const nextIndex = (index + direction + venueAreas.length) % venueAreas.length;
                setActiveZone(venueAreas[nextIndex]);
              }

              return (
                <button
                  key={zone}
                  id={`${zone}-zone-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${zone}-zone-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveZone(zone)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      moveTab(1);
                    } else if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      moveTab(-1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      setActiveZone(venueAreas[0]);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      setActiveZone(venueAreas[venueAreas.length - 1]);
                    }
                  }}
                  className={`rounded-md border px-4 py-2 text-sm font-semibold ${selected ? "border-primary bg-primary text-on-primary" : "border-neutral-300 hover:border-primary"}`}
                >
                  {venueAreaLabels[zone]}
                </button>
              );
            })}
          </div>

          <div
            id={`${activeZone}-zone-panel`}
            role="tabpanel"
            aria-labelledby={`${activeZone}-zone-tab`}
            tabIndex={0}
            className="mt-5"
          >
            <h3 className="text-lg font-semibold">{venueAreaLabels[activeZone]}</h3>
            {draft.sections.filter((section) => section.area === activeZone).length > 0 ? (
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {draft.sections
                  .filter((section) => section.area === activeZone)
                  .map((section) => <SectionEditor key={section.id} section={section} onChange={updateSection} />)}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500">
                No sections are configured for this zone.
              </p>
            )}
          </div>
        </section>

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
          <button type="button" onClick={reset} className="rounded-md border border-neutral-300 px-5 py-3 text-sm hover:border-primary">Reset demo data</button>
          <button type="submit" className="rounded-md bg-primary px-6 py-3 font-semibold text-on-primary hover:bg-accent">Save all changes</button>
        </div>
      </form>
      ) : (
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

function SectionEditor({ section, onChange }: { section: Section; onChange: (id: string, changes: Partial<Section>) => void }) {
  const setNumber = (field: "capacity" | "minimumSpend" | "deposit", value: string) => onChange(section.id, { [field]: Number(value) });
  return <section aria-labelledby={`${section.id}-editor-title`} className="rounded-lg border border-neutral-300 bg-neutral-100 p-4">
    <h4 id={`${section.id}-editor-title`} className="font-semibold">{section.name}</h4>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field label="Section name"><input required value={section.name} onChange={(event) => onChange(section.id, { name: event.target.value })} className="input" /></Field>
      <Field label="Availability"><select value={section.status} onChange={(event) => onChange(section.id, { status: event.target.value as Section["status"] })} className="input"><option value="available">Available</option><option value="sold">Sold</option></select></Field>
      <Field label="Capacity"><input required min="1" type="number" value={section.capacity} onChange={(event) => setNumber("capacity", event.target.value)} className="input" /></Field>
      <Field label="Minimum spend"><input required min="0" type="number" value={section.minimumSpend} onChange={(event) => setNumber("minimumSpend", event.target.value)} className="input" /></Field>
      <Field label="Deposit"><input required min="0" type="number" value={section.deposit} onChange={(event) => setNumber("deposit", event.target.value)} className="input" /></Field>
      <Field label="Area"><input value={section.area} disabled className="input opacity-60" /></Field>
    </div>
    <Field label="Description"><textarea required value={section.description} onChange={(event) => onChange(section.id, { description: event.target.value })} className="input mt-1 min-h-20" /></Field>
  </section>;
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
