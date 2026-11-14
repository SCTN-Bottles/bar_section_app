const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, "../src", file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, URLSearchParams, Response, Date, crypto, process: { env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test", STRIPE_SECRET_KEY: "test", STRIPE_WEBHOOK_SECRET: "test", APP_URL: "https://example.test",
  } }, require: (name) => name in dependencies ? dependencies[name]
    : name.startsWith("@/") ? load(`${name.slice(2)}.ts`, dependencies, globals) : require(name), ...globals });
  return exports;
}
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
}
async function main() {
  const { isValidAdditionalBands, parseAdditionalBands } = load("lib/additional-bands.ts");
  for (const value of [0, 1, 5]) assert.equal(isValidAdditionalBands(value), true);
  for (const value of [-1, 6, 1.5, NaN, Infinity, "2", null, true, undefined]) assert.equal(isValidAdditionalBands(value), false);
  assert.equal(parseAdditionalBands(undefined), 0);
  for (const value of ["", "-1", "6", "1.5", "abc", "NaN", " 2", "0x2"]) assert.equal(parseAdditionalBands(value), null);
  const BandSelection = load("components/venues/AdditionalBandsSelection.tsx").default;
  const section = { id: "section", area: "indoor", name: "A1", capacity: 10, deposit: 25, minimumSpend: 100, status: "available" };
  const props = { section, choice: null, quantity: "0", onChoice() {}, onQuantity() {}, onBack() {}, onContinue() {} };
  for (const [choice, quantity, inputVisible, enabled] of [[null,"0",false,false],["no","0",false,true],["yes","1",true,true],["yes","0",true,true],["yes","5",true,true],["yes","",true,false],["yes","6",true,false],["yes","1.5",true,false]]) {
    const tree = BandSelection({ ...props, choice, quantity });
    assert.equal(nodes(tree).some((node) => node.type === "input"), inputVisible);
    assert.equal(!nodes(tree).find((node) => node.type === "button" && node.props.children === "Continue to drinks").props.disabled, enabled);
  }
  const yesHtml = renderToStaticMarkup(React.createElement(BandSelection, { ...props, choice: "yes", quantity: "5" }));
  assert.match(yesHtml, /Up to 15 guests/); assert.match(yesHtml, /\$125/);

  // Exercise the real explorer's handlers and step transitions with deterministic hooks/data.
  const state = []; let cursor = 0;
  const hooks = { ...React, useEffect() {}, useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
  } };
  const stubs = {};
  for (const name of ["BeverageSelection","BookingCalendar","DrinkSignCustomization","ReservationAgreement","SectionDetails","SectionMap","AdditionalBandsSelection"]) stubs[`@/components/venues/${name}`] = { default: name, __esModule: true };
  const venue = { id: "venue", venueName: "test", sections: [section, { ...section, id: "other", name: "A2" }], beverages: [], bookingCalendar: { availableWeekdays: [0,1,2,3,4,5,6], availableSlots: ["night","day"], placeholderTime: "20:00" } };
  const Explorer = load("components/venues/VenueExplorer.tsx", { ...stubs, react: hooks,
    "@/lib/sections": { getReservationSections: async () => venue.sections },
    "@/lib/use-reservation-day": { useReservationDay: () => ({ data: venue, loading: false }) },
    "@/lib/drink-sign": { normalizeDrinkSignText: (text) => text ?? "", getDrinkSignError: () => null },
  }, { window: { scrollTo() {}, alert(message) { throw Error(message); } } }).default;
  let initialReservation = { date: "2027-01-03", sectionId: "section" };
  const render = () => { cursor=0; return Explorer({ venue, initialReservation }); };
  const find = (name) => nodes(render()).find((node) => node.type === name);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  find("SectionDetails").props.onReserve(); await flush();
  assert.equal(find("AdditionalBandsSelection").props.choice, null);
  find("AdditionalBandsSelection").props.onChoice("yes");
  assert.equal(find("AdditionalBandsSelection").props.quantity, "1");
  find("AdditionalBandsSelection").props.onQuantity("5");
  find("AdditionalBandsSelection").props.onContinue(); await flush();
  assert.equal(find("BeverageSelection").props.additionalBands, 5);
  find("BeverageSelection").props.onBack();
  assert.equal(find("AdditionalBandsSelection").props.quantity, "5");
  find("AdditionalBandsSelection").props.onChoice("no");
  assert.equal(find("AdditionalBandsSelection").props.quantity, "0");
  find("AdditionalBandsSelection").props.onChoice("yes");
  assert.equal(find("AdditionalBandsSelection").props.quantity, "1");
  find("AdditionalBandsSelection").props.onQuantity("3");
  find("AdditionalBandsSelection").props.onContinue(); await flush();
  find("BeverageSelection").props.onContinue(); await flush();
  find("DrinkSignCustomization").props.onContinue(); await flush();
  const href = find("ReservationAgreement").props.checkoutHref;
  assert.equal(new URL(href,"https://example.test").searchParams.get("additional_bands"), "3");
  assert.equal(new URL(href,"https://example.test").searchParams.get("bandsChoice"), "yes");
  find("ReservationAgreement").props.onBack();
  find("DrinkSignCustomization").props.onBack(); find("BeverageSelection").props.onBack(); find("AdditionalBandsSelection").props.onBack();
  find("SectionMap").props.onSelectSection("other");
  find("SectionDetails").props.onReserve(); await flush();
  assert.equal(find("AdditionalBandsSelection").props.choice, null);
  // Returned checkout URLs preserve Yes even when the customer chose zero bands.
  state.length=0; initialReservation={ date:"2027-01-03", sectionId:"section", step:"bands", additional_bands:"0", bandsChoice:"yes" };
  assert.equal(find("AdditionalBandsSelection").props.choice, "yes");
  find("AdditionalBandsSelection").props.onBack();
  nodes(render()).find((node) => node.type === "button" && node.props.children === "Change date").props.onClick();
  find("BookingCalendar").props.onChange("2027-01-04");
  find("SectionDetails").props.onReserve(); await flush();
  assert.equal(find("AdditionalBandsSelection").props.choice, null);

  let rpcCalls=0, lastArgs;
  const api = load("app/api/reservations/route.ts", {
    "@/lib/server/reservation-payments": { adminClient: () => ({ schema: () => ({ rpc: async (_name,args) => { rpcCalls++; lastArgs=args; return {}; } }) }), sendReservationEmail: async () => {}, errorResponse: (error) => Response.json({error:error.message},{status:400}) },
  });
  for (const invalid of [-1,6,0.5,"2",null]) {
    const response=await api.POST({ json:async()=>({reservation:{additional_bands:invalid}}) }); assert.equal(response.status,400);
  }
  assert.equal(rpcCalls,0);
  for (const value of [undefined,0,1,5]) {
    const response=await api.POST({json:async()=>({id:"id",reservation:{additional_bands:value},slot:"night"})}); assert.equal(response.status,200); assert.equal(lastArgs.p_additional_bands,value??0);
  }
  let booking={id:"id",status:"confirmed",deposit_amount:25,additional_bands:0};
  let created;
  const db={from(table) { const query={select(){return query;},eq(){return query;},gt(){return query;},update(){return query;},async single(){return {data:table==="reservation_attempts"?booking:{token:"token",payment_deadline:new Date(Date.now()+3600000).toISOString()}};},async maybeSingle(){return {data:{booking_id:"id"}};}};return query;}};
  const { prepareCheckout }=load("lib/server/reservation-payments.ts", {
    "server-only":{}, "@supabase/supabase-js":{createClient:()=>({schema:()=>db})},
    stripe:class {constructor(){return {checkout:{sessions:{create:async(args)=>{created=args;return {id:"session",url:"https://stripe.test"};}}}};}}
  });
  for (const bands of [0,1,5]) {
    booking.additional_bands=bands; await prepareCheckout("id");
    assert.equal(created.line_items.reduce((sum,item)=>sum+item.quantity*item.price_data.unit_amount,0),2500+bands*2000);
    assert.equal(created.line_items.length,bands?2:1);
    if(bands) assert.equal(created.line_items[1].quantity,bands);
  }
  booking.deposit_amount=0;booking.additional_bands=1;await prepareCheckout("id"); assert.equal(created.line_items.length,1);assert.equal(created.line_items[0].price_data.unit_amount,2000);
  booking.additional_bands=6; await assert.rejects(prepareCheckout("id"),/Invalid additional bands/);
  console.log("PASS: Yes/No conditional input, validation, navigation/URL persistence, selection resets, API validation, and Stripe line items/totals");
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
