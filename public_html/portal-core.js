// ═══════════════════════════════════════════════════════════════
// Narzim Patient Portal — core: namespace, state, helpers, routing
// ═══════════════════════════════════════════════════════════════
window.NZ = (function () {
  const P = window.PORTAL;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // mutable working state (live edits persist for the session)
  const state = {
    medical: JSON.parse(JSON.stringify(P.MEDICAL)),
    access:  JSON.parse(JSON.stringify(P.ACCESS)),
    timeline: JSON.parse(JSON.stringify(P.TIMELINE)),
    view: "home",
  };

  const clinic = (id) => P.CLINICS[id];
  const doctor = (k) => P.DOCTORS[k];
  const visit  = (id) => P.VISITS.find(v => v.id === id);

  // ── small icon set ──
  const ICON = {
    report:  `<path d="M14 3v4a1 1 0 001 1h4" /><path d="M5 3h9l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>`,
    lab:     `<path d="M9 3h6M10 3v6L5 18a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/>`,
    med:     `<rect x="3" y="3" width="6" height="12" rx="3"/><path d="M6 15l-1 4M9 9l9 9M13 5l6 6"/>`,
    allergy: `<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>`,
    vaccine: `<path d="M18 2l4 4M17 7l-9 9-4 1 1-4 9-9zM14 5l5 5"/>`,
    access:  `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>`,
    grant:   `<path d="M20 6L9 17l-5-5"/>`,
    revoke:  `<path d="M18 6L6 18M6 6l12 12"/>`,
    self:    `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>`,
    clock:   `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    chev:    `<path d="M9 6l6 6-6 6"/>`,
  };
  const svg = (name, size = 18, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ""}</svg>`;

  const timelineStyle = (k) => ({
    report:  { bg: "#EDE9FE", fg: "#6D28D9", icon: "report" },
    lab:     { bg: "#FEF3C7", fg: "#B45309", icon: "lab" },
    med:     { bg: "#DCFCE7", fg: "#15803D", icon: "med" },
    allergy: { bg: "#FFE4E6", fg: "#BE123C", icon: "allergy" },
    vaccine: { bg: "#E0F2FE", fg: "#0369A1", icon: "vaccine" },
    "access-request": { bg: "#FEF3C7", fg: "#B45309", icon: "access" },
    "access-grant":   { bg: "#DCFCE7", fg: "#15803D", icon: "grant" },
    "access-revoke":  { bg: "#F1F5F9", fg: "#475569", icon: "revoke" },
  }[k] || { bg: "#E2E8F0", fg: "#475569", icon: "report" });

  // ── toast ──
  function toast(msg, kind = "ok") {
    const c = kind === "ok" ? "#16A34A" : kind === "warn" ? "#D97706" : "#0098E4";
    const el = document.createElement("div");
    el.className = "fade px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12.5px] font-500 shadow-2xl flex items-center gap-2";
    el.innerHTML = `<span style="color:${c}">${svg(kind === "warn" ? "allergy" : "grant", 15, 2.6)}</span>${esc(msg)}`;
    $("#toastRoot").appendChild(el);
    setTimeout(() => { el.style.transition = "opacity .3s,transform .3s"; el.style.opacity = "0"; el.style.transform = "translateY(8px)"; }, 2600);
    setTimeout(() => el.remove(), 2950);
  }

  // ── modal ──
  function openModal(html) { $("#modalRoot").innerHTML = html; document.body.style.overflow = "hidden"; }
  function closeModal() { $("#modalRoot").innerHTML = ""; document.body.style.overflow = ""; }

  // ── routing ──
  function setView(name) {
    state.view = name;
    ["home", "health", "access", "settings"].forEach(v => $("#view-" + v).classList.toggle("hidden", v !== name));
    $$("[data-nav]").forEach(b => {
      const on = b.dataset.nav === name;
      b.classList.toggle("nav-on", on);
    });
    window.scrollTo({ top: 0 });
    const R = NZ.render;
    if (name === "home") R.home();
    if (name === "health") R.health();
    if (name === "access") R.access();
    if (name === "settings") R.settings();
  }

  // ── action dispatch ──
  const actions = {}; // populated by views/docs
  function boot() {
    document.addEventListener("click", (e) => {
      const menu = $("#userMenu");
      const menuTrigger = e.target.closest("[data-act='userMenu']");
      if (menuTrigger) { e.preventDefault(); if (menu) menu.classList.toggle("hidden"); return; }
      if (menu && !menu.classList.contains("hidden") && !e.target.closest("#userMenu")) menu.classList.add("hidden");

      const nav = e.target.closest("[data-nav]");
      if (nav) { if (menu) menu.classList.add("hidden"); setView(nav.dataset.nav); return; }
      const act = e.target.closest("[data-act]");
      if (act) {
        const fn = actions[act.dataset.act];
        if (fn) { e.preventDefault(); if (menu) menu.classList.add("hidden"); fn(act.dataset.arg, act); return; }
      }
      if (e.target.closest("[data-close]")) { closeModal(); return; }
      const ov = e.target.closest("[data-overlay]");
      if (ov && e.target === ov) closeModal();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
    setView("home");
  }

  return { P, $, $$, esc, state, clinic, doctor, visit, svg, timelineStyle, toast, openModal, closeModal, setView, actions, boot, render: {}, money: (n) => "$" + Number(n).toLocaleString() };
})();
