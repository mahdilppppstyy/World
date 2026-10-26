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
      power[br] = (power[br] || 0) + v.n * F.dmg(k, v.rl); count[br] = (count[br] || 0) + v.n; used[br] = (used[br] || 0) + v.n + q;
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
    try { arApply(REMOTE ? await cmApi("/api/mil") : localApi("/api/mil")); } catch (e) { AR.err = e.message; }
    if (view === "army") build();
  }
  async function act(path, body, okMsg) {
    if (AR.busy) return;
    AR.busy = true;
    try {
      arApply(REMOTE ? await cmApi(path, body) : localApi(path, body));
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

  window.OWArmy = { build, load, F, UNITS, BRANCHES, BASES, K };
})();
