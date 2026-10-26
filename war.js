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
    const rem = wcard("", T.inWar ? "⏳" : "☐", "ساعت جنگ", dur(T.untilMs) + (T.inWar ? " تا پایان ساعت جنگ" : " تا شروع ساعت جنگ"),
      { sq: true, pill: F + ":00 تا " + (TO % 24) + ":00" });
    rem.querySelector(".wic").onclick = () => toast("یادآوری ساعت جنگ — به‌زودی 🚧");
    box.appendChild(rem);
    const v = WS.sv;
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
    if (tg.showConfirm) tg.showConfirm(msg, (ok) => { if (ok) go(); }); else if (window.confirm(msg)) go();
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
  el("wset").onclick = () => toast("تنظیمات — به‌زودی 🚧");
  el("wgoal").onclick = () => toast("اهداف — به‌زودی 🚧");
  el("wback").onclick = () => setView("home");
  el("wtitle").onclick = () => setView("home");
  el("whelp").onclick = () => { const [F, T] = wHours(); toast("اعلان جنگ فقط بعد از آتش‌بس آغاز فصل ممکن است و نبردها فقط در ساعت جنگ (" + F + ":00 تا " + (T % 24) + ":00 به وقت تهران) انجام می‌شوند."); };

  window.OWWar = { build };
})();
