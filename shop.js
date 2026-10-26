/* صفحه‌ی فروشگاه (مثل عکس: نوار پول، توضیح کوتاه، و کارت هر بسته). بعد از اسکریپت اصلی index.html بارگذاری می‌شود.
   فعلاً هیچ بسته‌ای در فروشگاه نیست؛ برای اضافه‌کردن یک بسته فقط یک ردیف به CATALOG زیر اضافه کنید.
   نکته‌ی طراحی: هرچه با پول واقعی خریده می‌شود باید به حساب بازیکن وصل باشد (ظاهر، اشتراک، …) نه به کشور،
   تا با فتح‌شدن کشور از بین نرود. پرداخت هنوز وصل نیست؛ وقتی بسته‌ای اضافه شد، تابع pay() را به پرداخت واقعی وصل کنید. */
(function () {
  "use strict";

  // ---------------- فهرست بسته‌ها (فعلاً خالی)
  // هر مورد: { id: "vip", icon: "👑", title: "اشتراک VIP", desc: "توضیح کوتاه", price: 380000, tier: "gold" | "hex" | "coin",
  //            details: "توضیح کامل که بعد از لمس نشان داده می‌شود" }
  const CATALOG = [];

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
  .shempty { text-align: center; color: var(--hint); padding: 40px 12px; font-size: 18px; line-height: 2.1; border-radius: 24px;
    border: 1px dashed var(--line); background: rgba(255,255,255,.02); }
  .shempty .shbig { font-size: 44px; display: block; margin-bottom: 8px; }
  `;
  const stl = document.createElement("style"); stl.textContent = CSS; document.head.appendChild(stl);

  const nf = (n) => Number(n).toLocaleString("en-US");

  // پرداخت واقعی بعداً اینجا وصل می‌شود (مثلاً ستاره‌ی تلگرام یا درگاه). فعلاً فقط پیام می‌دهد.
  function pay(item) {
    toast("پرداخت هنوز فعال نیست 🚧");
  }
  function open(item) {
    const msg = item.title + " — " + nf(item.price) + " تومان\n\n" + (item.details || item.desc || "") + "\n\nتأیید می‌کنید؟";
    if (tg.showConfirm) tg.showConfirm(msg, (ok) => { if (ok) pay(item); });
    else if (window.confirm(msg)) pay(item);
  }

  function draw() {
    const box = el("shlist"); box.innerHTML = "";
    if (!CATALOG.length) {
      const e = cmEl("div", "shempty");
      e.append(cmEl("span", "shbig", "🛍"), "فعلاً چیزی برای فروش نیست، فرمانده.", document.createElement("br"), "بسته‌ها به‌زودی اینجا می‌آیند.");
      box.appendChild(e); return;
    }
    CATALOG.forEach((it) => {
      const c = cmEl("div", "shitem " + (it.tier || "")), ic = cmEl("div", "shic", it.icon || "🛍"), tx = cmEl("div", "shtx");
      tx.append(cmEl("h4", null, it.title), cmEl("p", null, it.desc || ""));
      c.append(ic, tx, cmEl("div", "shpr", nf(it.price) + " تومان"));   // در RTL آیکن سمت راست می‌افتد
      c.onclick = () => open(it);
      box.appendChild(c);
    });
  }

  function build() {
    const c = byCode[mine]; if (!c) return;
    const av = el("savatar2"); av.innerHTML = ""; av.appendChild(flagNode(c)); av.firstChild.classList.add("lg");
    av.appendChild(cmEl("div", "lvl", RM ? RM.rank : GAME.level));
    el("shcash").textContent = "$" + nf(GAME.cash);
    draw();
  }

  el("savatar2").onclick = () => setView("map");
  el("shcup").onclick = () => setView("rank");
  el("shbell").onclick = () => setView("notif");
  el("shset").onclick = () => toast("تنظیمات — به‌زودی 🚧");
  el("shgoal").onclick = () => toast("اهداف — به‌زودی 🚧");
  el("shback").onclick = () => setView("home");
  el("shtitle").onclick = () => setView("home");

  window.OWShop = { build };
})();
