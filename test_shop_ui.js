// تست سریع صفحه‌ی فروشگاه: node test_shop_ui.js webapp/shop.js
const vm = require("vm"), fs = require("fs");
const REG = {};
class N {
  constructor(t) { this.tag = t; this.children = []; this.className = ""; this.textContent = ""; this.classList = { add() {} }; }
  set innerHTML(v) { this.children = []; }
  get innerHTML() { return ""; }
  appendChild(c) { this.children.push(c); return c; }
  append(...a) { a.forEach(x => this.children.push(typeof x === "string" ? Object.assign(new N("#t"), { textContent: x }) : x)); }
  get firstChild() { return this.children[0]; }
  text() { return this.textContent + this.children.map(c => c.text()).join(" "); }
}
const ctx = {
  console, Number, document: { createElement: (t) => new N(t), head: new N("head") }, window: {}, mine: "IR", byCode: { IR: { code: "IR" } },
  GAME: { cash: 854135, level: 3 }, RM: null, tg: {}, toast() {}, setView() {}, flagNode: () => new N("flag"),
  el: (id) => REG[id] || (REG[id] = new N("div")), cmEl: (tag, cls, txt) => { const n = new N(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], "utf8"), ctx);
ctx.window.OWShop.build();
const t = REG.shlist.text();
if (!t.includes("فعلاً چیزی برای فروش نیست")) throw new Error("empty state missing: " + t);
if (REG.shcash.textContent !== "$854,135") throw new Error("cash: " + REG.shcash.textContent);
console.log("shop ok (empty catalog)");
