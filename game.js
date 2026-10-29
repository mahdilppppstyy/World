/* ===== army.js ===== */
/* صفحه‌ی ارتش (یگان‌ها، تولید، تحقیق). بعد از اسکریپت اصلی index.html بارگذاری می‌شود و از همان
   تابع‌ها و متغیرهای سراسریِ آن (el, cmEl, cmApi, ECO, GAME, REMOTE, setView, elLoadS, …) استفاده می‌کند.
   با سرور: /api/mil ؛ بدون سرور: همان منطق military.py روی localStorage (حالت محلی). */
(function () {
  "use strict";

  // ---------------- ظاهر (کنار استایل‌های زیرساخت)
  const CSS = `
  .artabs { display: flex; gap: 10px; overflow-x: auto; margin: 0 -14px 12px; padding: 2px 14px 6px; scrollbar-width: none; }
  .artabs::-webkit-scrollbar { display: none; }
  .artab { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 20px; cursor: pointer; font: inherit; font-size: 18px;
    color: var(--gold); background: rgba(150,105,30,.12); border: 2px solid rgba(232,196,108,.5); }
  .artab.on { background: linear-gradient(160deg, #ecc96f, #d9a94f); border-color: #ecc96f; color: #2a1d00; font-weight: 700; }
  .arhelp { width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 18px; color: var(--hint); background: none; border: 1.5px solid var(--line); }
  .arlab { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 14px 0 4px; font-size: 19px; }
  .arlink { display: block; width: 100%; text-align: right; padding: 8px 0 12px; font: inherit; font-size: 17px; color: var(--gold); background: none; border: 0; cursor: pointer; }
  .inbx.tap { cursor: pointer; }
  .inbx .ar-h { display: flex; align-items: center; gap: 8px; color: var(--hint); }
  .aract { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .arres { flex: 1; padding: 14px 8px; font: inherit; font-size: 17px; text-align: center; color: var(--gold); background: none; border: 0; cursor: pointer; }
  .arres.off { color: var(--hint); }
  .arprod { flex: 1.3; padding: 14px 8px; border-radius: 20px; cursor: pointer; font: inherit; font-size: 20px; font-weight: 700; text-align: center;
    color: #4fd9a0; background: rgba(79,217,160,.12); border: 2px solid rgba(79,217,160,.55); }
  .arprod.off { opacity: .5; }
  .ecchip.warn { color: var(--gold); border-color: rgba(232,196,108,.5); }
  .arnote { margin-top: 14px; color: #8b909c; font-size: 15px; line-height: 1.8; }
  `;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  // ---------------- جدول‌ها (هم‌اندازه‌ی military.py؛ در حالت سرور فقط برای حالت محلی لازم است)
  const BRANCHES = [["gnd", "زمینی", "🪖"], ["air", "هوایی", "✈️"], ["sea", "دریایی", "🚢"], ["mis", "موشکی", "🚀"], ["def", "پدافند", "📡"], ["sat", "ماهواره", "🛰"]];
  const BASES = { gnd: "armorbase", air: "airport", sea: "port", mis: "missilebase", def: "radar", sat: "space" };
  const UNITS = [
    ["tank", "تانک", "gnd", "🪖", "tankfac", 180000, 30, 600],
    ["launcher", "لانچر موشک", "gnd", "🚛", "tankfac", 200000, 40, 720],
    ["fighter", "جنگنده", "air", "✈️", "airfac", 350000, 55, 900],
    ["bomber", "بمب‌افکن", "air", "🛩", "airfac", 520000, 90, 1200],
    ["destroyer", "ناو", "sea", "🚢", "shipyard", 600000, 80, 1500],
    ["submarine", "زیردریایی", "sea", "⚓", "shipyard", 750000, 110, 1800],
    ["cruise", "موشک کروز", "mis", "🚀", "missilefac", 250000, 70, 900],
    ["ballistic", "موشک بالستیک", "mis", "☄️", "missilefac", 400000, 120, 1500],
    ["aadef", "پدافند هوایی", "def", "📡", "airfac", 300000, 40, 900],
    ["satellite", "ماهواره", "sat", "🛰", "space", 1500000, 0, 3600],
  ];
  const K = { MAX: 5, DMG: 0.25, COST: 0.20, UP: 0.01, UPS: 0.30, FAC: 0.90, MINP: 30, RMUL: 4, RSECS: 1800 };
  const U = {}; UNITS.forEach(u => { U[u[0]] = u; });
  const r1000 = (n) => Math.floor(n / 1000) * 1000;
  const F = {
    dmg: (k, l) => Math.round(U[k][6] * (1 + K.DMG * (Math.max(1, l) - 1))),
    cost: (k, l) => r1000(U[k][5] * (1 + K.COST * (Math.max(1, l) - 1)) + 1e-6),
    upkeep: (k, l) => Math.round(U[k][5] * K.UP * (1 + K.UPS * (Math.max(1, l) - 1))),
    prod: (k, fl) => Math.max(K.MINP, Math.floor(U[k][7] * Math.pow(K.FAC, Math.max(0, fl - 1)))),
    rcost: (k, to) => r1000(U[k][5] * K.RMUL * (to - 1)),
    rsecs: (to) => Math.floor(K.RSECS * Math.pow(2, Math.max(0, to - 2))),
  };

  // ---------------- حالت محلی (بدون سرور)
  const LK = () => "ow_mil_" + (typeof season === "undefined" || season === null ? "x" : season) + "_" + (mine || "");
  let lMem = null;
  function lLoad() {
    if (lMem) return lMem;
    let M = null;
    try { M = JSON.parse(localStorage.getItem(LK()) || "null"); } catch (e) { /* ذخیره‌ی خراب */ }
    return (lMem = M && M.units ? M : { units: {}, queue: [], ts: Math.floor(Date.now() / 1000) });
  }
  function lSave(M) { lMem = M; try { localStorage.setItem(LK(), JSON.stringify(M)); } catch (e) { /* بدون ذخیره */ } }
  const lUp = (M) => Object.keys(M.units).reduce((s, k) => s + M.units[k].n * F.upkeep(k, M.units[k].rl), 0);
  function lView(S, M, now) {
    const lv = S.lv, name = (k) => elIBy[k][1];
    const capR = lv.lab ? Math.min(K.MAX, lv.lab + 1) : 1;
    const used = {}, power = {}, count = {}, fbusy = {};
    UNITS.forEach(([k, , br, , fac]) => {
      const v = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 }, q = M.queue.filter(o => o.unit === k).length;
      power[br] = (power[br] || 0) + v.n * F.dmg(k, v.rl); count[br] = (count[br] || 0) + v.n; used[br] = (used[br] || 0) + v.n + q + ((M.esc || {})[k] || 0);   // یگانِ داخل آگهی هنوز جا می‌گیرد
      fbusy[fac] = (fbusy[fac] || 0) + q;
    });
    const units = UNITS.map(([k, nm, br, ic, fac, , , s0]) => {
      const v = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 }, rl = v.rl, fl = lv[fac] || 0;
      const cap = Math.floor(elIBy[BASES[br]][5] * (lv[BASES[br]] || 0)), line = Math.floor(elIBy[fac][5] * fl), price = F.cost(k, rl);
      const why = fl < 1 ? "fac" : used[br] >= cap ? "slots" : (fbusy[fac] || 0) >= line ? "line" : S.cash < price ? "cash" : null;
      const nx = rl + 1;
      const rw = U[k][6] === 0 ? "na" : v.rts ? "busy" : !lv.lab ? "lab" : rl >= K.MAX ? "max" : nx > capR ? "cap" : S.cash < F.rcost(k, nx) ? "cash" : null;
      return {
        key: k, name: nm, branch: br, icon: ic, n: v.n, queued: M.queue.filter(o => o.unit === k).length, level: rl, max: K.MAX,
        dmg: F.dmg(k, rl), cost: price, secs: fl ? F.prod(k, fl) : s0, upkeep: F.upkeep(k, rl),
        fac: { key: fac, name: name(fac), level: fl }, can: why === null, why,
        queue: M.queue.filter(o => o.unit === k).map(o => ({ until: o.until, secs: o.dur })),
        research: { to: rl < K.MAX ? nx : null, cost: rl < K.MAX ? F.rcost(k, nx) : null, secs: rl < K.MAX ? F.rsecs(nx) : null,
          can: rw === null, why: rw, until: v.rts || null, dur: v.rdur || null },
      };
    });
    const branches = BRANCHES.map(([k, nm, ic]) => ({ key: k, name: nm, icon: ic, power: power[k] || 0, count: count[k] || 0, used: used[k] || 0,
      cap: Math.floor(elIBy[BASES[k]][5] * (lv[BASES[k]] || 0)), base: BASES[k], base_name: name(BASES[k]), base_level: lv[BASES[k]] || 0 }));
    return { now, cash: S.cash, units, branches, lab: lv.lab || 0, lab_cap: capR,
      power: Object.keys(power).reduce((s, k) => s + power[k], 0), count: Object.keys(count).reduce((s, k) => s + count[k], 0), upkeep: lUp(M) };
  }
  function lSync(now) {
    const S = elSync(elLoadS(), now), M = lLoad();
    const due = lUp(M) * Math.max(0, now - M.ts) / 86400;
    if (due >= 1) { const take = Math.min(S.cash, Math.floor(due)); S.cash -= take; M.ts = take >= Math.floor(due) ? now : M.ts + Math.floor(take * 86400 / lUp(M)); } else if (!lUp(M)) M.ts = now;
    M.queue.filter(o => o.until <= now).forEach(o => { (M.units[o.unit] = M.units[o.unit] || { n: 0, rl: 1, rts: 0, rdur: 0 }).n++; });
    M.queue = M.queue.filter(o => o.until > now);
    Object.keys(M.units).forEach(k => { const v = M.units[k]; if (v.rts && v.rts <= now) { v.rl = Math.min(K.MAX, v.rl + 1); v.rts = 0; v.rdur = 0; } });
    return { S, M };
  }
  function localApi(path, body) {
    const now = Math.floor(Date.now() / 1000), { S, M } = lSync(now);
    const row = () => lView(S, M, now).units.find(u => u.key === (body && body.unit));
    if (path === "/api/mil/produce" || path === "/api/mil/research") {
      const r = row(); if (!r) throw new Error("یگان نامعتبر است.");
      if (path.endsWith("produce")) {
        if (r.why) throw new Error(WHY[r.why](r));
        S.cash -= r.cost; M.queue.push({ unit: r.key, until: now + r.secs, dur: r.secs });
      } else {
        const q = r.research; if (!q.can) throw new Error(RWHY[q.why]);
        S.cash -= q.cost; const v = (M.units[r.key] = M.units[r.key] || { n: 0, rl: 1, rts: 0, rdur: 0 }); v.rts = now + q.secs; v.rdur = q.secs;
      }
      elSave(S); lSave(M); return lView(S, M, now);
    }
    elSave(S); lSave(M); return lView(S, M, now);
  }

  // ---------------- پیام‌ها
  const WHY = {
    fac: (r) => "اول " + r.fac.name + " را بسازید.",
    slots: (r) => "جای نگهداری پر است؛ " + (BRANCHES.length && U[r.key] ? elIBy[BASES[r.branch]][1] : "پایگاه") + " را ارتقا دهید.",
    line: () => "صف تولید پر است؛ صبر کنید یا کارخانه را ارتقا دهید.",
    cash: () => "موجودی خزانه کافی نیست.",
  };
  const RWHY = { na: "این یگان تحقیق‌پذیر نیست.", busy: "تحقیق این یگان در حال انجام است.", lab: "آزمایشگاه ندارید.", max: "این یگان به بالاترین سطح رسیده است.",
    cap: "سطح آزمایشگاه اجازه‌ی تحقیق بیشتر را نمی‌دهد؛ آزمایشگاه را ارتقا دهید.", cash: "موجودی خزانه کافی نیست." };

  // ---------------- وضعیت صفحه
  const AR = { d: null, err: "", busy: false, br: "gnd", skew: 0, rl: 0 };
  const arNow = () => Date.now() + AR.skew;
  function arApply(d) {
    AR.d = d; AR.err = ""; AR.skew = d.now * 1000 - Date.now();
    GAME.cash = d.cash; GAME.power = d.power;
  }
  async function load() {
    try { arApply(await cmCall("/api/mil", undefined, localApi)); } catch (e) { AR.err = e.message; }
    if (view === "army") build();
  }
  async function act(path, body, okMsg) {
    if (AR.busy) return;
    AR.busy = true;
    try {
      arApply(await cmCall(path, body, localApi));
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      toast(okMsg);
      ecoLoad();   // خزانه‌ی اقتصاد و زیرساخت هم تازه شود
    } catch (e) { toast(e.message); load(); }
    AR.busy = false; if (view === "army") build();
  }
  function openInfra(cat) { INF.cat = cat; setView("infra"); }

  // ---------------- ساخت صفحه
  function panel(title, big) {
    const p = cmEl("div", "ecpanel"), h = cmEl("div", "inh");
    h.appendChild(title); if (big != null) h.appendChild(cmEl("span", "bg", big));
    p.appendChild(h); return p;
  }
  const bold = (t) => cmEl("b", null, t);
  function unitCard(d, u) {
    const own = u.n > 0, card = cmEl("div", "ecitem " + (own ? "own" : "off") + (u.queue.length ? " bld" : "") + (u.can ? " can" : ""));
    const top = cmEl("div", "top");
    top.appendChild(cmEl("div", "ic", u.icon));
    const mid = cmEl("div", "mid"); mid.appendChild(cmEl("div", "nm", u.name));
    const pips = cmEl("div", "ecpips"); for (let i = 0; i < u.max; i++) pips.appendChild(cmEl("i", i < u.level ? "on" : ""));
    mid.appendChild(pips); top.appendChild(mid);
    const sx = cmEl("div", "st");
    if (own || u.queued) { sx.appendChild(cmEl("b", null, en(u.n))); sx.append(u.queued ? "+ " + en(u.queued) + " در راه" : "یگان"); } else sx.append("ندارید");
    top.appendChild(sx); card.appendChild(top);

    const chips = cmEl("div", "ecchips");
    if (u.dmg) chips.appendChild(cmEl("span", "ecchip", "⚔ آسیب " + en(u.dmg)));
    chips.appendChild(cmEl("span", "ecchip", "🔧 ساخت $" + en(u.cost)));
    if (u.fac.level < 1) chips.appendChild(cmEl("span", "ecchip warn", "🏭 " + u.fac.name + " نداریم"));
    else chips.appendChild(cmEl("span", "ecchip", "⏱ " + bdur(u.secs)));
    if (own) chips.appendChild(cmEl("span", "ecchip", "🔧 نگهداری $" + en(u.upkeep * u.n) + " در روز"));
    card.appendChild(chips);

    u.queue.forEach(q => card.appendChild(timer("🔨 در حال تولید", q.until, q.secs)));
    if (u.research.until) card.appendChild(timer("🔬 تحقیق سطح " + u.research.to, u.research.until, u.research.dur));

    const row = cmEl("div", "aract"), r = u.research;
    const rb = cmEl("button", "arres" + (r.can ? "" : " off")); rb.type = "button";
    rb.textContent = r.why === "na" ? "—" : r.why === "lab" ? "آزمایشگاه ندارید" : r.why === "busy" ? "⏳ در حال تحقیق…" : r.why === "max" ? "حداکثر سطح ✅"
      : r.why === "cap" ? "آزمایشگاه بالاتر لازم است" : "🔬 تحقیق سطح " + r.to + " · $" + en(r.cost);
    rb.onclick = () => r.can ? act("/api/mil/research", { unit: u.key }, "تحقیق شروع شد ✅") : toast(RWHY[r.why] || "");
    const pb = cmEl("button", "arprod" + (u.can ? "" : " off"), "⚙ تولید"); pb.type = "button";
    pb.onclick = () => u.can ? act("/api/mil/produce", { unit: u.key }, "تولید شروع شد ✅") : toast(WHY[u.why](u));
    row.append(rb, pb); card.appendChild(row);
    return card;
  }
  function timer(label, until, secs) {
    const w = cmEl("div", "ecbl"); w.dataset.until = until; w.dataset.secs = secs; w.dataset.ar = "1";
    const t = cmEl("div", "t"); t.append(cmEl("span", null, label), cmEl("span", "r"));
    const bar = cmEl("div", "bar"); bar.appendChild(cmEl("i")); w.append(t, bar); w.style.marginBottom = "4px"; return w;
  }
  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("aavatar"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("acashbar").textContent = "$" + en(GAME.cash);
    const sc = document.scrollingElement, sy0 = sc.scrollTop, body = el("abody"); body.innerHTML = "";
    const box = (t) => body.appendChild(cmEl("div", "rbox dash", t));
    if (!REMOTE) box("📴 حالت محلی: ارتش روی همین گوشی ذخیره و حساب می‌شود؛ با دیگران مشترک نیست.");
    if (!AR.d) { box(AR.err || "در حال بارگذاری ارتش…"); if (!AR.err) load(); return; }
    const d = AR.d;

    // خلاصه‌ی ارتش، آزمایشگاه و پایگاه‌ها
    const t1 = cmEl("span", null); t1.append("🛡 ", bold("ارتش"));
    const q = cmEl("button", "arhelp", "?"); q.type = "button";
    q.onclick = () => toast("هر یگان در کارخانه‌ی خودش ساخته می‌شود و در پایگاه نگهداری می‌شود. آزمایشگاه یگان را قوی‌تر می‌کند اما نگهداری روزانه‌اش گران‌تر است و از خزانه کم می‌شود.");
    const p = panel(t1, en(d.power)); p.firstChild.insertBefore(q, p.firstChild.lastChild);
    const lab = cmEl("div", "arlab"); lab.append(cmEl("span", null, "⚗️ آزمایشگاه"), cmEl("span", "mut", d.lab ? "سطح " + d.lab + " · تحقیق تا سطح " + d.lab_cap : "ساخته نشده"));
    p.appendChild(lab);
    const lk = cmEl("button", "arlink", (d.lab ? "ارتقای آزمایشگاه" : "ساخت آزمایشگاه") + " ‹"); lk.type = "button"; lk.onclick = () => openInfra("str"); p.appendChild(lk);
    const g = cmEl("div", "ingrid");
    [["gnd", "🪖"], ["air", "✈️"], ["sea", "🚢"], ["mis", "🚀"], ["def", "📡"]].forEach(([k, ic]) => {
      const b = d.branches.find(x => x.key === k), bx = cmEl("div", "inbx tap");
      const h = cmEl("div", "ar-h"); h.append(ic + " ", b.base_name);
      bx.append(h, bold(b.base_level ? b.used + "/" + b.cap : "—"), cmEl("div", "mut", b.base_level ? "سطح " + b.base_level : "ساخته نشده"));
      bx.onclick = () => openInfra("mil"); g.appendChild(bx);
    });
    p.appendChild(g); body.appendChild(p);

    // تب شاخه‌ها
    const tabs = cmEl("div", "artabs");
    d.branches.forEach(b => {
      const t = cmEl("button", "artab" + (AR.br === b.key ? " on" : ""), b.name + " " + b.icon); t.type = "button";
      t.onclick = () => { AR.br = b.key; build(); }; tabs.appendChild(t);
    });
    body.appendChild(tabs);

    // قدرت شاخه
    const br = d.branches.find(b => b.key === AR.br), t2 = cmEl("span", null); t2.append(br.icon + " ", bold("قدرتِ این شاخه"));
    const bp = panel(t2, en(br.power));
    bp.appendChild(cmEl("div", "sub", en(br.count) + " یگان" + (br.cap ? " · جا: " + br.used + "/" + br.cap : "")));
    body.appendChild(bp);

    d.units.filter(u => u.branch === AR.br).forEach(u => body.appendChild(unitCard(d, u)));
    body.appendChild(cmEl("div", "arnote", "هر یگان تا پایان تولید اثری ندارد. نگهداری یگان‌ها روزانه از خزانه کم می‌شود: $" + en(d.upkeep) + " در روز. جای خالی در پایگاه و کارخانه‌ی ساخته‌شده لازم است."));
    tick(); sc.scrollTop = sy0;
    const act_ = tabs.querySelector(".on");   // تب فعال همیشه کامل دیده شود (در RTL از لبه‌ی راست بریده نشود)
    if (act_) tabs.scrollLeft += (act_.getBoundingClientRect().left + act_.getBoundingClientRect().right) / 2 - (tabs.getBoundingClientRect().left + tabs.getBoundingClientRect().right) / 2;
  }
  function tick() {
    if (view !== "army" || !AR.d) return;
    document.querySelectorAll("#abody .ecbl[data-ar]").forEach(b => {
      const until = Number(b.dataset.until) * 1000, total = Number(b.dataset.secs) * 1000, rem = Math.max(0, until - arNow());
      b.querySelector(".r").textContent = rem ? dur(rem) : "تمام شد ✅";
      b.querySelector(".bar i").style.width = Math.min(100, (1 - rem / total) * 100) + "%";
      if (!rem && Date.now() - AR.rl > 3000) { AR.rl = Date.now(); load(); }
    });
  }
  setInterval(tick, 1000);

  window.OWArmy = { build, load, F, UNITS, BRANCHES, BASES, K, L: { sync: lSync, save: lSave, view: lView } };   // L: برای بازارِ حالت محلی
})();
;

