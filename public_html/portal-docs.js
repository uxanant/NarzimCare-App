// ═══════════════════════════════════════════════════════════════
// Narzim Patient Portal — docs & modals
//   360° profile · share/export · clinic reports & labs ·
//   add health item · consent editor (OTP) · data deletion · edit
// ═══════════════════════════════════════════════════════════════
(function () {
  const { P, $, $$, esc, state, clinic, doctor, visit, svg, toast, openModal, closeModal, actions } = NZ;
  const PAT = P.PATIENT, NARZIM = P.NARZIM;
  const today = "Feb 26, 2026";

  // ── shells ──────────────────────────────────────────────────
  function docShell({ icon, iconBg, iconFg, title, sub, acts, body, maxw = 880 }) {
    const btns = acts.map(a => `
      <button data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ""} class="h-9 px-3 rounded-lg hover:bg-slate-100 text-slate-700 text-[12.5px] font-600 inline-flex items-center gap-1.5">${svg(a.icon, 14, 2)}<span class="hidden sm:inline">${esc(a.label)}</span></button>`).join("");
    return `<div class="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-md flex flex-col fade no-print" data-overlay>
      <div class="bg-white border-b border-slate-200 px-4 sm:px-5 py-3 flex items-center gap-3 shrink-0">
        <span class="size-9 rounded-lg grid place-items-center shrink-0" style="background:${iconBg};color:${iconFg}">${icon}</span>
        <div class="flex-1 min-w-0"><p class="text-[13px] font-700 text-slate-900 leading-tight truncate">${esc(title)}</p><p class="text-[11.5px] text-slate-500 truncate">${esc(sub)}</p></div>
        ${btns}
        <div class="w-px h-6 bg-slate-200 mx-0.5"></div>
        <button data-close class="size-9 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500">${svg("revoke", 18, 2)}</button>
      </div>
      <div class="flex-1 overflow-y-auto px-4 py-6 flex justify-center items-start">
        <div id="printArea" class="bg-white shadow-2xl rounded-md overflow-hidden w-full sheet" style="max-width:${maxw}px">${body}</div>
      </div>
    </div>`;
  }

  function cardModal({ title, sub, body, width = 460 }) {
    return `<div class="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-md grid place-items-center p-4 fade no-print" data-overlay>
      <div class="bg-white rounded-2xl shadow-2xl w-full sheet overflow-hidden" style="max-width:${width}px">
        <div class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div><h3 class="font-display font-700 text-[18px] text-slate-900 leading-tight">${esc(title)}</h3>${sub ? `<p class="text-[13px] text-slate-500 mt-0.5">${esc(sub)}</p>` : ""}</div>
          <button data-close class="size-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-400 -mr-1 -mt-1">${svg("revoke", 17, 2)}</button>
        </div>
        ${body}
      </div>
    </div>`;
  }

  // ── doc primitives ──
  function dsection(label, body) {
    return `<section class="px-8 pt-5 pb-1 border-t border-slate-100">
      <div class="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-700 mb-3 flex items-center gap-2"><span class="size-1 rounded-full bg-slate-400"></span>${label}</div>
      <div class="pb-4">${body}</div></section>`;
  }
  function attrLine(s) {
    if (s.kind === "self") return `<span class="text-[11px] text-brand-600 font-600">Self-reported · ${esc(s.date)}</span>`;
    const c = clinic(s.clinic), d = doctor(s.doctor);
    return `<span class="text-[11px] text-slate-400">${esc(c.name)}${d ? " · " + esc(d.name) : ""} · ${esc(s.date)}</span>`;
  }
  function drow(name, meta, source) {
    return `<div class="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div class="min-w-0"><div class="text-[13px] font-600 text-slate-900">${name}</div>${meta ? `<div class="text-[12px] text-slate-500">${meta}</div>` : ""}</div>
      <div class="text-right shrink-0 pt-0.5">${attrLine(source)}</div></div>`;
  }

  // ══════════════ 360° PROFILE ══════════════
  function open360() {
    const M = state.medical;
    const allergies = M.allergies.map(a => drow(`${esc(a.name)} <span class="text-[10.5px] font-700 text-rose-600">(${esc(a.severity)})</span>`, esc(a.reaction), a.source)).join("") || `<p class="text-[12.5px] text-slate-400 italic">None recorded.</p>`;
    const conditions = M.conditions.map(c => drow(esc(c.name), `${esc(c.status)} · since ${esc(c.since)}`, c.source)).join("") || `<p class="text-[12.5px] text-slate-400 italic">None recorded.</p>`;
    const meds = M.medications.map(m => drow(esc(m.name), esc(m.instr), m.source)).join("") || `<p class="text-[12.5px] text-slate-400 italic">None recorded.</p>`;
    const imm = M.immunizations.map(v => drow(esc(v.name), "Given " + esc(v.date), v.source)).join("");

    // visits grouped by clinic
    const byClinic = {};
    P.VISITS.forEach(v => { (byClinic[v.clinic] = byClinic[v.clinic] || []).push(v); });
    const visitsHtml = Object.keys(byClinic).map(cid => {
      const c = clinic(cid);
      const rows = byClinic[cid].map(v => `<li class="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
        <span class="text-slate-700">${esc(v.type)}</span>
        <span class="text-slate-400">${esc(v.date)} · ${esc(v.id)}</span></li>`).join("");
      return `<div class="mb-3 last:mb-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="inline-grid place-items-center size-5 rounded text-[9px] font-800" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <span class="text-[12.5px] font-700 text-slate-800">${esc(c.name)}</span>
          <span class="text-[11px] text-slate-400">· ${esc(c.type)}</span>
        </div>
        <ul class="pl-7 divide-y divide-slate-100 border-l border-slate-100">${rows}</ul></div>`;
    }).join("");

    const body = `
      <div class="h-1.5" style="background:linear-gradient(90deg,#33B1F0,#0098E4 50%,#006093)"></div>
      <header class="px-8 pt-7 pb-5 flex items-start justify-between gap-5 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <span class="logo-mark" style="width:40px;height:40px"></span>
          <div>
            <div class="font-display font-800 text-[20px] text-slate-900 leading-none">Narzim</div>
            <div class="text-[11px] text-slate-500 mt-1">360° Health Profile</div>
          </div>
        </div>
        <div class="text-right text-[11px] text-slate-500 leading-snug">
          <div class="font-600 text-slate-700">Compiled ${esc(today)}</div>
          <div>${esc(NARZIM.legal)}</div>
          <div>${esc(NARZIM.support)}</div>
        </div>
      </header>

      <div class="px-8 py-5 grid sm:grid-cols-[1.3fr_1fr] gap-x-8 gap-y-2 border-b border-dashed border-slate-300">
        <div>
          <div class="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-700">Patient</div>
          <div class="text-[22px] font-800 text-slate-900 leading-tight font-display mt-0.5">${esc(PAT.name)}</div>
          <div class="text-[12.5px] text-slate-600 mt-1">${esc(PAT.sexLabel)} · ${esc(PAT.age)} · DOB ${esc(PAT.dob)} · Blood type ${esc(PAT.bloodType)}</div>
          <div class="text-[12px] text-slate-500 mt-2">${esc(PAT.phone)} · ${esc(PAT.email)}</div>
          <div class="text-[12px] text-slate-500">${esc(PAT.address)}</div>
          <div class="text-[12px] text-slate-500 mt-1">Emergency: ${esc(PAT.emergency)}</div>
        </div>
        <div class="sm:text-right text-[12px] sm:border-l border-slate-200 sm:pl-6">
          <div class="mb-1.5"><div class="text-[10px] uppercase tracking-wide text-slate-400 font-700">Narzim MRN</div><div class="font-mono font-700 text-slate-900 text-[14px]">${esc(PAT.mrn)}</div></div>
          <div class="mb-1.5"><div class="text-[10px] uppercase tracking-wide text-slate-400 font-700">CURP</div><div class="font-mono text-slate-700">${esc(PAT.curp)}</div></div>
          <div><div class="text-[10px] uppercase tracking-wide text-slate-400 font-700">NSS</div><div class="font-mono text-slate-700">${esc(PAT.nss)}</div></div>
        </div>
      </div>

      <div class="mx-8 my-4 rounded-xl bg-brand-50 border border-brand-100 p-3.5 text-[12px] text-slate-600 flex gap-2.5">
        <span class="text-brand-500 shrink-0 mt-0.5">${svg("self", 15, 2)}</span>
        <p>This summary is compiled by Narzim from <b>${Object.keys(byClinic).length} clinics</b>. Every clinical entry shows the clinic and clinician who recorded it. Items marked <b>self-reported</b> were added by the patient.</p>
      </div>

      ${dsection("Allergies", `<div>${allergies}</div>`)}
      ${dsection("Conditions", `<div>${conditions}</div>`)}
      ${dsection("Current medications", `<div>${meds}</div>`)}
      ${dsection("Immunizations", `<div>${imm}</div>`)}
      ${dsection("Visit history", visitsHtml)}

      <div class="px-8 pt-6 pb-9 border-t border-slate-200 mt-3 flex items-end justify-between gap-6 flex-wrap">
        <div class="text-[11px] text-slate-500 max-w-sm">
          <div class="font-700 text-slate-700 mb-0.5">Authenticity</div>
          Generated by Narzim Health Network for the patient named above. Verify at narzim.mx/verify with code <span class="font-mono">NZ-${esc(PAT.mrn.slice(-4))}-7K2D</span>.
        </div>
        <div class="text-right">
          <span class="logo-mark inline-block align-middle" style="width:22px;height:22px"></span>
          <div class="text-[10.5px] text-slate-400 mt-1">narzim.mx</div>
        </div>
      </div>`;

    openModal(docShell({
      icon: `<span class="logo-mark" style="width:20px;height:20px"></span>`, iconBg: "transparent", iconFg: "#fff",
      title: "Narzim 360° Health Profile", sub: `${esc(PAT.name)} · MRN ${esc(PAT.mrn)}`,
      acts: [{ act: "print", label: "Print", icon: "report" }, { act: "downloadPdf", label: "Download PDF", icon: "lab" }, { act: "share360", label: "Share", icon: "grant" }],
      body,
    }));
  }

  // ══════════════ SHARE / EXPORT ══════════════
  function openShare() {
    const link = "narzim.mx/s/" + PAT.mrn.slice(-4).toLowerCase() + "x7k2d";
    openModal(cardModal({
      title: "Share your 360° profile", sub: "Works for any clinic — even ones not on Narzim.", width: 480,
      body: `<div class="px-5 pb-5 space-y-3">
        <button data-act="downloadPdf" class="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition text-left">
          <span class="size-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center shrink-0">${svg("lab", 18, 2)}</span>
          <div class="flex-1"><p class="text-[13.5px] font-600 text-slate-900">Download PDF</p><p class="text-[12px] text-slate-500">A complete branded summary to print or email yourself.</p></div>
          <span class="text-slate-300">${svg("chev", 16, 2)}</span>
        </button>

        <div class="p-3.5 rounded-xl border border-slate-200">
          <div class="flex items-center gap-2 mb-2"><span class="size-7 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">${svg("access", 15, 2)}</span><p class="text-[13.5px] font-600 text-slate-900">Secure share link</p></div>
          <div class="flex items-center gap-2">
            <input id="shareLink" readonly value="${esc(link)}" class="flex-1 h-9 rounded-lg bg-slate-50 border border-slate-200 px-3 text-[12.5px] font-mono text-slate-600" />
            <button data-act="copyLink" class="h-9 px-3 rounded-lg bg-slate-900 text-white text-[12.5px] font-600 hover:bg-slate-800 transition">Copy</button>
          </div>
          <p class="text-[11.5px] text-slate-400 mt-2">Read-only · expires in 7 days · opens in any browser, no account needed.</p>
        </div>

        <div class="p-3.5 rounded-xl border border-slate-200">
          <div class="flex items-center gap-2 mb-2"><span class="size-7 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">${svg("grant", 15, 2)}</span><p class="text-[13.5px] font-600 text-slate-900">Email to a clinic</p></div>
          <form data-act="emailShare" class="flex items-center gap-2">
            <input name="email" type="email" required placeholder="clinic@example.com" class="flex-1 h-9 rounded-lg bg-slate-50 border border-slate-200 px-3 text-[12.5px] text-slate-700" />
            <button type="submit" class="h-9 px-3 rounded-lg bg-brand-500 text-white text-[12.5px] font-600 hover:bg-brand-600 transition">Send</button>
          </form>
        </div>
      </div>`,
    }));
  }

  // ══════════════ CLINIC REPORT / LAB ══════════════
  function openDoc(id) {
    const v = visit(id);
    if (!v) return;
    const c = clinic(v.clinic), d = doctor(v.doctor);
    const head = `
      <div class="h-1.5" style="background:${c.fg}"></div>
      <header class="px-8 pt-7 pb-5 flex items-start justify-between gap-5 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <span class="size-11 rounded-xl grid place-items-center font-800 text-[15px]" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>
          <div><div class="font-display font-800 text-[18px] text-slate-900 leading-none">${esc(c.name)}</div><div class="text-[11px] text-slate-500 mt-1">${esc(c.type)} · ${esc(c.city)}</div></div>
        </div>
        <div class="text-right text-[11px] text-slate-500"><div class="font-600 text-slate-700">${esc(v.dateLong)}</div><div>${esc(v.time)} · ${esc(v.id)}</div></div>
      </header>
      <div class="px-8 py-4 flex items-end justify-between border-b border-dashed border-slate-300 gap-4 flex-wrap">
        <div><div class="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-700">${v.category === "lab" ? "Laboratory Report" : "Clinical Visit Report"}</div>
          <div class="text-[20px] font-800 text-slate-900 font-display mt-0.5">${esc(v.type)}</div></div>
        <div class="text-right text-[12px] text-slate-600">${esc(PAT.name)} · <span class="font-mono">${esc(PAT.mrn)}</span></div>
      </div>
      <div class="mx-8 my-4 rounded-xl bg-violet-50 border border-violet-100 p-4">
        <div class="flex items-center gap-2 mb-1"><span class="size-6 rounded-lg bg-violet-500 text-white grid place-items-center text-[12px] font-800 font-display">N</span><span class="text-[12px] font-700 text-violet-800">In plain words</span><span class="font-hand text-[15px] text-violet-500">by Narzim AI</span></div>
        <p class="text-[13.5px] leading-relaxed text-slate-700">${esc(v.plain)}</p>
      </div>`;

    let bodyMid = "";
    if (v.category === "lab") {
      const rows = v.labs.map(l => {
        const f = l.flag === "high" ? "text-amber-600" : l.flag === "low" ? "text-sky-600" : "text-slate-900";
        const tag = l.flag !== "normal" ? `<span class="text-[10px] font-700 uppercase ${f} ml-1">${esc(l.flag)}</span>` : "";
        return `<tr class="border-b border-slate-100">
          <td class="px-8 py-2.5 text-[12.5px] text-slate-800">${esc(l.test)}</td>
          <td class="px-3 py-2.5 text-[12.5px] font-mono font-700 ${f}">${esc(l.value)} <span class="text-slate-400 font-400">${esc(l.unit)}</span>${tag}</td>
          <td class="px-8 py-2.5 text-[12px] text-slate-500 text-right font-mono">${esc(l.range)}</td></tr>`;
      }).join("");
      bodyMid = `<div class="px-8 pt-2 pb-1 text-[12px] text-slate-500">Ordered by ${esc(v.orderedBy)}</div>
        <table class="w-full"><thead><tr class="border-y border-slate-200 bg-slate-50/50 text-[10.5px] uppercase tracking-wide text-slate-600">
          <th class="px-8 py-2 text-left font-700">Test</th><th class="px-3 py-2 text-left font-700">Result</th><th class="px-8 py-2 text-right font-700">Reference</th></tr></thead>
          <tbody>${rows}</tbody></table>
        ${v.education ? dsection("Note", `<p class="text-[13px] text-slate-700 leading-relaxed">${esc(v.education)}</p>`) : ""}`;
    } else {
      const vitals = v.vitals && Object.keys(v.vitals).length ? dsection("Vitals", `<div class="flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]">
        ${Object.entries({ weight: "kg", height: "cm", bp: "mmHg", hr: "bpm", temp: "°C", spo2: "%" }).map(([k, u]) => v.vitals[k] ? `<div><span class="text-[10px] uppercase tracking-wide text-slate-400 font-700 block">${k}</span><span class="font-mono font-700 text-[14px] text-slate-900">${esc(v.vitals[k])}</span> <span class="text-[11px] text-slate-400">${u}</span></div>` : "").join("")}
      </div>`) : "";
      const exam = v.exam && v.exam.length ? `<div class="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-1">${v.exam.map(([k, t]) => `<div class="text-[12.5px]"><span class="font-600 text-slate-800">${esc(k)}:</span> <span class="text-slate-600">${esc(t)}</span></div>`).join("")}</div>` : "";
      const dx = v.diagnoses.map(dd => `<li class="text-[13px] flex items-center gap-2 flex-wrap py-0.5"><span class="font-mono text-[11px] px-1.5 py-0.5 rounded ${dd.primary ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}">${esc(dd.code)}</span><span class="text-slate-800">${esc(dd.desc)}</span></li>`).join("");
      const rx = v.rx && v.rx.length ? `<div class="mt-2"><div class="text-[10.5px] uppercase tracking-wide text-slate-500 font-700 mb-1">Prescriptions</div><ul class="space-y-1">${v.rx.map(m => `<li class="text-[12.5px] text-slate-800">• <b>${esc(m.name)}</b> · ${esc(m.instr)}${m.days ? " · " + m.days + " days" : ""}</li>`).join("")}</ul></div>` : "";
      bodyMid = `${dsection("Reason for visit", `<p class="text-[13px] text-slate-700">${esc(v.chiefComplaint)}</p>`)}
        ${vitals}
        ${dsection("Findings & diagnosis", `${exam}<ul class="mt-2 space-y-1">${dx}</ul>`)}
        ${dsection("Plan", `<p class="text-[13px] text-slate-700 leading-relaxed">${esc(v.plan)}</p>${rx}`)}
        ${v.education ? dsection("Guidance", `<p class="text-[13px] text-slate-700 leading-relaxed">${esc(v.education)}</p>`) : ""}`;
    }

    const sig = `<div class="px-8 pt-6 pb-9 border-t border-slate-200 mt-3 grid sm:grid-cols-2 gap-6">
      <div><div class="border-b border-slate-400 pb-1 mb-1.5 font-hand" style="font-size:24px;color:#0F172A;line-height:1">${esc(d.name)}</div>
        <div class="text-[11.5px] text-slate-600"><div class="font-600 text-slate-800">${esc(d.name)}</div><div>${esc(d.role)} · Céd. ${esc(d.license)}</div><div class="text-slate-500 mt-0.5">Signed at ${esc(c.name)} · ${esc(v.dateLong)}</div></div></div>
      <div class="sm:text-right text-[11px] text-slate-500">
        <div class="text-[10px] uppercase tracking-wide text-slate-400 font-700 mb-1">Sharing</div>
        ${v.shared ? `Visible in your Narzim record. The originating clinic controls onward sharing.` : `Recorded at ${esc(c.name)}. You can include it in your 360° profile.`}
      </div></div>`;

    openModal(docShell({
      icon: svg(v.category === "lab" ? "lab" : "report", 18, 2), iconBg: c.bg, iconFg: c.fg,
      title: `${v.type} · ${c.name}`, sub: `${v.date} · ${d.name}`,
      acts: [{ act: "print", label: "Print", icon: "report" }, { act: "downloadPdf", label: "Download", icon: "lab" }],
      body: head + bodyMid + sig,
    }));
  }

  // ══════════════ ADD HEALTH ITEM ══════════════
  function openAddItem(type) {
    const cfg = {
      allergy:    { title: "Add an allergy", bucket: "allergies" },
      condition:  { title: "Add a condition", bucket: "conditions" },
      medication: { title: "Add a medication", bucket: "medications" },
    }[type] || { title: "Add item", bucket: "allergies" };

    const fields = {
      allergy: `
        <label class="block"><span class="lbl">Allergen</span><input name="name" required placeholder="e.g. Shellfish" class="inp" /></label>
        <label class="block"><span class="lbl">Severity</span><select name="severity" class="inp"><option>Mild</option><option>Moderate</option><option>Severe</option></select></label>
        <label class="block"><span class="lbl">Reaction</span><input name="reaction" placeholder="e.g. Itching, swelling" class="inp" /></label>`,
      condition: `
        <label class="block"><span class="lbl">Condition</span><input name="name" required placeholder="e.g. Migraine" class="inp" /></label>
        <label class="block"><span class="lbl">Status</span><input name="status" placeholder="e.g. Active" value="Active" class="inp" /></label>
        <label class="block"><span class="lbl">Since</span><input name="since" placeholder="e.g. 2024" class="inp" /></label>`,
      medication: `
        <label class="block"><span class="lbl">Medication</span><input name="name" required placeholder="e.g. Vitamin D 1000 IU" class="inp" /></label>
        <label class="block"><span class="lbl">Instructions</span><input name="instr" placeholder="e.g. 1 daily with food" class="inp" /></label>
        <label class="block"><span class="lbl">Since</span><input name="since" placeholder="e.g. 2025" class="inp" /></label>`,
    }[type];

    openModal(cardModal({
      title: cfg.title, sub: "Added to your record as self-reported.", width: 440,
      body: `<form data-act="submitItem" data-arg="${esc(type)}" class="px-5 pb-5 space-y-3">
        ${fields}
        <div class="flex items-start gap-2 text-[11.5px] text-slate-500 bg-slate-50 rounded-lg p-2.5">${svg("self", 14, 2)}<span>This will be clearly labeled <b>self-reported</b> so clinicians know it came from you.</span></div>
        <div class="flex gap-2 pt-1">
          <button type="button" data-close class="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-600 hover:bg-slate-50 transition">Cancel</button>
          <button type="submit" class="flex-1 h-10 rounded-xl bg-brand-500 text-white text-[13px] font-600 hover:bg-brand-600 transition">Add to record</button>
        </div>
      </form>`,
    }));
  }

  // ══════════════ CONSENT EDITOR (grant w/ OTP · manage) ══════════════
  const DEMO_OTP = "482913";
  function sectionChecklist(selected) {
    return P.SECTIONS.map(s => {
      const on = selected.includes(s.key);
      return `<label class="flex items-center gap-3 px-3 py-2.5 rounded-xl border ${on ? "border-brand-200 bg-brand-50/50" : "border-slate-200"} cursor-pointer transition">
        <input type="checkbox" name="sec" value="${s.key}" ${on ? "checked" : ""} class="size-4 accent-brand-500" />
        <span class="flex-1"><span class="text-[13px] font-600 text-slate-900 block">${esc(s.label)}</span><span class="text-[11.5px] text-slate-500">${esc(s.desc)}</span></span>
      </label>`;
    }).join("");
  }

  function openConsent(cid, mode) {
    const c = clinic(cid);
    const rec = state.access.find(a => a.clinic === cid) || { sections: ["demographics"] };
    const isGrant = mode === "grant";
    openModal(cardModal({
      title: isGrant ? `Grant access to ${c.name}` : `Edit what ${c.name} sees`,
      sub: isGrant ? "Choose what they can see, then confirm with the code we text you." : "Changes apply immediately.",
      width: 480,
      body: `<form data-act="${isGrant ? "confirmGrant" : "saveConsent"}" data-arg="${esc(cid)}" class="px-5 pb-5">
        <div class="space-y-2 max-h-[42vh] overflow-y-auto pr-0.5">${sectionChecklist(rec.sections)}</div>
        ${isGrant ? `
          <div class="mt-4 pt-4 border-t border-slate-100">
            <p class="text-[12.5px] text-slate-600">Enter the 6-digit code sent to <b>${esc(PAT.phone)}</b></p>
            <div class="mt-2 flex items-center gap-2">
              <input name="otp" inputmode="numeric" maxlength="6" placeholder="••••••" class="inp font-mono tracking-[0.4em] text-center text-[16px]" style="letter-spacing:.4em" />
              <button type="button" data-act="resendOtp" class="h-10 px-3 rounded-xl border border-slate-200 text-slate-500 text-[12px] font-600 hover:bg-slate-50 shrink-0">Resend</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1.5">Demo code: <span class="font-mono font-700 text-slate-500">${DEMO_OTP}</span></p>
          </div>` : ""}
        <div class="flex gap-2 pt-4">
          <button type="button" data-close class="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-600 hover:bg-slate-50 transition">Cancel</button>
          <button type="submit" class="flex-1 h-10 rounded-xl ${isGrant ? "bg-amber-500 hover:bg-amber-600" : "bg-brand-500 hover:bg-brand-600"} text-white text-[13px] font-600 transition">${isGrant ? "Confirm & grant" : "Save changes"}</button>
        </div>
      </form>`,
    }));
  }

  // ══════════════ DATA DELETION ══════════════
  function openDeletion() {
    openModal(cardModal({
      title: "Request data deletion", sub: "This asks Narzim to erase your platform profile.", width: 480,
      body: `<form data-act="confirmDeletion" class="px-5 pb-5 space-y-3">
        <div class="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-[12.5px] text-rose-800 space-y-1.5">
          <p class="font-600">What happens:</p>
          <ul class="list-disc pl-4 space-y-1 text-rose-700/90">
            <li>Your Narzim 360° profile and identity are permanently removed.</li>
            <li>All clinic access is revoked immediately.</li>
            <li>Clinics retain their own legally-required records (Narzim can't delete those).</li>
            <li>Processed within 30 days; you'll get an email confirmation.</li>
          </ul>
        </div>
        <label class="block"><span class="lbl">Type DELETE to confirm</span><input name="confirm" required placeholder="DELETE" class="inp" /></label>
        <div class="flex gap-2 pt-1">
          <button type="button" data-close class="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-600 hover:bg-slate-50 transition">Keep my data</button>
          <button type="submit" class="flex-1 h-10 rounded-xl bg-rose-600 text-white text-[13px] font-600 hover:bg-rose-700 transition">Submit request</button>
        </div>
      </form>`,
    }));
  }

  // ══════════════ EDIT PROFILE ══════════════
  function openEditProfile() {
    openModal(cardModal({
      title: "Edit personal information", width: 460,
      body: `<form data-act="saveProfile" class="px-5 pb-5 space-y-3">
        <label class="block"><span class="lbl">Phone</span><input name="phone" value="${esc(PAT.phone)}" class="inp" /></label>
        <label class="block"><span class="lbl">Email</span><input name="email" value="${esc(PAT.email)}" class="inp" /></label>
        <label class="block"><span class="lbl">Address</span><input name="address" value="${esc(PAT.address)}" class="inp" /></label>
        <label class="block"><span class="lbl">Emergency contact</span><input name="emergency" value="${esc(PAT.emergency)}" class="inp" /></label>
        <div class="flex items-start gap-2 text-[11.5px] text-slate-500 bg-slate-50 rounded-lg p-2.5">${svg("access", 14, 2)}<span>CURP, NSS and MRN are verified identifiers and can't be edited here.</span></div>
        <div class="flex gap-2 pt-1">
          <button type="button" data-close class="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-600 hover:bg-slate-50 transition">Cancel</button>
          <button type="submit" class="flex-1 h-10 rounded-xl bg-brand-500 text-white text-[13px] font-600 hover:bg-brand-600 transition">Save</button>
        </div>
      </form>`,
    }));
  }

  // ── helpers for form submit ──
  function formData(el) {
    const f = el.closest("form") || el;
    const o = {};
    $$("input,select,textarea", f).forEach(i => { if (i.name) o[i.name] = i.value.trim(); });
    o._secs = $$("input[name=sec]:checked", f).map(i => i.value);
    return o;
  }
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);

  // ══════════════ ACTIONS ══════════════
  Object.assign(actions, {
    view360: open360,
    share360: openShare,
    signOut: () => {
      const m = $("#userMenu"); if (m) m.classList.add("hidden");
      openModal(`<div class="fixed inset-0 z-[110] grid place-items-center p-6 fade no-print" style="background:linear-gradient(150deg,#0098E4,#003E5C)">
        <div class="text-center sheet">
          <span class="logo-mark mx-auto" style="width:52px;height:52px"></span>
          <h2 class="mt-5 font-display font-800 text-white text-[26px]">Signing you out…</h2>
          <p class="mt-1.5 text-brand-100 text-[14px]">Taking you back to the Narzim login.</p>
        </div>
      </div>`);
      setTimeout(() => { window.location.href = "Narzim Login.html?tab=patient"; }, 900);
    },
    openDoc: (id) => openDoc(id),
    addItem: (t) => openAddItem(t),
    requestDeletion: openDeletion,
    editProfile: openEditProfile,
    manageConsent: (cid) => openConsent(cid, "manage"),
    reviewReq: (cid) => openConsent(cid, "grant"),

    print: () => { toast("Opening print dialog…", "info"); setTimeout(() => window.print(), 250); },
    downloadPdf: () => { toast("Preparing PDF…", "info"); setTimeout(() => window.print(), 250); },

    copyLink: (_a, el) => {
      const inp = $("#shareLink");
      if (inp) { inp.select(); try { document.execCommand("copy"); } catch (e) {} }
      toast("Link copied to clipboard");
    },
    emailShare: (_a, el) => { const d = formData(el); closeModal(); toast("360° profile sent to " + (d.email || "clinic")); },

    submitItem: (type, el) => {
      const d = formData(el);
      if (!d.name) return;
      const M = state.medical, src = { kind: "self", date: today };
      if (type === "allergy") M.allergies.unshift({ id: uid("al"), name: d.name, severity: d.severity || "Mild", reaction: d.reaction || "—", source: src });
      if (type === "condition") M.conditions.unshift({ id: uid("co"), name: d.name, status: d.status || "Active", since: d.since || "—", source: src });
      if (type === "medication") M.medications.unshift({ id: uid("me"), name: d.name, instr: d.instr || "—", since: d.since || "—", active: true, source: src });
      state.timeline.unshift({ id: uid("t"), date: "Today", ago: "Just now", kind: type === "medication" ? "med" : (type === "condition" ? "report" : "allergy"), actor: "self", title: "You added " + (type === "allergy" ? "an allergy" : "a " + type), desc: d.name + " — self-reported." });
      closeModal(); NZ.render.health(); toast(d.name + " added to your record");
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
      closeModal();
      if (state.view === "access") NZ.render.access(); else NZ.render.home();
      toast(c.name + " now has access");
    },
    saveConsent: (cid, el) => {
      const d = formData(el);
      const rec = state.access.find(a => a.clinic === cid);
      if (rec) rec.sections = d._secs.length ? d._secs : ["demographics"];
      closeModal(); NZ.render.access(); toast("Sharing settings updated");
    },
    resendOtp: () => toast("New code sent — demo code is " + DEMO_OTP, "info"),

    confirmDeletion: (_a, el) => {
      const d = formData(el);
      if ((d.confirm || "").toUpperCase() !== "DELETE") { toast('Type "DELETE" to confirm', "warn"); return; }
      closeModal(); toast("Deletion request submitted · ref NZ-DEL-" + Math.floor(Math.random() * 9000 + 1000));
    },
    saveProfile: (_a, el) => {
      const d = formData(el);
      ["phone", "email", "address", "emergency"].forEach(k => { if (d[k]) PAT[k] = d[k]; });
      closeModal(); NZ.render.settings(); toast("Profile updated");
    },
  });
})();
