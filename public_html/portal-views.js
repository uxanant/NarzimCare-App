// ═══════════════════════════════════════════════════════════════
// Narzim Patient Portal — views: Home · Health · Access · Settings
// ═══════════════════════════════════════════════════════════════
(function () {
  const { P, $, esc, state, clinic, doctor, svg, timelineStyle, toast, setView, actions } = NZ;
  const PAT = P.PATIENT;

  // ── source line (who recorded a fact) ──
  function sourceTag(s) {
    if (s.kind === "self") {
      return `<span class="inline-flex items-center gap-1 text-[11.5px] font-600 text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-2 py-0.5">${svg("self", 11, 2)} Self-reported · ${esc(s.date)}</span>`;
    }
    const c = clinic(s.clinic), d = doctor(s.doctor);
    return `<span class="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
      <span class="inline-grid place-items-center size-4 rounded text-[8px] font-800" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
      <span class="text-slate-600 font-600">${esc(c.name)}</span><span class="text-slate-400">·</span>${esc(d ? d.name : "")}<span class="text-slate-400">·</span>${esc(s.date)}</span>`;
  }
  const lockChip = `<span class="inline-flex items-center gap-1 text-[10.5px] font-600 text-slate-400" title="Recorded by a clinic — read-only">${svg("access", 11, 2)} Verified</span>`;

  // ══════════════ HOME ══════════════
  NZ.render.home = function () {
    const pending = state.access.filter(a => a.status === "pending");
    const pendingBanner = pending.map(a => {
      const c = clinic(a.clinic);
      return `<div class="pop rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3.5">
        <span class="size-10 rounded-xl grid place-items-center font-800 text-[13px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
        <div class="flex-1 min-w-0">
          <p class="text-[14px] font-600 text-slate-900">${esc(c.name)} wants access to your profile</p>
          <p class="text-[12.5px] text-amber-700">Requested ${esc(a.requestedAt)} · review what they'll be able to see.</p>
        </div>
        <button data-act="reviewReq" data-arg="${esc(a.clinic)}" class="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-600 transition shrink-0">Review</button>
      </div>`;
    }).join("");

    const items = state.timeline.map((t, i) => {
      const st = timelineStyle(t.kind);
      const c = t.clinic ? clinic(t.clinic) : null;
      const who = t.actor === "self" ? "You" : (c ? c.name : "Narzim");
      const cta = t.refId
        ? `<button data-act="openDoc" data-arg="${esc(t.refId)}" class="mt-2 inline-flex items-center gap-1 text-[12.5px] font-600 text-brand-600 hover:text-brand-700">View ${NZ.visit(t.refId) && NZ.visit(t.refId).category === "lab" ? "results" : "report"} ${svg("chev", 13, 2.2)}</button>`
        : (t.kind === "access-request"
            ? `<button data-act="reviewReq" data-arg="${esc(t.clinic)}" class="mt-2 inline-flex items-center gap-1 text-[12.5px] font-600 text-amber-600 hover:text-amber-700">Review request ${svg("chev", 13, 2.2)}</button>`
            : "");
      const last = i === state.timeline.length - 1;
      return `<li class="relative pl-12 ${last ? "" : "pb-6"}">
        ${last ? "" : `<span class="absolute left-[19px] top-9 bottom-0 w-px bg-slate-200"></span>`}
        <span class="absolute left-0 top-0 size-10 rounded-full grid place-items-center ring-4 ring-white" style="background:${st.bg};color:${st.fg}">${svg(st.icon, 18, 2)}</span>
        <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm px-4 py-3.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[14px] font-600 text-slate-900">${esc(t.title)}</p>
            <span class="text-[11.5px] text-slate-400 shrink-0">${esc(t.ago)}</span>
          </div>
          <p class="text-[12.5px] text-slate-500 mt-0.5">${esc(t.desc)}</p>
          <div class="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-slate-400">
            ${c ? `<span class="inline-grid place-items-center size-4 rounded text-[8px] font-800" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>` : `<span class="inline-grid place-items-center size-4 rounded text-[8px] font-800 bg-brand-100 text-brand-700">N</span>`}
            <span>${esc(who)}</span>
          </div>
          ${cta}
        </div>
      </li>`;
    }).join("");

    $("#view-home").innerHTML = `
      <div class="pop mx-auto max-w-3xl">
        <p class="font-hand text-[24px] text-brand-500 leading-none">¡Hola!</p>
        <h1 class="font-display font-800 text-[30px] sm:text-[34px] text-slate-900 leading-tight">Hello, ${esc(PAT.first)}</h1>
        <p class="mt-1 text-[14.5px] text-slate-500">Everything from every clinic you visit, in one place.</p>

        <!-- 360 card -->
        <div class="mt-6 rounded-2xl overflow-hidden shadow-sm border border-brand-200/60" style="background:linear-gradient(135deg,#0098E4,#006093)">
          <div class="p-5 sm:p-6 flex items-center gap-5 flex-wrap">
            <div class="flex-1 min-w-[200px]">
              <div class="flex items-center gap-2 text-white/75 text-[11.5px] font-700 uppercase tracking-wider">${svg("self", 13, 2)} Narzim 360° profile</div>
              <p class="font-display font-800 text-white text-[20px] mt-1 leading-tight">Your complete medical record</p>
              <p class="text-brand-100 text-[13px] mt-1">One compiled, branded summary you can share with any clinic — even one not on Narzim.</p>
              <div class="mt-3 flex items-center gap-2 text-[11.5px] text-brand-100">
                <span class="font-mono bg-white/15 rounded px-2 py-0.5">MRN ${esc(PAT.mrn)}</span>
              </div>
            </div>
            <div class="flex flex-col gap-2 w-full sm:w-auto">
              <button data-act="view360" class="h-10 px-5 rounded-xl bg-white text-brand-700 text-[13.5px] font-600 hover:bg-brand-50 transition">View profile</button>
              <button data-act="share360" class="h-10 px-5 rounded-xl bg-white/15 border border-white/25 text-white text-[13.5px] font-600 hover:bg-white/25 transition">Share / export</button>
            </div>
          </div>
        </div>

        ${pendingBanner ? `<div class="mt-5 space-y-3">${pendingBanner}</div>` : ""}

        <!-- timeline -->
        <div class="mt-7 flex items-center justify-between">
          <h2 class="font-display font-700 text-[18px] text-slate-900">Recent activity</h2>
          <span class="text-[12.5px] text-slate-400">${state.timeline.length} events · ${Object.keys(P.CLINICS).length} clinics</span>
        </div>
        <ul class="mt-4">${items}</ul>
      </div>`;
  };

  // ══════════════ HEALTH RECORD ══════════════
  function recordCard(item, body, removable) {
    return `<div class="rounded-xl border border-slate-200/80 bg-white p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">${body}</div>
        <div class="flex items-center gap-2 shrink-0">
          ${item.source.kind === "clinic" ? lockChip : ""}
          ${removable ? `<button data-act="removeSelf" data-arg="${esc(item.id)}" class="size-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 grid place-items-center transition" title="Remove">${svg("revoke", 14, 2)}</button>` : ""}
        </div>
      </div>
      <div class="mt-2.5 pt-2.5 border-t border-slate-100">${sourceTag(item.source)}</div>
    </div>`;
  }

  function healthSection(title, addType, addLabel, rows) {
    return `<div class="pop rounded-2xl bg-white/60 border border-slate-200/70 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
        <h2 class="font-display font-700 text-[16px] text-slate-900">${title}</h2>
        ${addType ? `<button data-act="addItem" data-arg="${addType}" class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[12.5px] font-600 transition">+ ${addLabel}</button>` : ""}
      </div>
      <div class="p-4 grid sm:grid-cols-2 gap-3">${rows || `<p class="text-[13px] text-slate-400 italic p-2">Nothing recorded yet.</p>`}</div>
    </div>`;
  }

  NZ.render.health = function () {
    const M = state.medical;
    const sevColor = (s) => ({ Severe: "bg-rose-100 text-rose-700", Moderate: "bg-amber-100 text-amber-700", Mild: "bg-slate-100 text-slate-600" }[s] || "bg-slate-100 text-slate-600");

    const allergies = M.allergies.map(a => recordCard(a, `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[14.5px] font-600 text-slate-900">${esc(a.name)}</span>
        <span class="text-[10.5px] font-700 px-2 py-0.5 rounded-full ${sevColor(a.severity)}">${esc(a.severity)}</span>
      </div>
      <p class="text-[12.5px] text-slate-500 mt-1">${esc(a.reaction)}</p>`, a.source.kind === "self")).join("");

    const conditions = M.conditions.map(c => recordCard(c, `
      <span class="text-[14.5px] font-600 text-slate-900">${esc(c.name)}</span>
      <p class="text-[12.5px] text-slate-500 mt-1">${esc(c.status)} · since ${esc(c.since)}</p>`, c.source.kind === "self")).join("");

    const meds = M.medications.map(m => recordCard(m, `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[14.5px] font-600 text-slate-900">${esc(m.name)}</span>
        ${m.active ? `<span class="text-[10.5px] font-700 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>` : ""}
      </div>
      <p class="text-[12.5px] text-slate-500 mt-1">${esc(m.instr)} · since ${esc(m.since)}</p>`, m.source.kind === "self")).join("");

    const imm = M.immunizations.map(v => recordCard(v, `
      <span class="text-[14.5px] font-600 text-slate-900">${esc(v.name)}</span>
      <p class="text-[12.5px] text-slate-500 mt-1">Given ${esc(v.date)}</p>`, v.source.kind === "self")).join("");

    const visits = P.VISITS.map(v => {
      const c = clinic(v.clinic);
      return `<button data-act="openDoc" data-arg="${esc(v.id)}" class="w-full flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/70 transition text-left">
        <span class="size-10 rounded-xl grid place-items-center font-800 text-[12px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
        <div class="flex-1 min-w-0">
          <p class="text-[14px] font-600 text-slate-900 truncate">${esc(v.type)} <span class="text-slate-400 font-400">· ${esc(v.category === "lab" ? "Lab" : "Report")}</span></p>
          <p class="text-[12.5px] text-slate-500">${esc(c.name)} · ${esc(v.date)}</p>
        </div>
        <span class="text-slate-300">${svg("chev", 16, 2)}</span>
      </button>`;
    }).join("");

    $("#view-health").innerHTML = `
      <div class="pop mx-auto max-w-4xl">
        <div class="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 class="font-display font-800 text-[30px] text-slate-900 leading-tight">Health record</h1>
            <p class="mt-1 text-[14.5px] text-slate-500">Compiled from every clinic. <span class="text-slate-400">Clinic entries are verified & read-only — you can add your own anytime.</span></p>
          </div>
          <button data-act="view360" class="h-10 px-4 rounded-xl bg-slate-900 text-white text-[13px] font-600 hover:bg-slate-800 transition inline-flex items-center gap-2">${svg("report", 15, 2)} Open 360° summary</button>
        </div>
        <div class="mt-6 space-y-5">
          ${healthSection("Allergies", "allergy", "Add allergy", allergies)}
          ${healthSection("Conditions", "condition", "Add condition", conditions)}
          ${healthSection("Medications", "medication", "Add medication", meds)}
          ${healthSection("Immunizations", null, "", imm)}
          <div class="pop rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100"><h2 class="font-display font-700 text-[16px] text-slate-900">Visit history</h2></div>
            <div class="divide-y divide-slate-100">${visits}</div>
          </div>
        </div>
      </div>`;
  };

  // ══════════════ ACCESS ══════════════
  NZ.render.access = function () {
    const secLabel = (k) => (P.SECTIONS.find(s => s.key === k) || { label: k }).label;
    const pending = state.access.filter(a => a.status === "pending");
    const active = state.access.filter(a => a.status === "active");

    const pendingHtml = pending.map(a => {
      const c = clinic(a.clinic);
      return `<div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <div class="flex items-center gap-3.5">
          <span class="size-11 rounded-xl grid place-items-center font-800 text-[13px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-[14.5px] font-600 text-slate-900">${esc(c.name)}</p>
            <p class="text-[12.5px] text-amber-700">${esc(c.type)} · requested ${esc(a.requestedAt)}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button data-act="denyReq" data-arg="${esc(a.clinic)}" class="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12.5px] font-600 hover:bg-slate-50 transition">Deny</button>
            <button data-act="reviewReq" data-arg="${esc(a.clinic)}" class="h-9 px-3.5 rounded-lg bg-amber-500 text-white text-[12.5px] font-600 hover:bg-amber-600 transition">Review &amp; grant</button>
          </div>
        </div>
      </div>`;
    }).join("");

    const activeHtml = active.map(a => {
      const c = clinic(a.clinic);
      const chips = a.sections.map(k => `<span class="text-[11px] font-500 bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">${esc(secLabel(k))}</span>`).join("");
      return `<div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-4">
        <div class="flex items-start gap-3.5">
          <span class="size-11 rounded-xl grid place-items-center font-800 text-[13px] shrink-0" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-[14.5px] font-600 text-slate-900">${esc(c.name)}</p>
              <span class="inline-flex items-center gap-1 text-[11px] font-600 text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5"><span class="size-1.5 rounded-full bg-emerald-500"></span>Active</span>
            </div>
            <p class="text-[12px] text-slate-400 mt-0.5">Granted ${esc(a.grantedAt)} · last viewed ${esc(a.lastViewed)}</p>
            <div class="mt-2.5 flex flex-wrap gap-1.5">${chips}</div>
          </div>
        </div>
        <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button data-act="manageConsent" data-arg="${esc(a.clinic)}" class="h-8 px-3 rounded-lg text-[12.5px] font-600 text-slate-600 hover:bg-slate-100 transition">Edit what's shared</button>
          <button data-act="revoke" data-arg="${esc(a.clinic)}" class="h-8 px-3 rounded-lg text-[12.5px] font-600 text-rose-600 hover:bg-rose-50 transition">Revoke access</button>
        </div>
      </div>`;
    }).join("");

    $("#view-access").innerHTML = `
      <div class="pop mx-auto max-w-3xl">
        <h1 class="font-display font-800 text-[30px] text-slate-900 leading-tight">Clinic access</h1>
        <p class="mt-1 text-[14.5px] text-slate-500">You decide who sees your record and exactly which parts. Revoke anytime — instantly.</p>

        ${pending.length ? `<div class="mt-6"><h2 class="font-display font-700 text-[15px] text-slate-700 mb-3">Pending requests</h2><div class="space-y-3">${pendingHtml}</div></div>` : ""}

        <div class="mt-6">
          <h2 class="font-display font-700 text-[15px] text-slate-700 mb-3">Clinics with access (${active.length})</h2>
          <div class="space-y-3">${activeHtml || `<p class="text-[13px] text-slate-400 italic">No clinic currently has access.</p>`}</div>
        </div>

        <div class="mt-6 rounded-2xl bg-slate-50 border border-slate-200/70 p-4 flex gap-3 text-[12.5px] text-slate-500">
          <span class="text-slate-400 mt-0.5 shrink-0">${svg("access", 16, 2)}</span>
          <p>When a clinic requests access, Narzim verifies your consent with a one-time code sent to <b>${esc(PAT.phone)}</b>. Clinics only ever see the sections you allow, and entries other clinics made stay <b>read-only</b> to them.</p>
        </div>
      </div>`;
  };

  // ══════════════ SETTINGS ══════════════
  function field(label, value, mono) {
    return `<div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <span class="text-[12.5px] text-slate-500">${esc(label)}</span>
      <span class="text-[13.5px] text-slate-900 ${mono ? "font-mono" : "font-500"} text-right">${esc(value)}</span></div>`;
  }
  function toggleRow(label, desc, on) {
    return `<div class="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
      <div><p class="text-[13.5px] font-500 text-slate-900">${esc(label)}</p><p class="text-[12px] text-slate-500">${esc(desc)}</p></div>
      <button data-act="toggle" class="toggle ${on ? "on" : ""} shrink-0" role="switch" aria-checked="${on}"><span class="dot"></span></button></div>`;
  }

  NZ.render.settings = function () {
    $("#view-settings").innerHTML = `
      <div class="pop mx-auto max-w-3xl space-y-5">
        <h1 class="font-display font-800 text-[30px] text-slate-900 leading-tight">Settings</h1>

        <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <h2 class="font-display font-700 text-[15px] text-slate-900">Personal information</h2>
            <button data-act="editProfile" class="text-[12.5px] font-600 text-brand-600 hover:text-brand-700">Edit</button>
          </div>
          ${field("Full name", PAT.name)}
          ${field("Date of birth", PAT.dob + " · " + PAT.age)}
          ${field("Sex", PAT.sexLabel)}
          ${field("Blood type", PAT.bloodType)}
          ${field("Phone", PAT.phone)}
          ${field("Email", PAT.email)}
          ${field("Address", PAT.address)}
          ${field("Emergency contact", PAT.emergency)}
        </div>

        <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
          <div class="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <h2 class="font-display font-700 text-[15px] text-slate-900">Identity</h2>
            <span class="inline-flex items-center gap-1 text-[10.5px] font-600 text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">${svg("grant", 11, 2.4)} Verified</span>
          </div>
          ${field("CURP", PAT.curp, true)}
          ${field("Social security (NSS)", PAT.nss, true)}
          ${field("Narzim MRN", PAT.mrn, true)}
          <div class="px-4 py-2.5 bg-slate-50/60 text-[11.5px] text-slate-400">Your MRN is unique across the Narzim network and prevents duplicate records at any clinic.</div>
        </div>

        <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
          <div class="px-4 py-3.5 border-b border-slate-100"><h2 class="font-display font-700 text-[15px] text-slate-900">Preferences & privacy</h2></div>
          ${field("Language", PAT.language)}
          ${toggleRow("Appointment & result notifications", "Texts when a clinic updates your record", true)}
          ${toggleRow("Require my approval for every new access request", "Recommended — a one-time code confirms each grant", true)}
          ${toggleRow("Share new clinic reports by default", "New clinics see reports only if you allow", false)}
        </div>

        <div class="rounded-2xl border border-rose-200 bg-rose-50/50 overflow-hidden">
          <div class="px-4 py-3.5 border-b border-rose-100"><h2 class="font-display font-700 text-[15px] text-rose-700">Danger zone</h2></div>
          <div class="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div><p class="text-[13.5px] font-600 text-slate-900">Request data deletion</p>
              <p class="text-[12.5px] text-slate-500 max-w-md">Ask Narzim to permanently erase your profile and records from the platform. Clinics keep their own legally-required copies.</p></div>
            <button data-act="requestDeletion" class="h-10 px-4 rounded-xl bg-white border border-rose-300 text-rose-600 text-[13px] font-600 hover:bg-rose-50 transition shrink-0">Request deletion</button>
          </div>
        </div>
      </div>`;
  };

  // ── simple actions handled here ──
  actions.toggle = (_arg, el) => { el.classList.toggle("on"); };

  actions.removeSelf = (id) => {
    ["allergies", "conditions", "medications", "immunizations"].forEach(k => {
      state.medical[k] = state.medical[k].filter(x => x.id !== id);
    });
    NZ.render.health();
    toast("Removed from your record");
  };

  actions.denyReq = (cid) => {
    state.access = state.access.filter(a => !(a.clinic === cid && a.status === "pending"));
    state.timeline = state.timeline.filter(t => t.kind !== "access-request" || t.clinic !== cid);
    if (state.view === "access") NZ.render.access(); else NZ.render.home();
    toast("Request denied", "warn");
  };

  actions.revoke = (cid) => {
    const c = clinic(cid);
    state.access = state.access.filter(a => a.clinic !== cid);
    state.timeline.unshift({ id: "tr" + Date.now(), date: "Today", ago: "Just now", kind: "access-revoke", clinic: cid, title: "You revoked " + c.name + "'s access", desc: "They can no longer view any part of your record." });
    NZ.render.access();
    toast(c.name + " can no longer see your record");
  };
})();