/* ===== war.js ===== */
/* صفحه‌ی جنگ (آتش‌بس، ساعت جنگ، اعلان جنگ، اخبار، تاریخچه، دکترین). بعد از اسکریپت اصلی index.html
   بارگذاری می‌شود و از همان تابع‌ها و متغیرهای سراسری آن (el, cmEl, toast, byCode, countries, mine,
   GAME, flagNode, dur, setView, …) استفاده می‌کند. فایل را کنار index.html بگذارید.
   با سرور (REMOTE): همه‌چیز از /api/war می‌آید (اعلان جنگ، نبرد، صلح، دکترین، اخبار) و نتیجه‌ی نبرد سمت سرور حساب می‌شود.
   بدون سرور: فقط اعلان جنگ/دکترین روی همین گوشی (localStorage) ذخیره می‌شود و نبرد وجود ندارد. */
(function () {
  "use strict";

  // ---------------- ظاهر
  const CSS = `
  .wrbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px; border-radius: 22px;
    border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .wrbar .go { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 22px; background: rgba(232,196,108,.06); }
  .wrbar b { font-size: 21px; cursor: pointer; }
  .wrbar .money { margin-inline-start: auto; color: var(--gold); font-weight: 700; font-size: 20px; direction: ltr; }
  .wrbar .whelp { flex: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font: inherit; font-size: 18px; color: var(--hint);
    background: none; border: 1.5px solid var(--line); }
  .wcard { display: flex; align-items: center; gap: 14px; padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 1px solid var(--line);
    background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .wcard .wic { flex: none; width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px;
    border: 1px solid var(--line); background: rgba(255,255,255,.05); color: #d9dde6; }
  .wcard .wic.sq { border-radius: 14px; border-width: 2px; }
  .wcard .wtx { flex: 1; min-width: 0; }
  .wcard h4 { font-size: 21px; margin-bottom: 4px; }
  .wcard p { font-size: 16px; line-height: 1.9; color: #c4c8d1; }
  .wcard .wpill { display: inline-block; margin-inline-start: 8px; padding: 4px 14px; border-radius: 999px; font-size: 16px; font-weight: 400;
    background: rgba(255,255,255,.07); color: #d9dde6; direction: rtl; }
  .wcard.ok { border-color: rgba(79,217,160,.45); }
  .wcard.hot { border-color: rgba(255,122,122,.5); }
  .wtabs { display: flex; gap: 6px; padding: 8px; margin: 0 0 14px; border-radius: 26px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
  .wtab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border-radius: 20px; cursor: pointer; font: inherit;
    font-size: 17px; color: var(--hint); background: none; border: 0; }
  .wtab .ti { font-size: 22px; }
  .wtab.on { background: linear-gradient(160deg, #ecc96f, #d9a94f); color: #2a1d00; font-weight: 700; }
  .wpanel { border-radius: 28px; padding: 16px; margin-bottom: 14px; border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .wpanel h3 { display: flex; align-items: center; gap: 10px; font-size: 22px; margin-bottom: 10px; }
  .wpanel .wlead { font-size: 17px; line-height: 2; color: #c4c8d1; margin-bottom: 14px; }
  .wsearch { width: 100%; box-sizing: border-box; margin-bottom: 14px; }
  .wrow { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 12px; border-radius: 22px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
  .wrow .wflag { flex: none; width: 44px; height: 44px; }
  .wrow .wflag .flag { width: 44px; height: 44px; }
  .wrow .wn { flex: 1; min-width: 0; }
  .wrow .wn b { display: block; font-size: 22px; font-weight: 500; }
  .wrow .wn small { display: block; color: var(--hint); font-size: 14px; margin-top: 2px; }
  .wgo { flex: none; padding: 14px 18px; border-radius: 18px; cursor: pointer; font: inherit; font-size: 19px; color: var(--gold);
    background: rgba(150,105,30,.18); border: 2px solid rgba(232,196,108,.55); }
  .wgo.off { opacity: .45; }
  .wgo.at { color: #ff9d8a; border-color: rgba(255,122,122,.5); background: rgba(255,122,122,.08); }
  .wmore { display: block; width: 100%; padding: 12px; font: inherit; font-size: 17px; color: var(--gold); background: none; border: 0; cursor: pointer; }
  .wnote { margin-top: 14px; color: #8b909c; font-size: 15px; line-height: 1.8; }
  .wempty { text-align: center; color: var(--hint); padding: 22px 8px; font-size: 17px; line-height: 2; }
  .wnews { padding: 14px; margin-bottom: 10px; border-radius: 20px; border: 1px solid var(--line); background: rgba(255,255,255,.03); font-size: 17px; line-height: 1.9; }
  .wnews small { display: block; color: var(--hint); font-size: 14px; margin-top: 2px; }
  .wdoc { display: flex; align-items: center; gap: 12px; padding: 14px; margin-bottom: 12px; border-radius: 22px; cursor: pointer; border: 2px solid var(--line);
    background: rgba(255,255,255,.03); }
  .wdoc .wi { flex: none; font-size: 30px; }
  .wdoc b { display: block; font-size: 20px; }
  .wdoc p { font-size: 15.5px; line-height: 1.8; color: #b3b6bd; }
  .wdoc.on { border-color: rgba(232,196,108,.8); background: rgba(232,196,108,.08); box-shadow: 0 0 16px rgba(232,196,108,.15); }

  .wfront { padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 1px solid var(--line); background: rgba(255,255,255,.03); }
  .wfront .wtop { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .wfront .wtop .flag { width: 44px; height: 44px; }
  .wfront .wtop b { display: block; font-size: 22px; font-weight: 500; }
  .wfront .wtop small { display: block; color: var(--hint); font-size: 14px; margin-top: 2px; }
  .wprog { margin: 8px 0 12px; }
  .wprog .wl { display: flex; justify-content: space-between; font-size: 15px; color: #c4c8d1; margin-bottom: 5px; }
  .wprog .wb { height: 10px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
  .wprog .wb i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #d9a94f, #ecc96f); }
  .wprog.en .wb i { background: linear-gradient(90deg, #c0392b, #ff7a7a); }
  .wwhy { font-size: 15.5px; line-height: 1.8; color: #ff9d8a; margin-bottom: 10px; }
  .wacts { display: flex; gap: 10px; }
  .wact { flex: 1; padding: 14px 8px; border-radius: 18px; cursor: pointer; font: inherit; font-size: 19px; font-weight: 700; text-align: center;
    color: #ff9d8a; background: rgba(255,122,122,.08); border: 2px solid rgba(255,122,122,.5); }
  .wact.peace { color: #4fd9a0; background: rgba(79,217,160,.1); border-color: rgba(79,217,160,.5); }
  .wact.off { opacity: .45; }
  .wchips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
  .wchip { padding: 10px 16px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 17px; color: var(--hint); background: none; border: 2px solid var(--line); }
  .wchip.on { color: #2a1d00; font-weight: 700; background: linear-gradient(160deg, #ecc96f, #d9a94f); border-color: #ecc96f; }
  .wchip.off { opacity: .4; cursor: not-allowed; }
  .wrep { padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 2px solid var(--line); background: rgba(255,255,255,.04); font-size: 17px; line-height: 2; }
  .wrep.win { border-color: rgba(79,217,160,.6); }
  .wrep.lose { border-color: rgba(255,122,122,.6); }
  .wrep h4 { font-size: 22px; margin-bottom: 6px; }
  .wrep .wx { float: left; cursor: pointer; color: var(--hint); font-size: 20px; }
  .wtag { display: inline-block; margin-inline-start: 6px; padding: 2px 10px; border-radius: 999px; font-size: 13px; background: rgba(255,255,255,.08); color: #d9dde6; }
  .wtag.gold { color: var(--gold); background: rgba(232,196,108,.12); }
  .wtag.red { color: #ff9d8a; background: rgba(255,122,122,.1); }
  .wmul { font-size: 14px; color: var(--hint); margin-top: 4px; }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  // ---------------- ثابت‌ها
  const PAGE = 30;
  const DOCS = [
    ["aggr", "⚔️", "تهاجمی", "فشار و حمله‌ی سریع؛ مناسب کشورهای قوی با ارتش بزرگ."],
    ["def", "🛡️", "تدافعی", "حفظ خاک و پایتخت و دفاع پایدار؛ مناسب کشورهای کم‌قدرت‌تر."],
    ["bal", "⚖️", "متوازن", "ترکیبی از حمله و دفاع؛ انتخاب پیش‌فرض."],
    ["eco", "💰", "اقتصاد جنگی", "اولویت با خزانه و تولید؛ غنیمت بیشتر و تلفات کمتر، ولی حمله ضعیف‌تر."],
  ];
  const BR = { gnd: ["زمینی", "🪖"], air: ["هوایی", "✈️"], sea: ["دریایی", "🚢"], mis: ["موشکی", "🚀"] };
  const WHY = {
    hours: "الان آتش‌بس روزانه است؛ نبرد فقط در ساعت جنگ ممکن است.",
    start: "آتش‌بس آغاز فصل هنوز تمام نشده است.",
    protected: "این کشور بعد از تسخیر در حمایت موقت است.",
  };
  const REASON = { conquest: "تسخیر", peace: "صلح", gone: "خروج بازیکن" };
  const R = () => typeof REMOTE !== "undefined" && REMOTE;
  
  const TABS_L = [["declare", "⚔️", "اعلان جنگ"], ["news", "📰", "اخبار"], ["hist", "📄", "تاریخچه"], ["doc", "🎯", "دکترین"]];

  // ---------------- وضعیت
  const WS = { tab: null, q: "", shown: PAGE, st: null, sv: null, recv: 0, skew: 0, err: "", busy: false, atk: null, report: null, reloading: 0 };
  const tabs = () => TABS_L;   // همیشه همین ۴ تب؛ جبهه‌های فعال بالای تب «اعلان جنگ» می‌آیند
  const curTab = () => { const t = tabs(); return t.some(x => x[0] === WS.tab) ? WS.tab : t[0][0]; };
  const LK = () => "ow_war_" + (typeof season === "undefined" || season === null ? "x" : season) + "_" + (mine || "");
  function load() {   // حالت محلی
    if (WS.st) return WS.st;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(LK()) || "null"); } catch (e) { /* خالی */ }
    WS.st = s && typeof s === "object" ? s : {};
    WS.st.wars = WS.st.wars || []; WS.st.news = WS.st.news || []; WS.st.doctrine = WS.st.doctrine || "bal";
    return WS.st;
  }
  function save() { try { localStorage.setItem(LK(), JSON.stringify(WS.st)); } catch (e) { /* پر یا بسته */ } }

  // ---------------- سرور
  function apply(d) {
    WS.sv = d; WS.recv = Date.now(); WS.skew = d.now * 1000 - Date.now(); WS.err = "";
  }
  async function sLoad() {
    if (!R()) return;
    try { apply(await cmApi("/api/war")); } catch (e) { WS.err = e.message; }
    if (view === "war") { drawStatus(); drawPane(); }
  }
  async function act(path, body, okMsg, after) {
    if (WS.busy) return;
    WS.busy = true;
    try {
      const d = await cmApi(path, body);
      if (d.state) { apply(d.state); if (after) after(d); } else apply(d);
      if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
      if (okMsg) toast(okMsg);
      if (typeof ecoLoad === "function") ecoLoad();   // خزانه و ارتش هم تازه شوند
    } catch (e) { toast(e.message); sLoad(); }
    WS.busy = false;
    if (view === "war") { drawStatus(); drawPane(); }
  }

  // ---------------- زمان
  function tehran(now) {
    try {
      const p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).formatToParts(new Date(now));
      const g = (t) => Number(p.find(x => x.type === t).value) % 24;
      return { h: g("hour"), m: g("minute"), s: g("second") };
    } catch (e) { const d = new Date(now); return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }; }
  }
  function wHours() {
    const v = WS.sv;
    return v ? [v.war_from, v.war_to] : [DAILY_CEASEFIRE_END, 24];
  }
  function timing(now) {
    const v = WS.sv;
    if (R() && v) {   // ساعت سرور (با گذشتِ زمان از آخرین پاسخ)
      const el_ = now - WS.recv, left = v.toggle_in * 1000 - el_;
      const inWar = left > 0 ? v.in_war : !v.in_war;
      if (left <= 0 && Date.now() - WS.reloading > 5000) { WS.reloading = Date.now(); sLoad(); }
      return { inWar, untilMs: Math.max(0, left), startCf: Math.max(0, v.start_left * 1000 - el_) };
    }
    const t = tehran(now), sec = t.h * 3600 + t.m * 60 + t.s, [F, T] = wHours();
    const inWar = t.h >= F && t.h < T;
    const untilMs = (inWar ? T * 3600 - sec : ((F * 3600 - sec) % 86400 + 86400) % 86400) * 1000;
    const started = endsAt ? endsAt - SD * 86400000 : 0;
    const startCf = started ? Math.max(0, started + START_CEASEFIRE_DAYS * 86400000 - now) : 0;
    return { inWar, untilMs, startCf };
  }
  const nf = (n) => Number(n).toLocaleString("en-US");
  const fmtT = (ts) => new Date(ts).toLocaleString("fa", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const srvNow = () => Date.now() + WS.skew;

  // ---------------- ساخت صفحه
  function wcard(cls, ic, title, text, extra) {
    const c = cmEl("div", "wcard " + (cls || ""));
    const i = cmEl("div", "wic" + (extra && extra.sq ? " sq" : ""), ic);
    const tx = cmEl("div", "wtx"), h = cmEl("h4", null, title), p = cmEl("p", null, text);
    if (extra && extra.pill) h.appendChild(cmEl("span", "wpill", extra.pill));
    tx.append(h, p); c.append(tx, i);   // در RTL آیکن سمت راست می‌افتد
    return c;
  }
  function drawStatus() {
    const box = el("wstat"); if (!box) return;
    const T = timing(Date.now()), [F, TO] = wHours(); box.innerHTML = "";
    if (R() && WS.err && !WS.sv) { box.appendChild(wcard("hot", "⚠️", "خطا در اتصال", WS.err)); return; }
    if (T.inWar) box.appendChild(wcard("hot", "⚔️", "ساعت جنگ", "نبرد آزاد است، فرمانده.", { pill: "اکنون" }));
    else box.appendChild(wcard("ok", "⚖️", "آتش‌بس روزانه", "تا ساعت جنگ نبردی درنمی‌گیرد، فرمانده."));
    if (T.startCf > 0) {
      const d = dur(T.startCf);
      box.appendChild(wcard("", "🕒", "آغاز فصل", "اعلان جنگ " + d + " دیگر باز می‌شود. بازار جهانی " + d + " دیگر باز می‌شود.", { sq: true }));
    }
    const remOn = !!(R() && WS.sv && WS.sv.remind);
    const rem = wcard("", remOn ? "🔔" : T.inWar ? "⏳" : "☐", "ساعت جنگ",
      dur(T.untilMs) + (T.inWar ? " تا پایان ساعت جنگ" : " تا شروع ساعت جنگ") + (remOn ? " · یادآوری روشن" : " · برای یادآوری بزنید"),
      { sq: true, pill: F + ":00 تا " + (TO % 24) + ":00" });
    rem.style.cursor = "pointer";
    rem.onclick = () => {
      if (!R()) { toast("یادآوری فقط در حالت آنلاین کار می‌کند."); return; }
      act("/api/war/remind", { on: !remOn }, remOn ? "یادآوری خاموش شد" : "یادآوری روشن شد 🔔 اول ساعت جنگ پیام می‌گیرید");
    };
    box.appendChild(rem);
    const v = WS.sv;
    if (R() && v && v.damage && (v.damage.pwr > 0 || v.damage.eco > 0))
      box.appendChild(wcard("hot", "💥", "خسارت جنگی", "شبکه‌ی برق " + v.damage.pwr + "٪ و اقتصاد " + v.damage.eco + "٪ آسیب دیده؛ درآمد کم می‌شود. هر ساعت حدود " + v.damage.repair_per_hour + "٪ ترمیم می‌شود."));
    if (R() && v && v.protected_until * 1000 > srvNow())
      box.appendChild(wcard("ok", "🛡️", "حمایت موقت", "کشور شما بعد از تسخیر تا " + dur(v.protected_until * 1000 - srvNow()) + " دیگر در امان است."));
  }
  function drawTabs() {
    const bar = el("wtabs"); bar.innerHTML = ""; const cur = curTab();
    tabs().forEach(([k, ic, nm]) => {
      const b = cmEl("button", "wtab" + (cur === k ? " on" : "")); b.type = "button";
      b.append(cmEl("span", "ti", ic), cmEl("span", null, nm));
      b.onclick = () => { WS.tab = k; WS.q = ""; WS.shown = PAGE; WS.atk = null; drawTabs(); drawPane(); };
      bar.appendChild(b);
    });
  }

  // --- فهرست هدف‌ها
  function candidates() {
    const q = norm(WS.q || "");
    if (R()) {
      const rows = ((WS.sv && WS.sv.targets) || []).map(t => ({ c: byCode[t.code], nb: t.neighbor, t })).filter(x => x.c && (!q || norm(x.c.name).includes(q)));
      return rows.sort((a, b) => (b.nb - a.nb) || a.c.name.localeCompare(b.c.name, "fa"));
    }
    const nb = ((typeof NEIGHBORS !== "undefined" && NEIGHBORS[mine]) || "").split(" ").filter(Boolean);
    const has = (c) => (typeof counts !== "undefined" && counts[c.code] > 0) || c.n > 0;
    return countries.filter(c => c.code !== mine && has(c) && (!q || norm(c.name).includes(q)))
      .sort((a, b) => (nb.includes(b.code) - nb.includes(a.code)) || a.name.localeCompare(b.name, "fa"))
      .map(c => ({ c, nb: nb.includes(c.code), t: null }));
  }
  function declare(c) {
    const T = timing(Date.now());
    if (T.startCf > 0) { toast("اعلان جنگ تا پایان آتش‌بس آغاز فصل باز نمی‌شود."); return; }
    const msg = "به " + c.name + " اعلان جنگ می‌کنید؟ جنگ با یک کشور، جنگ با همه‌ی خاک‌های زیر فرمان آن است.";
    let go;
    if (R()) {
      go = () => act("/api/war/declare", { code: c.code }, "اعلان جنگ به " + c.name + " ثبت شد ⚔️", () => { WS.tab = "declare"; drawTabs(); });
    } else {
      const S = load();
      if (S.wars.some(w => w.code === c.code)) { toast("با " + c.name + " در جنگ هستید."); return; }
      go = () => {
        S.wars.unshift({ code: c.code, t: Date.now() });
        S.news.unshift({ t: Date.now(), text: "شما به " + c.name + " اعلان جنگ کردید ⚔️" });
        save();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("warning");
        toast("اعلان جنگ به " + c.name + " ثبت شد ⚔️");
        drawPane();
      };
    }
    const m2 = msg.length > 250 ? msg.slice(0, 247) + "…" : msg;   // سقف ۲۵۶ نویسه‌ی تلگرام
    try { if (tg.showConfirm) tg.showConfirm(m2, (ok) => { if (ok) go(); }); else if (window.confirm(m2)) go(); }
    catch (e) { if (window.confirm(m2)) go(); }
  }
  function atWar(code) {
    return R() ? !!(WS.sv && WS.sv.wars.some(w => w.code === code)) : load().wars.some(w => w.code === code);
  }
  const q_empty = () => (WS.q ? "کشوری پیدا نشد." : "فعلاً کشور دیگری بازیکن ندارد.");
  function drawList() {
    const box = el("wlist"); if (!box) return; box.innerHTML = "";
    const T = timing(Date.now()), all = candidates();
    if (!all.length) { box.appendChild(cmEl("div", "wempty", q_empty())); return; }
    all.slice(0, WS.shown).forEach(({ c, nb, t }) => {
      const row = cmEl("div", "wrow"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn");
      fl.appendChild(flagNode(c));
      const cap = capitalOf(c.code), bits = [];
      if (nb) bits.push("همسایه");
      if (cap) bits.push("پایتخت: " + cap);
      if (t && t.power != null) bits.push("قدرت: " + nf(t.power));
      n.append(cmEl("b", null, c.name), cmEl("small", null, bits.join(" · ")));
      const prot = t && t.protected_until * 1000 > srvNow();
      const at = atWar(c.code);
      const b = cmEl("button", "wgo" + (at ? " at" : (T.startCf > 0 || prot) ? " off" : ""), at ? "در جنگ ⚔" : prot ? "در حمایت 🛡" : "اعلان جنگ ⚔"); b.type = "button";
      b.onclick = () => { if (prot) toast(c.name + " فعلاً در حمایت است."); else if (at) toast("با " + c.name + " در جنگ هستید."); else declare(c); };
      row.append(fl, n, b); box.appendChild(row);
    });
    if (all.length > WS.shown) {
      const m = cmEl("button", "wmore", "نمایش بیشتر (" + (all.length - WS.shown) + ") ‹"); m.type = "button";
      m.onclick = () => { WS.shown += PAGE; drawList(); }; box.appendChild(m);
    }
  }

  // --- جبهه‌ها (فقط با سرور)
  const lossText = (loss, names) => {
    const k = Object.keys(loss || {});
    return k.length ? k.map(x => (names && names[x] || x) + " ×" + nf(loss[x])).join("، ") : "بدون تلفات";
  };
  function drawReport(p) {
    const r = WS.report; if (!r) return;
    const box = cmEl("div", "wrep " + (r.win ? "win" : "lose"));
    const x = cmEl("span", "wx", "✕"); x.onclick = () => { WS.report = null; drawPane(); };
    const en = byCode[r.enemy], nm = en ? en.name : r.enemy;
    box.append(x, cmEl("h4", null, r.conquered ? "🏴 پایتخت " + nm + " تسخیر شد!" : r.win ? "✅ پیروزی در برابر " + nm : "❌ عقب‌نشینی از " + nm));
    box.appendChild(cmEl("div", null, "قدرت شما: " + nf(r.a_power) + " — قدرت دشمن: " + nf(r.d_power)));
    if (r.air_cut) box.appendChild(cmEl("div", null, "پدافند دشمن " + Math.round(r.air_cut * 100) + "٪ از حمله‌ی هوایی و موشکی را رهگیری کرد."));
    if (r.win && !r.conquered) box.appendChild(cmEl("div", null, "پیشروی: +" + r.prog + "٪ (جمع: " + r.progress + "٪)"));
    if (r.conquered) box.appendChild(cmEl("div", null, "غنیمت: $" + nf(r.loot)));
    box.appendChild(cmEl("div", null, "تلفات شما: " + lossText(r.a_loss, r.loss_names && r.loss_names.a)));
    box.appendChild(cmEl("div", null, "تلفات دشمن: " + lossText(r.d_loss, r.loss_names && r.loss_names.d)));
    const dg = r.damage;
    if (dg && (dg.pwr > 0 || dg.eco > 0) && dg.total)
      box.appendChild(cmEl("div", null, "خسارت به زیرساخت دشمن: برق −" + dg.pwr + "٪، اقتصاد −" + dg.eco + "٪ (جمع: برق " + dg.total.pwr + "٪، اقتصاد " + dg.total.eco + "٪)"));
    p.appendChild(box);
  }
  function progBar(label, val, enemy) {
    const w = cmEl("div", "wprog" + (enemy ? " en" : "")), l = cmEl("div", "wl"), b = cmEl("div", "wb"), i = cmEl("i");
    l.append(cmEl("span", null, label), cmEl("span", null, Math.round(val) + "٪"));
    i.style.width = Math.max(0, Math.min(100, val)) + "%"; b.appendChild(i); w.append(l, b); return w;
  }
  function whyOf(w, T) {
    if (!T.inWar) return WHY.hours;
    if (T.startCf > 0) return WHY.start;
    if (w.why === "protected") return WHY.protected;
    return "";
  }
  function cdLeft(w) { return w.cooldown_until * 1000 - srvNow(); }
  function attackBox(w, c) {
    const A = WS.atk, box = cmEl("div");
    box.appendChild(cmEl("div", "wlead", "شاخه‌های حمله را انتخاب کنید:"));
    const chips = cmEl("div", "wchips");
    Object.keys(BR).forEach(k => {
      const off = k === "gnd" && !w.neighbor;
      const ch = cmEl("button", "wchip" + (A.sel.has(k) && !off ? " on" : "") + (off ? " off" : ""), BR[k][1] + " " + BR[k][0] + (off ? " (فقط همسایه)" : "")); ch.type = "button";
      ch.onclick = () => { if (off) { toast("نیروی زمینی فقط به کشورهای همسایه می‌رسد."); return; } if (A.sel.has(k)) A.sel.delete(k); else A.sel.add(k); drawPane(); };
      chips.appendChild(ch);
    });
    box.appendChild(chips);
    const acts = cmEl("div", "wacts");
    const go = cmEl("button", "wact", "شروع نبرد ⚔️"); go.type = "button";
    go.onclick = () => {
      const br = [...A.sel].filter(k => !(k === "gnd" && !w.neighbor));
      if (!br.length) { toast("حداقل یک شاخه انتخاب کنید."); return; }
      WS.atk = null;
      act("/api/war/attack", { war: w.id, branches: br }, null, (d) => { WS.report = d.report; });
    };
    const cancel = cmEl("button", "wact peace", "انصراف"); cancel.type = "button";
    cancel.onclick = () => { WS.atk = null; drawPane(); };
    acts.append(go, cancel); box.appendChild(acts); return box;
  }
  function drawFronts(pane) {
    const v = WS.sv, T = timing(Date.now());
    if (!v) return;
    drawReport(pane);
    if (!v.wars.length) return;
    const p = cmEl("div", "wpanel"), h = cmEl("h3"); h.append("⚔️ ", "جبهه‌های فعال " + nf(v.wars.length) + " از " + nf(v.max_wars)); p.appendChild(h);
    v.wars.forEach(w => {
      const c = byCode[w.code]; if (!c) return;
      const f = cmEl("div", "wfront"), top = cmEl("div", "wtop"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn");
      fl.appendChild(flagNode(c));
      const sub = cmEl("small", null, "شروع: " + fmtT(w.ts * 1000) + (w.declared_by_me ? " · شما اعلان کردید" : " · دشمن اعلان کرد"));
      const nm = cmEl("b", null, c.name); if (w.neighbor) nm.appendChild(cmEl("span", "wtag gold", "همسایه"));
      n.append(nm, sub); top.append(fl, n); f.appendChild(top);
      f.append(progBar("پیشروی شما به پایتخت", w.progress, false), progBar("پیشروی دشمن به پایتخت شما", w.enemy_progress, true));
      const why = whyOf(w, T), cd = cdLeft(w);
      if (why) f.appendChild(cmEl("div", "wwhy", why));
      else if (cd > 0) { const d = cmEl("div", "wwhy", "نیروها در حال آماده‌سازی‌اند: " + dur(cd)); d.dataset.cd = String(w.cooldown_until * 1000); f.appendChild(d); }
      if (WS.atk && WS.atk.war === w.id) f.appendChild(attackBox(w, c));
      else {
        const acts = cmEl("div", "wacts");
        const ok = !why && cd <= 0;
        const at = cmEl("button", "wact" + (ok ? "" : " off"), "حمله ⚔️"); at.type = "button";
        at.onclick = () => {
          if (why) { toast(why); return; }
          if (cdLeft(w) > 0) { toast("نیروها هنوز آماده نیستند."); return; }
          WS.atk = { war: w.id, sel: new Set(Object.keys(BR).filter(k => k !== "gnd" || w.neighbor)) }; drawPane();
        };
        const pc = w.peace, early = srvNow() < pc.after * 1000;
        const pb = cmEl("button", "wact peace" + (early || pc.mine ? " off" : ""), pc.theirs ? "پذیرش صلح 🕊" : pc.mine ? "پیشنهاد صلح ارسال شد" : "پیشنهاد صلح 🕊"); pb.type = "button";
        pb.onclick = () => {
          if (early) { toast("پیشنهاد صلح تا " + dur(pc.after * 1000 - srvNow()) + " دیگر ممکن نیست."); return; }
          if (pc.mine) { toast("منتظر پاسخ " + c.name + " هستید."); return; }
          act("/api/war/peace", { war: w.id }, pc.theirs ? "جنگ با صلح پایان یافت 🕊" : "پیشنهاد صلح فرستاده شد 🕊");
        };
        acts.append(at, pb); f.appendChild(acts);
      }
      p.appendChild(f);
    });
    pane.appendChild(p);
  }

  // --- تب‌های دیگر
  function newsRows(list, p) {
    if (!list.length) p.appendChild(cmEl("div", "wempty", "هنوز خبری از جبهه‌ها نیست، فرمانده."));
    list.slice(0, 50).forEach(n => { const d = cmEl("div", "wnews", n.text); d.appendChild(cmEl("small", null, fmtT(n.t))); p.appendChild(d); });
  }
  function histRows(p) {
    if (R()) {
      const hs = (WS.sv && WS.sv.history) || [];
      if (!hs.length) p.appendChild(cmEl("div", "wempty", "هنوز جنگی تمام نشده است."));
      hs.forEach(w => {
        const c = byCode[w.code]; if (!c) return;
        const row = cmEl("div", "wrow"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn"), nm = cmEl("b", null, c.name);
        nm.appendChild(cmEl("span", "wtag " + (w.result === "win" ? "gold" : w.result === "lose" ? "red" : ""), w.result === "win" ? "پیروزی" : w.result === "lose" ? "شکست" : "بدون برنده"));
        fl.appendChild(flagNode(c));
        n.append(nm, cmEl("small", null, (REASON[w.reason] || "پایان") + " · " + nf(w.battles) + " نبرد · " + fmtT(w.ended_ts * 1000)));
        row.append(fl, n); p.appendChild(row);
      });
      return;
    }
    const S = load();
    if (!S.wars.length) p.appendChild(cmEl("div", "wempty", "هنوز با هیچ کشوری وارد جنگ نشده‌اید."));
    S.wars.forEach(w => {
      const c = byCode[w.code]; if (!c) return;
      const row = cmEl("div", "wrow"), fl = cmEl("div", "wflag"), n = cmEl("div", "wn");
      fl.appendChild(flagNode(c)); n.append(cmEl("b", null, c.name), cmEl("small", null, "اعلان جنگ: " + fmtT(w.t) + " · در جریان"));
      row.append(fl, n); p.appendChild(row);
    });
  }
  function drawDoctrine(p) {
    const cur = R() ? (WS.sv ? WS.sv.doctrine.key : "bal") : load().doctrine;
    const mul = {}; if (R() && WS.sv) WS.sv.doctrine.list.forEach(d => { mul[d.key] = d; });
    DOCS.forEach(([k, ic, nm, ds]) => {
      const d = cmEl("div", "wdoc" + (cur === k ? " on" : "")), t = cmEl("div"), b = cmEl("b", null, nm);
      t.append(b, cmEl("p", null, ds));
      const m = mul[k];
      if (m) t.appendChild(cmEl("div", "wmul", "حمله ×" + m.atk + " · دفاع ×" + m.def + " · غنیمت ×" + m.loot + " · تلفات ×" + m.loss));
      d.append(cmEl("span", "wi", ic), t);
      d.onclick = () => {
        if (k === cur) return;
        if (R()) {
          const at = WS.sv && WS.sv.doctrine.can_change_at * 1000;
          if (at && srvNow() < at) { toast("دکترین را " + dur(at - srvNow()) + " دیگر می‌شود عوض کرد."); return; }
          act("/api/war/doctrine", { doctrine: k }, "دکترین «" + nm + "» انتخاب شد");
        } else { load().doctrine = k; save(); toast("دکترین «" + nm + "» انتخاب شد"); drawPane(); }
      };
      p.appendChild(d);
    });
    if (R()) p.appendChild(cmEl("div", "wnote", "دکترین بر قدرت حمله و دفاع، غنیمت و تلفات هر نبرد اثر می‌گذارد و هر ۱۲ ساعت یک بار قابل تغییر است."));
    else p.appendChild(cmEl("div", "wnote", "📴 حالت محلی: دکترین فقط روی همین گوشی ذخیره می‌شود و اثری ندارد."));
  }
  function drawPane() {
    const pane = el("wpane"); pane.innerHTML = ""; const tab = curTab();
    if (tab === "declare") {
      if (R()) drawFronts(pane);
      const p = cmEl("div", "wpanel"), h = cmEl("h3"); h.append("⚔️ ", "اعلان جنگ");
      p.append(h, cmEl("div", "wlead", "برای تسخیر یک کشور، اول به آن اعلان جنگ کنید، فرمانده. جنگ با یک کشور، جنگ با همه‌ی خاک‌های زیر فرمان آن است. با متحد یا طرف پیمان، اول پیمان را در دیپلماسی بشکنید." + (R() ? " فقط کشورهای دارای بازیکن در فهرست‌اند و هر بازیکن حداکثر " + ((WS.sv && WS.sv.max_wars) || 3) + " جنگ هم‌زمان دارد." : "")));
      const q = cmEl("input", "search wsearch"); q.type = "search"; q.placeholder = "🔍 جستجوی کشور…"; q.autocomplete = "off"; q.value = WS.q;
      q.oninput = () => { WS.q = q.value; WS.shown = PAGE; drawList(); };
      p.appendChild(q); p.appendChild(cmEl("div", null)).id = "wlist";
      if (!R()) p.appendChild(cmEl("div", "wnote", "📴 حالت محلی: اعلان‌های جنگ فقط روی همین گوشی ذخیره می‌شوند و نبردی انجام نمی‌شود."));
      pane.appendChild(p); drawList();
      return;
    }
    const p = cmEl("div", "wpanel"), h = cmEl("h3");
    if (tab === "news") { h.append("📰 ", "اخبار جنگ"); p.appendChild(h); newsRows(R() ? ((WS.sv && WS.sv.news) || []).map(n => ({ t: n.ts * 1000, text: n.text })) : load().news, p); }
    else if (tab === "hist") { h.append("📄 ", "تاریخچه‌ی جنگ‌ها"); p.appendChild(h); histRows(p); }
    else { h.append("🎯 ", "دکترین نظامی"); p.appendChild(h); p.appendChild(cmEl("div", "wlead", "شیوه‌ی جنگیدن کشورتان را انتخاب کنید.")); drawDoctrine(p); }
    pane.appendChild(p);
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("wavatar"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("wcash").textContent = "$" + nf(GAME.cash);
    drawStatus(); drawTabs(); drawPane();
    if (R()) sLoad();
  }
  let polls = 0;
  function tick() {
    if (view !== "war") { polls = 0; return; }
    drawStatus();
    if (R()) {
      if (++polls % 20 === 0 && !WS.atk) sLoad();   // هر ~۲۰ ثانیه وضعیت تازه می‌شود
      document.querySelectorAll("[data-cd]").forEach(d => {   // شمارش معکوس آمادگی نیروها
        const left = Number(d.dataset.cd) - srvNow();
        if (left <= 0) drawPane(); else d.textContent = "نیروها در حال آماده‌سازی‌اند: " + dur(left);
      });
    }
  }
  setInterval(tick, 1000);

  // ---------------- اتصال دکمه‌ها
  el("wavatar").onclick = () => setView("map");
  el("wcup").onclick = () => setView("rank");
  el("wbell").onclick = () => setView("notif");
  el("wgoal").onclick = () => openGoals();
  el("wback").onclick = () => setView("home");
  el("wtitle").onclick = () => setView("home");
  el("whelp").onclick = () => { const [F, T] = wHours(); toast("اعلان جنگ فقط بعد از آتش‌بس آغاز فصل ممکن است و نبردها فقط در ساعت جنگ (" + F + ":00 تا " + (T % 24) + ":00 به وقت تهران) انجام می‌شوند."); };

  window.OWWar = { build };
})();
;

/* ===== shop.js ===== */
/* صفحه‌ی فروشگاه (مثل عکس: نوار پول، توضیح کوتاه، و کارت هر بسته). بعد از اسکریپت اصلی index.html بارگذاری می‌شود.
   فعلاً هیچ بسته‌ای در فروشگاه نیست؛ برای اضافه‌کردن یک بسته فقط یک ردیف به CATALOG زیر اضافه کنید.
   نکته‌ی طراحی: هرچه با پول واقعی خریده می‌شود باید به حساب بازیکن وصل باشد (ظاهر، اشتراک، …) نه به کشور،
   تا با فتح‌شدن کشور از بین نرود. پرداخت هنوز وصل نیست؛ وقتی بسته‌ای اضافه شد، تابع pay() را به پرداخت واقعی وصل کنید. */
(function () {
  "use strict";

  // ---------------- فهرست بسته‌ها (فعلاً خالی)
  // هر مورد: { id: "vip", icon: "👑", title: "اشتراک VIP", desc: "توضیح کوتاه", price: 380000, tier: "gold" | "hex" | "coin",
  //            details: "توضیح کامل که بعد از لمس نشان داده می‌شود" }
  const CATALOG = [
    { id: "worker", icon: "👷", title: "کارگر", desc: "ساخت‌وساز فقط با کارگر ممکن است؛ هر کارگر هم‌زمان یک ساخت را انجام می‌دهد.", price: null, tier: "gold",   // قیمت را سرور می‌دهد (loadOrder)؛ تا نرسیده null است و خرید بسته است
      details: "یک کارگر به حساب شما اضافه می‌شود. برای ساخت و ارتقای زیرساخت یا بخش اقتصادی کارگر لازم است؛ هر کارگر تا پایان ساختِ خودش مشغول می‌ماند و بعد آزاد می‌شود. هر چه بیشتر بخرید، ساخت‌های هم‌زمان بیشتری دارید. هر حساب از ابتدا یک کارگر رایگان دارد و فقط ۴ کارگر دیگر قابل خرید است (حداکثر ۵ کارگر)." },
  ];

  const CSS = `
  .shbar { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 14px; border-radius: 22px;
    border: 1px solid var(--line); background: linear-gradient(160deg, var(--card-2), var(--card)); }
  .shbar .go { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--gold); color: var(--gold); cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 22px; background: rgba(232,196,108,.06); }
  .shbar b { font-size: 21px; cursor: pointer; }
  .shbar .money { margin-inline-start: auto; color: var(--gold); font-weight: 700; font-size: 20px; direction: ltr; }
  .shlead { font-size: 18px; line-height: 2; color: #c4c8d1; margin: 0 2px 16px; }
  .shitem { display: flex; align-items: center; gap: 14px; padding: 16px; margin-bottom: 14px; border-radius: 24px; cursor: pointer;
    border: 2px solid rgba(232,196,108,.55); background: linear-gradient(160deg, rgba(150,105,30,.22), var(--card)); }
  .shitem .shic { flex: none; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px;
    border: 1px solid rgba(232,196,108,.55); background: rgba(232,196,108,.08); }
  .shitem.hex .shic { border-radius: 18px; }
  .shitem .shtx { flex: 1; min-width: 0; }
  .shitem h4 { font-size: 22px; margin-bottom: 4px; color: var(--gold); }
  .shitem p { font-size: 16px; line-height: 1.8; color: #c4c8d1; }
  .shitem .shpr { flex: none; font-size: 20px; font-weight: 700; color: #f1e3b8; white-space: nowrap; }
  .shorder { padding: 16px; margin-bottom: 14px; border-radius: 24px; border: 2px solid rgba(232,196,108,.55); background: rgba(232,196,108,.07); font-size: 17px; line-height: 2; color: #e6e8ee; }
  .shorder h4 { font-size: 21px; color: var(--gold); margin-bottom: 4px; }
  .shorder .shcard { direction: ltr; text-align: center; font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #f1e3b8; margin: 6px 0; cursor: pointer; }
  .shorder .shnote { font-size: 15px; color: var(--hint); }
  .shorder.bad { border-color: rgba(220,90,90,.6); background: rgba(220,90,90,.07); }
  .shempty { text-align: center; color: var(--hint); padding: 40px 12px; font-size: 18px; line-height: 2.1; border-radius: 24px;
    border: 1px dashed var(--line); background: rgba(255,255,255,.02); }
  .shempty .shbig { font-size: 44px; display: block; margin-bottom: 8px; }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  const nf = (n) => Number(n).toLocaleString("en-US");

  // پرداخت کارت‌به‌کارت: «کارگر» سفارش می‌شود، کاربر واریز می‌کند و عکس رسید را برای ربات می‌فرستد؛
  // ادمین در ربات تأیید می‌کند و کارگر روی سرور اضافه می‌شود. TEST_MODE=true فقط برای آزمایش (خرید بدون پرداخت).
  const TEST_MODE = false;
  if (TEST_MODE) CATALOG[0].price = 50000;   // در حالت آزمایشی سروری برای قیمت نیست
  let ORDERS = [];   // سفارش‌های باز و ردشده‌ی اخیر کاربر (از سرور؛ چند سفارش هم‌زمان ممکن است)
  const needServer = async () => { throw new Error("خرید فقط با اتصال به سرور ممکن است."); };
  async function pay(item) {
    if (item.price == null) { toast("قیمت هنوز از سرور نرسیده است ⏳"); return; }
    if (item.id === "worker" && typeof ECO !== "undefined" && ECO.d && ECO.d.workers && ECO.d.workers.total >= 5) { toast("به حداکثر ۵ کارگر رسیده‌اید 👷"); return; }
    if (item.id !== "worker") { toast("این مورد هنوز قابل خرید نیست 🚧"); return; }
    try {
      if (TEST_MODE) {
        const d = await cmCall("/api/shop/buy", { item: item.id }, ecoLocal);
        ecoApply(d);
        toast("کارگر خریداری شد 👷 (حالت آزمایشی؛ پرداخت وصل نیست)");
      } else {
        const r = await cmCall("/api/shop/order", { item: item.id }, needServer);
        ORDERS = ORDERS.concat([r.order]);
        toast("سفارش ثبت شد؛ مشخصات کارت را ببینید 💳");
      }
    } catch (e) { toast(e.message); }
    build();
  }
  function open(item) {
    if (item.price == null) { toast("قیمت در حال دریافت است؛ چند لحظه بعد دوباره امتحان کنید ⏳"); loadOrder(); return; }
    // تلگرام پیام showConfirm را حداکثر ۲۵۶ نویسه می‌پذیرد؛ بیشتر از آن خطا می‌دهد و هیچ پنجره‌ای باز نمی‌شود
    let msg = item.title + " — " + nf(item.price) + " تومان\n\n" + (item.desc || "") + "\n\n" + (TEST_MODE ? "تأیید می‌کنید؟" : "سفارش ثبت شود و مشخصات کارت نشان داده شود؟");
    if (msg.length > 250) msg = msg.slice(0, 247) + "…";
    const go = () => pay(item);
    try {
      if (tg.showConfirm) tg.showConfirm(msg, (ok) => { if (ok) go(); });
      else if (window.confirm(msg)) go();
    } catch (e) { if (window.confirm(msg)) go(); }   // اگر پنجره‌ی تلگرام خطا داد، پنجره‌ی ساده‌ی مرورگر
  }
  async function loadOrder() {
    if (TEST_MODE || typeof cmCall !== "function") return;
    try {
      const was = ORDERS.filter((o) => o.status === "pending").map((o) => o.id);
      const cardWas = {}; ORDERS.forEach((o) => { if (o.status === "pending") cardWas[o.id] = o.card; });
      const d = await cmCall("/api/shop/order", undefined, needServer);
      ORDERS = d.orders || [];
      if (ORDERS.some((o) => o.status === "pending" && cardWas[o.id] !== undefined && cardWas[o.id] !== o.card))
        toast("شماره کارت تغییر کرد؛ اگر هنوز واریز نکرده‌اید فقط به کارت جدید واریز کنید 💳");
      const wk = CATALOG.find((x) => x.id === "worker"); if (wk && d.price > 0) wk.price = d.price;   // قیمت را ادمین در ربات تعیین می‌کند
      const open = ORDERS.filter((o) => o.status === "pending").map((o) => o.id);
      if (was.some((id) => !open.includes(id))) {   // ادمین درباره‌ی یکی تصمیم گرفته: شمار کارگرها را تازه کن
        toast(ORDERS.some((o) => o.status === "rejected") ? "سفارشی بررسی شد؛ وضعیت را ببینید" : "پرداخت تأیید شد؛ کارگر اضافه شد 👷");
        if (typeof ecoLoad === "function") ecoLoad();
      }
    } catch (e) { /* بدون سرور: بخش سفارش نشان داده نمی‌شود */ }
    draw();
  }
  function copyCard(num) {
    try { if (typeof navigator !== "undefined" && navigator.clipboard) { navigator.clipboard.writeText(num); toast("شماره کارت کپی شد"); return; } } catch (e) { /* ادامه */ }
    toast(num);
  }
  function orderBox(o) {
    const b = cmEl("div", "shorder" + (o.status === "rejected" ? " bad" : ""));
    if (o.status === "pending") {
      const cd = cmEl("div", "shcard", String(o.card || "").replace(/(\d{4})(?=\d)/g, "$1 ")); cd.onclick = () => copyCard(String(o.card || ""));
      b.append(cmEl("h4", null, "💳 سفارش کارگر #" + o.id),
        "مبلغ " + nf(o.amount) + " تومان را کارت‌به‌کارت به این کارت واریز کنید (برای کپی لمس کنید):", cd,
        "به نام: " + (o.holder || "—"), document.createElement("br"),
        "بعد از واریز، عکس رسید را همین‌جا برای ربات بفرستید. بعد از تأیید ادمین، کارگر اضافه می‌شود.",
        cmEl("div", "shnote", o.receipts ? "رسید ارسال‌شده: " + nf(o.receipts) : "هنوز رسیدی نفرستاده‌اید."));
    } else {
      b.append(cmEl("h4", null, "❌ سفارش #" + o.id + " تأیید نشد"), "اگر واریز کرده‌اید با ادمین در ارتباط باشید.");
    }
    return b;
  }

  function draw() {
    const box = el("shlist"); box.innerHTML = "";
    ORDERS.forEach((o) => box.appendChild(orderBox(o)));
    if (!CATALOG.length) {
      const e = cmEl("div", "shempty");
      e.append(cmEl("span", "shbig", "🛍"), "فعلاً چیزی برای فروش نیست، فرمانده.", document.createElement("br"), "بسته‌ها به‌زودی اینجا می‌آیند.");
      box.appendChild(e); return;
    }
    CATALOG.forEach((it) => {
      const c = cmEl("div", "shitem " + (it.tier || "")), ic = cmEl("div", "shic", it.icon || "🛍"), tx = cmEl("div", "shtx");
      const wd = (typeof ECO !== "undefined" && ECO.d && ECO.d.workers && it.id === "worker") ? ECO.d.workers : null;
      tx.append(cmEl("h4", null, it.title), cmEl("p", null, (it.desc || "") + (wd ? " — شما: " + nf(wd.total) + " از ۵ کارگر (" + nf(wd.free) + " آزاد)" + (wd.total >= 5 ? " ✅ حداکثر" : "") : "")));
      c.append(ic, tx, cmEl("div", "shpr", it.price == null ? "در حال دریافت قیمت…" : nf(it.price) + " تومان"));   // در RTL آیکن سمت راست می‌افتد
      c.onclick = () => open(it);
      box.appendChild(c);
    });
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("savatar2"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("shcash").textContent = "$" + nf(GAME.cash);
    if (typeof ECO !== "undefined" && !ECO.d && !ECO.err && typeof ecoLoad === "function") ecoLoad();   // شمار کارگرها
    draw();
    loadOrder();
  }

  // صفحه‌ی بازِ فروشگاه هر ۲۰ ثانیه سفارش‌ها را تازه می‌کند تا تغییر کارت (یا تصمیم ادمین) را بی‌رفرش ببیند
  if (typeof setInterval === "function") setInterval(() => { if (typeof view !== "undefined" && view === "shop") loadOrder(); }, 20000);
  el("savatar2").onclick = () => setView("map");
  el("shcup").onclick = () => setView("rank");
  el("shbell").onclick = () => setView("notif");
  el("shgoal").onclick = () => openGoals();
  el("shback").onclick = () => setView("home");
  el("shtitle").onclick = () => setView("home");

  window.OWShop = { build };
})();
;

/* ===== market.js ===== */
/* صفحه‌ی بازار جهانی (کالاها، نمودار، مبادله، معامله‌های من). بعد از اسکریپت اصلی index.html بارگذاری می‌شود
   و از همان تابع‌ها و متغیرهای سراسری آن (el, cmEl, toast, cmApi, GAME, mine, dur, setView, ecoLoad, …) استفاده می‌کند.
   با سرور (REMOTE): قیمت‌ها، خرید/فروش منابع و یگان‌ها، مبادله و آگهی بین بازیکن‌ها از /api/market می‌آید و سمت سرور حساب می‌شود.
   بدون سرور (یا وقتی سرور در دسترس نیست): حالت محلی روی همین گوشی؛ خرید/فروش، مبادله و آگهی با خریدار و فروشنده‌ی فرضی (localApi). */
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
  // ---------------- حالت محلی (بدون سرور)
  // خرید/فروش منابع و یگان و مبادله واقعی‌اند: روی خزانه و انبار اقتصادِ محلی و یگان‌های ارتشِ محلی (همین گوشی) اثر می‌گذارند.
  // آگهی‌ها فرضی‌اند: آگهی‌های «بازیکن‌ها» ساختگی و روزانه‌اند و آگهی خودتان را خریدارِ فرضی (بسته به قیمت) می‌خرد.
  const UBACK = 0.6, LIST_MAX = 5, LIST_H = 48, PLO = 0.5, PHI = 2, NPC_SLOTS = 5;
  const LMK = () => "ow_mkt_" + seasonNo() + "_" + (typeof mine === "undefined" ? "" : mine);
  let wMem = null;
  function wLoad() {
    if (wMem) return wMem;
    let W = null;
    try { W = JSON.parse(localStorage.getItem(LMK()) || "null"); } catch (e) { /* ذخیره‌ی خراب */ }
    return (wMem = W && Array.isArray(W.lists) ? W : { lists: [], trades: [], nid: 1, npc: {} });
  }
  function wSave(W) { wMem = W; try { localStorage.setItem(LMK(), JSON.stringify(W)); } catch (e) { /* بدون ذخیره */ } }
  const startedTs = () => (typeof endsAt !== "undefined" && endsAt ? Math.floor((endsAt - SD * 86400000) / 1000) : 0);
  function timeInfo(now) {
    const st = startedTs();
    return { st, day: st ? Math.max(0, Math.floor((now - st) / DAY)) : 0, left: st ? Math.max(0, st + START_CEASEFIRE_DAYS * DAY - now) : 0 };
  }
  const AL = () => (window.OWArmy && window.OWArmy.L) || null;
  const udef = (k) => window.OWArmy.UNITS.find(u => u[0] === k && u[2] !== "sat");
  const ucost = (k, lvl) => window.OWArmy.F.cost(k, lvl);
  const ubuy = (k, lvl) => Math.round(ucost(k, lvl) * UMARK);
  const usell = (k, lvl) => Math.floor(ucost(k, lvl) * UBACK);
  const refOf = (kind, item, lvl, day) => (kind === "res" ? priceOn(seasonNo(), item, day) : ubuy(item, lvl || 1));
  function wLog(W, ts, kind, item, qty, price, total, who) {
    W.trades.unshift({ ts, kind, item, qty, price, total, item2: who || null, qty2: null });
    if (W.trades.length > 40) W.trades.length = 40;
  }
  function giveBack(S, M, kind, item, qty) {
    if (qty < 1) return;
    if (kind === "res") { S.st = S.st || {}; S.st[item] = (S.st[item] || 0) + qty; return; }
    M.esc[item] = Math.max(0, (M.esc[item] || 0) - qty);
    (M.units[item] = M.units[item] || { n: 0, rl: 1, rts: 0, rdur: 0 }).n += qty;
  }
  // خریدارهای فرضیِ آگهی‌های خودتان + پایان آگهی‌ها
  function wTick(S, M, W, now, tm) {
    const pool = countries.filter(c => c.code !== mine), lvl = (k) => ((M.units[k] || {}).rl || 1);
    W.lists = W.lists.filter(l => {
      const hrs = Math.floor((Math.min(now, l.exp) - l.chk) / 3600);
      if (hrs >= 1 && l.qty > 0) {
        const ref = refOf(l.kind, l.item, lvl(l.item), tm.day), ratio = ref ? l.price / ref : 9;
        if (ratio <= 1.15) {
          l.acc = (l.acc || 0) + l.qty0 * Math.min(0.35, 0.06 + 0.5 * Math.max(0, 1 - ratio)) * hrs;
          const sold = Math.min(l.qty, Math.floor(l.acc));
          if (sold > 0) {
            l.acc -= sold; l.qty -= sold;
            const got = Math.floor(Math.max(1, Math.ceil(l.price * sold - 1e-9)) * (1 - FEE));
            S.cash += got;
            if (l.kind === "unit") M.esc[l.item] = Math.max(0, (M.esc[l.item] || 0) - sold);
            const who = pool.length ? pool[Math.floor(rnd(seasonNo() + l.id, 77, Math.floor(l.chk / 3600) % 100000) * pool.length)].code : "";
            wLog(W, l.chk + hrs * 3600, "lsell", l.item, sold, l.price, got, who);
          }
        }
        l.chk += hrs * 3600;
      }
      if (l.qty <= 0) return false;
      if (now >= l.exp) { giveBack(S, M, l.kind, l.item, l.qty); wLog(W, l.exp, "lexp", l.item, l.qty, 0, 0); return false; }
      return true;
    });
  }
  // آگهی‌های ساختگیِ «بازیکن‌های دیگر»: هر روز چند آگهی، هرکدام ۴۸ ساعت می‌ماند (ثابت برای هر روز و سیزن)
  function npcList(now, tm, W) {
    const A = window.OWArmy, s = seasonNo(), pool = countries.filter(c => c.code !== mine), out = [];
    const us = A.UNITS.filter(u => u[2] !== "sat");
    if (!pool.length) return out;
    const base = tm.st || 0, vday = Math.max(0, Math.floor((now - base) / DAY));
    for (let d = Math.max(0, vday - 2); d <= vday; d++) {
      for (let k = 0; k < NPC_SLOTS; k++) {
        const id = "n" + d + "_" + k, ts = base + d * DAY + Math.floor(rnd(s, 400 + k, d) * 0.5 * DAY);
        if (ts > now || now >= ts + LIST_H * 3600) continue;
        const kind = rnd(s, 300 + k, d) < 0.6 ? "res" : "unit", pd = tm.st ? Math.max(0, d) : 0;
        let item, qty, price;
        if (kind === "res") {
          item = RESJ[Math.floor(rnd(s, 500 + k, d) * RESJ.length)][0]; qty = (1 + Math.floor(rnd(s, 600 + k, d) * 20)) * 5000;
          price = Math.round(priceOn(s, item, pd) * (0.8 + 0.5 * rnd(s, 700 + k, d)) * 1e4) / 1e4;
        } else {
          item = us[Math.floor(rnd(s, 500 + k, d) * us.length)][0]; qty = 1 + Math.floor(rnd(s, 600 + k, d) * 5);
          price = Math.round(ubuy(item, 1) * (0.85 + 0.4 * rnd(s, 700 + k, d)));
        }
        const left = qty - ((W.npc || {})[id] || 0); if (left < 1) continue;
        const c = pool[Math.floor(rnd(s, 800 + k, d) * pool.length)];
        out.push({ id, kind, item, qty: left, price, ts, exp: ts + LIST_H * 3600, code: c.code, name: c.name, mine: false });
      }
    }
    return out;
  }
  function buildLocal(now, tm, S, M, W) {
    const A = window.OWArmy, v = AL().view(S, M, now), s = seasonNo(), day = tm.day;
    const own = W.lists.map(l => Object.assign({}, l, { mine: true, code: mine, name: cname(mine) }));
    const listings = own.concat(npcList(now, tm, W)).sort((a, b) => a.price - b.price || String(a.id).localeCompare(String(b.id)));
    const nBy = {}; listings.forEach(l => { nBy[l.item] = (nBy[l.item] || 0) + 1; });
    const res = RESJ.map(([key, name, icon, base]) => {
      const hist = []; for (let d = Math.max(0, day - HIST + 1); d <= day; d++) hist.push(priceOn(s, key, d));
      const p = hist[hist.length - 1], prev = hist.length > 1 ? hist[hist.length - 2] : p;
      return { key, name, icon, base, price: p, chg: pct(p, prev), hist, buy: p * (1 + FEE), sell: p * (1 - FEE), stock: Math.floor((S.st || {})[key] || 0), listings: nBy[key] || 0 };
    });
    const units = A.UNITS.filter(u => u[2] !== "sat").map(u => {
      const m = M.units[u[0]] || { n: 0, rl: 1 }, lv = m.rl || 1, vu = v.units.find(x => x.key === u[0]) || {}, br = v.branches.find(x => x.key === u[2]) || { cap: 0, used: 0 };
      return { key: u[0], name: u[1], branch: u[2], icon: u[3], chg: 0, listings: nBy[u[0]] || 0, prices: [1, 2, 3, 4, 5].map(l => ubuy(u[0], l)),
        owned: m.n, queued: vu.queued || 0, level: lv, buy: ubuy(u[0], lv), sell: usell(u[0], lv), room: Math.max(0, br.cap - br.used) };
    });
    const branches = A.BRANCHES.filter(b => b[0] !== "sat").map(b => ({ key: b[0], name: b[1], icon: b[2] }));
    return { now, open: tm.left === 0, start_left: tm.left, day, fee: FEE, index: { v: indexOn(s, day), chg: pct(indexOn(s, day), day ? indexOn(s, day - 1) : indexOn(s, 0)) },
      res, units, branches, levels: 5, trades: W.trades, listings, list: { max: LIST_MAX, hours: LIST_H, lo: PLO, hi: PHI, mine: own.length }, buyback: UBACK, local: false, offline: true };
  }
  function lctx() {
    const al = AL(); if (!al) throw new Error("صفحه‌ی ارتش بارگذاری نشده است.");
    const now = Math.floor(Date.now() / 1000), tm = timeInfo(now), { S, M } = al.sync(now), W = wLoad();
    M.esc = M.esc || {}; S.st = S.st || {}; W.npc = W.npc || {};
    wTick(S, M, W, now, tm);
    const c = { al, now, tm, S, M, W };
    elSave(S); al.save(M); wSave(W);   // پایان آگهی‌ها / فروش‌های فرضی همین‌جا ذخیره می‌شود
    return c;
  }
  function localApi(path, body) {
    const c = lctx(), { al, now, tm, S, M, W } = c, b = body || {}, s = seasonNo();
    const done = () => { elSave(S); al.save(M); wSave(W); return buildLocal(now, tm, S, M, W); };
    const qtyOf = (v) => { const q = Math.floor(Number(v)); if (!(q >= 1) || q > 1e9) throw new Error("تعداد نامعتبر است."); return q; };
    const have = (k) => Math.floor(S.st[k] || 0);
    const mu = (k) => (M.units[k] = M.units[k] || { n: 0, rl: 1, rts: 0, rdur: 0 });
    const needRoom = (k, q) => {
      const v = al.view(S, M, now), br = v.branches.find(x => x.key === udef(k)[2]);
      if (!br || br.cap < 1) throw new Error("پایگاه این یگان را ندارید؛ اول " + (br ? br.base_name : "پایگاه") + " را بسازید.");
      const room = Math.max(0, br.cap - br.used);
      if (q > room) throw new Error("جای نگهداری کافی نیست (جای خالی: " + room + ")؛ " + br.base_name + " را ارتقا دهید.");
    };
    if (path === "/api/market") return done();
    if (path === "/api/market/cancel") {
      const l = W.lists.find(x => String(x.id) === String(b.id));
      if (!l) throw new Error("آگهی پیدا نشد (شاید فروخته یا بسته شده است).");
      giveBack(S, M, l.kind, l.item, l.qty); W.lists = W.lists.filter(x => x !== l); wLog(W, now, "unlist", l.item, l.qty, l.price, 0);
      return done();
    }
    if (tm.left > 0) throw new Error("بازار جهانی در آغاز فصل بسته است.");
    if (path === "/api/market/trade") {
      const key = b.item, side = b.side;
      if (!NAME[key]) throw new Error("کالای نامعتبر است.");
      if (side !== "buy" && side !== "sell") throw new Error("نوع معامله نامعتبر است.");
      const q = qtyOf(b.qty), price = priceOn(s, key, tm.day);
      if (side === "buy") {
        const total = Math.ceil(price * q * (1 + FEE)); if (S.cash < total) throw new Error("موجودی خزانه کافی نیست.");
        S.cash -= total; S.st[key] = (S.st[key] || 0) + q; wLog(W, now, "buy", key, q, price, total);
      } else {
        if (have(key) < q) throw new Error("موجودی انبار کافی نیست.");
        const total = Math.floor(price * q * (1 - FEE)); S.cash += total; S.st[key] -= q; wLog(W, now, "sell", key, q, price, total);
      }
      return done();
    }
    if (path === "/api/market/swap") {
      const give = b.give, take = b.take;
      if (!NAME[give] || !NAME[take] || give === take) throw new Error("دو کالای متفاوت انتخاب کنید.");
      const q = qtyOf(b.qty), pg = priceOn(s, give, tm.day), pt = priceOn(s, take, tm.day), got = Math.floor(q * pg * (1 - FEE) / (pt * (1 + FEE)));
      if (got < 1) throw new Error("مقدار برای مبادله خیلی کم است.");
      if (have(give) < q) throw new Error("موجودی انبار کافی نیست.");
      S.st[give] -= q; S.st[take] = (S.st[take] || 0) + got;
      W.trades.unshift({ ts: now, kind: "swap", item: give, qty: q, price: pg, total: 0, item2: take, qty2: got }); if (W.trades.length > 40) W.trades.length = 40;
      return done();
    }
    if (path === "/api/market/unit") {
      const key = b.unit, side = b.side;
      if (!udef(key)) throw new Error("یگان نامعتبر است.");
      if (side !== "buy" && side !== "sell") throw new Error("نوع معامله نامعتبر است.");
      const q = qtyOf(b.qty), lvl = (M.units[key] || {}).rl || 1;
      if (side === "buy") {
        needRoom(key, q); const price = ubuy(key, lvl), total = price * q; if (S.cash < total) throw new Error("موجودی خزانه کافی نیست.");
        S.cash -= total; mu(key).n += q; wLog(W, now, "buy", key, q, price, total);
      } else {
        const price = usell(key, lvl), total = price * q; if ((M.units[key] || { n: 0 }).n < q) throw new Error("این تعداد یگان ندارید.");
        S.cash += total; mu(key).n -= q; wLog(W, now, "sell", key, q, price, total);
      }
      return done();
    }
    if (path === "/api/market/list") {
      const kind = b.kind, item = b.item;
      if (kind === "res") { if (!NAME[item]) throw new Error("کالای نامعتبر است."); } else if (kind === "unit") { if (!udef(item)) throw new Error("یگان نامعتبر است."); } else throw new Error("نوع آگهی نامعتبر است.");
      const q = qtyOf(b.qty); let p = Number(b.price);
      if (!isFinite(p) || p <= 0) throw new Error("قیمت نامعتبر است.");
      p = kind === "res" ? Math.round(p * 1e4) / 1e4 : Math.round(p);
      if (W.lists.length >= LIST_MAX) throw new Error("حداکثر " + LIST_MAX + " آگهی باز می‌توانید داشته باشید.");
      if (kind === "res") {
        const ref = priceOn(s, item, tm.day), lo = Math.round(ref * PLO * 1e4) / 1e4, hi = Math.round(ref * PHI * 1e4) / 1e4;
        if (!(p >= lo && p <= hi)) throw new Error("قیمت باید بین $" + lo + " و $" + hi + " باشد.");
        if (have(item) < q) throw new Error("موجودی انبار کافی نیست.");
        S.st[item] -= q;
      } else {
        const ref = ubuy(item, (M.units[item] || {}).rl || 1), lo = Math.ceil(ref * PLO), hi = Math.floor(ref * PHI);
        if (!(p >= lo && p <= hi)) throw new Error("قیمت باید بین $" + lo.toLocaleString("en-US") + " و $" + hi.toLocaleString("en-US") + " باشد.");
        if ((M.units[item] || { n: 0 }).n < q) throw new Error("این تعداد یگان ندارید.");
        mu(item).n -= q; M.esc[item] = (M.esc[item] || 0) + q;   // یگانِ داخل آگهی هنوز جای پایگاه را می‌گیرد
      }
      W.lists.push({ id: W.nid++, kind, item, qty: q, qty0: q, price: p, ts: now, exp: now + LIST_H * 3600, chk: now, acc: 0 });
      wLog(W, now, "list", item, q, p, 0);
      return done();
    }
    if (path === "/api/market/buy") {
      const id = String(b.id);
      if (W.lists.some(x => String(x.id) === id)) throw new Error("آگهی خودتان را نمی‌توانید بخرید.");
      const l = npcList(now, tm, W).find(x => x.id === id);
      if (!l) throw new Error("آگهی پیدا نشد (شاید فروخته یا بسته شده است).");
      const q = qtyOf(b.qty); if (q > l.qty) throw new Error("فقط " + l.qty + " عدد در آگهی مانده است.");
      const total = Math.max(1, Math.ceil(l.price * q - 1e-9)); if (S.cash < total) throw new Error("موجودی خزانه کافی نیست.");
      if (l.kind === "unit") { needRoom(l.item, q); mu(l.item).n += q; } else S.st[l.item] = (S.st[l.item] || 0) + q;
      S.cash -= total; W.npc[id] = (W.npc[id] || 0) + q; wLog(W, now, "lbuy", l.item, q, l.price, total, l.code);
      return done();
    }
    throw new Error("درخواست نامعتبر بود.");
  }

  // ---------------- وضعیت
  const MS = { tab: "goods", d: null, err: "", busy: false, lvl: 1, chart: "oil", give: "oil", take: "steel", qty: "", recv: 0, adf: "all" };
  function apply(d) { MS.d = d; MS.recv = Date.now(); MS.err = ""; }
  async function load() {
    try { apply(await cmCall("/api/market", undefined, localApi)); } catch (e) { MS.err = e.message; }
    if (view === "market") { drawHead(); drawPane(); }
  }
  async function act(path, body, okMsg) {
    if (MS.busy) return false;
    MS.busy = true; let ok = false;
    try {
      apply(await cmCall(path, body, localApi)); ok = true;
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
  const live = () => !!MS.d && !MS.d.local;   // در حالت محلی هم معامله ممکن است (شبیه‌سازی روی همین گوشی)
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
    // همه‌ی ورودی‌ها عدد می‌شوند تا چیزی جز عدد وارد SVG (innerHTML) نشود
    hist = Array.isArray(hist) && hist.length ? hist.map(Number) : [0]; chg = Number(chg); w = Number(w); h = Number(h);
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
      else if (d.offline) c.appendChild(cmEl("div", "mkclosed", "📴 حالت محلی: خرید و فروش روی همین گوشی انجام می‌شود. قیمت‌ها واقعی‌اند ولی آگهی‌ها و خریدارهای دیگر فرضی‌اند." + (typeof REMOTE_CFG !== "undefined" && REMOTE_CFG ? " سرور در دسترس نیست؛ به‌محض وصل‌شدن خودکار برمی‌گردیم." : "")));
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
        const bad = n < 1 || n > maxQ() || !isOpen() || !live();
        go.disabled = bad || MS.busy;
        go.textContent = !live() ? "فقط با سرور بازی" : n > maxQ() ? (side === "buy" ? "خزانه کافی نیست" : "موجودی کافی نیست") : "تأیید " + (side === "buy" ? "خرید" : "فروش");
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
    d.res.forEach(r => p.appendChild(row(r.icon, false, r.name, (r.listings ? nf(r.listings) + " آگهی" : "بی‌آگهی") + (live() ? " · موجودی شما " + nf(r.stock) : ""),
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
      go.disabled = MS.busy || q < 1 || got < 1 || q > g.stock || !isOpen() || !live();
      go.textContent = !live() ? "فقط با سرور بازی" : q > g.stock ? "موجودی کافی نیست" : !isOpen() ? "بازار بسته است" : "مبادله";
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
    if (!d.trades.length) p.appendChild(cmEl("div", "mkempty", live() ? "هنوز معامله‌ای نکرده‌اید، فرمانده." : "معامله‌ها فقط با سرور بازی ثبت می‌شوند."));
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
  el("mgoal").onclick = () => openGoals();
  el("mkback").onclick = () => setView("home");
  el("mktitle").onclick = () => setView("home");

  window.OWMarket = { build, priceOn, indexOn };
})();
;

/* ===== loan.js ===== */
/* صفحه‌ی وام بین کشورها. بک‌اند: loans.py (مسیرهای /api/loan...). فقط با سرور بازی کار می‌کند. */
(function () {
  "use strict";
  const CSS = `
  .lnbox { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin: 0 0 12px; }
  .lnbox h3 { margin: 0 0 10px; font-size: 17px; }
  .lnsum { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .lnsum div { background: var(--card-2); border-radius: 12px; padding: 10px; font-size: 13px; text-align: center; }
  .lnsum b { display: block; font-size: 18px; color: var(--gold); direction: ltr; margin-top: 4px; }
  .lnbox label { display: block; font-size: 13px; margin: 8px 0 4px; opacity: .8; }
  .lnbox input, .lnbox select { width: 100%; box-sizing: border-box; padding: 11px; border-radius: 12px; border: 1px solid var(--line);
    background: var(--card-2); color: inherit; font: inherit; }
  .lnrow2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lnbtn { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--gold); background: var(--gold-soft); color: var(--gold);
    font: inherit; font-weight: 700; cursor: pointer; }
  .lnbtn.full { width: 100%; margin-top: 12px; }
  .lnbtn.red { border-color: #c75454; color: #e98a8a; background: rgba(199,84,84,.12); }
  .lnbtn:disabled { opacity: .5; }
  .lnitem .top { display: flex; justify-content: space-between; align-items: center; font-weight: 700; }
  .lnitem .tag { font-size: 12px; padding: 3px 8px; border-radius: 99px; background: var(--card-2); }
  .lnitem .tag.late { color: #e98a8a; }
  .lnitem p { margin: 6px 0 0; font-size: 13px; opacity: .85; }
  .lnact { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
  .lnact input { flex: 1; min-width: 0; }
  .lnempty { text-align: center; opacity: .6; padding: 14px; font-size: 14px; }`;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  const LS = { d: null, err: "", busy: false };
  const nf = (n) => Number(n || 0).toLocaleString("en-US");
  const fl = (code) => (byCode[code] ? byCode[code].flag + " " + byCode[code].name : code);
  const dt = (ts) => new Date(ts * 1000).toLocaleString("fa", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const STAT = { offer: "پیشنهاد", active: "فعال", paid: "تسویه‌شده", forgiven: "بخشیده‌شده", defaulted: "نکول" };

  async function load() {
    if (!REMOTE) { LS.err = "وام فقط با سرور بازی کار می‌کند؛ از داخل ربات وارد شوید."; draw(); return; }
    try { LS.d = await cmApi("/api/loan"); LS.err = ""; } catch (e) { LS.err = e.message; }
    if (view === "loan") draw();
  }
  async function act(path, body, okMsg) {
    if (LS.busy) return;
    LS.busy = true;
    try {
      LS.d = await cmApi(path, body); LS.err = "";
      if (okMsg) toast(okMsg);
      if (typeof ecoLoad === "function") ecoLoad();   // خزانه تازه شود
    } catch (e) { toast(e.message); }
    LS.busy = false;
    if (view === "loan") draw();
  }

  function summary(d) {
    const b = cmEl("div", "lnbox"), g = cmEl("div", "lnsum");
    [["⭐ اعتبار شما", d.rating + "/100"], ["📑 وام فعال مجاز", d.limit], ["📤 طلب شما", "$" + nf(d.lent)], ["📥 بدهی شما", "$" + nf(d.debt)]]
      .forEach(([t, v]) => { const x = cmEl("div", null, t); x.appendChild(cmEl("b", null, v)); g.appendChild(x); });
    b.append(cmEl("h3", null, "💸 وام بین کشورها"), g);
    b.appendChild(cmEl("p", "lnempty", "به کشور دیگر وام بدهید یا پیشنهاد وام بگیرید. دیرکرد جریمه دارد و بعد از چند روز از خزانه برداشت می‌شود."));
    return b;
  }

  function form(d) {
    const b = cmEl("div", "lnbox"), sel = cmEl("select"), amt = cmEl("input"), rate = cmEl("input"), days = cmEl("input");
    b.appendChild(cmEl("h3", null, "➕ پیشنهاد وام به یک کشور"));
    sel.appendChild(new Option("— کشور را انتخاب کنید —", ""));
    countries.filter(c => c.n > 0 && c.code !== mine).forEach(c => sel.appendChild(new Option(c.flag + " " + c.name, c.code)));
    amt.type = "number"; amt.inputMode = "numeric"; amt.placeholder = "مثلاً 50000";
    rate.type = "number"; rate.value = d.rate; rate.min = d.min_rate; rate.max = d.max_rate;
    days.type = "number"; days.value = d.def_days; days.min = 1; days.max = d.max_days;
    const r2 = cmEl("div", "lnrow2"), l1 = cmEl("div"), l2 = cmEl("div");
    l1.append(cmEl("label", null, "سود (٪، از " + d.min_rate + " تا " + d.max_rate + ")"), rate);
    l2.append(cmEl("label", null, "مهلت (روز، تا " + d.max_days + ")"), days);
    r2.append(l1, l2);
    const go = cmEl("button", "lnbtn full", "ارسال پیشنهاد"); go.type = "button";
    go.onclick = () => {
      if (!sel.value) { toast("کشور را انتخاب کنید."); return; }
      act("/api/loan/offer", { code: sel.value, amount: amt.value, rate: rate.value, days: days.value }, "پیشنهاد فرستاده شد ✅");
    };
    b.append(cmEl("label", null, "کشور گیرنده (فقط کشورهای دارای بازیکن)"), sel, cmEl("label", null, "مبلغ ($)"), amt, r2, go);
    return b;
  }

  function btn(txt, cls, fn) { const x = cmEl("button", "lnbtn " + cls, txt); x.type = "button"; x.onclick = fn; return x; }

  function card(x, hist) {
    const b = cmEl("div", "lnbox lnitem"), other = x.role === "lender" ? x.to : x.from;
    const top = cmEl("div", "top"); top.append(cmEl("span", null, (x.role === "lender" ? "📤 به " : "📥 از ") + fl(other)));
    top.appendChild(cmEl("span", "tag" + (x.overdue ? " late" : ""), x.overdue ? "دیرکرد" : STAT[x.status] || x.status));
    b.appendChild(top);
    b.appendChild(cmEl("p", null, "اصل $" + nf(x.amount) + " · سود " + x.rate + "٪ · جمعاً $" + nf(x.owed) + (x.paid ? " · پرداخت‌شده $" + nf(x.paid) : "")));
    if (x.status === "active") {
      b.appendChild(cmEl("p", null, "باقی‌مانده $" + nf(x.left) + (x.late ? " (جریمه $" + nf(x.late) + ")" : "") + " · مهلت تا " + dt(x.due)));
    }
    if (hist) return b;
    const a = cmEl("div", "lnact");
    if (x.status === "offer") {
      if (x.role === "borrower") a.append(btn("✅ قبول", "", () => act("/api/loan/accept", { id: x.id }, "وام دریافت شد 💰")), btn("رد", "red", () => act("/api/loan/cancel", { id: x.id })));
      else a.appendChild(btn("لغو پیشنهاد", "red", () => act("/api/loan/cancel", { id: x.id })));
    } else if (x.role === "borrower") {
      const inp = cmEl("input"); inp.type = "number"; inp.inputMode = "numeric"; inp.placeholder = "خالی = پرداخت کامل";
      a.append(inp, btn("پرداخت", "", () => act("/api/loan/repay", { id: x.id, amount: inp.value || null }, "پرداخت شد ✅")));
    } else a.appendChild(btn("🎁 بخشیدن بدهی", "red", () => { if (confirm("باقی‌مانده‌ی بدهی بخشیده شود؟")) act("/api/loan/forgive", { id: x.id }); }));
    b.appendChild(a);
    return b;
  }

  function draw() {
    const box = el("lnbody"), d = LS.d; box.innerHTML = "";
    if (!d) { box.appendChild(cmEl("div", "lnbox lnempty", LS.err || "در حال دریافت…")); return; }
    box.append(summary(d), form(d));
    const t1 = cmEl("div", "lnbox"); t1.appendChild(cmEl("h3", null, "📋 وام‌های جاری"));
    if (!d.loans.length) t1.appendChild(cmEl("div", "lnempty", "فعلاً وامی ندارید."));
    box.appendChild(t1);
    d.loans.forEach(x => box.appendChild(card(x, false)));
    if (d.history.length) {
      const t2 = cmEl("div", "lnbox"); t2.appendChild(cmEl("h3", null, "🕘 تاریخچه"));
      box.appendChild(t2); d.history.forEach(x => box.appendChild(card(x, true)));
    }
  }

  function build() {
    el("lncash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash : GAME.cash));
    draw(); load();
  }
  el("lnback").onclick = () => setView("home");
  el("lntitle").onclick = () => setView("home");
  setInterval(() => { if (view === "loan" && !document.hidden && !LS.busy && !document.activeElement.matches("input,select")) load(); }, 20000);
  window.OWLoan = { build };
})();


/* ===== dip.js ===== */
/* صفحه‌ی دیپلماسی: پیمان عدم تجاوز و اتحاد. بک‌اند: diplomacy.py (مسیرهای /api/dip...). فقط با سرور بازی کار می‌کند. */
(function () {
  "use strict";
  const CSS = `
  .dpbox { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin: 0 0 12px; }
  .dpbox h3 { margin: 0 0 10px; font-size: 17px; }
  .dpsum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .dpsum div { background: var(--card-2); border-radius: 12px; padding: 10px 6px; font-size: 12.5px; text-align: center; }
  .dpsum b { display: block; font-size: 18px; color: var(--gold); direction: ltr; margin-top: 4px; }
  .dpbar { height: 8px; border-radius: 99px; background: var(--card-2); overflow: hidden; margin-top: 10px; }
  .dpbar i { display: block; height: 100%; border-radius: 99px; background: var(--gold); }
  .dpbar i.lo { background: #c75454; } .dpbar i.mid { background: #d9a441; } .dpbar i.hi { background: #4fae7b; }
  .dpbox label { display: block; font-size: 13px; margin: 8px 0 4px; opacity: .8; }
  .dpbox select { width: 100%; box-sizing: border-box; padding: 11px; border-radius: 12px; border: 1px solid var(--line);
    background: var(--card-2); color: inherit; font: inherit; }
  .dpkinds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
  .dpkind { padding: 11px 8px; border-radius: 12px; border: 1px solid var(--line); background: var(--card-2); color: inherit;
    font: inherit; font-size: 13.5px; cursor: pointer; }
  .dpkind.on { border-color: var(--gold); background: var(--gold-soft); color: var(--gold); font-weight: 700; }
  .dphint { font-size: 12.5px; opacity: .8; margin: 8px 0 0; line-height: 1.7; }
  .dpbtn { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--gold); background: var(--gold-soft); color: var(--gold);
    font: inherit; font-weight: 700; cursor: pointer; }
  .dpbtn.full { width: 100%; margin-top: 12px; }
  .dpbtn.red { border-color: #c75454; color: #e98a8a; background: rgba(199,84,84,.12); }
  .dpbtn:disabled { opacity: .5; }
  .dpitem .top { display: flex; justify-content: space-between; align-items: center; font-weight: 700; gap: 8px; }
  .dpitem .tag { font-size: 12px; padding: 3px 8px; border-radius: 99px; background: var(--card-2); white-space: nowrap; }
  .dpitem .tag.ok { color: #7fd1a3; } .dpitem .tag.warn { color: #e98a8a; }
  .dpitem p { margin: 6px 0 0; font-size: 13px; opacity: .85; line-height: 1.7; }
  .dpact { display: flex; gap: 8px; margin-top: 10px; }
  .dpempty { text-align: center; opacity: .6; padding: 14px; font-size: 14px; }`;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  const DS = { d: null, err: "", busy: false, pick: "", kind: "pact", tr: null, trFor: "" };
  const nf = (n) => Number(n || 0).toLocaleString("en-US");
  const fl = (code) => (byCode[code] ? byCode[code].flag + " " + byCode[code].name : code);
  const dt = (ts) => new Date(ts * 1000).toLocaleString("fa", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const ICON = { pact: "🕊", alliance: "🤝" };
  const hoursLeft = (ts) => Math.max(1, Math.ceil((ts - Date.now() / 1000) / 3600));
  const tcls = (s) => (s >= 70 ? "hi" : s >= 40 ? "mid" : "lo");
  const tname = (s) => (s >= 70 ? "قابل‌اعتماد" : s >= 40 ? "معمولی" : "پیمان‌شکن");

  async function load() {
    if (!REMOTE) { DS.err = "دیپلماسی فقط با سرور بازی کار می‌کند؛ از داخل ربات وارد شوید."; draw(); return; }
    try { DS.d = await cmApi("/api/dip"); DS.err = ""; } catch (e) { DS.err = e.message; }
    if (view === "dip") draw();
  }
  async function act(path, body, okMsg) {
    if (DS.busy) return;
    DS.busy = true;
    try {
      DS.d = await cmApi(path, body); DS.err = "";
      if (okMsg) toast(okMsg);
    } catch (e) { toast(e.message); }
    DS.busy = false;
    if (view === "dip") draw();
  }
  async function loadTrust(code) {
    DS.tr = null; DS.trFor = code;
    if (!code || !REMOTE) { draw(); return; }
    try { const r = await cmApi("/api/dip/trust", { code }); if (DS.trFor === code) DS.tr = r; } catch (e) { /* اعتماد فقط اطلاعاتی است */ }
    if (view === "dip" && DS.trFor === code) draw();
  }

  const count = (d, kind) => d.treaties.filter(x => x.kind === kind).length;
  const lim = (d, kind) => (d.limits && d.limits[kind]) || 0;

  function summary(d) {
    const b = cmEl("div", "dpbox"), g = cmEl("div", "dpsum");
    [["⭐ اعتماد شما", d.trust + "/100"],
     ["🕊 عدم تجاوز", count(d, "pact") + (lim(d, "pact") ? "/" + lim(d, "pact") : "")],
     ["🤝 اتحاد", count(d, "alliance") + (lim(d, "alliance") ? "/" + lim(d, "alliance") : "")]]
      .forEach(([t, v]) => { const x = cmEl("div", null, t); x.appendChild(cmEl("b", null, v)); g.appendChild(x); });
    const bar = cmEl("div", "dpbar"), fill = cmEl("i", tcls(d.trust)); fill.style.width = Math.max(3, Math.min(100, d.trust)) + "%"; bar.appendChild(fill);
    b.append(cmEl("h3", null, "📜 دیپلماسی"), g, bar);
    b.appendChild(cmEl("p", "dphint", "وضعیت اعتبار شما: " + tname(d.trust) + ". تا وقتی پیمانی بین دو کشور باشد، اعلان جنگ ممکن نیست. لغو پیمان " + d.notice_hours + " ساعت مهلت دارد و لغوکننده ۱۰ امتیاز اعتماد از دست می‌دهد."));
    return b;
  }

  function form(d) {
    const b = cmEl("div", "dpbox"), sel = cmEl("select");
    b.appendChild(cmEl("h3", null, "➕ پیشنهاد پیمان"));
    sel.appendChild(new Option("— کشور را انتخاب کنید —", ""));
    countries.filter(c => c.n > 0 && c.code !== mine).forEach(c => sel.appendChild(new Option(c.flag + " " + c.name, c.code)));
    sel.value = DS.pick;
    sel.onchange = () => { DS.pick = sel.value; loadTrust(DS.pick); };
    const kinds = cmEl("div", "dpkinds");
    Object.keys(d.kinds).forEach(k => {
      const x = cmEl("button", "dpkind" + (DS.kind === k ? " on" : ""), (ICON[k] || "📜") + " " + d.kinds[k]); x.type = "button";
      x.onclick = () => { DS.kind = k; draw(); };
      kinds.appendChild(x);
    });
    const go = cmEl("button", "dpbtn full", "ارسال پیشنهاد"); go.type = "button";
    const full = lim(d, DS.kind) && count(d, DS.kind) >= lim(d, DS.kind);
    go.disabled = DS.busy || full;
    if (full) go.textContent = "سقف " + d.kinds[DS.kind] + " پر است";
    go.onclick = () => {
      if (!DS.pick) { toast("کشور را انتخاب کنید."); return; }
      act("/api/dip/propose", { code: DS.pick, kind: DS.kind }, "پیشنهاد فرستاده شد ✅");
    };
    b.append(cmEl("label", null, "کشور طرف پیمان (فقط کشورهای دارای بازیکن)"), sel, cmEl("label", null, "نوع پیمان"), kinds);
    if (DS.pick && DS.tr && DS.trFor === DS.pick) {
      b.appendChild(cmEl("p", "dphint", fl(DS.pick) + " — اعتماد " + DS.tr.trust + "/100 (" + tname(DS.tr.trust) + ") · پیمان فعال: " + DS.tr.treaties));
    }
    b.appendChild(cmEl("p", "dphint", "پیشنهاد بی‌پاسخ بعد از " + (d.offer_hours || 24) + " ساعت خودکار بسته می‌شود."));
    b.appendChild(go);
    return b;
  }

  function btn(txt, cls, fn) { const x = cmEl("button", "dpbtn " + cls, txt); x.type = "button"; x.disabled = DS.busy; x.onclick = fn; return x; }

  function card(x, d, hist) {
    const b = cmEl("div", "dpbox dpitem");
    const top = cmEl("div", "top");
    top.append(cmEl("span", null, (ICON[x.kind] || "📜") + " " + x.title + " · " + fl(x.with)));
    let tag = "", cls = "";
    if (x.status === "offer") { tag = x.role === "target" ? "پیشنهاد به شما" : "در انتظار پاسخ"; }
    else if (x.status === "active") { tag = "فعال"; cls = " ok"; }
    else if (x.status === "ending") { tag = "در مهلت لغو"; cls = " warn"; }
    else { tag = { ended: "تمام‌شده", declined: "ردشده", cancel: "پس‌گرفته‌شده", expired: "منقضی" }[x.status] || x.status; }
    top.appendChild(cmEl("span", "tag" + cls, tag));
    b.appendChild(top);
    b.appendChild(cmEl("p", null, "اعتماد این کشور: " + x.trust + "/100 (" + tname(x.trust) + ")"));
    if (x.status === "offer") b.appendChild(cmEl("p", null, "ارسال: " + dt(x.ts) + " · انقضا: " + dt(x.ts + (d.offer_hours || 24) * 3600)));
    if (x.status === "active") b.appendChild(cmEl("p", null, "فعال از " + dt(x.ts)));
    if (x.status === "ending") b.appendChild(cmEl("p", null, "پیمان حدود " + hoursLeft(x.end_at) + " ساعت دیگر تمام می‌شود؛ تا آن موقع جنگ ممنوع است."));
    if (hist) return b;
    const a = cmEl("div", "dpact");
    if (x.status === "offer") {
      if (x.role === "target") a.append(btn("✅ قبول", "", () => act("/api/dip/accept", { id: x.id }, "پیمان بسته شد 🤝")), btn("رد", "red", () => act("/api/dip/cancel", { id: x.id })));
      else a.appendChild(btn("پس‌گرفتن پیشنهاد", "red", () => act("/api/dip/cancel", { id: x.id })));
    } else if (x.status === "active") {
      a.appendChild(btn("لغو پیمان", "red", () => {
        if (confirm("پیمان لغو شود؟ " + d.notice_hours + " ساعت مهلت دارد و ۱۰ امتیاز اعتماد شما کم می‌شود.")) act("/api/dip/break", { id: x.id }, "لغو ثبت شد");
      }));
    }
    if (a.children.length) b.appendChild(a);
    return b;
  }

  function section(title, items, d, empty) {
    const t = cmEl("div", "dpbox"); t.appendChild(cmEl("h3", null, title));
    if (!items.length && empty) t.appendChild(cmEl("div", "dpempty", empty));
    return t;
  }

  function draw() {
    const box = el("dpbody"), d = DS.d; box.innerHTML = "";
    if (!d) { box.appendChild(cmEl("div", "dpbox dpempty", DS.err || "در حال دریافت…")); return; }
    const incoming = d.treaties.filter(x => x.status === "offer" && x.role === "target");
    const sent = d.treaties.filter(x => x.status === "offer" && x.role === "proposer");
    const live = d.treaties.filter(x => x.status !== "offer");
    box.appendChild(summary(d));
    if (incoming.length) { box.appendChild(section("📩 پیشنهادهای رسیده", incoming, d)); incoming.forEach(x => box.appendChild(card(x, d, false))); }
    box.appendChild(form(d));
    if (sent.length) { box.appendChild(section("📤 پیشنهادهای ارسالی", sent, d)); sent.forEach(x => box.appendChild(card(x, d, false))); }
    box.appendChild(section("📋 پیمان‌های جاری", live, d, "فعلاً پیمانی ندارید."));
    live.forEach(x => box.appendChild(card(x, d, false)));
    if (d.history.length) { box.appendChild(section("🕘 تاریخچه", d.history, d)); d.history.forEach(x => box.appendChild(card(x, d, true))); }
  }

  function build() {
    el("dpcash").textContent = "$" + nf(Math.floor(typeof ECO !== "undefined" && ECO.d ? ECO.d.cash : GAME.cash));
    draw(); load();
  }
  el("dpback").onclick = () => setView("home");
  el("dptitle").onclick = () => setView("home");
  setInterval(() => { if (view === "dip" && !document.hidden && !DS.busy && !document.activeElement.matches("input,select")) load(); }, 20000);
  window.OWDip = { build };
})();
