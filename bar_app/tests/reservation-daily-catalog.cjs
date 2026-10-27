// Uses the existing venue route for server rendering, with browser API calls intercepted.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const venue = { id: "6811f057-fb8f-4545-8f58-a906ca3cd4a1", name: "Test bar", slug: "myhouse", description: "Test venue", city: "Chicago", state: "IL", booking_weekdays: [0,1,2,3,4,5,6], booking_start_time: "20:00:00", booking_slots: ["night", "day"], is_active: true };
    const section = { id: "eba82d1b-3be2-4e5b-8ceb-89b85c409f67", name: "A1", area: "indoor", description: "Section description", capacity: 10, minimum_spend: 100, deposit_amount: 25, status: "available", image_url: null };
    const drink = { id: "11111111-1111-4111-8111-111111111111", name: "Default bottle", type: "bottle", price: 60 };
    const calls = [];
    let failNextRead = false;
    await page.route("https://*.supabase.co/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      let data;
      if (url.pathname.endsWith("/venues")) data = request.headers().accept?.includes("object") ? venue : [venue];
      else if (url.pathname.endsWith("/sections")) data = [section];
      else if (url.pathname.endsWith("/beverage_options")) data = [drink];
      else if (url.pathname.endsWith("/rpc/get_reservation_sections")) {
        const input = request.postDataJSON();
        calls.push(input);
        if (failNextRead) { failNextRead = false; return route.fulfill({ status: 500, json: { message: "Test unavailable" } }); }
        const secondDay = input.p_date === "2027-01-04";
        const sold = input.p_slot === "day";
        data = [{ ...section, name: secondDay ? "Monday A1" : "Sunday A1", minimum_spend: secondDay ? 610.25 : 510.50, deposit_amount: 80.25, capacity: 18, reservation_time: "21:30:00", status: sold ? "sold" : "available" }];
      } else if (url.pathname.endsWith("/drink_schedule")) {
        const date = url.searchParams.get("reservation_date").includes("2027-01-04") ? "2027-01-04" : "2027-01-03";
        data = [{ reservation_date: date, beverages: date === "2027-01-04" ? [] : [{ ...drink, name: "Sunday bottle", price: 99.25 }] }];
      } else throw new Error(`Unexpected request ${url.pathname}`);
      await route.fulfill({ json: data });
    });
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    await page.goto(`${base}/myhouse?date=2027-01-03`);
    await page.getByRole("heading", { name: "Sunday A1", exact: true }).waitFor();
    assert.ok(calls.some((call) => call.p_date === "2027-01-03" && call.p_slot === "night"));
    await page.getByText("$510.5", { exact: true }).waitFor();
    await page.getByText("Up to 18 guests", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Reserve section", exact: true }).click();
    await page.getByText("Sunday bottle", { exact: true }).waitFor();
    await page.getByText("$99.25 per bottle", { exact: true }).waitFor();
    assert.equal(await page.getByText("Default bottle", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Back to sections" }).click();
    await page.getByRole("button", { name: "Daytime", exact: true }).click();
    await page.getByText("No sections are available in this area for the selected date.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Reserve section", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Nighttime", exact: true }).click();
    await page.getByRole("heading", { name: "Sunday A1", exact: true }).waitFor();
    await page.getByRole("button", { name: "Change date", exact: true }).click();
    const month = page.getByText("January 2027", { exact: true });
    for (let index = 0; index < 12 && !await month.isVisible(); index++) await page.getByRole("button", { name: "Show next month" }).click();
    failNextRead = true;
    await page.getByRole("button", { name: "4", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "could not be loaded" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Reserve section", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Retry loading date", exact: true }).click();
    await page.getByRole("heading", { name: "Monday A1", exact: true }).waitFor();
    await page.getByText("$610.25", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Reserve section", exact: true }).click();
    assert.equal(await page.getByText("Sunday bottle", { exact: true }).count(), 0);
    assert.ok(await page.getByRole("button", { name: "Continue to drink sign", exact: true }).isEnabled());
    // Direct checkout must also reload the selected date's prices instead of trusting URL values.
    await page.goto(`${base}/myhouse/checkout/${section.id}?date=2027-01-03&slot=night&time=01:00&addons=${drink.id}:1`);
    await page.getByRole("heading", { name: "Reserve Sunday A1", exact: true }).waitFor();
    await page.getByText("1× Sunday bottle", { exact: true }).waitFor();
    await page.getByText("$99.25", { exact: true }).first().waitFor();
    await page.getByText("$510.5", { exact: true }).waitFor();
    await page.getByText("9:30 PM", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log("PASS: dated sections/drinks, availability, date switching, load error retry, empty menus, and direct checkout prices");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
