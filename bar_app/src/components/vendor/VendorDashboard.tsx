"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useVenueData } from "@/components/providers/VenueDataProvider";
import ReservationHistory from "@/components/vendor/ReservationHistory";
import ReservationReview from "@/components/vendor/ReservationReview";
import ViewBookings from "@/components/vendor/ViewBookings";
import DrinkMenuEditor from "@/components/vendor/DrinkMenuEditor";
import WeeklyBookingEditor from "@/components/vendor/WeeklyBookingEditor";
import SectionDefaultsEditor from "@/components/vendor/SectionDefaultsEditor";
import { logoutVendor, type VendorSession } from "@/lib/vendor-auth";
import type { Venue } from "@/types/venue";

type VendorDashboardProps = { session: VendorSession };

type DashboardTab = "management" | "defaults" | "drink-defaults" | "reservations" | "review" | "bookings" | "analytics";
type DashboardGroup = "reservations" | "reports" | "sections" | "drinks";

const dashboardGroups: { id: DashboardGroup; label: string; tabs: { id: DashboardTab; label: string }[] }[] = [
  { id: "reservations", label: "Reservations", tabs: [{ id: "bookings", label: "Bookings" }, { id: "review", label: "Pending Reservations" }] },
  { id: "reports", label: "Reports", tabs: [{ id: "reservations", label: "Reservation History" }, { id: "analytics", label: "Reservation Analytics" }] },
  { id: "sections", label: "Sections", tabs: [{ id: "management", label: "Manage Sections" }, { id: "defaults", label: "Section Defaults" }] },
  { id: "drinks", label: "Drink Menu", tabs: [{ id: "drink-defaults", label: "Drink Menu Defaults" }] },
];

function PortalTabs<T extends string>({ label, tabs, activeTab, onSelect, secondary = false, idPrefix = "" }: {
  label: string;
  tabs: { id: T; label: string; panelId: string }[];
  activeTab: T;
  onSelect: (id: T) => void;
  secondary?: boolean;
  idPrefix?: string;
}) {
  return <div role="tablist" aria-label={label} className={`flex overflow-x-auto border-b border-neutral-300 ${secondary ? "mt-4 gap-1" : "mt-7 gap-2"}`}>
    {tabs.map((tab, index) => <button key={tab.id} id={`${idPrefix}${tab.id}-tab`} type="button" role="tab"
      aria-selected={activeTab === tab.id} aria-controls={tab.panelId} tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => onSelect(tab.id)}
      onKeyDown={(event) => {
        const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length
          : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (nextIndex < 0) return;
        event.preventDefault();
        onSelect(tabs[nextIndex].id);
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
      }}
      className={`shrink-0 border-b-2 px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${secondary ? "font-medium" : "font-semibold"} ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-neutral-500 hover:text-foreground"}`}>
      {tab.label}
    </button>)}
  </div>;
}

function cloneVenue(venue: Venue) {
  return JSON.parse(JSON.stringify(venue)) as Venue;
}

