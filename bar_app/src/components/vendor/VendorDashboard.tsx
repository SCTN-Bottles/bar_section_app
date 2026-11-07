"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useVenueData } from "@/components/providers/VenueDataProvider";
import ReservationHistory from "@/components/vendor/ReservationHistory";
import ReservationReview from "@/components/vendor/ReservationReview";
import DrinkMenuEditor from "@/components/vendor/DrinkMenuEditor";
import WeeklyBookingEditor from "@/components/vendor/WeeklyBookingEditor";
import SectionDefaultsEditor from "@/components/vendor/SectionDefaultsEditor";
import { logoutVendor, type VendorSession } from "@/lib/vendor-auth";
import type { Venue } from "@/types/venue";

type VendorDashboardProps = { session: VendorSession };

function cloneVenue(venue: Venue) {
  return JSON.parse(JSON.stringify(venue)) as Venue;
}

export default function VendorDashboard({ session }: VendorDashboardProps) {
  const router = useRouter();
  const { venues, hydrated, venueError, beverageError, sectionError, updateVenue } = useVenueData();
  const venue = venues.find((item) => item.venueName.toLowerCase() === session.venueName);
  const [draft, setDraft] = useState<Venue | null>(venue ? cloneVenue(venue) : null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"management" | "defaults" | "drink-defaults" | "reservations" | "review">("management");
  const [defaultsOpened, setDefaultsOpened] = useState(false);
  const [notice, setNotice] = useState("");
  const [drinkDefaultsOpened, setDrinkDefaultsOpened] = useState(false);
  const [menuRefreshVersion, setMenuRefreshVersion] = useState(0);

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
      // Refresh the local draft from provider updates while preserving drink edits.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <>
      <header className="venue-header border-b-2">
        <div className="venue-header-content grid w-full items-center gap-2 px-3 py-3 sm:px-4">
          <p className="justify-self-start text-xs text-foreground sm:text-sm">Vendor portal</p>
          <Link href="/vendor" className="venue-header-title text-base font-semibold text-foreground sm:text-xl">{venue?.name ?? draft.name}</Link>
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
          id="review-tab"
          type="button"
          role="tab"
          aria-selected={activeDashboardTab === "review"}
          aria-controls="review-panel"
          onClick={() => setActiveDashboardTab("review")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "review" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}
        >
          Pending reservations
        </button>
        <button
          id="management-tab"
          type="button"
          role="tab"
          aria-selected={activeDashboardTab === "management"}
          aria-controls="management-panel"
          onClick={() => { setMenuRefreshVersion((value) => value + 1); setActiveDashboardTab("management"); }}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "management" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}
        >
          Add or Update Sections
        </button>
        <button id="defaults-tab" type="button" role="tab" aria-selected={activeDashboardTab === "defaults"} aria-controls="defaults-panel"
          onClick={() => { setDefaultsOpened(true); setActiveDashboardTab("defaults"); }}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "defaults" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}>
          Update Section Defaults
        </button>
        <button id="drink-defaults-tab" type="button" role="tab" aria-selected={activeDashboardTab === "drink-defaults"} aria-controls="drink-defaults-panel"
          onClick={() => { setDrinkDefaultsOpened(true); setActiveDashboardTab("drink-defaults"); }}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeDashboardTab === "drink-defaults" ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}>
          Update Drink Menu Defaults
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

        <WeeklyBookingEditor venue={venue ?? draft} disabled={!!venueError || !!sectionError} menuRefreshVersion={menuRefreshVersion} />
      </div>
      {defaultsOpened && <div id="defaults-panel" role="tabpanel" aria-labelledby="defaults-tab" hidden={activeDashboardTab !== "defaults"} className="mt-8 pb-12">
        <SectionDefaultsEditor venueId={session.venueId} venueName={session.venueName}
          onSaved={(sections) => { if (venue) updateVenue({ ...venue, sections }); }} />
      </div>}
      {drinkDefaultsOpened && <div id="drink-defaults-panel" role="tabpanel" aria-labelledby="drink-defaults-tab" hidden={activeDashboardTab !== "drink-defaults"} className="mt-8 pb-12">
        <DrinkMenuEditor venueId={session.venueId} venueName={session.venueName}
          onSaved={(beverages) => { if (venue) updateVenue({ ...venue, beverages }); setMenuRefreshVersion((value) => value + 1); }} />
      </div>}

      {activeDashboardTab === "review" && <div id="review-panel" role="tabpanel" aria-labelledby="review-tab"><ReservationReview venueId={session.venueId} /></div>}
      {activeDashboardTab === "reservations" && (
        <ReservationHistory
          venueId={session.venueId}
        />
      )}

    </main>
    </>
  );
}
