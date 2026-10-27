// تست: node test_home_power.js app.js — برق خانه = تولید − مصرف − رزرو ساخت
const vm = require("vm"), fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");
const a = src.indexOf("  function ecoApply(d) {"), b = src.indexOf("  async function ecoLoad()");
const b2 = src.indexOf('    // برق آزاد = تولید'), e2 = src.indexOf('    const bgp = P.get("bg");');
if (a < 0 || b < 0 || b2 < 0 || e2 < 0) throw new Error("blocks missing");
const nodes = {};
const el = (id) => nodes[id] || (nodes[id] = { textContent: "", hidden: false, classes: new Set(), classList: { toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, _s: null }, });
for (const id of ["hel", "helsub", "infbadge", "ecobadge", "tileeco"]) { const n = el(id); n.classList._s = n.classes; }
const ctx = { Math, Number, el, en: (n) => Number(n).toLocaleString("en-US"), GAME: { cash: 0, income: 0, power: 0, elecGen: 0, elecUse: 0, elecRes: 0 }, ECO: {} };
vm.createContext(ctx);
vm.runInContext(src.slice(a, b) + "\nthis.ecoApply = ecoApply;" , ctx);
const show = () => vm.runInContext("(function(){\n" + src.slice(b2, e2) + "\n})()", ctx);
const base = { now: 1, cash: 1, income: 1, ready: false };
ctx.ecoApply({ ...base, power: { supply: 30, demand: 12.5, reserved: 0, short: false } });
show();
if (nodes.hel.textContent !== "17.5+" || nodes.helsub.textContent !== "12.5 از 30") throw new Error("بدون رزرو: " + nodes.hel.textContent + " | " + nodes.helsub.textContent);
ctx.ecoApply({ ...base, power: { supply: 30, demand: 12.5, reserved: 9, short: false } });   // ساخت شروع شد
show();
if (nodes.hel.textContent !== "8.5+" || !nodes.helsub.textContent.includes("21.5 از 30") || !nodes.helsub.textContent.includes("رزرو ساخت 9")) throw new Error("با رزرو: " + nodes.hel.textContent + " | " + nodes.helsub.textContent);
ctx.ecoApply({ ...base, power: { supply: 30, demand: 25, reserved: 9, short: true } });
show();
if (nodes.hel.textContent !== "4−" || !nodes.hel.classes.has("neg") || nodes.hel.classes.has("green")) throw new Error("منفی: " + nodes.hel.textContent);
console.log("home power ok");
