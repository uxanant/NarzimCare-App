// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — booking flow
//   Specialty → Doctor → Date & time → Reason/mode → Confirm
//   Also powers "Reschedule" (preset doctor, updates existing appt)
// ═══════════════════════════════════════════════════════════════
(function () {
  const { P, A, $, $$, esc, state, clinic, svg, toast,
          openSheet, closeSheet, fullPage, setStatusBar, setView, render, actions, money } = NZA;

  const STEPS = ["Specialty", "Doctor", "Time", "Confirm"];

  function docAvatar(d, size = 48, fs = 14) {
    const c = clinic(d.clinic);
    return `<span class="rounded-2xl grid place-items-center font-800 shrink-0" style="width:${size}px;height:${size}px;background:${d.swatch};color:${d.fgc};font-size:${fs}px">${esc(c.initials)}</span>`;
  }
  const stars = (r) => `<span class="inline-flex items-center gap-1 text-amber-500">${svg("star", 13, 0).replace('fill="none"', 'fill="currentColor"')}<span class="text-slate-700 font-700 text-[12px]">${r.toFixed(1)}</span></span>`;
  const modeChip = (m) => m === "video"
    ? `<span class="inline-flex items-center gap-1 text-[11px] font-600 text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">${svg("video", 11, 2)} Video</span>`
    : m === "in"
    ? `<span class="inline-flex items-center gap-1 text-[11px] font-600 text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">${svg("pin", 11, 2)} In person</span>`
    : `<span class="inline-flex items-center gap-1 text-[11px] font-600 text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">${svg("video", 11, 2)} In person or video</span>`;
  const nextLabel = (n) => (n.day === 0 ? "Today" : n.day === 1 ? "Tomorrow" : "In " + n.day + " days") + " · " + n.time;

  // ── progress header ──
  function progress(step) {
    return `<div class="px-5 pb-3 -mt-1">
      <div class="flex items-center gap-1.5">
        ${STEPS.map((s, i) => `<div class="flex-1 h-1.5 rounded-full ${i <= step ? "bg-white" : "bg-white/25"}"></div>`).join("")}
      </div>
      <p class="text-white/85 text-[11.5px] font-600 mt-2">Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}</p>
    </div>`;
  }

  // ══════════════ STEP RENDER ══════════════
  function bRender() {
    const b = state.booking;
    if (!b) return;
    setStatusBar(true);

    if (b.step === 0) return renderSpec(b);
    if (b.step === 1) return renderDocs(b);
    if (b.step === 2) return renderTime(b);
    if (b.step === 3) return renderConfirm(b);
    if (b.step === 4) return renderDone(b);
  }

  function brandShell(step, headline, sub, body, backAct = "bookBack") {
    const html = `<div class="absolute inset-0 z-[100] bg-[#F4F7FC] flex flex-col fade">
      <div class="text-white shrink-0" style="background:linear-gradient(150deg,#0098E4,#006093)">
        <div style="height:52px"></div>
        <div class="px-3 pb-1 flex items-center gap-1">
          <button data-act="${backAct}" class="size-10 rounded-full grid place-items-center tap hover:bg-white/10">${svg("chevL", 22, 2.2)}</button>
          <h2 class="flex-1 font-display font-700 text-[18px] truncate">${esc(headline)}</h2>
          <button data-act="closeFull" class="size-10 rounded-full grid place-items-center tap hover:bg-white/10">${svg("revoke", 20, 2.2)}</button>
        </div>
        ${typeof step === "number" ? progress(step) : (sub ? `<p class="px-5 pb-3 text-white/85 text-[12.5px] -mt-1">${esc(sub)}</p>` : "")}
      </div>
      <div class="flex-1 overflow-y-auto" style="-webkit-overflow-scrolling:touch">${body}</div>
    </div>`;
    openSheet(html);
  }

  // ── Step 0 · specialty ──
  function renderSpec(b) {
    const specs = A.SPECIALTIES.map(s => `
      <button data-act="bookSpec" data-arg="${s.key}" class="rounded-2xl bg-white border ${b.spec === s.key ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200/70"} shadow-sm p-4 text-left tap">
        <span class="size-11 rounded-2xl grid place-items-center mb-2.5" style="background:${s.bg};color:${s.fg}">${svg(s.icon, 22, 2)}</span>
        <p class="text-[13.5px] font-700 text-slate-900 leading-tight">${esc(s.label)}</p>
      </button>`).join("");

    // featured doctors (top rated)
    const feat = [...A.DOCTORS].sort((x, y) => y.rating - x.rating).slice(0, 3).map(d => {
      const c = clinic(d.clinic), sp = A.spec(d.spec);
      return `<button data-act="bookDoc" data-arg="${d.id}" class="w-full flex items-center gap-3 px-4 py-3 text-left tap">
        ${docAvatar(d, 44, 13)}
        <div class="flex-1 min-w-0">
          <p class="text-[13.5px] font-700 text-slate-900 truncate">${esc(d.name)}</p>
          <p class="text-[11.5px] text-slate-500 truncate">${esc(sp.label)} · ${esc(c.name)}</p>
        </div>
        <div class="text-right shrink-0">${stars(d.rating)}<p class="text-[10.5px] text-slate-400">${nextLabel(d.next).split(" · ")[0]}</p></div>
      </button>`;
    }).join("");

    brandShell(0, "Book a visit", null, `
      <div class="px-5 pt-4 pb-6">
        <h3 class="font-display font-700 text-[17px] text-slate-900 mb-3">What do you need?</h3>
        <div class="grid grid-cols-2 gap-2.5">${specs}</div>

        <div class="mt-6 flex items-center justify-between mb-2">
          <h3 class="font-display font-700 text-[17px] text-slate-900">Top-rated near you</h3>
        </div>
        <div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden divide-y divide-slate-100">${feat}</div>
      </div>`, "closeFull");
  }

  // ── Step 1 · doctors for specialty ──
  function renderDocs(b) {
    const sp = A.spec(b.spec);
    const docs = A.DOCTORS.filter(d => d.spec === b.spec);
    const list = (docs.length ? docs : A.DOCTORS).map(d => {
      const c = clinic(d.clinic);
      return `<button data-act="bookDoc" data-arg="${d.id}" class="w-full rounded-3xl bg-white border border-slate-200/70 shadow-sm p-4 text-left tap">
        <div class="flex items-start gap-3.5">
          ${docAvatar(d, 52, 15)}
          <div class="flex-1 min-w-0">
            <p class="text-[14.5px] font-700 text-slate-900 truncate">${esc(d.name)}</p>
            <p class="text-[12px] text-slate-500 truncate">${esc(c.name)} · ${esc(c.city)}</p>
            <div class="flex items-center gap-2.5 mt-1.5">${stars(d.rating)}<span class="text-[11px] text-slate-400">${d.reviews} reviews</span></div>
          </div>
          <div class="text-right shrink-0">
            <p class="font-display font-800 text-[16px] text-slate-900">${money(d.fee)}</p>
            <p class="text-[10.5px] text-slate-400">per visit</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          ${modeChip(d.mode)}
          <span class="text-[11.5px] font-600 text-emerald-600">${svg("clock", 12, 2)} ${nextLabel(d.next)}</span>
        </div>
      </button>`;
    }).join("");

    brandShell(1, sp ? sp.label : "Choose a doctor", null, `
      <div class="px-5 pt-4 pb-6 space-y-3">
        <p class="text-[12.5px] text-slate-500 px-0.5">${docs.length} ${docs.length === 1 ? "doctor" : "doctors"} available${sp ? " for " + esc(sp.label.toLowerCase()) : ""}.</p>
        ${list}
      </div>`);
  }

  // ── Step 2 · date & time ──
  function renderTime(b) {
    const d = A.doc(b.doctor), c = clinic(d.clinic);
    const days = A.nextDays(14);
    if (!b.dayIso) b.dayIso = days.find(x => !x.isSunday).iso;
    const slots = A.slotsFor(d.id, b.dayIso);

    const dayPills = days.map(day => {
      const on = day.iso === b.dayIso;
      const disabled = day.isSunday;
      return `<button ${disabled ? "disabled" : `data-act="bookDay" data-arg="${day.iso}"`} class="shrink-0 w-14 py-2.5 rounded-2xl text-center tap ${disabled ? "opacity-30" : ""} ${on ? "bg-brand-500 text-white shadow-md" : "bg-white border border-slate-200 text-slate-700"}">
        <div class="text-[10.5px] font-600 ${on ? "text-white/85" : "text-slate-400"}">${day.dow}</div>
        <div class="font-display font-800 text-[17px] leading-tight">${day.day}</div>
        <div class="text-[9.5px] ${on ? "text-white/80" : "text-slate-400"}">${day.isToday ? "Today" : day.mon}</div>
      </button>`;
    }).join("");

    function slotGroup(label, arr) {
      if (!arr.length) return "";
      return `<div class="mb-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-400 font-700 mb-2">${label}</p>
        <div class="grid grid-cols-3 gap-2">
          ${arr.map(t => `<button data-act="bookTime" data-arg="${esc(t)}" class="h-10 rounded-xl text-[12.5px] font-600 tap ${b.time === t ? "bg-brand-500 text-white shadow-md" : "bg-white border border-slate-200 text-slate-700"}">${esc(t)}</button>`).join("")}
        </div>
      </div>`;
    }
    const anySlots = slots.morning.length + slots.afternoon.length + slots.evening.length;

    // mode selector for "both" doctors
    const modeSel = d.mode === "both" ? `
      <div class="px-5 pt-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-400 font-700 mb-2">Visit type</p>
        <div class="flex p-1 rounded-2xl bg-slate-200/60 text-[13px] font-600">
          <button data-act="bookMode" data-arg="in" class="flex-1 h-10 rounded-xl tap inline-flex items-center justify-center gap-1.5 ${b.mode === "in" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}">${svg("pin", 15, 2)} In person</button>
          <button data-act="bookMode" data-arg="video" class="flex-1 h-10 rounded-xl tap inline-flex items-center justify-center gap-1.5 ${b.mode === "video" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}">${svg("video", 15, 2)} Video</button>
        </div>
      </div>` : "";

    const cta = b.time ? `
      <div class="sticky bottom-0 px-5 py-3 bg-[#F4F7FC]/95 backdrop-blur border-t border-slate-200">
        <button data-act="bookToConfirm" class="w-full h-12 rounded-2xl text-white text-[14px] font-700 tap" style="background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">Continue · ${esc(A.fmtDate(b.dayIso))}, ${esc(b.time)}</button>
      </div>` : "";

    brandShell(2, "Pick a time", null, `
      <div class="pb-2">
        <div class="px-5 pt-4">
          <div class="rounded-3xl bg-white border border-slate-200/70 shadow-sm p-4 flex items-center gap-3.5">
            ${docAvatar(d, 48, 14)}
            <div class="flex-1 min-w-0"><p class="text-[14px] font-700 text-slate-900 truncate">${esc(d.name)}</p><p class="text-[12px] text-slate-500 truncate">${esc(c.name)} · ${money(d.fee)}</p></div>
            ${modeChip(b.mode || d.mode)}
          </div>
        </div>
        ${modeSel}
        <div class="px-5 pt-4">
          <p class="text-[11px] uppercase tracking-wide text-slate-400 font-700 mb-2">Choose a day</p>
        </div>
        <div class="flex gap-2 overflow-x-auto px-5 pb-1" style="scrollbar-width:none">${dayPills}</div>
        <div class="px-5 pt-4">
          <p class="text-[13.5px] font-700 text-slate-900 mb-3">${esc(A.fmtDateLong(b.dayIso))}</p>
          ${anySlots ? slotGroup("Morning", slots.morning) + slotGroup("Afternoon", slots.afternoon) + slotGroup("Evening", slots.evening)
            : `<div class="rounded-2xl bg-white border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-400">No openings this day — try another.</div>`}
        </div>
      </div>
      ${cta}`);
  }

  // ── Step 3 · reason & confirm ──
  function renderConfirm(b) {
    const d = A.doc(b.doctor), c = clinic(d.clinic), sp = A.spec(b.spec);
    const mode = b.mode || (d.mode === "video" ? "video" : "in");
    brandShell(3, b.rescheduleId ? "Confirm new time" : "Review & confirm", null, `
      <form data-act="bookConfirm">
       <div class="px-5 pt-4 pb-4">
        <div class="rounded-3xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
          <div class="p-4 flex items-center gap-3.5 border-b border-slate-100">
            ${docAvatar(d, 52, 15)}
            <div class="flex-1 min-w-0"><p class="text-[14.5px] font-700 text-slate-900 truncate">${esc(d.name)}</p><p class="text-[12px] text-slate-500 truncate">${esc(sp ? sp.label : "")} · ${esc(c.name)}</p></div>
          </div>
          <div class="p-4 space-y-3 text-[13px]">
            <div class="flex items-center justify-between gap-3"><span class="text-slate-500">Date</span><span class="font-600 text-slate-900">${esc(A.fmtDate(b.dayIso))}</span></div>
            <div class="flex items-center justify-between gap-3"><span class="text-slate-500">Time</span><span class="font-600 text-slate-900">${esc(b.time)}</span></div>
            <div class="flex items-center justify-between gap-3"><span class="text-slate-500">Visit type</span><span class="font-600 text-slate-900 inline-flex items-center gap-1.5">${mode === "video" ? svg("video", 14, 2) + " Video" : svg("pin", 14, 2) + " In person"}</span></div>
            <div class="flex items-center justify-between gap-3"><span class="text-slate-500">Fee</span><span class="font-600 text-slate-900">${money(d.fee)}</span></div>
          </div>
        </div>

        <div class="mt-4">
          <span class="lbl">Reason for visit</span>
          <textarea name="reason" rows="3" class="inp" placeholder="Briefly describe your symptoms or what you'd like to discuss…">${esc(b.reason || "")}</textarea>
        </div>

        <div class="mt-3 rounded-2xl bg-brand-50 border border-brand-100 p-3.5 flex gap-2.5 text-[12px] text-slate-600">
          <span class="text-brand-500 shrink-0 mt-0.5">${svg("shield", 15, 2)}</span>
          <p>${esc(d.name.split(" ").slice(0, 2).join(" "))} can see the parts of your record you've shared with ${esc(c.name)}. You can change this anytime in your profile.</p>
        </div>
       </div>
        <div class="sticky bottom-0 px-5 py-3 bg-[#F4F7FC]/95 backdrop-blur border-t border-slate-200">
          <button type="submit" class="w-full h-12 rounded-2xl text-white text-[14px] font-700 tap" style="background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">${b.rescheduleId ? "Confirm new time" : "Confirm booking"}</button>
        </div>
      </form>`);
  }

  // ── Step 4 · success ──
  function renderDone(b) {
    const d = A.doc(b.doctor), c = clinic(d.clinic);
    openSheet(`<div class="absolute inset-0 z-[100] flex flex-col fade" style="background:linear-gradient(160deg,#0098E4,#004B72)">
      <div style="height:52px"></div>
      <div class="flex-1 flex flex-col items-center justify-center px-7 text-center">
        <div class="size-20 rounded-full bg-white/15 grid place-items-center pop">
          <div class="size-14 rounded-full bg-white grid place-items-center text-brand-600">${svg("check", 30, 3)}</div>
        </div>
        <h2 class="mt-6 font-display font-800 text-white text-[24px] leading-tight">${b.rescheduleId ? "Appointment updated" : "You're booked!"}</h2>
        <p class="mt-2 text-brand-100 text-[14px] leading-relaxed">${esc(d.name)} · ${esc(c.name)}<br/>${esc(A.fmtDateLong(b.dayIso))} at ${esc(b.time)}</p>
        <div class="mt-5 inline-flex items-center gap-2 text-[12px] text-white/80 bg-white/12 rounded-full px-3.5 py-1.5">${svg("bell", 14, 2)} We'll text you a reminder the day before</div>
      </div>
      <div class="px-5 pb-8 space-y-2.5">
        <button data-act="bookSeeAppts" class="w-full h-12 rounded-2xl bg-white text-brand-700 text-[14px] font-700 tap">View in appointments</button>
        <button data-act="closeFull" class="w-full h-12 rounded-2xl bg-white/15 border border-white/25 text-white text-[14px] font-700 tap">Done</button>
      </div>
    </div>`);
  }

  const uid = (p) => p + Math.random().toString(36).slice(2, 7);

  // ══════════════ ACTIONS ══════════════
  Object.assign(actions, {
    startBooking: () => { state.booking = { step: 0, mode: null }; bRender(); },

    bookSpec: (key) => { state.booking.spec = key; state.booking.step = 1; bRender(); },

    bookDoc: (id) => {
      const b = state.booking, d = A.doc(id);
      b.doctor = id;
      if (!b.spec) b.spec = d.spec;
      b.mode = d.mode === "both" ? "in" : d.mode;
      b.dayIso = null; b.time = null;
      b.step = 2; bRender();
    },

    bookDay: (iso) => { state.booking.dayIso = iso; state.booking.time = null; bRender(); },
    bookTime: (t) => { state.booking.time = t; bRender(); },
    bookMode: (m) => { state.booking.mode = m; bRender(); },
    bookToConfirm: () => { if (!state.booking.time) return; state.booking.step = 3; bRender(); },

    bookBack: () => {
      const b = state.booking;
      if (!b) { actions.closeFull(); return; }
      if (b.step <= 0 || (b.rescheduleId && b.step <= 2)) { actions.closeFull(); state.booking = null; return; }
      b.step -= 1; bRender();
    },

    bookConfirm: (_a, el) => {
      const b = state.booking;
      const f = el.closest("form");
      const reason = (f && f.querySelector('[name=reason]') ? f.querySelector('[name=reason]').value.trim() : "") || "General consultation";
      const d = A.doc(b.doctor);
      const mode = b.mode || (d.mode === "video" ? "video" : "in");

      if (b.rescheduleId) {
        const ap = state.appts.find(x => x.id === b.rescheduleId);
        if (ap) { ap.date = b.dayIso; ap.time = b.time; ap.mode = mode; ap.reason = reason; ap.status = "upcoming"; }
      } else {
        state.appts.push({ id: uid("ap"), doctor: b.doctor, spec: b.spec, date: b.dayIso, time: b.time, mode, reason, status: "upcoming" });
        state.timeline.unshift({ id: uid("t"), date: "Today", ago: "Just now", kind: "appt", clinic: d.clinic, title: "Appointment booked", desc: d.name + " · " + A.fmtDate(b.dayIso) + " at " + b.time + "." });
      }
      b.step = 4; bRender();
    },

    bookSeeAppts: () => {
      state.booking = null;
      setStatusBar(false);
      state.apptTab = "upcoming";
      setView("appts");
    },

    reschedule: (id) => {
      const ap = state.appts.find(x => x.id === id);
      if (!ap) return;
      const d = A.doc(ap.doctor);
      state.booking = { step: 2, doctor: ap.doctor, spec: ap.spec, mode: ap.mode, dayIso: null, time: null, reason: ap.reason, rescheduleId: id };
      bRender();
    },
  });
})();
