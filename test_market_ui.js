// تست سریع صفحه‌ی بازار جهانی: node test_market_ui.js webapp/market.js
const vm = require("vm"), fs = require("fs");
const REG = {};
class N {
  constructor(t) { this.tag = t; this.children = []; this.className = ""; this.textContent = ""; this.style = {}; this._html = ""; this.classList = { add() {}, remove() {} }; }
  set innerHTML(v) { this.children = []; this._html = v; this.textContent = ""; }
  get innerHTML() { return this._html; }
  appendChild(c) { this.children.push(c); return c; }
  append(...a) { a.forEach(x => this.children.push(typeof x === "string" ? Object.assign(new N("#t"), { textContent: x }) : x)); }
  get firstChild() { return this.children[0]; }
  text() { return this.textContent + this._html + this.children.map(c => c.text()).join(" "); }
  all(f, out = []) { if (f(this)) out.push(this); this.children.forEach(c => c.all(f, out)); return out; }
}
const calls = [], toasts = [];
const NOW = Math.floor(Date.now() / 1000);
const mkState = (open) => ({
  now: NOW, open, start_left: open ? 0 : 3600, day: 5, fee: 0.02, index: { v: 1024, chg: -2.4 },
  res: [["oil", "نفت", "🛢", 0.5], ["steel", "فولاد", "⚙️", 0.5], ["food", "غذا", "🌾", 0.5], ["uranium", "اورانیوم", "⚗️", 0.55]].map(([key, name, icon, base], i) =>
    ({ key, name, icon, base, price: base, chg: i === 3 ? -9.1 : 0, hist: [base, base * 1.1, base], buy: base * 1.02, sell: base * .98, stock: 100000, listings: 0 })),
  units: [{ key: "tank", name: "تانک", branch: "gnd", icon: "🪖", prices: [216000, 259000, 302000, 345000, 388000], chg: 0, listings: 1,
    owned: 3, queued: 0, level: 1, buy: 216000, sell: 108000, room: 7 }],
  branches: [{ key: "gnd", name: "زمینی", icon: "🪖" }], levels: 5,
  trades: [{ ts: NOW, kind: "buy", item: "food", qty: 1000, price: 0.5, total: 510, item2: null, qty2: null },
    { ts: NOW, kind: "lbuy", item: "tank", qty: 1, price: 250000, total: 250000, item2: "TR", qty2: null },
    { ts: NOW, kind: "lsell", item: "food", qty: 400, price: 0.55, total: 215, item2: "TR", qty2: null }],
  listings: [
    { id: 7, kind: "res", item: "food", qty: 5000, price: 0.55, ts: NOW, exp: NOW + 40 * 3600, code: "TR", name: "ترکیه", mine: false },
    { id: 8, kind: "unit", item: "tank", qty: 2, price: 250000, ts: NOW, exp: NOW + 10 * 3600, code: "IR", name: "ایران", mine: true },
  ],
  list: { max: 5, hours: 48, lo: 0.5, hi: 2, mine: 1 }, buyback: 0.6,
});
let remote = true, open = true;
const ctx = {
  console, setInterval: () => 0, Date, Intl, Number, Math, Object, JSON, String, Array, Promise,
  document: { createElement: (t) => new N(t), head: new N("head"), body: new N("body") },
  window: {}, REMOTE: true, view: "market", mine: "IR", season: 1, endsAt: 0, SD: 30, START_CEASEFIRE_DAYS: 3,
  GAME: { cash: 854135, level: 3 }, RM: null, tg: { HapticFeedback: { impactOccurred() {} } },
  byCode: { IR: { code: "IR", name: "ایران" }, TR: { code: "TR", name: "ترکیه" } }, flagNode: () => new N("flag"), dur: (ms) => Math.round(ms / 1000) + "s",
  toast: (m) => toasts.push(m), setView() {}, ecoLoad() {}, ecoPending: () => 0, ECO: { d: { cash: 854135 } },
  el: (id) => REG[id] || (REG[id] = new N("div")),
  cmEl: (tag, cls, txt) => { const n = new N(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; },
};
ctx.cmApi = async (path, body) => { calls.push([path, body]); return mkState(open); };
ctx.cmCall = async (path, body, local) => (ctx.REMOTE ? ctx.cmApi(path, body) : local(path, body));  // مثل cmCall برنامه
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], "utf8"), ctx);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const W = ctx.window.OWMarket;
  // همان قیمت‌های market.py (مرجع از پایتون)
  const ref = { "1,5": [0.4868, 0.4386, 0.508, 0.5582], "7,17": [0.5273, 0.5521, 0.5446, 0.5321], "123,29": [0.5162, 0.5338, 0.4854, 0.496] };
  for (const [k, v] of Object.entries(ref)) {
    const [s, d] = k.split(",").map(Number);
    ["oil", "steel", "food", "uranium"].forEach((key, i) => { if (Math.abs(W.priceOn(s, key, d) - v[i]) > 1e-9) throw new Error("price mismatch " + k + " " + key + ": " + W.priceOn(s, key, d) + " vs " + v[i]); });
  }
  if (W.indexOn(7, 17) !== 1054) throw new Error("index " + W.indexOn(7, 17));
  console.log("price parity ok");

  W.build(); await sleep(30);
  let t = REG.mkpane.text();
  if (!t.includes("نفت") || !t.includes("بی‌آگهی") || !t.includes("تانک") || !t.includes("$0.5")) throw new Error("goods not drawn: " + t);
  if (!REG.mkhead.text().includes("1,024")) throw new Error("index missing");
  if (REG.mkhead.text().includes("بسته است")) throw new Error("should be open");
  if (!calls.some(c => c[0] === "/api/market")) throw new Error("no api call");
  console.log("goods ok");

  // بسته در آغاز فصل
  open = false; calls.length = 0; W.build(); await sleep(30);
  if (!REG.mkhead.text().includes("بسته است")) throw new Error("closed notice missing");
  console.log("closed ok");

  // حالت محلی (بدون سرور): قیمت‌ها + خرید/فروش و آگهی روی همین گوشی (بدون هیچ درخواست API)
  const LS = { S: { cash: 5000000, st: { oil: 1000 } }, M: { units: {}, esc: {} } };
  ctx.REMOTE = false;
  ctx.countries = [{ code: "IR", name: "ایران" }, { code: "TR", name: "ترکیه" }, { code: "DE", name: "آلمان" }];
  ctx.elSave = () => {};
  ctx.window.OWArmy = { UNITS: [["tank", "تانک", "gnd", "🪖", "tankfac", 180000, 30, 600]], BRANCHES: [["gnd", "زمینی", "🪖"]], F: { cost: () => 180000 },
    L: { sync: () => LS, save() {}, view: () => ({ units: [], branches: [{ key: "gnd", cap: 10, used: 0, base_name: "پایگاه زمینی" }] }) } };
  calls.length = 0; W.build(); await sleep(30);
  t = REG.mkpane.text();
  if (calls.length) throw new Error("local mode must not call api");
  if (!t.includes("نفت")) throw new Error("local goods: " + t);
  if (!REG.mkhead.text().includes("حالت محلی")) throw new Error("local note: " + REG.mkhead.text());
  // خرید محلی واقعاً روی خزانه و انبار محلی اثر می‌گذارد
  REG.mkpane.all(n => n.className.includes("mkrow"))[0].onclick();
  const lsheet = ctx.document.body.children[1];
  const linp = lsheet.all(n => n.className === "mkin")[0], lgo = lsheet.all(n => n.className === "mkgo")[0];
  linp.value = "100"; linp.oninput();
  if (lgo.disabled) throw new Error("local buy should be enabled: " + lgo.textContent);
  await lgo.onclick(); await sleep(30);
  if (calls.length) throw new Error("local buy must not call api: " + JSON.stringify(calls));
  if (LS.S.st.oil !== 1100 || LS.S.cash >= 5000000) throw new Error("local buy not applied: " + JSON.stringify(LS.S));
  console.log("local ok");
  // پنجره‌ی خرید و فروش
  ctx.REMOTE = true; open = true; W.build(); await sleep(30);
  const rowN = REG.mkpane.all(n => n.className.includes("mkrow"))[0];
  rowN.onclick();
  const sheet = ctx.document.body.children[1];
  const inp = sheet.all(n => n.className === "mkin")[0], go = sheet.all(n => n.className === "mkgo")[0];
  if (!go.disabled) {} else {}
  inp.value = "1000"; inp.oninput();
  if (go.disabled) throw new Error("buy button should be enabled: " + go.textContent);
  calls.length = 0; await go.onclick(); await sleep(30);
  const tr = calls.find(c => c[0] === "/api/market/trade");
  if (!tr || tr[1].item !== "oil" || tr[1].side !== "buy" || tr[1].qty !== 1000) throw new Error("trade call wrong: " + JSON.stringify(calls));
  inp.value = "999999999"; inp.oninput();
  if (!go.disabled) throw new Error("should block over-max qty");
  console.log("trade sheet ok");
  // خرید و فروش یگان
  const theSheet = sheet;
  const click = (root, pred) => { const n = root.all(pred)[0]; if (!n) throw new Error("not found"); n.onclick(); return n; };
  const inputs = () => theSheet.all(n => n.className === "mkin");
  const goBtn = () => theSheet.all(n => n.className === "mkgo")[0];
  REG.mkpane.all(n => n.className.includes("mkrow")).find(r => r.text().includes("تانک") && r.text().includes("دارید 3")).onclick();
  if (!theSheet.text().includes("216,000") || !theSheet.text().includes("108,000")) throw new Error("unit sheet: " + theSheet.text());
  let i1 = inputs()[0]; i1.value = "2"; i1.oninput();
  if (goBtn().disabled) throw new Error("unit buy should be enabled: " + goBtn().textContent);
  calls.length = 0; await goBtn().onclick(); await sleep(30);
  let uc = calls.find(c => c[0] === "/api/market/unit");
  if (!uc || uc[1].unit !== "tank" || uc[1].side !== "buy" || uc[1].qty !== 2) throw new Error("unit call: " + JSON.stringify(calls));
  REG.mkpane.all(n => n.className.includes("mkrow")).find(r => r.text().includes("تانک")).onclick();
  i1 = inputs()[0]; i1.value = "50"; i1.oninput();
  if (!goBtn().disabled) throw new Error("unit buy over room must be blocked");
  click(theSheet, n => n.textContent === "فروش"); i1.value = "3"; i1.oninput();
  if (goBtn().disabled) throw new Error("unit sell should be enabled");
  i1.value = "4"; i1.oninput();
  if (!goBtn().disabled) throw new Error("unit sell over owned must be blocked");
  i1.value = "1"; i1.oninput(); calls.length = 0; await goBtn().onclick(); await sleep(30);
  uc = calls.find(c => c[0] === "/api/market/unit");
  if (!uc || uc[1].side !== "sell" || uc[1].qty !== 1) throw new Error("unit sell call: " + JSON.stringify(calls));
  console.log("unit sheet ok");

  // تب آگهی‌ها: خرید، لغو و ثبت
  REG.mktabs.children[1].onclick();
  t = REG.mkpane.text();
  if (!t.includes("ترکیه") || !t.includes("آگهی شما") || !t.includes("5,000") || !t.includes("$0.55")) throw new Error("ads tab: " + t);
  const rows = REG.mkpane.all(n => n.className === "mkrow");
  rows.find(r => r.text().includes("ترکیه")).onclick();
  let ii = inputs()[0]; ii.value = "1000"; ii.oninput();
  if (goBtn().disabled) throw new Error("ad buy should be enabled: " + goBtn().textContent);
  calls.length = 0; await goBtn().onclick(); await sleep(30);
  let bc = calls.find(c => c[0] === "/api/market/buy");
  if (!bc || bc[1].id !== 7 || bc[1].qty !== 1000) throw new Error("ad buy call: " + JSON.stringify(calls));
  REG.mkpane.all(n => n.className === "mkrow").find(r => r.text().includes("ترکیه")).onclick();
  ii = inputs()[0]; ii.value = "6000"; ii.oninput();
  if (!goBtn().disabled) throw new Error("ad buy over listing qty must be blocked");
  REG.mkpane.all(n => n.className === "mkrow").find(r => r.text().includes("آگهی شما")).onclick();
  if (!theSheet.text().includes("لغو آگهی")) throw new Error("my ad sheet");
  calls.length = 0; await goBtn().onclick(); await sleep(30);
  const cc = calls.find(c => c[0] === "/api/market/cancel");
  if (!cc || cc[1].id !== 8) throw new Error("cancel call: " + JSON.stringify(calls));
  // ثبت آگهی
  click(REG.mkpane, n => n.textContent === "➕ ثبت آگهی");
  let [qi, pi] = inputs();
  if (pi.value !== "0.5") throw new Error("default price: " + pi.value);
  qi.value = "1000"; qi.oninput();
  if (goBtn().disabled) throw new Error("list should be enabled: " + goBtn().textContent);
  pi.value = "5"; pi.oninput();
  if (!goBtn().disabled) throw new Error("price out of range must be blocked");
  pi.value = "0.6"; pi.oninput();
  calls.length = 0; await goBtn().onclick(); await sleep(30);
  const lc = calls.find(c => c[0] === "/api/market/list");
  if (!lc || lc[1].kind !== "res" || lc[1].item !== "oil" || lc[1].qty !== 1000 || lc[1].price !== 0.6) throw new Error("list call: " + JSON.stringify(calls));
  console.log("ads ok");

  // تب مبادله، نمودار و معامله‌ها
  ctx.document.body.children.length = 0;
  REG.mktabs.children[3].onclick(); if (!REG.mkpane.text().includes("مبادله")) throw new Error("swap tab");
  REG.mktabs.children[4].onclick(); t = REG.mkpane.text();
  if (!t.includes("1,000") || !t.includes("خرید از آگهی") || !t.includes("فروش با آگهی") || !t.includes("ترکیه")) throw new Error("mine tab: " + t);
  REG.mktabs.children[2].onclick(); if (!REG.mkpane.text().includes("نمودار")) throw new Error("chart tab");
  console.log("tabs ok");

  // بدون سرور (یا سرور قطع): ثبت آگهی هم محلی کار می‌کند و درخواستی به API نمی‌رود
  ctx.REMOTE = false; LS.S.st.oil = 50000;
  W.build(); await sleep(30); calls.length = 0; toasts.length = 0;
  REG.mktabs.children[1].onclick();
  const ladd = REG.mkpane.all(n => n.onclick && n.text().includes("ثبت آگهی")).sort((a, b) => a.text().length - b.text().length)[0];
  if (!ladd) throw new Error("local ads: add button missing: " + REG.mkpane.text());
  ladd.onclick();
  if (toasts.some(m => m.includes("با سرور"))) throw new Error("local list must not need server: " + toasts);
  const lsh = lsheet;   // پنجره‌ی پایین‌صفحه یک‌بار ساخته و دوباره استفاده می‌شود
  const lin = lsh.all(n => n.className === "mkin");
  lin[0].value = "10000"; lin[0].oninput(); lin[1].value = "0.5"; lin[1].oninput();
  await lsh.all(n => n.className === "mkgo")[0].onclick(); await sleep(30);
  if (calls.length) throw new Error("local list must not call api: " + JSON.stringify(calls));
  if (!toasts.some(m => m.includes("آگهی ثبت شد"))) throw new Error("local list toast: " + toasts);
  if (LS.S.st.oil !== 40000) throw new Error("local list should escrow stock: " + JSON.stringify(LS.S));
  console.log("local ads ok");
  console.log("ALL MARKET UI TESTS PASSED");
})().catch(e => { console.error(e); process.exit(1); });
