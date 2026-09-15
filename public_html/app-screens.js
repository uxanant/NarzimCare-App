// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — screens: Home · Records · Visits · Profile
//   + report/lab viewer · 360° profile · share · add item ·
//     clinic access / consent (OTP) · edit profile
// ═══════════════════════════════════════════════════════════════
(function () {
  const { P, A, $, $$, esc, state, clinic, doctor, visit, svg, timelineStyle,
          toast, openSheet, closeSheet, bottomSheet, fullPage, setView,
          setStatusBar, render, actions, money } = NZA;
  const PAT = P.PATIENT, NARZIM = P.NARZIM;
  const today = "Feb 26, 2026";
  const DEMO_OTP = "482913";

  // ── small helpers ──────────────────────────────────────────
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monShort = (iso) => MON[+iso.split("-")[1] - 1];
  const dayNum   = (iso) => +iso.split("-")[2];

  // Pre-visit checklist items shown on every upcoming appointment
  const PRE_VISIT_ITEMS = [
    { key: "questionnaire", label: "Complete health questionnaire", icon: "edit" },
    { key: "insurance",     label: "Confirm insurance details",     icon: "shield" },
    { key: "consent",       label: "Review & sign consent form",    icon: "report" },
    { key: "medications",   label: "Update current medications",    icon: "med" },
  ];

  function preVisitChecklist(apptId, compact) {
    const checks = state.preVisitChecks[apptId] || {};
    const pending = PRE_VISIT_ITEMS.filter(i => !checks[i.key]);
    const done    = PRE_VISIT_ITEMS.length - pending.length;
    if (compact) {
      // small badge for the home-screen card
      const allDone = done === PRE_VISIT_ITEMS.length;
      return `<div class="mt-2.5 flex items-center gap-2 ${allDone ? "text-emerald-600" : "text-amber-600"}">
        <span class="inline-flex items-center justify-center size-4 rounded-full ${allDone ? "bg-emerald-100" : "bg-amber-100"}">
          ${allDone
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
            : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4M12 16h.01"/></svg>`}
        </span>
        <span class="text-[11.5px] font-600">${allDone ? "All pre-visit tasks done" : `${pending.length} pre-visit task${pending.length > 1 ? "s" : ""} needed`}</span>
      </div>`;
    }
    // full checklist for the appointments screen
    return `<div class="mt-3 pt-3 border-t border-slate-100">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[12px] font-700 text-slate-700 uppercase tracking-wide">Pre-visit checklist</p>
        <span class="text-[11px] font-600 ${done === PRE_VISIT_ITEMS.length ? "text-emerald-600" : "text-slate-400"}">${done}/${PRE_VISIT_ITEMS.length} done</span>
      </div>
      <div class="space-y-2">
        ${PRE_VISIT_ITEMS.map(item => {
          const checked = !!checks[item.key];
          return `<button data-act="togglePreCheck" data-arg="${esc(apptId)}|${esc(item.key)}"
            class="w-full flex items-center gap-2.5 text-left tap group">
            <span class="size-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
              ${checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent"}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
            <span class="text-[12.5px] font-500 flex-1 ${checked ? "line-through text-slate-400" : "text-slate-700"}">${esc(item.label)}</span>
            ${checked ? "" : `<span class="text-[11px] font-600 text-brand-600 shrink-0">Open</span>`}
          </button>`;
        }).join("")}
      </div>
    </div>`;
  }

  function pageHead(title, sub) {
    return `<div class="px-5 pt-3 pb-1">
      <h1 class="font-display font-800 text-[26px] text-slate-900 leading-tight">${esc(title)}</h1>
      ${sub ? `<p class="text-[13px] text-slate-500 mt-0.5">${esc(sub)}</p>` : ""}
    </div>`;
  }

  function sourceLine(s) {
    if (s.kind === "self")
      return `<span class="inline-flex items-center gap-1 text-[11px] font-600 text-brand-700">${svg("self", 11, 2)} You · ${esc(s.date)}</span>`;
    const c = clinic(s.clinic), d = doctor(s.doctor);
    return `<span class="inline-flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
      <span class="inline-grid place-items-center size-4 rounded text-[8px] font-800 shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
      <span class="truncate">${esc(c.name)}${d ? " · " + esc(d.name) : ""} · ${esc(s.date)}</span></span>`;
  }
  const modePill = (mode) => mode === "video"
    ? `<span class="inline-flex items-center gap-1 text-emerald-600">${svg("video", 13, 2)} Video visit</span>`
    : `<span class="inline-flex items-center gap-1 text-slate-500">${svg("pin", 13, 2)} In person</span>`;

  function recCard(item, body, removable) {
    const right = removable
      ? `<button data-act="removeSelf" data-arg="${esc(item.id)}" class="size-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 grid place-items-center shrink-0 transition" title="Remove">${svg("trash", 14, 2)}</button>`
      : `<span class="inline-flex items-center gap-1 text-[10px] font-600 text-slate-400 shrink-0" title="Recorded by a clinic — read-only">${svg("shield", 12, 2.2)} Verified</span>`;
    return `<div class="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">${body}</div>${right}
      </div>
      <div class="mt-2.5 pt-2.5 border-t border-slate-100">${sourceLine(item.source)}</div>
    </div>`;
  }

  // ══════════════════════════ HOME ══════════════════════════
  function timelineItems(list) {
    return list.map((t, i) => {
      const st = timelineStyle(t.kind);
      const last = i === list.length - 1;
      const cta = t.refId
        ? `<button data-act="openDoc" data-arg="${esc(t.refId)}" class="mt-1.5 inline-flex items-center gap-1 text-[12px] font-600 text-brand-600">View ${visit(t.refId) && visit(t.refId).category === "lab" ? "results" : "report"} ${svg("chev", 12, 2.2)}</button>`
        : (t.kind === "access-request"
            ? `<button data-act="reviewReq" data-arg="${esc(t.clinic)}" class="mt-1.5 inline-flex items-center gap-1 text-[12px] font-600 text-amber-600">Review request ${svg("chev", 12, 2.2)}</button>`
            : "");
      return `<li class="relative pl-11 ${last ? "" : "pb-4"}">
        ${last ? "" : `<span class="absolute left-[17px] top-9 bottom-0 w-px bg-slate-200"></span>`}
        <span class="absolute left-0 top-0 size-9 rounded-full grid place-items-center ring-4 ring-[#F4F7FC]" style="background:${st.bg};color:${st.fg}">${svg(st.icon, 16, 2)}</span>
        <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm px-3.5 py-3">
          <div class="flex items-start justify-between gap-2">
            <p class="text-[13.5px] font-600 text-slate-900 leading-snug">${esc(t.title)}</p>
            <span class="text-[11px] text-slate-400 shrink-0">${esc(t.ago)}</span>
          </div>
          <p class="text-[12px] text-slate-500 mt-0.5 leading-snug">${esc(t.desc)}</p>
          ${cta}
        </div>
      </li>`;
    }).join("");
  }

  function nextApptCard(a) {
    const d = A.doc(a.doctor), c = clinic(d.clinic);
    return `<div class="mt-5">
      <div class="flex items-center justify-between mb-2 px-0.5">
        <h2 class="font-display font-700 text-[16px] text-slate-900">Next appointment</h2>
        <button data-nav="appts" class="text-[12.5px] font-600 text-brand-600">All visits</button>
      </div>
      <button data-act="viewAppt" data-arg="${esc(a.id)}" class="w-full text-left rounded-3xl bg-white border border-slate-200/70 shadow-sm p-4 flex items-center gap-3.5 tap">
        <div class="text-center shrink-0 w-12">
          <div class="text-[11px] font-700 text-brand-500 uppercase">${monShort(a.date)}</div>
          <div class="font-display font-800 text-[22px] text-slate-900 leading-none">${dayNum(a.date)}</div>
        </div>
        <div class="w-px self-stretch bg-slate-100"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 text-[11px] font-600">${modePill(a.mode)}</div>
          <p class="text-[14.5px] font-700 text-slate-900 truncate mt-0.5">${esc(d.name)}</p>
          <p class="text-[12.5px] text-slate-500 truncate">${esc(a.time)} · ${esc(a.reason)}</p>
          ${preVisitChecklist(a.id, true)}
        </div>
        <span class="text-slate-300 shrink-0 self-start mt-1">${svg("chev", 18, 2)}</span>
      </button>
    </div>`;
  }

  render.home = function () {
    setStatusBar(false);
    const pending = state.access.filter(a => a.status === "pending");
    const pendingBanner = pending.map(a => {
      const c = clinic(a.clinic);
      return `<div class="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex items-center gap-3">
        <span class="size-10 rounded-xl grid place-items-center font-800 text-[12px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-600 text-slate-900 leading-snug">${esc(c.name)} wants access</p>
          <p class="text-[11.5px] text-amber-700">Requested ${esc(a.requestedAt)}</p>
        </div>
        <button data-act="reviewReq" data-arg="${esc(a.clinic)}" class="h-8 px-3.5 rounded-lg bg-amber-500 text-white text-[12.5px] font-600 tap shrink-0">Review</button>
      </div>`;
    }).join("");

    const upcoming = state.appts.filter(a => a.status === "upcoming").sort((x, y) => x.date.localeCompare(y.date));

    $("#scroll").innerHTML = `<div class="screen-in px-5 pt-3 pb-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-hand text-[22px] text-brand-500 leading-none">¡Hola!</p>
          <h1 class="font-display font-800 text-[27px] text-slate-900 leading-tight">Hello, ${esc(PAT.first)}</h1>
        </div>
        <button data-nav="profile" class="relative size-11 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-500 tap">
          ${svg("bell", 20, 2)}
          ${pending.length ? `<span class="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-rose-500 text-white text-[9px] font-800 grid place-items-center ring-2 ring-[#F4F7FC]">${pending.length}</span>` : ""}
        </button>
      </div>

      <div class="mt-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
        <button data-act="view360" class="w-full flex items-center gap-3 px-4 py-3.5 text-left tap">
          <span class="size-10 rounded-xl grid place-items-center shrink-0 text-white" style="background:linear-gradient(150deg,#33B1F0,#0098E4 60%,#006093)">${svg("self", 19, 2)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-[14px] font-700 text-slate-900 leading-tight">360° Health Profile</p>
            <p class="text-[11.5px] text-slate-500 truncate">Your full record from ${Object.keys(P.CLINICS).length} clinics · MRN ${esc(PAT.mrn)}</p>
          </div>
          <span class="text-slate-300 shrink-0">${svg("chev", 17, 2)}</span>
        </button>
        <div class="flex border-t border-slate-100 divide-x divide-slate-100">
          <button data-act="view360" class="flex-1 py-2.5 text-[12.5px] font-600 text-brand-600 tap inline-flex items-center justify-center gap-1.5">${svg("report", 14, 2)} View profile</button>
          <button data-act="share360" class="flex-1 py-2.5 text-[12.5px] font-600 text-slate-600 tap inline-flex items-center justify-center gap-1.5">${svg("share", 14, 2)} Share</button>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2.5">
        <button data-nav="body" class="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-3.5 text-left tap">
          <span class="size-9 rounded-xl bg-[#D0ECFF] text-brand-600 grid place-items-center mb-2">${svg("body", 19, 2)}</span>
          <p class="text-[13px] font-700 text-slate-900 leading-tight">Body report</p>
          <p class="text-[11px] text-slate-500 mt-0.5">Health score ${state.health.score.value}/100</p>
        </button>
        <button data-act="startScan" class="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-3.5 text-left tap">
          <span class="size-9 rounded-xl bg-[#EDE9FE] text-violet-600 grid place-items-center mb-2">${svg("camera", 19, 2)}</span>
          <p class="text-[13px] font-700 text-slate-900 leading-tight flex items-center gap-1">Scan a report ${svg("ai", 12, 2)}</p>
          <p class="text-[11px] text-slate-500 mt-0.5">AI files it for you</p>
        </button>
      </div>

      ${pendingBanner ? `<div class="mt-4 space-y-2.5">${pendingBanner}</div>` : ""}
      ${upcoming[0] ? nextApptCard(upcoming[0]) : ""}

      <div class="mt-6 flex items-center justify-between">
        <h2 class="font-display font-700 text-[16px] text-slate-900">Recent activity</h2>
        <button data-nav="records" class="text-[12.5px] font-600 text-brand-600">View record</button>
      </div>
      <ul class="mt-3">${timelineItems(state.timeline.slice(0, 5))}</ul>
    </div>`;
  };

  // ══════════════════════════ RECORDS ══════════════════════════
  function section(title, addType, addLabel, rows) {
    return `<div>
      <div class="flex items-center justify-between mb-2.5 px-0.5">
        <h2 class="font-display font-700 text-[16px] text-slate-900">${title}</h2>
        ${addType ? `<button data-act="addItem" data-arg="${addType}" class="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-brand-50 text-brand-700 text-[12.5px] font-600 tap">+ ${addLabel}</button>` : ""}
      </div>
      <div class="space-y-2.5">${rows || `<p class="text-[13px] text-slate-400 italic px-1">Nothing recorded yet.</p>`}</div>
    </div>`;
  }
  function visitRow(v) {
    const c = clinic(v.clinic);
    return `<button data-act="openDoc" data-arg="${esc(v.id)}" class="w-full flex items-center gap-3 px-4 py-3.5 text-left tap">
      <span class="size-10 rounded-xl grid place-items-center font-800 text-[12px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
      <div class="flex-1 min-w-0">
        <p class="text-[13.5px] font-600 text-slate-900 truncate">${esc(v.type)}</p>
        <p class="text-[12px] text-slate-500 truncate">${esc(c.name)} · ${esc(v.date)}</p>
      </div>
      <span class="text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 ${v.category === "lab" ? "bg-violet-100 text-violet-700" : "bg-brand-100 text-brand-700"}">${v.category === "lab" ? "Lab" : "Report"}</span>
      <span class="text-slate-300 shrink-0">${svg("chev", 16, 2)}</span>
    </button>`;
  }

  render.records = function () {
    setStatusBar(false);
    const M = state.medical;
    const sev = (s) => ({ Severe: "bg-rose-100 text-rose-700", Moderate: "bg-amber-100 text-amber-700", Mild: "bg-slate-100 text-slate-600" }[s] || "bg-slate-100 text-slate-600");

    const allergies = M.allergies.map(a => recCard(a, `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[14px] font-600 text-slate-900">${esc(a.name)}</span>
        <span class="text-[10px] font-700 px-2 py-0.5 rounded-full ${sev(a.severity)}">${esc(a.severity)}</span>
      </div>
      <p class="text-[12.5px] text-slate-500 mt-1">${esc(a.reaction)}</p>`, a.source.kind === "self")).join("");

    const conditions = M.conditions.map(c => recCard(c, `
      <span class="text-[14px] font-600 text-slate-900">${esc(c.name)}</span>
      <p class="text-[12.5px] text-slate-500 mt-1">${esc(c.status)} · since ${esc(c.since)}</p>`, c.source.kind === "self")).join("");

    const meds = M.medications.map(m => recCard(m, `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[14px] font-600 text-slate-900">${esc(m.name)}</span>
        ${m.active ? `<span class="text-[10px] font-700 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>` : ""}
      </div>
      <p class="text-[12.5px] text-slate-500 mt-1">${esc(m.instr)} · since ${esc(m.since)}</p>`, m.source.kind === "self")).join("");

    const imm = M.immunizations.map(v => recCard(v, `
      <span class="text-[14px] font-600 text-slate-900">${esc(v.name)}</span>
      <p class="text-[12.5px] text-slate-500 mt-1">Given ${esc(v.date)}</p>`, v.source.kind === "self")).join("");

    const visits = P.VISITS.map(visitRow).join("");

    $("#scroll").innerHTML = `<div class="screen-in pb-6">
      ${pageHead("Health record", "Everything from every clinic, compiled.")}
      <div class="px-5 mt-2 grid grid-cols-2 gap-2.5">
        <button data-act="view360" class="h-11 rounded-xl bg-white border border-slate-200/70 shadow-sm text-[12.5px] font-600 text-slate-700 inline-flex items-center justify-center gap-1.5 tap"><span class="text-slate-400">${svg("report", 16, 2)}</span> 360° summary</button>
        <button data-act="startScan" class="h-11 rounded-xl bg-white border border-slate-200/70 shadow-sm text-[12.5px] font-600 text-slate-700 inline-flex items-center justify-center gap-1.5 tap"><span class="text-brand-500">${svg("camera", 16, 2)}</span> Scan a report</button>
      </div>
      <div class="px-5 mt-5 space-y-5">
        ${section("Allergies", "allergy", "Add", allergies)}
        ${section("Conditions", "condition", "Add", conditions)}
        ${section("Medications", "medication", "Add", meds)}
        ${section("Immunizations", null, "", imm)}
        <div>
          <h2 class="font-display font-700 text-[16px] text-slate-900 mb-2.5 px-0.5">Visit history</h2>
          <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden divide-y divide-slate-100">${visits}</div>
        </div>
      </div>
    </div>`;
  };

  // ══════════════════════════ VISITS ══════════════════════════
  function apptCard(a, tab) {
    const d = A.doc(a.doctor), c = clinic(d.clinic), sp = A.spec(a.spec);
    const footer = tab === "upcoming"
      ? preVisitChecklist(a.id, false) + `<div class="mt-3 flex gap-2">
          ${a.mode === "video"
            ? `<button data-act="joinVideo" data-arg="${esc(a.id)}" class="flex-1 h-9 rounded-xl bg-emerald-500 text-white text-[12.5px] font-600 tap inline-flex items-center justify-center gap-1.5">${svg("video", 14, 2)} Join video</button>`
            : `<button data-act="directions" data-arg="${esc(a.id)}" class="flex-1 h-9 rounded-xl bg-slate-100 text-slate-700 text-[12.5px] font-600 tap inline-flex items-center justify-center gap-1.5">${svg("map", 14, 2)} Directions</button>`}
          <button data-act="reschedule" data-arg="${esc(a.id)}" class="h-9 px-3.5 rounded-xl bg-slate-100 text-slate-700 text-[12.5px] font-600 tap">Reschedule</button>
          <button data-act="cancelAppt" data-arg="${esc(a.id)}" class="h-9 px-3 rounded-xl text-rose-600 text-[12.5px] font-600 tap">Cancel</button>
        </div>`
      : (a.reportId
          ? `<div class="mt-3 pt-3 border-t border-slate-100"><button data-act="openDoc" data-arg="${esc(a.reportId)}" class="inline-flex items-center gap-1 text-[12.5px] font-600 text-brand-600">View ${visit(a.reportId) && visit(a.reportId).category === "lab" ? "results" : "report"} ${svg("chev", 13, 2.2)}</button></div>`
          : "");
    return `<div class="rounded-3xl bg-white border border-slate-200/70 shadow-sm p-4">
      <div class="flex items-start gap-3.5">
        <div class="text-center shrink-0 w-12">
          <div class="text-[11px] font-700 ${tab === "upcoming" ? "text-brand-500" : "text-slate-400"} uppercase">${monShort(a.date)}</div>
          <div class="font-display font-800 text-[22px] text-slate-900 leading-none">${dayNum(a.date)}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${esc(a.time.replace(" ", ""))}</div>
        </div>
        <div class="w-px self-stretch bg-slate-100"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 text-[11px] font-600">${modePill(a.mode)}</div>
          <p class="text-[14.5px] font-700 text-slate-900 mt-0.5 leading-snug">${esc(d.name)}</p>
          <p class="text-[12px] text-slate-500 truncate">${esc(sp ? sp.label : "")} · ${esc(c.name)}</p>
          <p class="text-[12.5px] text-slate-600 mt-1.5 leading-snug">${esc(a.reason)}</p>
        </div>
      </div>
      ${footer}
    </div>`;
  }

  render.appts = function () {
    setStatusBar(false);
    const tab = state.apptTab || "upcoming";
    const ups  = state.appts.filter(a => a.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
    const past = state.appts.filter(a => a.status === "past").sort((a, b) => b.date.localeCompare(a.date));
    const list = tab === "upcoming" ? ups : past;
    const cards = list.map(a => apptCard(a, tab)).join("")
      || `<div class="rounded-3xl bg-white border border-dashed border-slate-300 p-8 text-center">
            <p class="text-[13.5px] text-slate-400">No ${tab} appointments.</p></div>`;

    const seg = (id, label, n) => `<button data-act="setApptTab" data-arg="${id}" class="flex-1 h-9 rounded-xl tap ${tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}">${label}${n ? ` <span class="text-[11px] ${tab === id ? "text-brand-500" : "text-slate-400"}">${n}</span>` : ""}</button>`;

    $("#scroll").innerHTML = `<div class="screen-in pb-6">
      ${pageHead("Appointments")}
      <div class="px-5 mt-2">
        <div class="flex p-1 rounded-2xl bg-slate-200/60 text-[13px] font-600">
          ${seg("upcoming", "Upcoming", ups.length)}
          ${seg("past", "Past", past.length)}
        </div>
      </div>
      <div class="px-5 mt-4 space-y-3">${cards}</div>
      <div class="px-5 mt-5">
        <button data-act="startBooking" class="w-full h-12 rounded-2xl text-white text-[14px] font-700 inline-flex items-center justify-center gap-2 tap" style="background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">${svg("plus", 18, 2.4)} Book new appointment</button>
      </div>
    </div>`;
  };

  // ══════════════════════════ PROFILE ══════════════════════════
  function infoRow(label, value, mono) {
    return `<div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <span class="text-[12.5px] text-slate-500 shrink-0">${esc(label)}</span>
      <span class="text-[13px] text-slate-900 ${mono ? "font-mono" : "font-500"} text-right">${esc(value)}</span></div>`;
  }
  function toggleRow(label, desc, on) {
    return `<div class="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
      <div class="min-w-0"><p class="text-[13px] font-500 text-slate-900">${esc(label)}</p><p class="text-[11.5px] text-slate-500 leading-snug">${esc(desc)}</p></div>
      <button data-act="toggle" class="toggle ${on ? "on" : ""} shrink-0" role="switch" aria-checked="${on}"><span class="dot"></span></button></div>`;
  }
  function cardWrap(title, right, body) {
    return `<div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
      ${title ? `<div class="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <h2 class="font-display font-700 text-[15px] text-slate-900">${title}</h2>${right || ""}</div>` : ""}
      ${body}</div>`;
  }

  render.profile = function () {
    setStatusBar(false);
    const secLabel = (k) => (P.SECTIONS.find(s => s.key === k) || { label: k }).label;
    const active = state.access.filter(a => a.status === "active");
    const pending = state.access.filter(a => a.status === "pending");

    const pendingHtml = pending.map(a => {
      const c = clinic(a.clinic);
      return `<div class="p-4 border-b border-slate-100 last:border-0">
        <div class="flex items-center gap-3">
          <span class="size-10 rounded-xl grid place-items-center font-800 text-[12px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-[13.5px] font-600 text-slate-900 truncate">${esc(c.name)}</p>
            <p class="text-[11.5px] text-amber-700">Requested ${esc(a.requestedAt)}</p>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button data-act="denyReq" data-arg="${esc(a.clinic)}" class="flex-1 h-9 rounded-xl bg-slate-100 text-slate-600 text-[12.5px] font-600 tap">Deny</button>
          <button data-act="reviewReq" data-arg="${esc(a.clinic)}" class="flex-1 h-9 rounded-xl bg-amber-500 text-white text-[12.5px] font-600 tap">Review &amp; grant</button>
        </div>
      </div>`;
    }).join("");

    const activeHtml = active.map(a => {
      const c = clinic(a.clinic);
      const chips = a.sections.slice(0, 4).map(k => `<span class="text-[10.5px] font-500 bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">${esc(secLabel(k))}</span>`).join("")
        + (a.sections.length > 4 ? `<span class="text-[10.5px] font-500 text-slate-400 px-1">+${a.sections.length - 4}</span>` : "");
      return `<div class="p-4 border-b border-slate-100 last:border-0">
        <div class="flex items-start gap-3">
          <span class="size-10 rounded-xl grid place-items-center font-800 text-[12px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-[13.5px] font-600 text-slate-900 truncate">${esc(c.name)}</p>
              <span class="inline-flex items-center gap-1 text-[10px] font-600 text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5 shrink-0"><span class="size-1.5 rounded-full bg-emerald-500"></span>Active</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Last viewed ${esc(a.lastViewed)}</p>
            <div class="mt-2 flex flex-wrap gap-1.5">${chips}</div>
          </div>
        </div>
        <div class="mt-3 flex gap-2 justify-end">
          <button data-act="manageConsent" data-arg="${esc(a.clinic)}" class="h-8 px-3 rounded-lg text-[12px] font-600 text-slate-600 bg-slate-100 tap">Edit sharing</button>
          <button data-act="revoke" data-arg="${esc(a.clinic)}" class="h-8 px-3 rounded-lg text-[12px] font-600 text-rose-600 tap">Revoke</button>
        </div>
      </div>`;
    }).join("");

    $("#scroll").innerHTML = `<div class="screen-in pb-6">
      <div class="px-5 pt-3">
        <div class="flex items-center gap-4">
          <span class="size-16 rounded-2xl grid place-items-center font-display font-800 text-[22px] shrink-0" style="background:${PAT.swatch};color:#0E4F73">${esc(PAT.initials)}</span>
          <div class="min-w-0">
            <h1 class="font-display font-800 text-[21px] text-slate-900 leading-tight truncate">${esc(PAT.name)}</h1>
            <p class="text-[12.5px] text-slate-500">${esc(PAT.sexLabel)} · ${esc(PAT.age)} · ${esc(PAT.bloodType)}</p>
            <p class="text-[11px] text-slate-400 font-mono mt-0.5">MRN ${esc(PAT.mrn)}</p>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2.5">
          <button data-act="view360" class="h-10 rounded-2xl bg-brand-50 text-brand-700 text-[13px] font-600 tap inline-flex items-center justify-center gap-1.5">${svg("report", 15, 2)} 360° profile</button>
          <button data-act="share360" class="h-10 rounded-2xl bg-slate-100 text-slate-700 text-[13px] font-600 tap inline-flex items-center justify-center gap-1.5">${svg("share", 15, 2)} Share</button>
        </div>
      </div>

      <div class="px-5 mt-6 space-y-5">
        <div>
          <h2 class="font-display font-700 text-[16px] text-slate-900 mb-2.5 px-0.5">Clinic access</h2>
          ${pending.length ? cardWrap("", "", pendingHtml) + `<div class="h-2.5"></div>` : ""}
          ${cardWrap("", "", activeHtml || `<p class="text-[13px] text-slate-400 italic p-4">No clinic has access.</p>`)}
          <p class="text-[11.5px] text-slate-400 mt-2 px-1 leading-snug">You decide who sees your record and exactly which parts. Revoke anytime — instantly.</p>
        </div>

        ${cardWrap("Personal information",
          `<button data-act="editProfile" class="text-[12.5px] font-600 text-brand-600 tap">Edit</button>`,
          infoRow("Date of birth", PAT.dob + " · " + PAT.age)
          + infoRow("Phone", PAT.phone) + infoRow("Email", PAT.email)
          + infoRow("Address", PAT.address) + infoRow("Emergency", PAT.emergency))}

        ${cardWrap("Identity",
          `<span class="inline-flex items-center gap-1 text-[10px] font-600 text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">${svg("grant", 11, 2.4)} Verified</span>`,
          infoRow("CURP", PAT.curp, true) + infoRow("NSS", PAT.nss, true) + infoRow("Narzim MRN", PAT.mrn, true)
          + `<div class="px-4 py-2.5 bg-slate-50/60 text-[11px] text-slate-400 leading-snug">Your MRN is unique across the Narzim network and prevents duplicate records at any clinic.</div>`)}

        ${cardWrap("Preferences & privacy", "",
          toggleRow("Appointment & result alerts", "Texts when a clinic updates your record", true)
          + toggleRow("Approve every access request", "A one-time code confirms each grant", true)
          + toggleRow("Share new reports by default", "New clinics see reports only if you allow", false))}

        <div class="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
          <button data-act="signOut" class="w-full px-4 py-3.5 flex items-center gap-3 text-rose-600 text-[13.5px] font-600 tap">${svg("logout", 18, 2)} Log out</button>
        </div>
        <button data-act="requestDeletion" class="w-full text-center text-[12px] text-slate-400 py-1">Request data deletion</button>
      </div>
    </div>`;
  };

  // ══════════════════════════ REPORT / LAB VIEWER ══════════════════════════
  function dSection(label, body) {
    return `<section class="px-5 pt-4 pb-1 border-t border-slate-100">
      <div class="text-[10.5px] uppercase tracking-[0.16em] text-slate-500 font-700 mb-2.5 flex items-center gap-2"><span class="size-1 rounded-full bg-slate-400"></span>${label}</div>
      <div class="pb-3">${body}</div></section>`;
  }
  function openDoc(id) {
    const v = visit(id);
    if (!v) return;
    const c = clinic(v.clinic), d = doctor(v.doctor);

    let mid = "";
    if (v.category === "lab") {
      const rows = v.labs.map(l => {
        const f = l.flag === "high" ? "text-amber-600" : l.flag === "low" ? "text-sky-600" : "text-slate-900";
        return `<div class="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
          <div class="min-w-0"><p class="text-[13px] text-slate-800">${esc(l.test)}</p><p class="text-[11px] text-slate-400 font-mono">Ref ${esc(l.range)}</p></div>
          <div class="text-right shrink-0"><span class="font-mono font-700 text-[14px] ${f}">${esc(l.value)}</span> <span class="text-[11px] text-slate-400">${esc(l.unit)}</span>${l.flag !== "normal" ? `<span class="block text-[10px] font-700 uppercase ${f}">${esc(l.flag)}</span>` : ""}</div>
        </div>`;
      }).join("");
      mid = `<div class="px-5 pt-3 text-[11.5px] text-slate-500">Ordered by ${esc(v.orderedBy)}</div>
        <div class="px-5 pt-1">${rows}</div>
        ${v.education ? dSection("Note", `<p class="text-[13px] text-slate-700 leading-relaxed">${esc(v.education)}</p>`) : ""}`;
    } else {
      const vitals = v.vitals && Object.keys(v.vitals).length
        ? dSection("Vitals", `<div class="grid grid-cols-3 gap-y-3 gap-x-2">
            ${Object.entries({ weight: "kg", height: "cm", bp: "mmHg", hr: "bpm", temp: "°C", spo2: "%" }).map(([k, u]) => v.vitals[k] ? `<div><span class="text-[10px] uppercase tracking-wide text-slate-400 font-700 block">${k}</span><span class="font-mono font-700 text-[15px] text-slate-900">${esc(v.vitals[k])}</span> <span class="text-[10px] text-slate-400">${u}</span></div>` : "").join("")}
          </div>`) : "";
      const exam = v.exam && v.exam.length ? `<div class="space-y-1.5">${v.exam.map(([k, t]) => `<p class="text-[12.5px]"><span class="font-600 text-slate-800">${esc(k)}:</span> <span class="text-slate-600">${esc(t)}</span></p>`).join("")}</div>` : "";
      const dx = v.diagnoses.map(dd => `<li class="text-[12.5px] flex items-start gap-2 py-1"><span class="font-mono text-[10.5px] px-1.5 py-0.5 rounded shrink-0 ${dd.primary ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}">${esc(dd.code)}</span><span class="text-slate-800">${esc(dd.desc)}</span></li>`).join("");
      const rx = v.rx && v.rx.length ? `<div class="mt-2"><p class="text-[10.5px] uppercase tracking-wide text-slate-500 font-700 mb-1">Prescriptions</p><ul class="space-y-1">${v.rx.map(m => `<li class="text-[12.5px] text-slate-800">• <b>${esc(m.name)}</b> · ${esc(m.instr)}${m.days ? " · " + m.days + " days" : ""}</li>`).join("")}</ul></div>` : "";
      mid = `${dSection("Reason for visit", `<p class="text-[13px] text-slate-700">${esc(v.chiefComplaint)}</p>`)}
        ${vitals}
        ${dSection("Findings & diagnosis", `${exam}<ul class="mt-2">${dx}</ul>`)}
        ${dSection("Plan", `<p class="text-[13px] text-slate-700 leading-relaxed">${esc(v.plan)}</p>${rx}`)}
        ${v.education ? dSection("Guidance", `<p class="text-[13px] text-slate-700 leading-relaxed">${esc(v.education)}</p>`) : ""}`;
    }

    const body = `<div class="bg-white">
      <div class="h-1.5" style="background:${c.fg}"></div>
      <div class="px-5 pt-4 pb-4">
        <div class="flex items-center gap-3">
          <span class="size-11 rounded-xl grid place-items-center font-800 text-[14px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <div class="min-w-0"><p class="font-display font-800 text-[16px] text-slate-900 leading-tight truncate">${esc(c.name)}</p><p class="text-[11.5px] text-slate-500">${esc(c.type)} · ${esc(c.city)}</p></div>
        </div>
        <div class="mt-4 flex items-end justify-between gap-3">
          <div><p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-700">${v.category === "lab" ? "Laboratory report" : "Clinical visit report"}</p>
            <p class="font-display font-800 text-[19px] text-slate-900 leading-tight">${esc(v.type)}</p></div>
          <p class="text-[11px] text-slate-400 text-right shrink-0 font-mono">${esc(v.id)}</p>
        </div>
        <p class="text-[12px] text-slate-500 mt-1">${esc(v.dateLong)} · ${esc(v.time)}</p>
      </div>

      <div class="mx-5 mb-2 rounded-2xl bg-violet-50 border border-violet-100 p-4">
        <div class="flex items-center gap-2 mb-1.5"><span class="size-6 rounded-lg bg-violet-500 text-white grid place-items-center text-[12px] font-800 font-display">N</span><span class="text-[12px] font-700 text-violet-800">In plain words</span><span class="font-hand text-[15px] text-violet-500">Narzim AI</span></div>
        <p class="text-[13px] leading-relaxed text-slate-700">${esc(v.plain)}</p>
      </div>

      ${mid}

      <div class="px-5 pt-5 pb-7 border-t border-slate-100 mt-2">
        <div class="font-hand text-[24px] text-slate-900 leading-none border-b border-slate-300 pb-1 mb-2">${esc(d.name)}</div>
        <p class="text-[11.5px] text-slate-600"><span class="font-600 text-slate-800">${esc(d.name)}</span> · ${esc(d.role)}</p>
        <p class="text-[11px] text-slate-500">Céd. ${esc(d.license)} · signed ${esc(v.dateLong)}</p>
      </div>
    </div>`;

    setStatusBar(false);
    openSheet(fullPage({
      title: v.type,
      headRight: `<button data-act="share360" class="size-10 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 tap">${svg("share", 18, 2)}</button>`,
      onBack: "closeSheet",
      body,
    }));
  };

  // ══════════════════════════ 360° PROFILE ══════════════════════════
  function attr(s) {
    if (s.kind === "self") return `<span class="text-[10.5px] text-brand-600 font-600">You · ${esc(s.date)}</span>`;
    const c = clinic(s.clinic), d = doctor(s.doctor);
    return `<span class="text-[10.5px] text-slate-400">${esc(c.initials)} · ${esc(s.date)}</span>`;
  }
  function dRow(name, meta, source) {
    return `<div class="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div class="min-w-0"><div class="text-[13px] font-600 text-slate-900">${name}</div>${meta ? `<div class="text-[11.5px] text-slate-500">${meta}</div>` : ""}</div>
      <div class="text-right shrink-0 pt-0.5">${attr(source)}</div></div>`;
  }
  function open360() {
    const M = state.medical;
    const allergies = M.allergies.map(a => dRow(`${esc(a.name)} <span class="text-[10px] font-700 text-rose-600">(${esc(a.severity)})</span>`, esc(a.reaction), a.source)).join("") || `<p class="text-[12px] text-slate-400 italic">None recorded.</p>`;
    const conditions = M.conditions.map(c => dRow(esc(c.name), `${esc(c.status)} · since ${esc(c.since)}`, c.source)).join("") || `<p class="text-[12px] text-slate-400 italic">None recorded.</p>`;
    const meds = M.medications.map(m => dRow(esc(m.name), esc(m.instr), m.source)).join("") || `<p class="text-[12px] text-slate-400 italic">None recorded.</p>`;
    const imm = M.immunizations.map(v => dRow(esc(v.name), "Given " + esc(v.date), v.source)).join("");

    const byClinic = {};
    P.VISITS.forEach(v => { (byClinic[v.clinic] = byClinic[v.clinic] || []).push(v); });
    const visitsHtml = Object.keys(byClinic).map(cid => {
      const c = clinic(cid);
      const rows = byClinic[cid].map(v => `<li class="flex items-center justify-between gap-2 py-1.5 text-[12px]"><span class="text-slate-700 truncate">${esc(v.type)}</span><span class="text-slate-400 shrink-0">${esc(v.date)}</span></li>`).join("");
      return `<div class="mb-3 last:mb-0">
        <div class="flex items-center gap-2 mb-1"><span class="inline-grid place-items-center size-5 rounded text-[9px] font-800" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span><span class="text-[12px] font-700 text-slate-800 truncate">${esc(c.name)}</span></div>
        <ul class="pl-6 divide-y divide-slate-100 border-l border-slate-100">${rows}</ul></div>`;
    }).join("");

    const body = `<div class="bg-white">
      <div class="h-1.5" style="background:linear-gradient(90deg,#33B1F0,#0098E4 50%,#006093)"></div>
      <div class="px-5 pt-5 pb-4 border-b border-dashed border-slate-300">
        <div class="flex items-center gap-2.5 mb-4">
          <span class="logo-mark" style="width:34px;height:34px"></span>
          <div><div class="font-display font-800 text-[17px] text-slate-900 leading-none">Narzim</div><div class="text-[10.5px] text-slate-500 mt-0.5">360° Health Profile · compiled ${esc(today)}</div></div>
        </div>
        <p class="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-700">Patient</p>
        <p class="text-[20px] font-800 text-slate-900 leading-tight font-display">${esc(PAT.name)}</p>
        <p class="text-[12px] text-slate-600 mt-0.5">${esc(PAT.sexLabel)} · ${esc(PAT.age)} · DOB ${esc(PAT.dob)} · ${esc(PAT.bloodType)}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div><span class="text-[9.5px] uppercase tracking-wide text-slate-400 font-700 block">Narzim MRN</span><span class="font-mono font-700 text-slate-900">${esc(PAT.mrn)}</span></div>
          <div><span class="text-[9.5px] uppercase tracking-wide text-slate-400 font-700 block">CURP</span><span class="font-mono text-slate-700 text-[10.5px]">${esc(PAT.curp)}</span></div>
        </div>
      </div>
      <div class="mx-5 my-4 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[11.5px] text-slate-600 flex gap-2.5">
        <span class="text-brand-500 shrink-0 mt-0.5">${svg("self", 14, 2)}</span>
        <p>Compiled by Narzim from <b>${Object.keys(byClinic).length} clinics</b>. Every entry shows who recorded it; <b>self-reported</b> items were added by you.</p>
      </div>
      ${dSection("Allergies", allergies)}
      ${dSection("Conditions", conditions)}
      ${dSection("Current medications", meds)}
      ${dSection("Immunizations", imm)}
      ${dSection("Visit history", visitsHtml)}
      <div class="px-5 pt-5 pb-7 border-t border-slate-100 text-[10.5px] text-slate-500 leading-snug">
        <p class="font-700 text-slate-700 mb-0.5">Authenticity</p>
        Generated by Narzim Health Network. Verify at narzim.mx/verify with code <span class="font-mono">NZ-${esc(PAT.mrn.slice(-4))}-7K2D</span>.
      </div>
    </div>`;

    setStatusBar(true);
    openSheet(fullPage({
      title: "360° Health Profile",
      brand: true,
      onBack: "closeFull",
      headRight: `<button data-act="share360" class="h-9 px-3.5 rounded-full bg-white/15 border border-white/25 text-white text-[12.5px] font-600 tap inline-flex items-center gap-1.5">${svg("share", 14, 2)} Share</button>`,
      body,
    }));
  }

  // ══════════════════════════ SHARE ══════════════════════════
  function openShare() {
    const link = "narzim.mx/s/" + PAT.mrn.slice(-4).toLowerCase() + "x7k2d";
    openSheet(bottomSheet({
      title: "Share your profile",
      maxH: 70,
      body: `<p class="text-[12.5px] text-slate-500 -mt-1 mb-3">Works for any clinic — even ones not on Narzim.</p>
        <div class="space-y-2.5">
          <button data-act="downloadPdf" class="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition text-left tap">
            <span class="size-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center shrink-0">${svg("lab", 18, 2)}</span>
            <div class="flex-1 min-w-0"><p class="text-[13.5px] font-600 text-slate-900">Download PDF</p><p class="text-[12px] text-slate-500">A complete branded summary to print or email.</p></div>
            <span class="text-slate-300">${svg("chev", 16, 2)}</span>
          </button>
          <div class="p-3.5 rounded-2xl border border-slate-200">
            <div class="flex items-center gap-2 mb-2"><span class="size-7 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">${svg("access", 15, 2)}</span><p class="text-[13.5px] font-600 text-slate-900">Secure link</p></div>
            <div class="flex items-center gap-2">
              <input id="shareLink" readonly value="${esc(link)}" class="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-[12px] font-mono text-slate-600" />
              <button data-act="copyLink" class="h-10 px-4 rounded-xl bg-slate-900 text-white text-[12.5px] font-600 tap">Copy</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Read-only · expires in 7 days · no account needed.</p>
          </div>
          <form data-act="emailShare" class="p-3.5 rounded-2xl border border-slate-200">
            <div class="flex items-center gap-2 mb-2"><span class="size-7 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">${svg("grant", 15, 2)}</span><p class="text-[13.5px] font-600 text-slate-900">Email to a clinic</p></div>
            <div class="flex items-center gap-2">
              <input name="email" type="email" required placeholder="clinic@example.com" class="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-[12.5px] text-slate-700" />
              <button type="submit" class="h-10 px-4 rounded-xl bg-brand-500 text-white text-[12.5px] font-600 tap">Send</button>
            </div>
          </form>
        </div>`,
    }));
  }

  // ══════════════════════════ ADD HEALTH ITEM ══════════════════════════
  function openAddItem(type) {
    const cfg = { allergy: "Add an allergy", condition: "Add a condition", medication: "Add a medication" }[type] || "Add item";
    const fields = {
      allergy: `
        <label class="block"><span class="lbl">Allergen</span><input name="name" required placeholder="e.g. Shellfish" class="inp" /></label>
        <label class="block"><span class="lbl">Severity</span><select name="severity" class="inp"><option>Mild</option><option>Moderate</option><option>Severe</option></select></label>
        <label class="block"><span class="lbl">Reaction</span><input name="reaction" placeholder="e.g. Itching, swelling" class="inp" /></label>`,
      condition: `
        <label class="block"><span class="lbl">Condition</span><input name="name" required placeholder="e.g. Migraine" class="inp" /></label>
        <label class="block"><span class="lbl">Status</span><input name="status" value="Active" class="inp" /></label>
        <label class="block"><span class="lbl">Since</span><input name="since" placeholder="e.g. 2024" class="inp" /></label>`,
      medication: `
        <label class="block"><span class="lbl">Medication</span><input name="name" required placeholder="e.g. Vitamin D 1000 IU" class="inp" /></label>
        <label class="block"><span class="lbl">Instructions</span><input name="instr" placeholder="e.g. 1 daily with food" class="inp" /></label>
        <label class="block"><span class="lbl">Since</span><input name="since" placeholder="e.g. 2025" class="inp" /></label>`,
    }[type];

    openSheet(bottomSheet({
      title: cfg, maxH: 80,
      body: `<form data-act="submitItem" data-arg="${esc(type)}" class="space-y-3">
        ${fields}
        <div class="flex items-start gap-2 text-[11.5px] text-slate-500 bg-slate-50 rounded-xl p-2.5">${svg("self", 14, 2)}<span>Saved as <b>self-reported</b> so clinicians know it came from you.</span></div>
        <div class="flex gap-2 pt-1">
          <button type="button" data-close class="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 text-[13.5px] font-600 tap">Cancel</button>
          <button type="submit" class="flex-1 h-11 rounded-2xl bg-brand-500 text-white text-[13.5px] font-600 tap">Add to record</button>
        </div>
      </form>`,
    }));
  }

  // ══════════════════════════ CONSENT (grant w/ OTP · manage) ══════════════════════════
  function sectionChecklist(selected) {
    return P.SECTIONS.map(s => {
      const on = selected.includes(s.key);
      return `<label class="flex items-center gap-3 px-3 py-2.5 rounded-xl border ${on ? "border-brand-200 bg-brand-50/50" : "border-slate-200"} cursor-pointer transition">
        <input type="checkbox" name="sec" value="${s.key}" ${on ? "checked" : ""} class="size-4 accent-brand-500" />
        <span class="flex-1 min-w-0"><span class="text-[13px] font-600 text-slate-900 block">${esc(s.label)}</span><span class="text-[11.5px] text-slate-500">${esc(s.desc)}</span></span>
      </label>`;
    }).join("");
  }
  function openConsent(cid, mode) {
    const c = clinic(cid);
    const rec = state.access.find(a => a.clinic === cid) || { sections: ["demographics"] };
    const isGrant = mode === "grant";
    openSheet(bottomSheet({
      title: isGrant ? `Grant ${c.name} access` : `Edit what ${c.name} sees`,
      maxH: 86,
      body: `<form data-act="${isGrant ? "confirmGrant" : "saveConsent"}" data-arg="${esc(cid)}">
        <p class="text-[12.5px] text-slate-500 -mt-1 mb-3">${isGrant ? "Choose what they can see, then confirm with the code we text you." : "Changes apply immediately."}</p>
        <div class="space-y-2">${sectionChecklist(rec.sections)}</div>
        ${isGrant ? `
          <div class="mt-4 pt-4 border-t border-slate-100">
            <p class="text-[12.5px] text-slate-600">Enter the 6-digit code sent to <b>${esc(PAT.phone)}</b></p>
            <div class="mt-2 flex items-center gap-2">
              <input name="otp" inputmode="numeric" maxlength="6" placeholder="••••••" class="inp font-mono text-center text-[16px]" style="letter-spacing:.4em" />
              <button type="button" data-act="resendOtp" class="h-[46px] px-3 rounded-xl border border-slate-200 text-slate-500 text-[12px] font-600 tap shrink-0">Resend</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1.5">Demo code: <span class="font-mono font-700 text-slate-500">${DEMO_OTP}</span></p>
          </div>` : ""}
        <div class="flex gap-2 pt-4">
          <button type="button" data-close class="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 text-[13.5px] font-600 tap">Cancel</button>
          <button type="submit" class="flex-1 h-11 rounded-2xl ${isGrant ? "bg-amber-500" : "bg-brand-500"} text-white text-[13.5px] font-600 tap">${isGrant ? "Confirm &amp; grant" : "Save changes"}</button>
        </div>
      </form>`,
    }));
  }

  // ══════════════════════════ EDIT PROFILE / DELETION ══════════════════════════
  function openEditProfile() {
    openSheet(bottomSheet({
      title: "Edit information", maxH: 80,
      body: `<form data-act="saveProfile" class="space-y-3">
        <label class="block"><span class="lbl">Phone</span><input name="phone" value="${esc(PAT.phone)}" class="inp" /></label>
        <label class="block"><span class="lbl">Email</span><input name="email" value="${esc(PAT.email)}" class="inp" /></label>
        <label class="block"><span class="lbl">Address</span><input name="address" value="${esc(PAT.address)}" class="inp" /></label>
        <label class="block"><span class="lbl">Emergency contact</span><input name="emergency" value="${esc(PAT.emergency)}" class="inp" /></label>
        <div class="flex items-start gap-2 text-[11.5px] text-slate-500 bg-slate-50 rounded-xl p-2.5">${svg("access", 14, 2)}<span>CURP, NSS and MRN are verified identifiers and can't be edited here.</span></div>
        <div class="flex gap-2 pt-1">
          <button type="button" data-close class="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 text-[13.5px] font-600 tap">Cancel</button>
          <button type="submit" class="flex-1 h-11 rounded-2xl bg-brand-500 text-white text-[13.5px] font-600 tap">Save</button>
        </div>
      </form>`,
    }));
  }
  function openDeletion() {
    openSheet(bottomSheet({
      title: "Request data deletion", maxH: 78,
      body: `<form data-act="confirmDeletion" class="space-y-3">
        <div class="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-[12px] text-rose-800 space-y-1.5">
          <p class="font-600">What happens:</p>
          <ul class="list-disc pl-4 space-y-1 text-rose-700/90">
            <li>Your Narzim profile and identity are permanently removed.</li>
            <li>All clinic access is revoked immediately.</li>
            <li>Clinics keep their own legally-required records.</li>
            <li>Processed within 30 days, with email confirmation.</li>
          </ul>
        </div>
        <label class="block"><span class="lbl">Type DELETE to confirm</span><input name="confirm" required placeholder="DELETE" class="inp" /></label>
        <div class="flex gap-2 pt-1">
          <button type="button" data-close class="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 text-[13.5px] font-600 tap">Keep my data</button>
          <button type="submit" class="flex-1 h-11 rounded-2xl bg-rose-600 text-white text-[13.5px] font-600 tap">Submit request</button>
        </div>
      </form>`,
    }));
  }

  // ══════════════════════════ APPT DETAIL ══════════════════════════
  function openApptDetail(id) {
    const a = state.appts.find(x => x.id === id);
    if (!a) return;
    const d = A.doc(a.doctor), c = clinic(d.clinic), sp = A.spec(a.spec);
    openSheet(bottomSheet({
      title: "Appointment", maxH: 72,
      body: `<div class="flex items-center gap-3.5 pb-3 border-b border-slate-100">
          <span class="size-12 rounded-2xl grid place-items-center font-800 text-[14px] shrink-0" style="background:${d.swatch};color:${d.fgc}">${esc(c.initials)}</span>
          <div class="min-w-0"><p class="text-[15px] font-700 text-slate-900 truncate">${esc(d.name)}</p><p class="text-[12.5px] text-slate-500 truncate">${esc(sp ? sp.label : "")} · ${esc(c.name)}</p></div>
        </div>
        <div class="py-3 space-y-2.5 text-[13px]">
          <div class="flex items-center gap-2.5 text-slate-700">${svg("calendar", 16, 2)} ${esc(A.fmtDateLong(a.date))}</div>
          <div class="flex items-center gap-2.5 text-slate-700">${svg("clock", 16, 2)} ${esc(a.time)}</div>
          <div class="flex items-center gap-2.5 text-slate-700">${a.mode === "video" ? svg("video", 16, 2) + " Video visit" : svg("pin", 16, 2) + " In person · " + esc(c.city)}</div>
          <div class="flex items-start gap-2.5 text-slate-700">${svg("info", 16, 2)} <span class="flex-1">${esc(a.reason)}</span></div>
        </div>
        <div class="flex gap-2 pt-2">
          ${a.mode === "video"
            ? `<button data-act="joinVideo" data-arg="${esc(a.id)}" class="flex-1 h-11 rounded-2xl bg-emerald-500 text-white text-[13.5px] font-600 tap inline-flex items-center justify-center gap-1.5">${svg("video", 16, 2)} Join video</button>`
            : `<button data-act="directions" data-arg="${esc(a.id)}" class="flex-1 h-11 rounded-2xl bg-slate-100 text-slate-700 text-[13.5px] font-600 tap inline-flex items-center justify-center gap-1.5">${svg("map", 16, 2)} Directions</button>`}
          <button data-act="reschedule" data-arg="${esc(a.id)}" class="h-11 px-4 rounded-2xl bg-slate-100 text-slate-700 text-[13.5px] font-600 tap">Reschedule</button>
        </div>`,
    }));
  }

  // ── form helper ──
  function formData(el) {
    const f = el.closest("form") || el;
    const o = {};
    $$("input,select,textarea", f).forEach(i => { if (i.name) o[i.name] = i.value.trim(); });
    o._secs = $$("input[name=sec]:checked", f).map(i => i.value);
    return o;
  }
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);

  // ══════════════════════════ ACTIONS ══════════════════════════
  Object.assign(actions, {
    view360: open360,
    share360: openShare,
    openDoc: (id) => openDoc(id),
    addItem: (t) => openAddItem(t),
    editProfile: openEditProfile,
    requestDeletion: openDeletion,
    manageConsent: (cid) => openConsent(cid, "manage"),
    reviewReq: (cid) => openConsent(cid, "grant"),
    viewAppt: (id) => openApptDetail(id),

    closeFull: () => { NZA.closeSheet(); setStatusBar(false); },
    closeSheet: () => { NZA.closeSheet(); setStatusBar(false); },

    setApptTab: (t) => { state.apptTab = t; render.appts(); },

    togglePreCheck: (arg) => {
      const [apptId, itemKey] = arg.split("|");
      if (!state.preVisitChecks[apptId]) state.preVisitChecks[apptId] = {};
      const checks = state.preVisitChecks[apptId];
      checks[itemKey] = !checks[itemKey];
      const allDone = PRE_VISIT_ITEMS.every(i => checks[i.key]);
      if (allDone) toast("All pre-visit tasks complete!", "ok");
      if (state.view === "appts") render.appts(); else render.home();
    },
    joinVideo: () => toast("Connecting to your video visit…", "info"),
    directions: () => toast("Opening directions in Maps…", "info"),

    cancelAppt: (id) => {
      const a = state.appts.find(x => x.id === id);
      if (!a) return;
      openSheet(bottomSheet({
        title: "Cancel appointment?", maxH: 50,
        body: `<p class="text-[13px] text-slate-600 -mt-1">This frees the slot for other patients. You can always book again.</p>
          <div class="flex gap-2 pt-4">
            <button type="button" data-close class="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 text-[13.5px] font-600 tap">Keep it</button>
            <button data-act="confirmCancel" data-arg="${esc(id)}" class="flex-1 h-11 rounded-2xl bg-rose-600 text-white text-[13.5px] font-600 tap">Cancel appointment</button>
          </div>`,
      }));
    },
    confirmCancel: (id) => {
      state.appts = state.appts.filter(x => x.id !== id);
      closeSheet(); render.appts(); toast("Appointment cancelled", "warn");
    },

    print: () => { closeSheet(); setStatusBar(false); toast("Opening print…", "info"); },
    downloadPdf: () => toast("Preparing your PDF…", "info"),
    copyLink: () => {
      const inp = $("#shareLink");
      if (inp) { inp.select(); try { document.execCommand("copy"); } catch (e) {} }
      toast("Link copied to clipboard");
    },
    emailShare: (_a, el) => { const d = formData(el); closeSheet(); toast("Profile sent to " + (d.email || "clinic")); },

    submitItem: (type, el) => {
      const d = formData(el);
      if (!d.name) { toast("Enter a name first", "warn"); return; }
      const M = state.medical, source = { kind: "self", date: today };
      if (type === "allergy") M.allergies.unshift({ id: uid("al"), name: d.name, severity: d.severity || "Mild", reaction: d.reaction || "—", source });
      if (type === "condition") M.conditions.unshift({ id: uid("co"), name: d.name, status: d.status || "Active", since: d.since || "—", source });
      if (type === "medication") M.medications.unshift({ id: uid("me"), name: d.name, instr: d.instr || "—", since: d.since || "—", active: true, source });
      state.timeline.unshift({ id: uid("t"), date: "Today", ago: "Just now", kind: type === "medication" ? "med" : (type === "condition" ? "report" : "allergy"), actor: "self", title: "You added " + (type === "allergy" ? "an allergy" : "a " + type), desc: d.name + " — self-reported." });
      closeSheet(); render.records(); toast(d.name + " added to your record");
    },

    confirmGrant: (cid, el) => {
      const d = formData(el);
      if (d.otp !== DEMO_OTP) { toast("Incorrect code — try " + DEMO_OTP, "warn"); return; }
      const c = clinic(cid);
      const rec = state.access.find(a => a.clinic === cid);
      const secs = d._secs.length ? d._secs : ["demographics"];
      if (rec) { rec.status = "active"; rec.sections = secs; rec.grantedAt = today; rec.lastViewed = "—"; delete rec.requestedAt; }
      state.timeline = state.timeline.filter(t => !(t.kind === "access-request" && t.clinic === cid));
      state.timeline.unshift({ id: uid("t"), date: "Today", ago: "Just now", kind: "access-grant", clinic: cid, title: "You granted " + c.name + " access", desc: "They can now see " + secs.length + " section" + (secs.length > 1 ? "s" : "") + " of your record." });
      closeSheet();
      render[state.view] ? render[state.view]() : render.home();
      toast(c.name + " now has access");
    },
    saveConsent: (cid, el) => {
      const d = formData(el);
      const rec = state.access.find(a => a.clinic === cid);
      if (rec) rec.sections = d._secs.length ? d._secs : ["demographics"];
      closeSheet(); render.profile(); toast("Sharing settings updated");
    },
    resendOtp: () => toast("New code sent — demo code is " + DEMO_OTP, "info"),

    denyReq: (cid) => {
      state.access = state.access.filter(a => !(a.clinic === cid && a.status === "pending"));
      state.timeline = state.timeline.filter(t => t.kind !== "access-request" || t.clinic !== cid);
      closeSheet(); render[state.view] ? render[state.view]() : render.home();
      toast("Request denied", "warn");
    },
    revoke: (cid) => {
      const c = clinic(cid);
      state.access = state.access.filter(a => a.clinic !== cid);
      state.timeline.unshift({ id: uid("t"), date: "Today", ago: "Just now", kind: "access-revoke", clinic: cid, title: "You revoked " + c.name + "'s access", desc: "They can no longer view any part of your record." });
      render.profile(); toast(c.name + " can no longer see your record");
    },

    toggle: (_a, el) => el.classList.toggle("on"),
    removeSelf: (id) => {
      ["allergies", "conditions", "medications", "immunizations"].forEach(k => { state.medical[k] = state.medical[k].filter(x => x.id !== id); });
      render.records(); toast("Removed from your record");
    },
    saveProfile: (_a, el) => {
      const d = formData(el);
      ["phone", "email", "address", "emergency"].forEach(k => { if (d[k]) PAT[k] = d[k]; });
      closeSheet(); render.profile(); toast("Profile updated");
    },
    confirmDeletion: (_a, el) => {
      const d = formData(el);
      if ((d.confirm || "").toUpperCase() !== "DELETE") { toast('Type "DELETE" to confirm', "warn"); return; }
      closeSheet(); toast("Deletion request submitted · ref NZ-DEL-" + Math.floor(Math.random() * 9000 + 1000));
    },
    signOut: () => {
      openSheet(`<div class="absolute inset-0 z-[100] grid place-items-center fade" style="background:linear-gradient(150deg,#0098E4,#003E5C)">
        <div class="text-center">
          <span class="logo-mark mx-auto" style="width:48px;height:48px"></span>
          <h2 class="mt-4 font-display font-800 text-white text-[22px]">Signing you out…</h2>
          <p class="mt-1 text-brand-100 text-[13px]">See you soon.</p>
        </div></div>`);
      setTimeout(() => { NZA.closeSheet(); if (NZA.auth) NZA.auth.logout(); else window.location.href = "Narzim Login.html?tab=patient"; }, 950);
    },
  });
})();
