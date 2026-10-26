/* صفحه‌ی بازار جهانی (کالاها، نمودار، مبادله، معامله‌های من). بعد از اسکریپت اصلی index.html بارگذاری می‌شود
   و از همان تابع‌ها و متغیرهای سراسری آن (el, cmEl, toast, cmApi, GAME, mine, dur, setView, ecoLoad, …) استفاده می‌کند.
   با سرور (REMOTE): قیمت‌ها، خرید/فروش منابع و یگان‌ها، مبادله و آگهی بین بازیکن‌ها از /api/market می‌آید و سمت سرور حساب می‌شود.
   بدون سرور: فقط قیمت‌ها (همان فرمول market.py) و فهرست یگان‌ها دیده می‌شود؛ معامله و آگهی وجود ندارد. */
(function () {
  "use strict";

  const CSS = `
  .mkbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px; border-radius: 22px;
    border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .mkbar .go { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 22px; background: rgba(232,196,108,.06); }
  .mkbar b { font-size: 21px; cursor: pointer; }
  .mkbar .money { margin-inline-start: auto; color: var(--gold); font-weight: 700; font-size: 20px; direction: ltr; }
  .mkinfo { position: relative; padding: 16px; margin-bottom: 14px; border-radius: 26px; border: 2px solid rgba(232,196,108,.5);
    background: linear-gradient(160deg, rgba(150,105,30,.2), var(--card)); }
  .mkinfo h3 { font-size: 22px; margin-bottom: 8px; padding-inline-end: 48px; }
  .mkinfo p { font-size: 17px; line-height: 2; color: #c4c8d1; }
  .mkinfo .mkq { position: absolute; top: 14px; left: 14px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 20px;
    color: var(--hint); background: none; border: 1.5px solid var(--line); }
  .mkidx { display: inline-flex; align-items: center; gap: 10px; margin: 14px 0 4px; padding: 12px 18px; border-radius: 999px;
    border: 1px solid var(--line); background: rgba(255,255,255,.03); font-size: 18px; }
  .mkidx b { font-size: 20px; direction: ltr; }
  .mkclosed { margin-top: 10px; font-size: 16.5px; line-height: 2; color: #ff9d8a; }
  .up { color: #4fd9a0; } .dn { color: #ff7a7a; } .fl { color: #d9dde6; }
  .mktabs { display: flex; gap: 8px; margin: 0 0 14px; overflow-x: auto; }
  .mktab { flex: none; padding: 12px 16px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 17px; color: var(--gold);
    background: rgba(150,105,30,.14); border: 2px solid rgba(232,196,108,.5); white-space: nowrap; }
  .mktab.on { color: #2a1d00; font-weight: 700; background: linear-gradient(160deg, #ecc96f, #d9a94f); border-color: #ecc96f; }
  .mkpanel { border-radius: 28px; padding: 16px; margin-bottom: 14px; border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .mkpanel .mkh { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .mkpanel .mkh small { font-weight: 400; font-size: 15px; color: var(--hint); cursor: pointer; }
  .mkrow { display: flex; align-items: center; gap: 12px; padding: 12px 2px; cursor: pointer; border-top: 1px solid rgba(255,255,255,.07); }
  .mkrow:first-of-type { border-top: 0; }
  .mkrow .mki { flex: none; width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; font-size: 28px;
    border-radius: 18px; border: 1px solid rgba(232,196,108,.5); background: rgba(232,196,108,.07); }
  .mkrow .mki.rnd { border-radius: 50%; border-color: rgba(120,150,230,.5); background: rgba(120,150,230,.12); }
  .mkrow .mkn { flex: 1; min-width: 0; }
  .mkrow .mkn b { display: block; font-size: 21px; font-weight: 500; }
  .mkrow .mkn small { display: block; color: var(--hint); font-size: 14.5px; margin-top: 2px; }
  .mkrow .mkspark { flex: none; width: 90px; height: 36px; direction: ltr; }
  .mkrow .mkp { flex: none; width: 96px; text-align: left; direction: ltr; font-size: 21px; font-weight: 700; }
  .mkrow .mkp small { display: block; font-size: 15px; font-weight: 700; }
  .mkempty { text-align: center; color: var(--hint); padding: 22px 8px; font-size: 17px; line-height: 2; }
  .mkchips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 14px; }
  .mkchip { padding: 10px 16px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 17px; color: var(--hint); background: none; border: 2px solid var(--line); }
  .mkchip.on { color: #2a1d00; font-weight: 700; background: linear-gradient(160deg, #ecc96f, #d9a94f); border-color: #ecc96f; }
  .mklbl { font-size: 16px; color: #c4c8d1; margin: 6px 2px 2px; }
  .mkin { width: 100%; box-sizing: border-box; padding: 14px; border-radius: 16px; font: inherit; font-size: 20px; direction: ltr; text-align: center;
    color: var(--text, #fff); background: rgba(255,255,255,.05); border: 2px solid var(--line); margin: 6px 0 10px; }
  .mkgo { width: 100%; padding: 16px; border: 0; border-radius: 18px; cursor: pointer; font: inherit; font-size: 19px; font-weight: 700; color: #2a1d00;
    background: linear-gradient(160deg, #ecc96f, #d9a94f); }
  .mkgo:disabled { opacity: .4; cursor: not-allowed; }
  .mknote { margin-top: 12px; color: #8b909c; font-size: 15px; line-height: 1.9; }
  .mksum { font-size: 17px; line-height: 2; color: #d9dde6; margin-bottom: 10px; }
  .mktr { display: flex; justify-content: space-between; gap: 10px; padding: 12px 2px; border-top: 1px solid rgba(255,255,255,.07); font-size: 16.5px; line-height: 1.8; }
  .mktr:first-of-type { border-top: 0; }
  .mktr small { display: block; color: var(--hint); font-size: 13.5px; }
  .mkmask { position: fixed; inset: 0; z-index: 900; background: rgba(0,0,0,.6); }
  .mksheet { position: fixed; z-index: 901; left: 12px; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom)); max-height: 82vh; overflow-y: auto;
    padding: 18px 16px; border-radius: 28px; border: 1px solid var(--line); background: #151925; }
  .mksheet h3 { font-size: 22px; margin-bottom: 4px; }
  .mksheet .mkx { position: absolute; top: 14px; left: 14px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 20px;
    color: var(--hint); background: none; border: 1.5px solid var(--line); }
  .mkad { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .mkad .mkchip { margin: 0; }
  .mkdanger { color: #ff9d8a; border-color: rgba(255,122,122,.5); }
  .mkhelp p { font-size: 17.5px; line-height: 2.1; color: #d9dde6; margin-top: 14px; }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  // ---------------- قیمت‌ها (همان فرمول market.py؛ فقط برای حالت بدون سرور)
  const DAY = 86400, HIST = 7, FEE = 0.02, VOL = 0.08, FLAT = 0.2, REVERT = 0.08, UMARK = 1.2;
  const RESJ = [["oil", "نفت", "🛢", 0.5], ["steel", "فولاد", "⚙️", 0.5], ["food", "غذا", "🌾", 0.5], ["uranium", "اورانیوم", "⚗️", 0.55]];
  const NAME = {}; RESJ.forEach(r => { NAME[r[0]] = r; });
  const BR_ICON = { gnd: "🪖", air: "✈️", sea: "🚢", mis: "🚀", def: "📡" };
  function rnd(s, idx, day) {
    let x = (Math.imul(s, 73856093) ^ Math.imul(idx, 19349663) ^ Math.imul(day, 83492791)) >>> 0;
    x = Math.imul((x ^ (x >>> 16)) >>> 0, 0x45d9f3b) >>> 0;
    x = Math.imul((x ^ (x >>> 16)) >>> 0, 0x45d9f3b) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function priceOn(s, key, day) {
    const idx = RESJ.findIndex(r => r[0] === key), base = RESJ[idx][3];
    let p = base;
    for (let d = 1; d <= Math.max(0, day); d++) {
      const n = rnd(s, idx + 50, d) < FLAT ? 0 : (rnd(s, idx, d) - 0.5) * 2 * VOL;
      p = p * (1 + n); p += (base - p) * REVERT;
      p = Math.max(base * 0.25, Math.min(base * 4, p)); p = Math.round(p * 10000) / 10000;
    }
    return p;
  }
  const pct = (a, b) => (b ? Math.round((a / b - 1) * 1000) / 10 : 0);
  const indexOn = (s, day) => Math.round(1000 * RESJ.reduce((t, r) => t + priceOn(s, r[0], day) / r[3], 0) / RESJ.length);
  const R = () => typeof REMOTE !== "undefined" && REMOTE;
  const seasonNo = () => (typeof season === "undefined" || season === null ? 0 : Number(season) || 0);
  function localState() {
    const now = Math.floor(Date.now() / 1000);
    const started = typeof endsAt !== "undefined" && endsAt ? Math.floor((endsAt - SD * 86400000) / 1000) : 0;
    const day = started ? Math.max(0, Math.floor((now - started) / DAY)) : 0, s = seasonNo();
    const left = started ? Math.max(0, started + START_CEASEFIRE_DAYS * DAY - now) : 0;
    const res = RESJ.map(([key, name, icon, base]) => {
      const hist = []; for (let d = Math.max(0, day - HIST + 1); d <= day; d++) hist.push(priceOn(s, key, d));
      const p = hist[hist.length - 1], prev = hist.length > 1 ? hist[hist.length - 2] : p;
      return { key, name, icon, base, price: p, chg: pct(p, prev), hist, buy: p * (1 + FEE), sell: p * (1 - FEE), stock: 0, listings: 0 };
    });
    const A = window.OWArmy, units = [], branches = [];
    if (A) {
      A.UNITS.forEach(u => { if (u[2] === "sat") return; units.push({ key: u[0], name: u[1], branch: u[2], icon: u[3], chg: 0, listings: 0,
        prices: [1, 2, 3, 4, 5].map(l => Math.round(Math.floor((u[5] * (1 + 0.2 * (l - 1)) + 1e-6) / 1000) * 1000 * UMARK)) }); });
      A.BRANCHES.forEach(b => { if (b[0] !== "sat") branches.push({ key: b[0], name: b[1], icon: b[2] }); });
    }
    return { now, open: left === 0, start_left: left, day, fee: FEE, index: { v: indexOn(s, day), chg: pct(indexOn(s, day), day ? indexOn(s, day - 1) : indexOn(s, 0)) },
      res, units, branches, levels: 5, trades: [], listings: [], list: { max: 5, hours: 48, lo: 0.5, hi: 2, mine: 0 }, local: true };
  }

  // ---------------- وضعیت
  const MS = { tab: "goods", d: null, err: "", busy: false, lvl: 1, chart: "oil", give: "oil", take: "steel", qty: "", recv: 0, adf: "all" };
  function apply(d) { MS.d = d; MS.recv = Date.now(); MS.err = ""; }
  async function load() {
    try { apply(R() ? await cmApi("/api/market") : localState()); } catch (e) { MS.err = e.message; }
    if (view === "market") { drawHead(); drawPane(); }
  }
  async function act(path, body, okMsg) {
    if (MS.busy) return false;
    MS.busy = true; let ok = false;
    try {
      apply(await cmApi(path, body)); ok = true;
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
      if (okMsg) toast(okMsg);
      if (typeof ecoLoad === "function") ecoLoad();   // خزانه و انبار تازه شوند
    } catch (e) { toast(e.message); load(); }
    MS.busy = false;
    if (view === "market") { drawHead(); drawPane(); }
    return ok;
  }

  // ---------------- ابزارهای نمایش
  const nf = (n) => Number(n).toLocaleString("en-US");
  const pf = (p) => "$" + Number(Number(p).toFixed(2)).toString();
  const pf4 = (p) => "$" + Number(Number(p).toFixed(3)).toString();
  const cls = (c) => (c > 0 ? "up" : c < 0 ? "dn" : "fl");
  const chgTxt = (c) => (c > 0 ? "▲ " : c < 0 ? "▼ " : "") + Math.abs(c).toFixed(1) + "٪";
  const fmtT = (ts) => new Date(ts * 1000).toLocaleString("fa", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const live = () => R() && !!MS.d && !MS.d.local;
  const cashNow = () => Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash + ecoPending() : GAME.cash);
  const isUnit = (k) => k === "unit";
  function info(kind, item) {
    const d = MS.d, x = d && (isUnit(kind) ? d.units : d.res).find(r => r.key === item);
    return x || { key: item, name: item, icon: "📦" };
  }
  const priceTxt = (kind, p) => (isUnit(kind) ? "$" + nf(p) : pf4(p));
  const total = (kind, p, n) => (isUnit(kind) ? Math.round(p) * n : Math.max(1, Math.ceil(n * p - 1e-9)));
  const cname = (code) => (typeof byCode !== "undefined" && byCode[code] && byCode[code].name) || code || "";
  const leftMs = () => { const d = MS.d; return d ? Math.max(0, d.start_left * 1000 - (Date.now() - MS.recv)) : 0; };
  const isOpen = () => !!MS.d && (MS.d.start_left === 0 || leftMs() === 0);
  function spark(hist, chg, w, h) {
    const col = chg > 0 ? "#4fd9a0" : chg < 0 ? "#ff7a7a" : "#9aa3c7";
    const hs = hist.length > 1 ? hist : [hist[0], hist[0]], lo = Math.min(...hs), hi = Math.max(...hs), rg = hi - lo || 1;
    const pts = hs.map((v, i) => (i / (hs.length - 1) * (w - 4) + 2).toFixed(1) + "," + (h - 3 - (v - lo) / rg * (h - 6)).toFixed(1)).join(" ");
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '"><polyline fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/></svg>';
  }
  function row(icon, rnd_, name, sub, hist, chg, priceTxt, onTap) {
    const r = cmEl("div", "mkrow"), i = cmEl("div", "mki" + (rnd_ ? " rnd" : ""), icon), n = cmEl("div", "mkn");
    n.append(cmEl("b", null, name), cmEl("small", null, sub));
    const sp = cmEl("div", "mkspark"); sp.innerHTML = spark(hist, chg, 90, 36);
    const p = cmEl("div", "mkp", priceTxt); p.appendChild(cmEl("small", cls(chg), chgTxt(chg)));
    r.append(i, n, sp, p); r.onclick = onTap; return r;   // در RTL آیکن سمت راست می‌افتد
  }

  // ---------------- سربرگ
  function drawHead() {
    const box = el("mkhead"), d = MS.d; box.innerHTML = "";
    const c = cmEl("div", "mkinfo"), q = cmEl("button", "mkq", "?"); q.type = "button"; q.onclick = help;
    c.append(q, cmEl("h3", null, "🏪 بازار جهانی"), cmEl("p", null, "منابع و یگان‌ها را با قیمت روز بخرید، بفروشید یا با هم عوض کنید."));
    if (d) {
      const ix = cmEl("div", "mkidx"); ix.append("شاخص کالا ", cmEl("b", null, nf(d.index.v)), cmEl("span", cls(d.index.chg), chgTxt(d.index.chg)));
      c.appendChild(ix);
      if (!isOpen()) { const z = cmEl("div", "mkclosed", "🌾 بازار جهانی در آغاز فصل بسته است؛ " + dur(leftMs()) + " دیگر باز می‌شود. قیمت‌ها دیده می‌شوند ولی معامله‌ای انجام نمی‌شود."); z.id = "mkclosed"; c.appendChild(z); }
      else if (d.local) c.appendChild(cmEl("div", "mkclosed", "📴 حالت محلی: فقط قیمت‌ها دیده می‌شوند؛ خرید و فروش با سرور بازی ممکن است."));
    } else c.appendChild(cmEl("p", null, MS.err || "در حال دریافت قیمت‌ها…"));
    box.appendChild(c);
  }
  // پنجره‌ها
  let mask = null, sheet = null;
  function closeSheet() { if (mask) mask.hidden = true; if (sheet) sheet.hidden = true; }
  function openSheet(build) {
    if (!mask) {
      mask = cmEl("div", "mkmask"); sheet = cmEl("div", "mksheet");
      mask.onclick = closeSheet; document.body.append(mask, sheet);
    }
    sheet.innerHTML = ""; const x = cmEl("button", "mkx", "✕"); x.type = "button"; x.onclick = closeSheet; sheet.appendChild(x);
    build(sheet); mask.hidden = false; sheet.hidden = false;
  }
  function help() {
    openSheet((s) => {
      s.classList.add("mkhelp"); s.appendChild(cmEl("h3", null, "بازار جهانی"));
      s.appendChild(cmEl("p", null, "منابع را به قیمت روز بخرید و بفروشید یا با هم مبادله کنید، فرمانده. قیمت‌ها هر روز کمی تغییر می‌کنند و برای همه‌ی بازیکن‌ها یکسان است."));
      s.appendChild(cmEl("p", null, "هر معامله " + Math.round(((MS.d && MS.d.fee) || FEE) * 100) + "٪ کارمزد دارد. یگان را فوری و بدون کارخانه می‌توانید از بازار بخرید (گران‌تر از تولید خودتان) یا به بازار بفروشید (کمتر از هزینه‌ی تولید)؛ یگان خریداری‌شده سطح تحقیق خودتان را می‌گیرد و باید در پایگاه جا داشته باشد."));
      s.appendChild(cmEl("p", null, "در تب «آگهی‌ها» می‌توانید منبع یا یگان خود را با قیمتِ دلخواه (نیم تا دو برابر قیمت بازار) برای بازیکن‌های دیگر بگذارید. کالا همان لحظه در آگهی می‌ماند و اگر کسی نخرد " + ((MS.d && MS.d.list && MS.d.list.hours) || 48) + " ساعت بعد برمی‌گردد؛ هر زمان هم می‌توانید لغو کنید."));
      s.appendChild(cmEl("p", null, "بازار در آتش‌بس آغاز فصل بسته است؛ قیمت‌ها دیده می‌شوند ولی معامله‌ای انجام نمی‌شود."));
    });
  }

  // ---------------- پنجره‌ی خرید و فروش
  function tradeSheet(r) {
    const d = MS.d;
    openSheet((s) => {
      s.classList.remove("mkhelp");
      let side = "buy", qty = "";
      const cash = () => Math.floor((typeof ECO !== "undefined" && ECO.d ? ECO.d.cash + ecoPending() : GAME.cash));
      s.appendChild(cmEl("h3", null, r.icon + " " + r.name));
      const info = cmEl("div", "mksum"); s.appendChild(info);
      const chips = cmEl("div", "mkchips"), tb = cmEl("button", "mkchip on", "خرید"), ts = cmEl("button", "mkchip", "فروش");
      tb.type = ts.type = "button"; chips.append(tb, ts); s.appendChild(chips);
      s.appendChild(cmEl("div", "mklbl", "تعداد"));
      const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; s.appendChild(inp);
      const q = cmEl("div", "mkchips"); s.appendChild(q);
      const sum = cmEl("div", "mksum"); s.appendChild(sum);
      const go = cmEl("button", "mkgo", "تأیید"); go.type = "button"; s.appendChild(go);
      if (!d.open && !isOpen()) s.appendChild(cmEl("div", "mknote", "بازار هنوز باز نیست."));
      const unit = () => (side === "buy" ? r.buy : r.sell);
      const maxQ = () => (side === "buy" ? Math.floor(cash() / unit()) : r.stock);
      function refresh() {
        info.textContent = "قیمت روز " + pf4(r.price) + " · خرید " + pf4(r.buy) + " · فروش " + pf4(r.sell) + " (کارمزد " + Math.round(d.fee * 100) + "٪)\n"
          + "موجودی انبار شما: " + nf(r.stock) + " · خزانه: $" + nf(cash());
        info.style.whiteSpace = "pre-line";
        tb.className = "mkchip" + (side === "buy" ? " on" : ""); ts.className = "mkchip" + (side === "sell" ? " on" : "");
        const n = Math.floor(Number(qty) || 0);
        sum.textContent = n > 0 ? (side === "buy" ? "هزینه: $" : "دریافتی: $") + nf(side === "buy" ? Math.ceil(n * r.price * (1 + d.fee)) : Math.floor(n * r.price * (1 - d.fee))) : "";
        const bad = n < 1 || n > maxQ() || !isOpen() || !R() || d.local;
        go.disabled = bad || MS.busy;
        go.textContent = !R() || d.local ? "فقط با سرور بازی" : n > maxQ() ? (side === "buy" ? "خزانه کافی نیست" : "موجودی کافی نیست") : "تأیید " + (side === "buy" ? "خرید" : "فروش");
      }
      tb.onclick = () => { side = "buy"; refresh(); }; ts.onclick = () => { side = "sell"; refresh(); };
      inp.oninput = () => { qty = inp.value; refresh(); };
      [["۲۵٪", 0.25], ["۵۰٪", 0.5], ["حداکثر", 1]].forEach(([t, f]) => {
        const b = cmEl("button", "mkchip", t); b.type = "button";
        b.onclick = () => { const v = Math.max(0, Math.floor(maxQ() * f)); inp.value = v || ""; qty = inp.value; refresh(); }; q.appendChild(b);
      });
      adLinks(s, "res", r.key);
      go.onclick = async () => {
        const n = Math.floor(Number(qty) || 0); if (n < 1) return;
        const ok = await act("/api/market/trade", { item: r.key, side, qty: n }, (side === "buy" ? "خرید" : "فروش") + " " + nf(n) + " " + r.name + " انجام شد ✅");
        if (ok) closeSheet();
      };
      refresh();
    });
  }

  // ---------------- لینک آگهی‌ها داخل پنجره‌ها
  function adLinks(s, kind, item) {
    const row_ = cmEl("div", "mkad"), n = ((MS.d && MS.d.listings) || []).filter(l => l.kind === kind && l.item === item && !l.mine).length;
    const a = cmEl("button", "mkchip", "📢 آگهی‌ها (" + nf(n) + ")"), b = cmEl("button", "mkchip", "➕ ثبت آگهی فروش");
    a.type = b.type = "button";
    a.onclick = () => { MS.adf = kind + ":" + item; MS.tab = "ads"; closeSheet(); drawTabs(); drawPane(); };
    b.onclick = () => (live() ? listSheet(kind, item) : toast("آگهی با سرور بازی ممکن است."));
    row_.append(a, b); s.appendChild(row_);
  }
  function qtyChips(box, maxQ, inp, setQ, refresh) {
    const q = cmEl("div", "mkchips"); box.appendChild(q);
    [["۲۵٪", 0.25], ["۵۰٪", 0.5], ["حداکثر", 1]].forEach(([t, f]) => {
      const b = cmEl("button", "mkchip", t); b.type = "button";
      b.onclick = () => { const v = Math.max(0, Math.floor(maxQ() * f)); inp.value = v || ""; setQ(inp.value); refresh(); }; q.appendChild(b);
    });
  }

  // ---------------- خرید و فروش یگان با بازار
  function unitSheet(u) {
    const d = MS.d;
    openSheet((s) => {
      s.classList.remove("mkhelp");
      let side = "buy", qty = "";
      s.appendChild(cmEl("h3", null, u.icon + " " + u.name));
      const inf = cmEl("div", "mksum"); inf.style.whiteSpace = "pre-line"; s.appendChild(inf);
      const chips = cmEl("div", "mkchips"), tb = cmEl("button", "mkchip on", "خرید"), ts = cmEl("button", "mkchip", "فروش");
      tb.type = ts.type = "button"; chips.append(tb, ts); s.appendChild(chips);
      s.appendChild(cmEl("div", "mklbl", "تعداد"));
      const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; s.appendChild(inp);
      const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "تأیید"); go.type = "button";
      const maxQ = () => (side === "buy" ? Math.max(0, Math.min(u.room, Math.floor(cashNow() / u.buy))) : u.owned);
      function refresh() {
        inf.textContent = "سطح تحقیق شما: " + u.level + " · خرید فوری (بدون کارخانه) $" + nf(u.buy) + " · فروش به بازار $" + nf(u.sell)
          + " (" + Math.round((d.buyback || 0.6) * 100) + "٪ هزینه‌ی تولید)\nدارید: " + nf(u.owned) + " · جای خالی پایگاه: " + nf(u.room) + " · خزانه: $" + nf(cashNow());
        tb.className = "mkchip" + (side === "buy" ? " on" : ""); ts.className = "mkchip" + (side === "sell" ? " on" : "");
        const n = Math.floor(Number(qty) || 0);
        sum.textContent = n > 0 ? (side === "buy" ? "هزینه: $" : "دریافتی: $") + nf(n * (side === "buy" ? u.buy : u.sell)) : "";
        const bad = n < 1 || n > maxQ() || !isOpen() || !live();
        go.disabled = bad || MS.busy;
        go.textContent = !live() ? "فقط با سرور بازی" : !isOpen() ? "بازار بسته است"
          : n > maxQ() ? (side === "sell" ? "یگان کافی ندارید" : u.room < n && u.room * u.buy <= cashNow() ? "جای پایگاه کافی نیست" : "خزانه کافی نیست") : "تأیید " + (side === "buy" ? "خرید" : "فروش");
      }
      tb.onclick = () => { side = "buy"; refresh(); }; ts.onclick = () => { side = "sell"; refresh(); };
      inp.oninput = () => { qty = inp.value; refresh(); };
      s.append(sum); qtyChips(s, maxQ, inp, (v) => { qty = v; }, refresh); s.appendChild(go);
      s.appendChild(cmEl("div", "mknote", "یگانِ خریداری‌شده همان لحظه به پایگاهتان اضافه می‌شود و نگهداری روزانه دارد. تولید در کارخانه‌ی خودتان ارزان‌تر است ولی زمان می‌برد."));
      adLinks(s, "unit", u.key);
      go.onclick = async () => {
        const n = Math.floor(Number(qty) || 0); if (n < 1) return;
        const ok = await act("/api/market/unit", { unit: u.key, side, qty: n }, (side === "buy" ? "خرید" : "فروش") + " " + nf(n) + " " + u.name + " انجام شد ✅");
        if (ok) closeSheet();
      };
      refresh();
    });
  }

  // ---------------- آگهی: خرید، ثبت و لغو
  function buyAdSheet(l) {
    const it = info(l.kind, l.item), d = MS.d;
    openSheet((s) => {
      s.classList.remove("mkhelp");
      let qty = "";
      s.appendChild(cmEl("h3", null, it.icon + " " + it.name));
      const inf = cmEl("div", "mksum"); inf.style.whiteSpace = "pre-line"; s.appendChild(inf);
      s.appendChild(cmEl("div", "mklbl", "تعداد"));
      const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; s.appendChild(inp);
      const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "خرید"); go.type = "button";
      const room = () => (isUnit(l.kind) && it.room != null ? it.room : Infinity);
      const maxQ = () => Math.max(0, Math.min(l.qty, room(), Math.floor(cashNow() / l.price)));
      function refresh() {
        inf.textContent = "فروشنده: " + l.name + " · قیمت هر واحد " + priceTxt(l.kind, l.price) + "\nموجود در آگهی: " + nf(l.qty) + " · خزانه: $" + nf(cashNow())
          + (isUnit(l.kind) && it.room != null ? " · جای خالی پایگاه: " + nf(it.room) : "");
        const n = Math.floor(Number(qty) || 0);
        sum.textContent = n > 0 ? "هزینه: $" + nf(total(l.kind, l.price, n)) : "";
        const bad = n < 1 || n > maxQ() || !isOpen() || !live() || total(l.kind, l.price, Math.max(1, n)) > cashNow();
        go.disabled = bad || MS.busy;
        go.textContent = !live() ? "فقط با سرور بازی" : !isOpen() ? "بازار بسته است" : n > l.qty ? "بیشتر از موجودی آگهی" : n > room() ? "جای پایگاه کافی نیست"
          : n > 0 && total(l.kind, l.price, n) > cashNow() ? "خزانه کافی نیست" : "تأیید خرید";
      }
      inp.oninput = () => { qty = inp.value; refresh(); };
      s.append(sum); qtyChips(s, maxQ, inp, (v) => { qty = v; }, refresh); s.appendChild(go);
      s.appendChild(cmEl("div", "mknote", "پول به فروشنده می‌رسد (پس از " + Math.round(d.fee * 100) + "٪ کارمزد) و کالا همان لحظه برای شما می‌شود." + (isUnit(l.kind) ? " یگان سطح تحقیق شما را می‌گیرد." : "")));
      go.onclick = async () => {
        const n = Math.floor(Number(qty) || 0); if (n < 1) return;
        const ok = await act("/api/market/buy", { id: l.id, qty: n }, "خرید " + nf(n) + " " + it.name + " از آگهی انجام شد ✅");
        if (ok) closeSheet();
      };
      refresh();
    });
  }
  function myAdSheet(l) {
    const it = info(l.kind, l.item);
    openSheet((s) => {
      s.classList.remove("mkhelp");
      s.appendChild(cmEl("h3", null, it.icon + " آگهی شما"));
      s.appendChild(cmEl("div", "mksum", nf(l.qty) + " " + it.name + " · قیمت هر واحد " + priceTxt(l.kind, l.price) + "\nمانده تا پایان: " + dur(adLeft(l))));
      const go = cmEl("button", "mkgo", "لغو آگهی و بازگرداندن کالا"); go.type = "button"; s.appendChild(go);
      go.onclick = async () => { const ok = await act("/api/market/cancel", { id: l.id }, "آگهی لغو شد و کالا برگشت ✅"); if (ok) closeSheet(); };
    });
  }
  function listSheet(kind0, item0) {
    openSheet((s) => {
      s.classList.remove("mkhelp");
      const d = MS.d, L = d.list || { max: 5, lo: 0.5, hi: 2 };
      let kind = kind0 || "res", item = item0 || "oil", qty = "", price = "";
      s.appendChild(cmEl("h3", null, "➕ آگهی فروش"));
      const box = cmEl("div"); s.appendChild(box);
      const ref = () => { const x = info(kind, item); return isUnit(kind) ? x.buy : x.price; };
      const have = () => { const x = info(kind, item); return isUnit(kind) ? (x.owned || 0) : (x.stock || 0); };
      const bounds = () => (isUnit(kind) ? [Math.ceil(ref() * L.lo), Math.floor(ref() * L.hi)] : [Math.round(ref() * L.lo * 1e4) / 1e4, Math.round(ref() * L.hi * 1e4) / 1e4]);
      const defPrice = () => (isUnit(kind) ? String(Math.round(ref())) : String(Math.round(ref() * 1e4) / 1e4));
      function draw() {
        box.innerHTML = "";
        const kc = cmEl("div", "mkchips");
        [["res", "📦 منبع"], ["unit", "🪖 یگان"]].forEach(([k, t]) => {
          const c = cmEl("button", "mkchip" + (kind === k ? " on" : ""), t); c.type = "button";
          c.onclick = () => { if (kind !== k) { kind = k; item = isUnit(k) ? (d.units[0] || {}).key : "oil"; qty = ""; price = defPrice(); draw(); } }; kc.appendChild(c);
        });
        box.appendChild(kc);
        const ic = cmEl("div", "mkchips");
        (isUnit(kind) ? d.units : d.res).forEach(x => {
          const c = cmEl("button", "mkchip" + (x.key === item ? " on" : ""), x.icon + " " + x.name); c.type = "button";
          c.onclick = () => { item = x.key; qty = ""; price = defPrice(); draw(); }; ic.appendChild(c);
        });
        box.appendChild(ic);
        const inf = cmEl("div", "mksum"); inf.style.whiteSpace = "pre-line"; box.appendChild(inf);
        box.appendChild(cmEl("div", "mklbl", "تعداد"));
        const qi = cmEl("input", "mkin"); qi.type = "number"; qi.inputMode = "numeric"; qi.min = "1"; qi.placeholder = "0"; qi.value = qty; box.appendChild(qi);
        box.appendChild(cmEl("div", "mklbl", "قیمت هر واحد ($)"));
        const pi = cmEl("input", "mkin"); pi.type = "number"; pi.inputMode = "decimal"; pi.placeholder = "0"; pi.value = price; box.appendChild(pi);
        const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "ثبت آگهی"); go.type = "button";
        function refresh() {
          const [lo, hi] = bounds(), n = Math.floor(Number(qty) || 0), p = Number(price) || 0;
          inf.textContent = "قیمت بازار " + priceTxt(kind, ref()) + " · بازه‌ی مجاز " + priceTxt(kind, lo) + " تا " + priceTxt(kind, hi) + "\nموجودی شما: " + nf(have())
            + " · آگهی‌های باز: " + nf(d.list ? d.list.mine : 0) + " از " + nf(L.max);
          sum.textContent = n > 0 && p > 0 ? "اگر همه فروخته شود: $" + nf(Math.floor(total(kind, p, n) * (1 - d.fee))) + " (پس از " + Math.round(d.fee * 100) + "٪ کارمزد)" : "";
          const bad = n < 1 || n > have() || !(p >= lo && p <= hi) || !isOpen() || !live() || (d.list && d.list.mine >= L.max);
          go.disabled = bad || MS.busy;
          go.textContent = !live() ? "فقط با سرور بازی" : !isOpen() ? "بازار بسته است" : d.list && d.list.mine >= L.max ? "سقف آگهی پر است" : n > have() ? "موجودی کافی نیست"
            : p > 0 && !(p >= lo && p <= hi) ? "قیمت خارج از بازه" : "ثبت آگهی";
        }
        qi.oninput = () => { qty = qi.value; refresh(); }; pi.oninput = () => { price = pi.value; refresh(); };
        box.append(sum); qtyChips(box, have, qi, (v) => { qty = v; }, refresh); box.appendChild(go);
        go.onclick = async () => {
          const n = Math.floor(Number(qty) || 0), p = Number(price) || 0; if (n < 1 || p <= 0) return;
          const ok = await act("/api/market/list", { kind, item, qty: n, price: p }, "آگهی ثبت شد ✅");
          if (ok) { MS.tab = "ads"; MS.adf = "all"; closeSheet(); drawTabs(); drawPane(); }
        };
        refresh();
      }
      price = defPrice(); draw();
    });
  }
  const adLeft = (l) => Math.max(0, (l.exp - MS.d.now) * 1000 - (Date.now() - MS.recv));

  // ---------------- تب‌ها
  const TABS = [["goods", "🏪", "کالاها"], ["ads", "📢", "آگهی‌ها"], ["chart", "📊", "نمودار"], ["swap", "⇄", "مبادله"], ["mine", "🧾", "معامله‌های من"]];
  function drawTabs() {
    const bar = el("mktabs"); bar.innerHTML = "";
    TABS.forEach(([k, ic, nm]) => {
      const b = cmEl("button", "mktab" + (MS.tab === k ? " on" : ""), ic + " " + nm); b.type = "button";
      b.onclick = () => { MS.tab = k; drawTabs(); drawPane(); }; bar.appendChild(b);
    });
  }
  function goods(pane) {
    const d = MS.d;
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "📦 منابع")); p.appendChild(h);
    d.res.forEach(r => p.appendChild(row(r.icon, false, r.name, (r.listings ? nf(r.listings) + " آگهی" : "بی‌آگهی") + (R() && !d.local ? " · موجودی شما " + nf(r.stock) : ""),
      r.hist, r.chg, pf(r.price), () => tradeSheet(r))));
    pane.appendChild(p);
    if (!d.units.length) { pane.appendChild(cmEl("div", "mkempty", "فهرست یگان‌ها هنوز بارگذاری نشده است.")); return; }
    d.branches.forEach(b => {
      const us = d.units.filter(u => u.branch === b.key); if (!us.length) return;
      const pn = cmEl("div", "mkpanel"), hh = cmEl("div", "mkh");
      const lv = cmEl("small", null, "قیمت سطح " + MS.lvl + " ‹"); lv.onclick = () => { MS.lvl = MS.lvl % d.levels + 1; drawPane(); };
      hh.append(cmEl("span", null, b.icon + " یگان‌های " + b.name), lv); pn.appendChild(hh);
      us.forEach(u => pn.appendChild(row(u.icon, true, u.name, (u.listings ? nf(u.listings) + " آگهی" : "بی‌آگهی") + (live() && u.owned != null ? " · دارید " + nf(u.owned) : ""), [u.prices[MS.lvl - 1], u.prices[MS.lvl - 1]], u.chg,
        "$" + nf(u.prices[MS.lvl - 1]), () => (live() ? unitSheet(u) : toast("خرید و فروش یگان با سرور بازی ممکن است.")))));
      pane.appendChild(pn);
    });
  }
  function adsTab(pane) {
    const d = MS.d, L = d.list || { max: 5, mine: 0 }, f = MS.adf || "all";
    const [fk, fi] = f.split(":");
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"), add = cmEl("small", null, "➕ ثبت آگهی");
    add.onclick = () => (live() ? listSheet() : toast("آگهی با سرور بازی ممکن است."));
    h.append(cmEl("span", null, "📢 آگهی بازیکن‌ها"), add); p.appendChild(h);
    p.appendChild(cmEl("div", "mksum", "آگهی‌های باز شما: " + nf(L.mine || 0) + " از " + nf(L.max) + " · هر آگهی " + nf(L.hours || 48) + " ساعت می‌ماند"));
    const chips = cmEl("div", "mkchips");
    [["all", "همه"], ["res", "📦 منابع"], ["unit", "🪖 یگان‌ها"]].forEach(([k, t]) => {
      const c = cmEl("button", "mkchip" + (f === k ? " on" : ""), t); c.type = "button"; c.onclick = () => { MS.adf = k; drawPane(); }; chips.appendChild(c);
    });
    if (fi) { const it = info(fk, fi), c = cmEl("button", "mkchip on", it.icon + " " + it.name + " ✕"); c.type = "button"; c.onclick = () => { MS.adf = fk; drawPane(); }; chips.appendChild(c); }
    p.appendChild(chips);
    const list = (d.listings || []).filter(l => (fk === "all" || l.kind === fk) && (!fi || l.item === fi));
    if (!list.length) p.appendChild(cmEl("div", "mkempty", live() ? "آگهی‌ای نیست. اولین آگهی را شما بگذارید، فرمانده." : "آگهی‌ها فقط با سرور بازی دیده می‌شوند."));
    list.forEach(l => {
      const it = info(l.kind, l.item), r = cmEl("div", "mkrow"), i = cmEl("div", "mki" + (isUnit(l.kind) ? " rnd" : ""), it.icon), n = cmEl("div", "mkn");
      n.append(cmEl("b", null, nf(l.qty) + " " + it.name), cmEl("small", null, (l.mine ? "آگهی شما" : "فروشنده: " + l.name) + " · " + dur(adLeft(l))));
      const pr = cmEl("div", "mkp", priceTxt(l.kind, l.price)); pr.appendChild(cmEl("small", "fl", l.mine ? "لغو ‹" : "هر واحد ‹"));
      r.append(i, n, pr); r.onclick = () => (l.mine ? myAdSheet(l) : buyAdSheet(l)); p.appendChild(r);
    });
    pane.appendChild(p);
  }
  function chart(pane) {
    const d = MS.d, r = d.res.find(x => x.key === MS.chart) || d.res[0];
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "📊 نمودار قیمت"));
    p.appendChild(h);
    const chips = cmEl("div", "mkchips");
    d.res.forEach(x => { const c = cmEl("button", "mkchip" + (x.key === r.key ? " on" : ""), x.icon + " " + x.name); c.type = "button"; c.onclick = () => { MS.chart = x.key; drawPane(); }; chips.appendChild(c); });
    p.appendChild(chips);
    const g = cmEl("div", "mkspark"); g.style.width = "100%"; g.style.height = "170px";
    g.innerHTML = spark(r.hist, r.chg, 320, 170).replace('width="320" height="170"', 'width="100%" height="170" preserveAspectRatio="none"'); p.appendChild(g);
    const lo = Math.min(...r.hist), hi = Math.max(...r.hist);
    p.appendChild(cmEl("div", "mksum", "امروز " + pf4(r.price) + " (" + chgTxt(r.chg) + ") · کمترین " + pf4(lo) + " · بیشترین " + pf4(hi) + " · قیمت پایه " + pf4(r.base)));
    r.hist.slice().reverse().forEach((v, i) => {
      const t = cmEl("div", "mktr"); t.append(cmEl("span", null, i === 0 ? "امروز" : (i) + " روز پیش"), cmEl("b", null, pf4(v))); p.appendChild(t);
    });
    pane.appendChild(p);
  }
  function swapTab(pane) {
    const d = MS.d, g = d.res.find(x => x.key === MS.give), t = d.res.find(x => x.key === MS.take);
    const p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "⇄ مبادله‌ی کالا")); p.appendChild(h);
    const pick = (label, cur, set) => {
      p.appendChild(cmEl("div", "mklbl", label)); const ch = cmEl("div", "mkchips");
      d.res.forEach(x => { const c = cmEl("button", "mkchip" + (x.key === cur ? " on" : ""), x.icon + " " + x.name); c.type = "button";
        c.onclick = () => { set(x.key); if (MS.give === MS.take) { const o = RESJ.find(r => r[0] !== MS.give)[0]; if (cur === MS.give) MS.take = o; else MS.give = o; } drawPane(); }; ch.appendChild(c); });
      p.appendChild(ch);
    };
    pick("می‌دهید", MS.give, (k) => { MS.give = k; }); pick("می‌گیرید", MS.take, (k) => { MS.take = k; });
    p.appendChild(cmEl("div", "mklbl", "تعداد از «" + g.name + "» (موجودی شما " + nf(g.stock) + ")"));
    const inp = cmEl("input", "mkin"); inp.type = "number"; inp.inputMode = "numeric"; inp.min = "1"; inp.placeholder = "0"; inp.value = MS.qty;
    const sum = cmEl("div", "mksum"), go = cmEl("button", "mkgo", "مبادله"); go.type = "button";
    const calc = () => { const q = Math.floor(Number(MS.qty) || 0); return q > 0 ? Math.floor(q * g.price * (1 - d.fee) / (t.price * (1 + d.fee))) : 0; };
    const refresh = () => {
      const q = Math.floor(Number(MS.qty) || 0), got = calc();
      sum.textContent = q > 0 ? "می‌گیرید: حدود " + nf(got) + " " + t.name + " (کارمزد " + Math.round(d.fee * 100) + "٪ دو سر حساب شده)" : "";
      go.disabled = MS.busy || q < 1 || got < 1 || q > g.stock || !isOpen() || !R() || !!d.local;
      go.textContent = !R() || d.local ? "فقط با سرور بازی" : q > g.stock ? "موجودی کافی نیست" : !isOpen() ? "بازار بسته است" : "مبادله";
    };
    inp.oninput = () => { MS.qty = inp.value; refresh(); };
    go.onclick = async () => { const q = Math.floor(Number(MS.qty) || 0); const ok = await act("/api/market/swap", { give: MS.give, take: MS.take, qty: q }, "مبادله انجام شد ✅"); if (ok) { MS.qty = ""; drawPane(); } };
    p.append(inp, sum, go); refresh();
    p.appendChild(cmEl("div", "mknote", "خزانه دست نمی‌خورد؛ فقط انبار منابع جابه‌جا می‌شود."));
    pane.appendChild(p);
  }
  const KIND = { buy: "خرید", sell: "فروش", swap: "مبادله", lbuy: "خرید از آگهی", lsell: "فروش با آگهی", list: "ثبت آگهی", unlist: "لغو آگهی", lexp: "پایان آگهی" };
  const PLUS = { sell: 1, lsell: 1 }, MINUS = { buy: 1, lbuy: 1 };
  function mineTab(pane) {
    const d = MS.d, p = cmEl("div", "mkpanel"), h = cmEl("div", "mkh"); h.appendChild(cmEl("span", null, "🧾 معامله‌های من")); p.appendChild(h);
    if (!d.trades.length) p.appendChild(cmEl("div", "mkempty", R() && !d.local ? "هنوز معامله‌ای نکرده‌اید، فرمانده." : "معامله‌ها فقط با سرور بازی ثبت می‌شوند."));
    d.trades.forEach(t => {
      const a = NAME[t.item] ? NAME[t.item][1] : ((MS.d.units.find(u => u.key === t.item) || {}).name || t.item);
      const b = t.kind === "swap" && t.item2 && NAME[t.item2], row_ = cmEl("div", "mktr"), l = cmEl("span");
      const who = (t.kind === "lbuy" || t.kind === "lsell") && t.item2 ? " · " + (t.kind === "lbuy" ? "از " : "به ") + cname(t.item2) : "";
      l.append((KIND[t.kind] || t.kind) + " " + nf(t.qty) + " " + a + (b ? " ← " + nf(t.qty2) + " " + b[1] : "") + who, cmEl("small", null, fmtT(t.ts)));
      row_.append(l, cmEl("b", null, PLUS[t.kind] ? "+$" + nf(t.total) : MINUS[t.kind] ? "−$" + nf(t.total) : "")); p.appendChild(row_);
    });
    pane.appendChild(p);
  }
  function drawPane() {
    const pane = el("mkpane"); pane.innerHTML = "";
    if (!MS.d) { pane.appendChild(cmEl("div", "mkempty", MS.err || "در حال دریافت قیمت‌ها…")); return; }
    ({ goods, ads: adsTab, chart, swap: swapTab, mine: mineTab }[MS.tab] || goods)(pane);
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("mavatar"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("mkcash").textContent = "$" + nf(GAME.cash);
    drawHead(); drawTabs(); drawPane(); load();
    if (typeof ecoLoad === "function" && R()) ecoLoad();
  }
  let ticks = 0, reloading = 0;
  setInterval(() => {
    if (typeof view === "undefined" || view !== "market") { ticks = 0; return; }
    const cashEl = el("mkcash");
    if (cashEl) cashEl.textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash + ecoPending() : GAME.cash));
    if (MS.d && MS.d.start_left > 0) {
      const z = el("mkclosed");
      if (leftMs() > 0 && z) z.textContent = "🌾 بازار جهانی در آغاز فصل بسته است؛ " + dur(leftMs()) + " دیگر باز می‌شود. قیمت‌ها دیده می‌شوند ولی معامله‌ای انجام نمی‌شود.";
      else if (leftMs() === 0 && Date.now() - reloading > 5000) { reloading = Date.now(); load(); }
    }
    if (++ticks % 60 === 0 && !MS.busy) load();   // هر ~۶۰ ثانیه قیمت‌ها تازه می‌شود
  }, 1000);

  // ---------------- اتصال دکمه‌ها
  el("mavatar").onclick = () => setView("map");
  el("mcup").onclick = () => setView("rank");
  el("mbell").onclick = () => setView("notif");
  el("mset").onclick = () => toast("تنظیمات — به‌زودی 🚧");
  el("mgoal").onclick = () => toast("اهداف — به‌زودی 🚧");
  el("mkback").onclick = () => setView("home");
  el("mktitle").onclick = () => setView("home");

  window.OWMarket = { build, priceOn, indexOn };
})();
