const vm = require("vm"), fs = require("fs");
const REG = {};
class N {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.style = {}; this._cls = new Set(); this.textContent = ""; this._id = ""; }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this._cls].join(" "); }
  get classList() { return { add: (c) => this._cls.add(c), remove: (c) => this._cls.delete(c) }; }
  set id(v) { this._id = v; REG[v] = this; }
  get id() { return this._id; }
  set innerHTML(v) { this.children = []; this.textContent = ""; }
  get innerHTML() { return ""; }
  appendChild(c) { this.children.push(c); return c; }
  append(...a) { a.forEach(x => this.children.push(typeof x === "string" ? Object.assign(new N("#t"), { textContent: x }) : x)); }
  get firstChild() { return this.children[0]; }
  querySelector() { return new N("q"); }
  text() { return this.textContent + this.children.map(c => c.text()).join(" "); }
  all(f, out = []) { if (f(this)) out.push(this); this.children.forEach(c => c.all(f, out)); return out; }
}
const calls = [];
let sv = null;
const ctx = {
  console, setInterval: () => 0, Date, Intl, Number, Math, Set, Object, JSON, String, Array, Promise, document: { createElement: (t) => new N(t), querySelectorAll: () => [], head: new N("head") },
  localStorage: { getItem: () => null, setItem() {} }, window: {},
  REMOTE: true, view: "war", mine: "IR", season: 1, endsAt: 0, SD: 30, START_CEASEFIRE_DAYS: 3, DAILY_CEASEFIRE_END: 12,
  GAME: { cash: 5000000, level: 3 }, RM: null, tg: { HapticFeedback: { impactOccurred() {}, notificationOccurred() {} }, showConfirm: (m, cb) => cb(true) },
  byCode: { IQ: { code: "IQ", name: "عراق" }, IR: { code: "IR", name: "ایران" }, US: { code: "US", name: "آمریکا" } },
  countries: [], NEIGHBORS: {}, norm: (t) => t, capitalOf: () => "", flagNode: () => new N("flag"), dur: (ms) => Math.round(ms / 1000) + "s",
  toast: (m) => { ctx.toasts.push(m); }, toasts: [], setView() {}, ecoLoad() {},
  el: (id) => REG[id] || (REG[id] = new N("div")), cmEl: (tag, cls, txt) => { const n = new N(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; },
};
const NOW = Math.floor(Date.now() / 1000);
const mk = () => ({
  now: NOW, in_war: true, toggle_in: 3600, war_from: 12, war_to: 24, start_left: 0, max_wars: 3,
  doctrine: { key: "bal", can_change_at: 0, list: [{ key: "aggr", atk: 1.15, def: 0.9, loot: 1, loss: 1 }, { key: "def", atk: .9, def: 1.2, loot: 1, loss: 1 }, { key: "bal", atk: 1, def: 1, loot: 1, loss: 1 }, { key: "eco", atk: .9, def: 1, loot: 1.5, loss: .85 }] },
  protected_until: 0, conquests: 0, intel: false,
  wars: [{ id: 7, code: "IQ", ts: NOW - 99999, declared_by_me: true, progress: 40, enemy_progress: 10, neighbor: true, can_attack: true, why: null, cooldown_until: 0, peace: { mine: false, theirs: false, after: NOW - 10 } }],
  targets: [{ code: "IQ", neighbor: true, at_war: true, protected_until: 0 }, { code: "US", neighbor: false, at_war: false, protected_until: 0 }],
  news: [{ ts: NOW, text: "ایران به عراق اعلان جنگ کرد" }], history: [{ id: 1, code: "US", ts: NOW - 5000, ended_ts: NOW - 100, reason: "peace", declared_by_me: true, result: "draw", battles: 2 }],
});
ctx.cmApi = async (path, body) => {
  calls.push([path, body]);
  if (path === "/api/war") return mk();
  if (path === "/api/war/attack") return { report: { win: true, conquered: false, a_power: 900, d_power: 300, prog: 12.5, progress: 52.5, enemy: "IQ", air_cut: 0.2, loot: 0, a_loss: { tank: 2 }, d_loss: { tank: 5 }, loss_names: { a: { tank: "تانک" }, d: { tank: "تانک" } }, branches: body.branches }, state: mk() };
  return mk();
};
ctx.cmCall = async (path, body, local) => (ctx.REMOTE ? ctx.cmApi(path, body) : local(path, body));  // مثل cmCall برنامه
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], "utf8"), ctx);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  ctx.window.OWWar.build(); await sleep(30);
  const pane = REG["wpane"];
  let txt = pane.text();
  if (!txt.includes("عراق") || !txt.includes("40٪")) throw new Error("fronts not drawn: " + txt);
  console.log("fronts ok");
  // کلیک روی «حمله»
  const atk = pane.all(n => n.className.includes("wact") && n.textContent.startsWith("حمله"))[0];
  atk.onclick(); await sleep(5);
  const chips = REG["wpane"].all(n => n._cls.has("wchip"));
  if (chips.length !== 4) throw new Error("chips " + chips.length);
  chips.find(c => c.textContent.includes("موشکی")).onclick();   // خاموش کردن موشکی
  const go = REG["wpane"].all(n => n.textContent === "شروع نبرد ⚔️")[0];
  go.onclick(); await sleep(30);
  const call = calls.find(c => c[0] === "/api/war/attack");
  if (!call || call[1].war !== 7 || call[1].branches.includes("mis") || call[1].branches.length !== 3) throw new Error("attack payload " + JSON.stringify(call));
  const t2 = REG["wpane"].text();
  if (!t2.includes("پیروزی") || !t2.includes("تانک ×2") || !t2.includes("52.5")) throw new Error("report: " + t2);
  console.log("attack + report ok");
  // اعلان جنگ
  const warEl = (await (async () => { ctx.window.OWWar.build(); await sleep(20); return REG["wtabs"]; })());
  const tabDecl = warEl.children.find(b => b.text().includes("اعلان"));
  tabDecl.onclick(); await sleep(5);
  const rows = REG["wlist"].children;
  if (rows.length !== 2) throw new Error("targets rows " + rows.length);
  const usBtn = rows.map(r => r.all(n => n.tag === "button")[0]).find(b => b.textContent.includes("اعلان جنگ"));
  usBtn.onclick(); await sleep(30);
  const d = calls.find(c => c[0] === "/api/war/declare");
  if (!d || d[1].code !== "US") throw new Error("declare payload " + JSON.stringify(d));
  console.log("declare ok");
  // دکترین
  REG["wtabs"].children.find(b => b.text().includes("دکترین")).onclick(); await sleep(5);
  const dd = REG["wpane"].all(n => n.className.includes("wdoc") && !n.className.includes("on"))[0];
  dd.onclick(); await sleep(20);
  if (!calls.find(c => c[0] === "/api/war/doctrine")) throw new Error("no doctrine call");
  console.log("doctrine ok");
  // خبر و تاریخچه
  REG["wtabs"].children.find(b => b.text().includes("اخبار")).onclick(); await sleep(5);
  if (!REG["wpane"].text().includes("اعلان جنگ کرد")) throw new Error("news");
  REG["wtabs"].children.find(b => b.text().includes("تاریخچه")).onclick(); await sleep(5);
  if (!REG["wpane"].text().includes("بدون برنده")) throw new Error("history");
  console.log("news/history ok");
  // حالت محلی
  ctx.REMOTE = false; REG["wtabs"].children[0] && 0;
  ctx.window.OWWar.build(); await sleep(5);
  console.log("local mode build ok; tabs:", REG["wtabs"].children.length);
  console.log("ALL UI SMOKE TESTS PASSED");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
