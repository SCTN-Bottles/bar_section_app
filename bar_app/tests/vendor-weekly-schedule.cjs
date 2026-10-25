// Run against a local dev server. Set PLAYWRIGHT_PATH if Playwright is installed outside this repo.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const venue = { id: "test-venue", name: "Test bar", slug: "test-bar", description: "Test venue", city: "Chicago", state: "IL", booking_weekdays: [0, 1], booking_start_time: "20:00:00", booking_slots: ["night", "day"], is_active: true };
    const defaults = [
      { id: "eba82d1b-3be2-4e5b-8ceb-89b85c409f67", name: "A1", area: "indoor", description: "Indoor section", capacity: 10, minimum_spend: 100, deposit_amount: 25, status: "available", image_url: null },
      { id: "43b401e2-1372-4882-bed5-0d7b8245c2fe", name: "Cabana 1", area: "cabanas", description: "Cabana section", capacity: 12, minimum_spend: 200, deposit_amount: 50, status: "available", image_url: null },
    ];
    const stored = new Map();
    const writes = [];
    const defaultWrites = [];
    let failNextSave = false;
    await context.addInitScript(() => {
      // A test-only browser session; every Supabase request is intercepted below.
      localStorage.setItem("sb-cenaxburlzpsjkkdprzd-auth-token", JSON.stringify({ access_token: "test-session", refresh_token: "test-refresh", expires_at: 4102444800, token_type: "bearer", user: { id: "test-manager", email: "manager@example.test" } }));
    });
    await page.route("https://*.supabase.co/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      let data;
      if (url.pathname === "/auth/v1/user") data = { id: "test-manager", email: "manager@example.test" };
      else if (url.pathname.endsWith("/venue_managers")) data = [{ venue_id: venue.id }];
      else if (url.pathname.endsWith("/venues")) data = request.headers().accept?.includes("object") ? venue : [venue];
      else if (url.pathname.endsWith("/sections")) {
        if (request.method() === "PATCH") {
          assert.equal(request.headers()["content-profile"], "sctn-dev");
          assert.equal(url.searchParams.get("venue_id"), `eq.${venue.id}`);
          const section = defaults.find((value) => url.searchParams.get("id") === `eq.${value.id}`);
          assert.ok(section);
          Object.assign(section, request.postDataJSON());
          defaultWrites.push(request.postDataJSON());
          data = { id: section.id };
        } else data = defaults;
      }
      else if (url.pathname.endsWith("/beverage_options")) data = [];
      else if (url.pathname.endsWith("/bookings") || url.pathname.endsWith("/rpc/save_section_schedule")) {
        assert.equal(request.headers()[request.method() === "GET" ? "accept-profile" : "content-profile"], "sctn-dev");
        if (request.method() === "POST") {
          if (failNextSave) {
            failNextSave = false;
            return route.fulfill({ status: 500, json: { message: "Test save failure" } });
          }
          assert.ok(url.pathname.endsWith("/rpc/save_section_schedule"));
          const rows = request.postDataJSON().p_settings;
          writes.push(rows);
          for (const row of rows) {
            assert.ok(Number.isInteger(row.guest_count) && row.guest_count > 0);
            assert.ok(["available", "sold"].includes(row.status));
            assert.equal(row.section_capacity, undefined);
            assert.equal(row.section_status, undefined);
            assert.equal(row.schedule_date, undefined);
            assert.equal(row.customer_name, undefined);
            stored.set(`${row.reservation_date}:${row.booking_slot}:${row.section_id}`, row);
          }
          data = rows.map((_, index) => ({ id: `saved-${index}` }));
        } else {
          assert.equal(url.searchParams.get("record_type"), "eq.schedule");
          data = [...stored.values()].filter((row) => url.searchParams.get("reservation_date").includes(row.reservation_date));
        }
      } else throw new Error(`Unexpected Supabase request: ${request.method()} ${url.pathname}`);
      await route.fulfill({ json: data });
    });

    await page.goto(`${process.env.TEST_BASE_URL || "http://localhost:3000"}/vendor`);
    await page.getByRole("heading", { name: "Booking schedule" }).waitFor();
    await page.getByLabel("Week starting Sunday").fill("2026-12-30");
    assert.equal(await page.getByLabel("Week starting Sunday").inputValue(), "2026-12-27");
    await page.getByRole("button", { name: "Confirm days", exact: true }).click();
    await page.getByText("Starting from section defaults").waitFor();
    const dayTabs = page.getByRole("tablist", { name: "Confirmed booking days" }).getByRole("tab");
    assert.equal(await dayTabs.count(), 2);
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "100");
    await page.getByLabel("Minimum spend ($)", { exact: true }).fill("325.5");
    await page.getByLabel("Deposit ($)", { exact: true }).fill("80.25");
    await page.getByRole("tab", { name: /Cabana 1/ }).click();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "200");
    await page.getByRole("tab", { name: /A1/ }).click();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "325.5");
    await dayTabs.nth(1).click();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "100");
    await page.getByLabel("Capacity", { exact: true }).fill("0");
    await dayTabs.nth(0).click();
    await page.getByRole("button", { name: "Confirm changes", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Check the name" }).waitFor();
    assert.equal(await page.getByLabel("Capacity", { exact: true }).inputValue(), "0");
    assert.equal(writes.length, 0);
    await page.getByLabel("Capacity", { exact: true }).fill("15");
    await dayTabs.nth(0).click();
    await page.getByRole("tab", { name: "Reservation history" }).click();
    await page.getByRole("tab", { name: "Add or Update Sections" }).click();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "325.5");
    failNextSave = true;
    await page.getByRole("button", { name: "Confirm changes", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Changes could not be saved" }).waitFor();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "325.5");
    await page.getByRole("button", { name: "Confirm changes", exact: true }).click();
    await page.getByText("Section settings saved for 2 days.", { exact: true }).waitFor();
    assert.equal(writes[0].length, 8); // Two dates, two sections, two slots.
    assert.equal(stored.size, 8);
    await page.getByLabel("Minimum spend ($)", { exact: true }).fill("400");
    await page.getByRole("button", { name: "Confirm changes", exact: true }).click();
    await page.getByText("Section settings saved for 2 days.", { exact: true }).waitFor();
    assert.equal(stored.size, 8);
    await page.reload();
    await page.getByRole("heading", { name: "Booking schedule" }).waitFor();
    await page.getByLabel("Week starting Sunday").fill("2026-12-27");
    await page.getByRole("button", { name: "Confirm days", exact: true }).click();
    await page.getByText("Loaded from saved booking settings").waitFor();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "400");
    await page.getByRole("button", { name: "Daytime", exact: true }).click();
    assert.equal(await page.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "100");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile layout must not overflow");
    if (process.env.TEST_SCREENSHOT_PATH) {
      await page.locator("#booking-section-panel").scrollIntoViewIfNeeded();
      await page.screenshot({ path: process.env.TEST_SCREENSHOT_PATH });
    }
    await page.getByRole("tab", { name: "Update Section Defaults", exact: true }).click();
    const defaultsPanel = page.locator("#defaults-panel");
    await defaultsPanel.getByLabel("Minimum spend ($)", { exact: true }).waitFor();
    assert.equal(await defaultsPanel.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "100");
    await defaultsPanel.getByLabel("Minimum spend ($)", { exact: true }).fill("175.25");
    await defaultsPanel.getByRole("tab", { name: /Cabana 1/ }).click();
    await defaultsPanel.getByLabel("Capacity", { exact: true }).fill("0");
    await defaultsPanel.getByRole("tab", { name: /A1/ }).click();
    await defaultsPanel.getByRole("button", { name: "Save section defaults", exact: true }).click();
    await defaultsPanel.getByRole("alert").waitFor();
    assert.equal(defaultWrites.length, 0);
    assert.equal(await defaultsPanel.getByLabel("Capacity", { exact: true }).inputValue(), "0");
    await defaultsPanel.getByLabel("Capacity", { exact: true }).fill("18");
    await page.getByRole("tab", { name: "Add or Update Sections" }).click();
    await page.getByRole("tab", { name: "Update Section Defaults", exact: true }).click();
    assert.equal(await defaultsPanel.getByLabel("Capacity", { exact: true }).inputValue(), "18");
    const bookingWriteCount = writes.length;
    await defaultsPanel.getByRole("button", { name: "Save section defaults", exact: true }).click();
    await defaultsPanel.getByText("Section defaults saved.", { exact: true }).waitFor();
    assert.equal(defaultWrites.length, 2);
    assert.equal(defaults[0].minimum_spend, 175.25);
    assert.equal(defaults[1].capacity, 18);
    assert.equal(writes.length, bookingWriteCount);
    await page.reload();
    await page.getByRole("tab", { name: "Update Section Defaults", exact: true }).click();
    await defaultsPanel.getByLabel("Minimum spend ($)", { exact: true }).waitFor();
    assert.equal(await defaultsPanel.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "175.25");
    await page.getByRole("tab", { name: "Add or Update Sections" }).click();
    const management = page.locator("#management-panel");
    await management.getByLabel("Week starting Sunday").fill("2027-01-03");
    await management.getByRole("button", { name: "Confirm days", exact: true }).click();
    await management.getByText("Starting from section defaults").waitFor();
    assert.equal(await management.getByLabel("Minimum spend ($)", { exact: true }).inputValue(), "175.25");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "New tabs must fit mobile layout");
    assert.deepEqual(errors, []);
    console.log("PASS: weekly schedules, section defaults loading/editing/persistence, validation, scoped section updates, new-day defaults, and mobile layout");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
