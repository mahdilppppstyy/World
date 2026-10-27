// تست: node test_taken_ui.js app.js — کشورهای برداشته‌شده در فهرست انتخاب نمی‌آیند
const vm = require("vm"), fs = require("fs");
class N {
  constructor(t) { this.tag = t; this.children = []; this.className = ""; this.textContent = ""; this.style = {}; this.hidden = false; this._html = ""; this.value = ""; }
  set innerHTML(v) { this.children = []; this._html = v; }
  get innerHTML() { return this._html; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute() {}
  text() { return this.textContent + this._html + this.children.map(c => c.text()).join(" "); }
}
function run(query) {
  const nodes = {};
  const el = (id) => nodes[id] || (nodes[id] = new N("div"));
  const ctx = {
    console, Number, Math, String, Set, URLSearchParams, Image: class extends N { },
    location: { search: query }, window: { Telegram: { WebApp: { ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {} } } },
    document: { getElementById: el, createElement: (t) => new N(t) },
  };
  vm.createContext(ctx);
  const src = fs.readFileSync(process.argv[2], "utf8");
  const end = src.indexOf("// ---------------- اطلاعات کشور برای صفحه‌ی تأیید");
  vm.runInContext(src.slice(0, end) + "\nthis.render = render; this.countries = countries;", ctx);
  ctx.render();
  return { list: el("list"), sub: el("sub"), n: ctx.countries.length };
}
const cards = (l) => l.children.filter(c => c.className.split(" ")[0] === "c");
const names = (l) => cards(l).map(c => c.text());
const base = "?season=3&live=1&plus=US,RU,CN,IR,IL&prem=FR,GB,JP,KP,IN";

let r = run(base);
if (cards(r.list).length !== r.n) throw new Error("بدون taken همه باید بیایند");
r = run(base + "&taken=RU,IR");
if (cards(r.list).length !== r.n - 2) throw new Error("دو کشور باید حذف شوند");
if (names(r.list).some(t => t.includes("روسیه") || t.includes("ایران"))) throw new Error("روسیه/ایران نباید باشند");
if (!r.sub.textContent.includes("کشور آزاد است")) throw new Error("زیرنویس تعداد آزاد را ندارد: " + r.sub.textContent);
r = run(base + "&locked=1&mine=US&taken=RU,IR");                   // قفل (کشور دارد): فهرست دست نمی‌خورد
if (cards(r.list).length !== r.n) throw new Error("در حالت قفل نباید فیلتر شود");
r = run("?season=2&plus=US&prem=FR&taken=RU");                     // سیزن گذشته: فیلتر نمی‌شود
if (cards(r.list).length !== r.n) throw new Error("سیزن گذشته نباید فیلتر شود");
console.log("taken ui ok");