export default function VendorDashboard({ session }: VendorDashboardProps) {
  const router = useRouter();
  const { venues, hydrated, venueError, beverageError, sectionError, updateVenue } = useVenueData();
  const venue = venues.find((item) => item.venueName.toLowerCase() === session.venueName);
  const [draft, setDraft] = useState<Venue | null>(venue ? cloneVenue(venue) : null);
  const [activeGroup, setActiveGroup] = useState<DashboardGroup>("reservations");
  const [groupTabs, setGroupTabs] = useState<Record<DashboardGroup, DashboardTab>>({
    reservations: "bookings", reports: "reservations", sections: "management", drinks: "drink-defaults",
  });
  const activeDashboardTab = groupTabs[activeGroup];
  const currentGroup = dashboardGroups.find((group) => group.id === activeGroup)!;
  const [defaultsOpened, setDefaultsOpened] = useState(false);
  const [notice, setNotice] = useState("");
  const [drinkDefaultsOpened, setDrinkDefaultsOpened] = useState(false);
  const [menuRefreshVersion, setMenuRefreshVersion] = useState(0);
  const [reservationRefreshVersion, setReservationRefreshVersion] = useState(0);

  function openTab(tab: DashboardTab) {
    if (tab === "management") setMenuRefreshVersion((value) => value + 1);
    if (tab === "defaults") setDefaultsOpened(true);
    if (tab === "drink-defaults") setDrinkDefaultsOpened(true);
  }

  function selectGroup(group: DashboardGroup) {
    setActiveGroup(group);
    openTab(groupTabs[group]);
  }

  function selectTab(tab: DashboardTab) {
    setGroupTabs((current) => ({ ...current, [activeGroup]: tab }));
    openTab(tab);
  }

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

      <PortalTabs label="Vendor portal views" activeTab={activeGroup} onSelect={selectGroup} idPrefix="group-"
        tabs={dashboardGroups.map((group) => ({ id: group.id, label: group.label, panelId: "vendor-group-panel" }))} />

      <div id="vendor-group-panel" role="tabpanel" aria-labelledby={`group-${activeGroup}-tab`} tabIndex={0}>
        {currentGroup.tabs.length > 1 && <PortalTabs label={`${currentGroup.label} views`} activeTab={activeDashboardTab} onSelect={selectTab} secondary
          tabs={currentGroup.tabs.map((tab) => ({ ...tab, panelId: `${tab.id}-panel` }))} />}

        <div id="management-panel" role="tabpanel" aria-labelledby="management-tab" hidden={activeDashboardTab !== "management"} className="mt-8 space-y-10">
          {notice && <p role="status" className="rounded-md border border-primary bg-neutral-50 px-4 py-3 text-sm">{notice}</p>}
          {venueError && <p role="alert" className="text-red-700">{venueError}</p>}
          {beverageError && <p role="alert" className="text-red-700">{beverageError}</p>}
          {sectionError && <p role="alert" className="text-red-700">{sectionError}</p>}

          <WeeklyBookingEditor venue={venue ?? draft} disabled={!!venueError || !!sectionError} menuRefreshVersion={menuRefreshVersion} reservationRefreshVersion={reservationRefreshVersion} />
        </div>
        {defaultsOpened && <div id="defaults-panel" role="tabpanel" aria-labelledby="defaults-tab" hidden={activeDashboardTab !== "defaults"} className="mt-8 pb-12">
          <SectionDefaultsEditor venueId={session.venueId} venueName={session.venueName}
            onSaved={(sections) => { if (venue) updateVenue({ ...venue, sections }); }} />
        </div>}
        {drinkDefaultsOpened && <div id="drink-defaults-panel" role="tabpanel" aria-labelledby="group-drinks-tab" hidden={activeDashboardTab !== "drink-defaults"} className="mt-8 pb-12">
          <DrinkMenuEditor venueId={session.venueId} venueName={session.venueName}
            onSaved={(beverages) => { if (venue) updateVenue({ ...venue, beverages }); setMenuRefreshVersion((value) => value + 1); }} />
        </div>}

        {activeDashboardTab === "review" && <div id="review-panel" role="tabpanel" aria-labelledby="review-tab"><ReservationReview venueId={session.venueId} onReservationChanged={() => setReservationRefreshVersion((value) => value + 1)} /></div>}
        {activeDashboardTab === "bookings" && <ViewBookings venueId={session.venueId} />}
        {activeDashboardTab === "reservations" && (
          <ReservationHistory
            venueId={session.venueId}
          />
        )}

        {activeDashboardTab === "analytics" && <section id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab" tabIndex={0} className="mt-8 space-y-3 pb-12">
          <h2 className="text-2xl font-semibold">Reservation Analytics</h2>
          <p className="text-sm text-neutral-500">Coming soon: charts and trends for your venue’s reservations.</p>
        </section>}
      </div>
    </main>
    </>
  );
}
