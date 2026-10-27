// تست سریع پنجره‌ی اهداف: node test_goals_ui.js app.js
const vm = require("vm"), fs = require("fs");
class N {
  constructor(t) { this.tag = t; this.children = []; this.className = ""; this.textContent = ""; this.style = {}; this.hidden = false; }
  set innerHTML(v) { this.children = []; }
  get innerHTML() { return ""; }
  appendChild(c) { this.children.push(c); return c; }
  append(...a) { a.forEach(x => this.children.push(typeof x === "string" ? Object.assign(new N("#t"), { textContent: x }) : x)); }
  text() { return this.textContent + this.children.map(c => c.text()).join(" "); }
}
const reg = {};
const DATA = { done: 1, total: 2, items: [
  { key: "a", icon: "🏗", title: "اولین ساختمان", desc: "d", have: 1, need: 1, done: true },
  { key: "cash", icon: "💰", title: "خزانه‌ی پرپول", desc: "d", have: 5000000, need: 20000000, done: false }] };
const body = new N("body");
const ctx = { console, Number, Math, REMOTE: true, en: (n) => Number(n).toLocaleString("en-US"), toast() {},
  cmEl: (t, c, x) => { const n = new N(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; },
  cmApi: async () => DATA,
  document: { createElement: (t) => new N(t), head: new N("head"), body, getElementById: (id) => { const f = (n) => n.id === id ? n : n.children.map(f).find(Boolean); return f(body) || null; } } };
vm.createContext(ctx);
const src = fs.readFileSync(process.argv[2], "utf8");
const a = src.indexOf("// ---------------- اهداف (/api/goals)"), b = src.indexOf("// ---------------- اخبار جهانی (/api/news)");
if (a < 0 || b < 0) throw new Error("goals block missing");
vm.runInContext(src.slice(a, b) + "\nthis.openGoals = openGoals;", ctx);
ctx.openGoals().then(() => {
  const t = body.text();
  for (const s of ["🎯 اهداف", "1 از 2 هدف", "اولین ساختمان", "✅ انجام شد", "5,000,000 / 20,000,000"]) if (!t.includes(s)) throw new Error("missing " + s + "\n" + t);
  console.log("goals ui ok");
});
