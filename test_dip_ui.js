// تست سریع صفحه‌ی دیپلماسی: node test_dip_ui.js game.js
const vm = require("vm"), fs = require("fs");
const REG = {};
class N {
  constructor(t) { this.tag = t; this.children = []; this.className = ""; this.textContent = ""; this.style = {}; this.classList = { add() {} }; }
  set innerHTML(v) { this.children = []; }
  get innerHTML() { return ""; }
  appendChild(c) { this.children.push(c); return c; }
  append(...a) { a.forEach(x => this.children.push(typeof x === "string" ? Object.assign(new N("#t"), { textContent: x }) : x)); }
  get firstChild() { return this.children[0]; }
  text() { return this.textContent + this.children.map(c => (typeof c.text === "function" ? c.text() : "")).join(" "); }
}
const DATA = {
  kinds: { pact: "پیمان عدم تجاوز", alliance: "اتحاد" }, limits: { pact: 3, alliance: 2 }, notice_hours: 12, offer_hours: 24, trust: 40,
  treaties: [
    { id: 1, kind: "pact", title: "پیمان عدم تجاوز", status: "offer", ts: 1700000000, end_at: 0, with: "TR", role: "target", trust: 50 },
    { id: 2, kind: "alliance", title: "اتحاد", status: "active", ts: 1700000000, end_at: 0, with: "DE", role: "proposer", trust: 80 },
    { id: 3, kind: "pact", title: "پیمان عدم تجاوز", status: "ending", ts: 1700000000, end_at: Math.floor(Date.now() / 1000) + 7200, with: "FR", role: "target", trust: 30 },
  ],
  history: [{ id: 4, kind: "pact", title: "پیمان عدم تجاوز", status: "declined", ts: 1700000000, end_at: 0, with: "IT", role: "proposer", trust: 50 }],
};
const doc = { createElement: (t) => new N(t), head: new N("head"), hidden: false, activeElement: { matches: () => false } };
const flags = { IR: "🇮🇷", TR: "🇹🇷", DE: "🇩🇪", FR: "🇫🇷", IT: "🇮🇹" };
const byCode = {}; Object.keys(flags).forEach(c => byCode[c] = { code: c, flag: flags[c], name: c, n: 1 });
const calls = [];
const ctx = {
  console, Number, Math, Date, Object, document: doc, window: {}, mine: "IR", byCode, countries: Object.values(byCode), REMOTE: true,
  view: "dip", GAME: { cash: 854135 }, toast() {}, setView() {}, confirm: () => true, setInterval() {}, Option: function (t, v) { return { text: t, value: v }; },
  cmApi: async (path, body) => { calls.push(path); return path === "/api/dip" ? DATA : { code: "TR", trust: 50, treaties: 1 }; },
  el: (id) => REG[id] || (REG[id] = new N("div")),
  cmEl: (tag, cls, txt) => { const n = new N(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; },
};
vm.createContext(ctx);
// فقط بلوک dip.js را اجرا می‌کنیم
const src = fs.readFileSync(process.argv[2], "utf8");
const i = src.indexOf("/* ===== dip.js ===== */");
if (i < 0) throw new Error("dip.js block missing");
vm.runInContext(src.slice(i), ctx);
ctx.window.OWDip.build();
setTimeout(() => {
  const t = REG.dpbody.text();
  for (const s of ["پیشنهادهای رسیده", "پیمان عدم تجاوز", "اتحاد", "در مهلت لغو", "فعال", "تاریخچه", "ردشده", "اعتماد شما", "پیمان‌شکن"])
    if (!t.includes(s)) throw new Error("missing: " + s + "\n" + t);
  if (!calls.includes("/api/dip")) throw new Error("no load call");
  if (REG.dpcash.textContent !== "$854,135") throw new Error("cash: " + REG.dpcash.textContent);
  console.log("dip ok");
}, 20);
