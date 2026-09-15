// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — AI document scan flow
//   Camera capture (simulated) → "Narzim AI is analysing" →
//   four buckets (clear · blurry · irrelevant · duplicate) →
//   proceed: import clear reports into the record + body report.
// ═══════════════════════════════════════════════════════════════
(function () {
  const { P, $, $$, esc, state, clinic, svg, toast, openSheet, closeSheet, setStatusBar, setView, render, actions } = NZA;
  const H = window.HEALTH;
  const SAMPLES = H.SCAN_SAMPLES;
  const sample = (id) => SAMPLES.find(s => s.id === id);

  function ensureStyles() {
    if ($("#scanStyles")) return;
    const s = document.createElement("style");
    s.id = "scanStyles";
    s.textContent = `
      @keyframes scanSweep{0%{top:6%}50%{top:90%}100%{top:6%}}
      .scan-laser{animation:scanSweep 2.1s ease-in-out infinite}
      @keyframes thumbPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
      .thumb-pop{animation:thumbPop .28s cubic-bezier(.22,.61,.36,1) both}
      @keyframes shutterFlash{0%{opacity:0}30%{opacity:.85}100%{opacity:0}}
      .shutter-flash{animation:shutterFlash .35s ease-out both}
      @keyframes barGrow{from{transform:scaleX(0)}}`;
    document.head.appendChild(s);
  }

  function render_() {
    const s = state.scan;
    if (!s) return;
    if (s.step === "capture")   return renderCapture(s);
    if (s.step === "analyzing") return renderAnalyzing(s);
    if (s.step === "results")   return renderResults(s);
    if (s.step === "done")      return renderDone(s);
  }

  // ── 1 · camera capture ──
  function renderCapture(s) {
    setStatusBar(true);
    const next = s.idx < SAMPLES.length ? SAMPLES[s.idx] : null;
    const strip = s.captured.map((id, i) => {
      const sm = sample(id);
      return `<div class="thumb-pop relative shrink-0"><img src="${sm.img}" class="w-12 h-14 object-cover rounded-lg border-2 border-white/80"/></div>`;
    }).join("");
    const n = s.captured.length;

    openSheet(`<div class="absolute inset-0 z-[100] flex flex-col fade" style="background:#0a0f17">
      <div style="height:52px"></div>
      <div class="px-4 pb-3 flex items-center justify-between text-white">
        <button data-act="closeScan" class="size-10 rounded-full grid place-items-center tap hover:bg-white/10">${svg("revoke", 22, 2.2)}</button>
        <span class="text-[14px] font-700">Scan reports</span>
        <button class="size-10 rounded-full grid place-items-center tap text-white/70 hover:bg-white/10">${svg("flash", 18, 2)}</button>
      </div>

      <div class="flex-1 relative grid place-items-center px-6">
        <div class="relative w-full" style="max-width:280px;aspect-ratio:3/4">
          ${next
            ? `<img src="${next.img}" class="absolute inset-0 w-full h-full object-cover rounded-3xl"/>`
            : `<div class="absolute inset-0 rounded-3xl grid place-items-center text-white/40 text-[13px] text-center px-6" style="background:#0d1722">All sample documents captured.<br>Tap analyse to continue.</div>`}
          <div class="absolute inset-0 rounded-3xl" style="box-shadow:inset 0 0 0 9999px rgba(10,15,23,.18)"></div>
          ${["top-3 left-3 border-t-2 border-l-2 rounded-tl-xl", "top-3 right-3 border-t-2 border-r-2 rounded-tr-xl", "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-xl", "bottom-3 right-3 border-b-2 border-r-2 rounded-br-xl"]
            .map(p => `<span class="absolute ${p} w-8 h-8 border-white/90"></span>`).join("")}
          ${next ? `<div class="scan-laser absolute left-3 right-3 h-0.5 rounded-full" style="background:linear-gradient(90deg,transparent,#33B1F0,transparent);box-shadow:0 0 12px #33B1F0"></div>` : ""}
        </div>
        <p class="text-white/70 text-[12.5px] mt-4 text-center">${next ? "Align the document inside the frame, then tap the shutter." : ""}</p>
        <div id="shutterFlash" class="absolute inset-0 bg-white pointer-events-none" style="opacity:0"></div>
      </div>

      <div class="pt-3 pb-8 px-6">
        ${n ? `<div class="flex items-center gap-2 mb-4 overflow-x-auto" style="scrollbar-width:none">${strip}<span class="text-white/60 text-[12px] font-600 shrink-0 ml-1">${n} captured</span></div>` : `<p class="text-white/45 text-[12px] text-center mb-4">No pages captured yet</p>`}
        <div class="flex items-center justify-between">
          <button data-act="scanGallery" class="size-12 rounded-2xl bg-white/10 text-white grid place-items-center tap" title="Upload from gallery">${svg("image", 22, 2)}</button>
          <button data-act="snap" ${next ? "" : "disabled"} class="size-[72px] rounded-full grid place-items-center tap ${next ? "" : "opacity-40"}" style="background:rgba(255,255,255,.15)">
            <span class="size-[58px] rounded-full bg-white block ring-2 ring-white/40"></span>
          </button>
          <button data-act="toAnalyze" ${n ? "" : "disabled"} class="size-12 rounded-2xl grid place-items-center tap ${n ? "text-white" : "text-white/30"}" style="background:${n ? "linear-gradient(150deg,#33B1F0,#0098E4)" : "rgba(255,255,255,.08)"}" title="Analyse">${svg("chev", 24, 2.4)}</button>
        </div>
        <button data-act="scanGallery" class="w-full text-center text-white/55 text-[12px] mt-4 tap">or upload all sample reports from gallery</button>
      </div>
    </div>`);
  }

  // ── 2 · analyzing ──
  function renderAnalyzing(s) {
    setStatusBar(true);
    const thumbs = s.captured.map(id => `<img src="${sample(id).img}" class="w-14 h-16 object-cover rounded-lg border border-white/20"/>`).join("");
    openSheet(`<div class="absolute inset-0 z-[100] flex flex-col fade" style="background:linear-gradient(165deg,#0a1f33,#071019)">
      <div style="height:52px"></div>
      <div class="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div class="relative mb-7">
          <div class="flex gap-2 justify-center">${thumbs}</div>
          <div class="scan-laser absolute left-0 right-0 h-0.5 rounded-full" style="background:linear-gradient(90deg,transparent,#33B1F0,transparent);box-shadow:0 0 16px #33B1F0"></div>
        </div>
        <div class="inline-flex items-center gap-2 text-brand-300 text-[12px] font-700 uppercase tracking-wider mb-2">${svg("ai", 15, 2)} Narzim AI</div>
        <h2 class="font-display font-800 text-white text-[22px] leading-tight">Analysing your reports</h2>
        <p id="scanStatus" class="mt-2 text-brand-100/80 text-[13.5px] h-5">Reading text…</p>
        <div class="mt-6 w-56 h-2 rounded-full bg-white/12 overflow-hidden">
          <div id="scanBar" class="h-full rounded-full" style="width:0%;background:linear-gradient(90deg,#33B1F0,#7CCBF5);transition:width .3s"></div>
        </div>
        <p class="mt-3 text-white/50 text-[11.5px]">Checking quality · extracting values · matching to your record</p>
      </div>
    </div>`);

    const msgs = ["Reading text…", "Checking image quality…", "Extracting values…", "Matching to your record…", "Sorting into categories…"];
    let p = 0, mi = 0;
    clearInterval(s.timer);
    s.timer = setInterval(() => {
      p = Math.min(100, p + 7 + Math.random() * 6);
      const bar = $("#scanBar"), st = $("#scanStatus");
      if (bar) bar.style.width = p + "%";
      if (st && Math.floor(p / 20) !== mi) { mi = Math.min(msgs.length - 1, Math.floor(p / 20)); st.textContent = msgs[mi]; }
      if (p >= 100) {
        clearInterval(s.timer);
        setTimeout(() => { if (state.scan && state.scan.step === "analyzing") { state.scan.step = "results"; render_(); } }, 450);
      }
    }, 260);
  }

  // ── 3 · results / buckets ──
  function renderResults(s) {
    setStatusBar(false);
    const by = { clear: [], blurry: [], irrelevant: [], duplicate: [] };
    s.captured.forEach(id => { const sm = sample(id); if (by[sm.bucket]) by[sm.bucket].push(sm); });
    const clearN = by.clear.length, blurryN = by.blurry.length;

    function bucket(key) {
      const meta = H.BUCKETS[key], items = by[key];
      if (!items.length) return "";
      const rows = items.map(sm => `<div class="flex items-center gap-3 px-3.5 py-2.5 border-t border-slate-100 first:border-0">
          <img src="${sm.img}" class="w-11 h-13 object-cover rounded-lg border border-slate-200 shrink-0" style="height:52px"/>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-600 text-slate-900 truncate">${esc(sm.type)}</p>
            <p class="text-[11.5px] text-slate-500 truncate">${esc(sm.detail || sm.reason || "")}</p>
            ${sm.match ? `<p class="text-[11px] text-brand-600 truncate">${esc(sm.match)}</p>` : ""}
            ${sm.guide ? `<p class="text-[11px] text-amber-600 leading-snug mt-0.5">${esc(sm.guide)}</p>` : ""}
          </div>
          ${key === "clear" ? `<span class="shrink-0 text-emerald-500">${svg("check", 18, 2.4)}</span>` : ""}
        </div>`).join("");
      return `<div class="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
        <div class="flex items-center gap-2.5 px-3.5 py-3" style="background:${meta.bg}">
          <span class="size-7 rounded-lg grid place-items-center text-white shrink-0" style="background:${meta.color}">${svg(meta.icon, 15, 2.4)}</span>
          <div class="flex-1 min-w-0"><p class="text-[13px] font-700 text-slate-900">${meta.label} · ${items.length}</p><p class="text-[11px]" style="color:${meta.color}">${meta.desc}</p></div>
        </div>
        ${rows}
        ${key === "blurry" ? `<button data-act="retakeBlurry" class="w-full py-2.5 text-[12.5px] font-600 text-amber-700 bg-amber-50/60 border-t border-amber-100 tap inline-flex items-center justify-center gap-1.5">${svg("retake", 14, 2.2)} Retake these documents</button>` : ""}
      </div>`;
    }

    openSheet(`<div class="absolute inset-0 z-[100] bg-[#F4F7FC] flex flex-col fade">
      <div style="height:52px"></div>
      <div class="px-5 pb-3 flex items-center gap-1 bg-white border-b border-slate-100">
        <button data-act="closeScan" class="size-10 rounded-full grid place-items-center tap hover:bg-slate-100 text-slate-500">${svg("revoke", 20, 2.2)}</button>
        <h2 class="flex-1 font-display font-700 text-[18px] text-slate-900">Analysis complete</h2>
      </div>
      <div class="flex-1 overflow-y-auto px-5 py-4" style="-webkit-overflow-scrolling:touch">
        <div class="rounded-2xl p-4 mb-4 text-white" style="background:linear-gradient(150deg,#0098E4,#006093)">
          <div class="flex items-center gap-2 text-white/85 text-[11.5px] font-700 uppercase tracking-wider">${svg("ai", 14, 2)} Narzim AI sorted ${s.captured.length} ${s.captured.length === 1 ? "page" : "pages"}</div>
          <p class="font-display font-800 text-[19px] mt-1.5 leading-snug">${clearN} ${clearN === 1 ? "report is" : "reports are"} ready to add</p>
          <p class="text-brand-100 text-[12.5px] mt-1">Review the buckets below, then add the clear ones to your record.</p>
        </div>
        <div class="space-y-3 pb-2">
          ${bucket("clear")}
          ${bucket("blurry")}
          ${bucket("duplicate")}
          ${bucket("irrelevant")}
        </div>
      </div>
      <div class="px-5 py-3 bg-[#F4F7FC]/95 backdrop-blur border-t border-slate-200 space-y-2">
        ${clearN ? `<button data-act="applyScan" class="w-full h-12 rounded-2xl text-white text-[14px] font-700 tap" style="background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">Add ${clearN} ${clearN === 1 ? "report" : "reports"} to my record</button>` : ""}
        ${blurryN ? `<button data-act="retakeBlurry" class="w-full h-11 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[13.5px] font-600 tap">Retake ${blurryN} blurry ${blurryN === 1 ? "document" : "documents"}</button>` : ""}
        ${!clearN && !blurryN ? `<button data-act="closeScan" class="w-full h-12 rounded-2xl bg-slate-900 text-white text-[14px] font-700 tap">Done</button>` : ""}
      </div>
    </div>`);
  }

  // ── 4 · success ──
  function renderDone(s) {
    setStatusBar(true);
    const added = s.added || [];
    const changed = s.changed || [];
    openSheet(`<div class="absolute inset-0 z-[100] flex flex-col fade" style="background:linear-gradient(160deg,#0098E4,#004B72)">
      <div style="height:52px"></div>
      <div class="flex-1 flex flex-col items-center justify-center px-7 text-center">
        <div class="size-20 rounded-full bg-white/15 grid place-items-center pop">
          <div class="size-14 rounded-full bg-white grid place-items-center text-brand-600">${svg("check", 30, 3)}</div>
        </div>
        <h2 class="mt-6 font-display font-800 text-white text-[24px] leading-tight">${added.length} ${added.length === 1 ? "report" : "reports"} added</h2>
        <p class="mt-2 text-brand-100 text-[13.5px] leading-relaxed max-w-[260px]">Filed into your record and used to refresh your body report.</p>
        ${changed.length ? `<div class="mt-5 w-full max-w-[280px] rounded-2xl bg-white/12 p-3.5 text-left">
          <p class="text-white/70 text-[11px] font-700 uppercase tracking-wider mb-1.5">What changed</p>
          ${changed.map(c => `<p class="text-white text-[13px] flex items-center gap-2 py-0.5">${svg("ai", 13, 2)} ${esc(c)}</p>`).join("")}
        </div>` : ""}
      </div>
      <div class="px-5 pb-8 space-y-2.5">
        <button data-act="scanViewBody" class="w-full h-12 rounded-2xl bg-white text-brand-700 text-[14px] font-700 tap">View body report</button>
        <button data-act="scanViewRecords" class="w-full h-12 rounded-2xl bg-white/15 border border-white/25 text-white text-[14px] font-700 tap">View records</button>
      </div>
    </div>`);
  }

  const uid = (p) => p + Math.random().toString(36).slice(2, 7);
  const today = "Jun 2, 2026", todayLong = "Tuesday, June 2, 2026";

  function applyScan() {
    const s = state.scan;
    const clears = s.captured.map(sample).filter(sm => sm.bucket === "clear");
    const added = [], changed = [];

    clears.forEach(sm => {
      const ex = sm.extract; if (!ex) return;
      const id = uid((ex.category === "lab" ? "LAB-IMP-" : "ENC-IMP-"));
      const base = { id, clinic: ex.clinic, doctor: ex.clinic === "azteca" ? "azteca" : (ex.clinic === "merida" ? "solis" : "solis"),
        date: ex.date, dateLong: todayLong, time: "—", type: ex.title, category: ex.category, shared: true, imported: true };
      if (ex.category === "lab") {
        Object.assign(base, {
          plain: "Imported from a photo you scanned. Narzim AI read the values and matched them to your record. " + (ex.labs.some(l => l.flag !== "normal") ? "Some values are outside the usual range." : "All values are within normal range."),
          labs: ex.labs, orderedBy: "Imported via Narzim AI scan", education: "Values were auto-extracted from your photo — confirm with your clinician.",
        });
      } else {
        const meds = ex.meds || [];
        Object.assign(base, {
          plain: "Imported from a photo you scanned. " + (ex.summary || (meds.length ? "Narzim AI read " + meds.length + " medications from this prescription." : "")),
          chiefComplaint: ex.summary ? "Imported imaging report" : "Imported prescription",
          vitals: {}, exam: ex.summary ? [["Impression", ex.summary]] : [],
          diagnoses: [], plan: meds.length ? "Continue medications as written." : (ex.summary || "—"),
          rx: meds.map(m => ({ name: m.name, instr: m.instr })), education: "Auto-extracted from your photo — confirm with your clinician.",
        });
      }
      P.VISITS.unshift(base);
      added.push(ex.title);
      state.timeline.unshift({ id: uid("t"), date: "Today", ago: "Just now", kind: ex.category === "lab" ? "lab" : "report", clinic: ex.clinic, title: ex.title + " imported", desc: "Added from a scanned photo via Narzim AI.", refId: id });

      // apply to body zones
      (ex.applies || []).forEach(ap => {
        const z = state.health.zones.find(x => x.id === ap.zone);
        if (!z) return;
        const m = z.metrics.find(x => x.label === ap.metric);
        if (m) { m.value = ap.value; if (ap.flag) m.flag = ap.flag; }
        const wasWatch = z.status === "watch";
        const stillBad = z.metrics.some(x => x.flag === "high" || x.flag === "low");
        if (wasWatch && !stillBad) {
          z.status = z.condition ? "managed" : "good";
          z.headline = z.id === "metabolic" ? "Back in range" : z.headline;
          changed.push(z.name + " is now in range");
        } else {
          changed.push(z.name + ": " + ap.metric + " updated to " + ap.value);
        }
      });
    });

    // bump score if a watch zone cleared
    if (changed.some(c => /in range/.test(c))) state.health.score = Object.assign({}, state.health.score, { value: Math.min(100, state.health.score.value + 3) });

    s.added = added;
    s.changed = [...new Set(changed)].slice(0, 4);
    s.step = "done";
    render_();
  }

  Object.assign(actions, {
    startScan: () => { state.scan = { step: "capture", captured: [], idx: 0, timer: null }; render_(); },
    snap: () => {
      const s = state.scan;
      if (!s || s.idx >= SAMPLES.length) return;
      s.captured.push(SAMPLES[s.idx].id); s.idx++;
      render_();
      const fl = $("#shutterFlash"); if (fl) { fl.className = "absolute inset-0 bg-white pointer-events-none shutter-flash"; }
    },
    scanGallery: () => {
      const s = state.scan;
      s.captured = SAMPLES.map(x => x.id); s.idx = SAMPLES.length;
      s.step = "analyzing"; render_();
    },
    toAnalyze: () => { const s = state.scan; if (s && s.captured.length) { s.step = "analyzing"; render_(); } },
    retakeBlurry: () => { const s = state.scan; if (s) { clearInterval(s.timer); s.step = "capture"; s.captured = []; s.idx = 0; render_(); toast("Retake the blurry documents — hold steady & good light", "info"); } },
    applyScan: () => applyScan(),
    closeScan: () => { if (state.scan) clearInterval(state.scan.timer); state.scan = null; closeSheet(); setStatusBar(false); },
    scanViewBody: () => { if (state.scan) clearInterval(state.scan.timer); state.scan = null; closeSheet(); setView("body"); },
    scanViewRecords: () => { if (state.scan) clearInterval(state.scan.timer); state.scan = null; closeSheet(); setView("records"); },
  });
})();
