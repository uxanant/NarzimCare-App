// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — core: state, routing, tab bar, sheets, toast
// ═══════════════════════════════════════════════════════════════
window.NZA = (function () {
  const P = window.PORTAL, A = window.APPDATA;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

  const state = {
    view: "home",
    medical: JSON.parse(JSON.stringify(P.MEDICAL)),
    access:  JSON.parse(JSON.stringify(P.ACCESS)),
    timeline: JSON.parse(JSON.stringify(P.TIMELINE)),
    appts:   JSON.parse(JSON.stringify(A.APPOINTMENTS)),
    booking: null, // working booking draft
    health:  JSON.parse(JSON.stringify({ zones: window.HEALTH.ZONES, lifestyle: window.HEALTH.LIFESTYLE, score: window.HEALTH.SCORE })),
    addedReports: [], // reports imported via the AI scan flow
    scan: null,       // working scan session
    apptTab: "upcoming",
    preVisitChecks: {}, // { [apptId]: { [itemKey]: true } }
  };

  const clinic = (id) => P.CLINICS[id];
  const doctor = (k) => P.DOCTORS[k];
  const visit  = (id) => P.VISITS.find(v => v.id === id);

  // ── icons ──
  const ICON = {
    home:    `<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>`,
    records: `<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 13h6M9 17h4"/>`,
    calendar:`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>`,
    user:    `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`,
    plus:    `<path d="M12 5v14M5 12h14"/>`,
    chev:    `<path d="M9 6l6 6-6 6"/>`,
    chevL:   `<path d="M15 6l-6 6 6 6"/>`,
    chevD:   `<path d="M6 9l6 6 6-6"/>`,
    bell:    `<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>`,
    report:  `<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>`,
    lab:     `<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>`,
    med:     `<rect x="3" y="3" width="6" height="12" rx="3"/><path d="M6 15l-1 4M9 9l9 9M13 5l6 6"/>`,
    allergy: `<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>`,
    vaccine: `<path d="M18 2l4 4M17 7l-9 9-4 1 1-4 9-9zM14 5l5 5"/>`,
    access:  `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
    grant:   `<path d="M20 6L9 17l-5-5"/>`,
    revoke:  `<path d="M18 6L6 18M6 6l12 12"/>`,
    self:    `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`,
    clock:   `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    pin:     `<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>`,
    video:   `<path d="m23 7-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/>`,
    share:   `<path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"/><path d="M16 6l-4-4-4 4M12 2v14"/>`,
    settings:`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
    stetho:  `<path d="M4 3v6a5 5 0 0 0 10 0V3"/><path d="M4 3H2M14 3h-2M9 19a4 4 0 0 0 8 0v-2"/><circle cx="19" cy="14" r="2"/>`,
    pulse:   `<path d="M3 12h4l2 6 4-14 2 8h6"/>`,
    heart:   `<path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7z"/>`,
    tooth:   `<path d="M12 5.5c-1.5-1.2-4-2-6-1C3 5.6 3 9 4 13c.7 3 1 7 3 7s1.7-4 3-4 1 4 3 4 2.3-4 3-7c1-4 1-7.4-2-8.5-2-1-4.5-.2-6 1z"/>`,
    drop:    `<path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z"/>`,
    phone:   `<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>`,
    map:     `<path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/>`,
    edit:    `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>`,
    star:    `<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z"/>`,
    check:   `<path d="M20 6L9 17l-5-5"/>`,
    info:    `<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`,
    logout:  `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>`,
    shield:  `<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/>`,
    trash:   `<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>`,
    body:    `<circle cx="12" cy="4.5" r="2.2"/><path d="M12 7v6M12 9l-4.5 2M12 9l4.5 2M12 13l-3 7M12 13l3 7"/>`,
    camera:  `<path d="M3 8.5A2 2 0 0 1 5 6.5h1.5L8 4.5h8l1.5 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.4"/>`,
    ai:      `<path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 16l-1.7-5L6 9.3l4.3-1.7z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>`,
    moon:    `<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>`,
    walk:    `<circle cx="13" cy="4" r="1.8"/><path d="M13 6.5l-1.5 4 3 2.2.8 6M11.5 10.5L8 12l-2 5M15.5 12.7l3 .8"/>`,
    flame:   `<path d="M12 3c2.5 3 5 5.2 5 9a5 5 0 0 1-10 0c0-1.8.9-3 2-4 .2 1.2 1 2 2 2 0-3-1-5-1-7z"/>`,
    retake:  `<path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5"/>`,
    copy:    `<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
    image:   `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-4-7 6"/>`,
    mail:    `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`,
    flash:   `<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>`,
    scan2:   `<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>`,
  };
  const svg = (name, size = 20, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ""}</svg>`;

  const timelineStyle = (k) => ({
    report:  { bg:"#EDE9FE", fg:"#6D28D9", icon:"report" },
    lab:     { bg:"#FEF3C7", fg:"#B45309", icon:"lab" },
    med:     { bg:"#DCFCE7", fg:"#15803D", icon:"med" },
    allergy: { bg:"#FFE4E6", fg:"#BE123C", icon:"allergy" },
    vaccine: { bg:"#E0F2FE", fg:"#0369A1", icon:"vaccine" },
    appt:    { bg:"#D0ECFF", fg:"#006093", icon:"calendar" },
    "access-request": { bg:"#FEF3C7", fg:"#B45309", icon:"access" },
    "access-grant":   { bg:"#DCFCE7", fg:"#15803D", icon:"grant" },
    "access-revoke":  { bg:"#F1F5F9", fg:"#475569", icon:"revoke" },
  }[k] || { bg:"#E2E8F0", fg:"#475569", icon:"report" });

  // ── toast ──
  function toast(msg, kind = "ok") {
    const c = kind === "ok" ? "#34D399" : kind === "warn" ? "#FBBF24" : "#7CCBF5";
    const el = document.createElement("div");
    el.className = "fade px-4 py-2.5 rounded-2xl text-white text-[13px] font-600 shadow-2xl flex items-center gap-2 max-w-[330px]";
    el.style.background = "#0F172A";
    el.innerHTML = `<span style="color:${c}">${svg(kind === "warn" ? "info" : "check", 16, 2.6)}</span><span>${esc(msg)}</span>`;
    $("#toastRoot").appendChild(el);
    setTimeout(() => { el.style.transition = "opacity .3s,transform .3s"; el.style.opacity = "0"; el.style.transform = "translateY(8px)"; }, 2400);
    setTimeout(() => el.remove(), 2750);
  }

  // ── sheet / fullscreen overlays (rendered INSIDE the phone) ──
  function openSheet(html) { $("#sheetRoot").innerHTML = html; }
  function closeSheet() { $("#sheetRoot").innerHTML = ""; }

  // bottom sheet shell
  function bottomSheet({ title, body, maxH = 78 }) {
    return `<div class="absolute inset-0 z-[100] fade" data-overlay style="background:rgba(15,23,42,.45);backdrop-filter:blur(2px)">
      <div class="absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] sheet-up flex flex-col" style="max-height:${maxH}%">
        <div class="pt-3 pb-1 flex justify-center shrink-0"><span class="w-10 h-1.5 rounded-full bg-slate-300"></span></div>
        ${title ? `<div class="px-5 pt-2 pb-3 flex items-center justify-between shrink-0">
          <h3 class="font-display font-700 text-[19px] text-slate-900">${esc(title)}</h3>
          <button data-close class="size-9 rounded-full bg-slate-100 grid place-items-center text-slate-500 tap">${svg("revoke",18,2.2)}</button>
        </div>` : ""}
        <div class="overflow-y-auto px-5 pb-6" style="-webkit-overflow-scrolling:touch">${body}</div>
      </div>
    </div>`;
  }

  // fullscreen page overlay (for booking flow / report viewer)
  function fullPage({ title, body, headRight = "", onBack = "closeSheet", brand = false }) {
    return `<div class="absolute inset-0 z-[100] bg-[#F4F7FC] flex flex-col fade">
      <div class="${brand ? "text-white" : "text-slate-900"} shrink-0" style="${brand ? "background:linear-gradient(150deg,#0098E4,#006093)" : "background:#fff;border-bottom:1px solid #E8EDF4"}">
        <div style="height:52px"></div>
        <div class="px-3 pb-3 flex items-center gap-1">
          <button data-act="${onBack}" class="size-10 rounded-full grid place-items-center tap ${brand ? "hover:bg-white/10" : "hover:bg-slate-100"}">${svg("chevL",22,2.2)}</button>
          <h2 class="flex-1 font-display font-700 text-[18px] truncate">${esc(title)}</h2>
          ${headRight}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto" style="-webkit-overflow-scrolling:touch">${body}</div>
    </div>`;
  }

  // ── tab bar ──
  const TABS = [
    { id: "home",    label: "Home",    icon: "home" },
    { id: "body",    label: "Body",    icon: "body" },
    { id: "book",    label: "Book",    icon: "plus", fab: true },
    { id: "records", label: "Records", icon: "records" },
    { id: "profile", label: "Profile", icon: "user" },
  ];
  function renderTabs() {
    $("#tabbar").innerHTML = TABS.map(tb => {
      if (tb.fab) {
        return `<button class="tabbtn tab-book" data-act="startBooking">
          <span class="fab">${svg("plus",24,2.6)}</span>
          <span style="margin-top:2px">${tb.label}</span>
        </button>`;
      }
      const on = state.view === tb.id;
      return `<button class="tabbtn ${on ? "on" : ""}" data-nav="${tb.id}">
        ${svg(tb.icon, 23, on ? 2.3 : 2)}<span>${tb.label}</span>
      </button>`;
    }).join("");
  }

  // ── routing ──
  function setView(name) {
    state.view = name;
    closeSheet();
    renderTabs();
    const R = NZA.render;
    ({ home: R.home, body: R.body, records: R.records, appts: R.appts, profile: R.profile }[name] || R.home)();
    const sc = $("#scroll"); if (sc) sc.scrollTop = 0;
  }

  // status bar tint per view
  function setStatusBar(brand) { $("#statusbar").classList.toggle("on-brand", !!brand); }

  // ── action dispatch ──
  const actions = {};
  function boot() {
    // live clock in status bar
    const tick = () => { const d = new Date(); $("#sbTime").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2,"0"); };
    tick(); setInterval(tick, 30000);

    document.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) { setView(nav.dataset.nav); return; }
      if (e.target.closest("[data-close]")) { closeSheet(); return; }
      const ov = e.target.closest("[data-overlay]");
      if (ov && e.target === ov) { closeSheet(); return; }
      const act = e.target.closest("[data-act]");
      if (act) {
        const fn = actions[act.dataset.act];
        if (fn) { e.preventDefault(); fn(act.dataset.arg, act); }
      }
    });

    renderTabs();
    if (NZA.auth && !NZA.auth.isAuthed()) { NZA.auth.start(); }
    else { enterApp(); }
  }

  function enterApp() {
    closeSheet();
    setStatusBar(false);
    renderTabs();
    setView("home");
  }

  return { P, A, $, $$, esc, state, clinic, doctor, visit, svg, timelineStyle, toast,
    openSheet, closeSheet, bottomSheet, fullPage, setView, setStatusBar, renderTabs, actions, boot, enterApp,
    money: (n) => "$" + Number(n).toLocaleString("es-MX"), render: {} };
})();
