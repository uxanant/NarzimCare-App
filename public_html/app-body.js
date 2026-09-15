// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — Body report (anatomical glass body)
//   Translucent figure with glowing skeleton/vessels · drag or
//   toggle to rotate front ↔ back · tappable zone markers with a
//   floating info card · segmented Areas / Vitals / Habits.
// ═══════════════════════════════════════════════════════════════
(function () {
  const { $, $$, esc, state, clinic, svg, openSheet, bottomSheet, setStatusBar, render, actions } = NZA;
  const H = window.HEALTH;
  const cx = 120;

  const ZS = {
    good:    { c: "#10b981", soft: "#ECFDF3", label: "Healthy" },
    watch:   { c: "#f59e0b", soft: "#FEF6E7", label: "Watch" },
    managed: { c: "#0098e4", soft: "#EAF5FF", label: "Managed" },
  };
  const flagColor = (f) => f === "high" ? "#d97706" : f === "low" ? "#0284c7" : "#0f172a";
  const scoreColor = (v) => v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444";

  // back-view marker coordinates (front uses zone.x / zone.y)
  const BACK_POS = { thyroid: [120, 128], heart: [110, 200], lungs: [140, 200], metabolic: [120, 300], body: [120, 358] };

  function ensureStyles() {
    if ($("#bodyStyles")) return;
    const s = document.createElement("style");
    s.id = "bodyStyles";
    s.textContent = `
      @keyframes bodyFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      .body-fl{animation:bodyFloat 7s ease-in-out infinite}
      @keyframes mkPulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
      .mk-ring{transform-box:fill-box;transform-origin:center;animation:mkPulse 2.8s ease-out infinite}
      @keyframes ringDash{from{stroke-dashoffset:var(--c)}}
      .score-arc{animation:ringDash 1s cubic-bezier(.22,.61,.36,1) both}
      .hseg{display:flex;background:#EBF0F6;border-radius:13px;padding:3px}
      .hseg button{flex:1;border:0;background:none;padding:8px 0;border-radius:10px;color:#64748B;font-size:12.5px;font-weight:600;cursor:pointer;transition:.15s}
      .hseg button.on{background:#fff;color:#0F172A;box-shadow:0 1px 3px rgba(15,23,42,.1)}
      .bstage{perspective:1100px;-webkit-tap-highlight-color:transparent;touch-action:pan-y}
      .brot{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
      .bface{position:absolute;inset:0;display:grid;place-items:center;backface-visibility:hidden;-webkit-backface-visibility:hidden}
      .bface.back{transform:rotateY(180deg)}
      .bface.hide{opacity:0;pointer-events:none}
      .btoggle{display:flex;background:rgba(255,255,255,.6);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.75);border-radius:13px;padding:3px;box-shadow:0 6px 16px -6px rgba(180,80,150,.35)}
      .btoggle button{border:0;background:none;padding:6px 15px;border-radius:10px;font-size:12px;font-weight:600;color:#9a6b91;cursor:pointer}
      .btoggle button.on{background:#fff;color:#c01f8a;box-shadow:0 1px 3px rgba(150,40,110,.18)}
      .bcard{position:absolute;left:12px;bottom:14px;width:176px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-radius:16px;padding:11px 13px;box-shadow:0 16px 36px -12px rgba(120,40,100,.4);border:1px solid rgba(255,255,255,.8);cursor:pointer}`;
    document.head.appendChild(s);
  }

  // ── figure geometry ──
  const BODY = `<g fill="url(#nzSkin)" stroke="#ffffff" stroke-opacity=".5" stroke-width="1">
    <ellipse cx="${cx}" cy="48" rx="33" ry="40"/><path d="M104 84 L136 84 L140 116 Q120 126 100 116 Z"/>
    <path d="M120 104 C92 104 70 112 60 134 C52 152 56 220 66 300 C70 332 78 360 96 374 L144 374 C162 360 170 332 174 300 C184 220 188 152 180 134 C170 112 148 104 120 104 Z"/>
    <path d="M64 128 C44 138 34 168 36 214 C37 252 42 286 52 312 C57 322 68 320 70 308 C74 280 66 232 68 196 C69 162 70 140 74 124 Z"/>
    <path d="M176 128 C196 138 206 168 204 214 C203 252 198 286 188 312 C183 322 172 320 170 308 C166 280 174 232 172 196 C171 162 170 140 166 124 Z"/>
    <path d="M96 366 C86 410 90 470 94 520 L118 520 C120 470 119 414 118 372 Z"/><path d="M144 366 C154 410 150 470 146 520 L122 520 C120 470 121 414 122 372 Z"/></g>`;
  const RIM = `<g fill="url(#nzRim)"><ellipse cx="${cx}" cy="48" rx="33" ry="40"/></g>`;
  const DEFS = `<defs>
    <linearGradient id="nzSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".62"/><stop offset=".5" stop-color="#fbe6f2" stop-opacity=".42"/><stop offset="1" stop-color="#f3d4e8" stop-opacity=".3"/></linearGradient>
    <linearGradient id="nzBone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ec8"/><stop offset="1" stop-color="#ec0f93"/></linearGradient>
    <radialGradient id="nzRim" cx="38%" cy="14%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="nzSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1"/></filter>
    <filter id="nzGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;

  function ribcage() {
    let o = "";
    [[168,42,6],[182,54,9],[196,62,13],[210,66,18],[224,64,24],[238,56,31],[252,46,38]].forEach(([y,w,d]) => {
      o += `<path d="M${cx+5} ${y} Q${cx+w} ${y-5} ${cx+w*0.92} ${y+d}"/><path d="M${cx-5} ${y} Q${cx-w} ${y-5} ${cx-w*0.92} ${y+d}"/>`;
    });
    o += `<path d="M${cx} 300 Q${cx-30} 296 ${cx-42} 290"/><path d="M${cx} 300 Q${cx+30} 296 ${cx+42} 290"/>`;
    return o;
  }
  const vesselsF = `<path d="M${cx} 150 L${cx} 470"/><path d="M${cx} 360 C${cx-10} 400 ${cx-22} 440 ${cx-26} 500"/><path d="M${cx} 360 C${cx+10} 400 ${cx+22} 440 ${cx+26} 500"/><path d="M${cx} 175 C${cx-40} 185 ${cx-66} 215 ${cx-74} 280"/><path d="M${cx} 175 C${cx+40} 185 ${cx+66} 215 ${cx+74} 280"/><path d="M${cx} 120 C${cx-9} 96 ${cx-12} 74 ${cx-8} 56"/><path d="M${cx} 120 C${cx+9} 96 ${cx+12} 74 ${cx+8} 56"/>`;
  function spineCol() { let o = ""; for (let i = 0; i < 17; i++) { const y = 120 + i * 14.5, w = 7 + (i > 10 ? (i - 10) * 0.8 : 0); o += `<rect x="${cx-w}" y="${y}" width="${w*2}" height="9" rx="3.5"/>`; } return o; }
  function backRibs() { let o = ""; [[182,48,16],[198,58,20],[214,62,24],[230,58,28],[246,50,32]].forEach(([y,w,d]) => { o += `<path d="M${cx} ${y} Q${cx+w} ${y+2} ${cx+w*0.9} ${y+d}"/><path d="M${cx} ${y} Q${cx-w} ${y+2} ${cx-w*0.9} ${y+d}"/>`; }); return o; }
  const scapulae = `<path d="M${cx-12} 158 Q${cx-52} 162 ${cx-44} 210 Q${cx-30} 200 ${cx-14} 196 Z"/><path d="M${cx+12} 158 Q${cx+52} 162 ${cx+44} 210 Q${cx+30} 200 ${cx+14} 196 Z"/>`;
  const sacrum = `<path d="M${cx-7} 352 Q${cx-36} 372 ${cx-30} 410"/><path d="M${cx+7} 352 Q${cx+36} 372 ${cx+30} 410"/><path d="M${cx-10} 350 L${cx+10} 350 L${cx+5} 392 L${cx-5} 392 Z"/>`;

  function markers(side) {
    return state.health.zones.map(z => {
      const [x, y] = side === "back" ? (BACK_POS[z.id] || [z.x, z.y]) : [z.x, z.y];
      const c = ZS[z.status].c, on = state.health.sel === z.id;
      return `<g class="mk" data-zone="${esc(z.id)}" transform="translate(${x},${y})" style="cursor:pointer">
        <circle class="mk-ring" r="9" fill="${c}"/>
        <circle r="15" fill="transparent"/>
        <circle r="${on ? 12 : 10.5}" fill="rgba(255,255,255,.16)" stroke="#fff" stroke-width="${on ? 3.2 : 2.4}" filter="url(#nzSoft)"/>
        <circle r="4.2" fill="${c}"/>
      </g>`;
    }).join("");
  }

  function figureSVG(side) {
    const inner = side === "back"
      ? `<g filter="url(#nzGlow)" fill="none" stroke="url(#nzBone)" stroke-width="2.6" stroke-linecap="round" opacity=".85">${backRibs()}</g>
         <g filter="url(#nzSoft)" fill="url(#nzBone)">${spineCol()}</g>
         <g filter="url(#nzSoft)" fill="rgba(236,15,147,.5)" stroke="url(#nzBone)" stroke-width="2">${scapulae}</g>
         <g filter="url(#nzSoft)" fill="url(#nzBone)" stroke="url(#nzBone)" stroke-width="2.6" stroke-linecap="round">${sacrum}</g>`
      : `<g filter="url(#nzGlow)" fill="none" stroke="url(#nzBone)" stroke-width="3" stroke-linecap="round" opacity=".9">${vesselsF}</g>
         <g filter="url(#nzSoft)" fill="none" stroke="url(#nzBone)" stroke-width="3.4" stroke-linecap="round">
           <path d="M${cx-4} 150 Q${cx-34} 138 ${cx-60} 150"/><path d="M${cx+4} 150 Q${cx+34} 138 ${cx+60} 150"/>
           <path d="M${cx} 156 L${cx} 196"/>${ribcage()}
           <path d="M${cx-7} 352 Q${cx-36} 372 ${cx-30} 410"/><path d="M${cx+7} 352 Q${cx+36} 372 ${cx+30} 410"/><path d="M${cx-30} 410 Q${cx} 398 ${cx+30} 410"/>
         </g>`;
    return `<svg class="body-fl" width="266" height="372" viewBox="0 8 240 430" style="overflow:visible">${DEFS}${BODY}${inner}${RIM}${markers(side)}</svg>`;
  }

  function scoreRing(v) {
    const r = 25, c = 2 * Math.PI * r, off = c - (c * v / 100), col = scoreColor(v);
    return `<svg width="58" height="58" viewBox="0 0 58 58" class="shrink-0">
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="#E8EDF4" stroke-width="5"/>
      <circle class="score-arc" style="--c:${c.toFixed(1)}" cx="29" cy="29" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 29 29)"/>
      <text x="29" y="35" text-anchor="middle" fill="#0F172A" style="font:800 19px 'Bricolage Grotesque',sans-serif">${v}</text></svg>`;
  }

  function cardHTML(z) {
    if (!z) return "";
    const zs = ZS[z.status], c = z.source && z.source.clinic ? clinic(z.source.clinic) : null;
    return `<div class="bcard" data-act="zoneDetail" data-arg="${esc(z.id)}">
      <div class="text-[10px] font-700 tracking-[0.07em] uppercase" style="color:${zs.c}">${zs.label}</div>
      <div class="font-display font-800 text-[16px] text-slate-900 leading-tight mt-0.5">${esc(z.name)}</div>
      <div class="text-[11.5px] text-slate-500 mt-0.5 leading-snug">${esc(z.headline)}</div>
      <div class="h-px bg-slate-100 my-2"></div>
      <div class="text-[11px] text-slate-600 leading-snug">${esc(z.note)}</div>
      <div class="flex items-center justify-between mt-1.5">
        <span class="text-[10px] text-slate-400">${c ? esc(z.source.date) : ""}</span>
        <span class="text-[11px] font-600 text-brand-600 inline-flex items-center gap-0.5">Details ${svg("chev", 12, 2.4)}</span>
      </div></div>`;
  }

  // ── segment content ──
  function areasContent() {
    return `<div class="rounded-2xl bg-white border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
      ${state.health.zones.map(z => {
        const zs = ZS[z.status];
        return `<button data-act="zoneDetail" data-arg="${esc(z.id)}" class="w-full flex items-center gap-3 px-4 py-3 text-left tap">
          <span class="size-2 rounded-full shrink-0" style="background:${zs.c}"></span>
          <div class="flex-1 min-w-0"><p class="text-[13.5px] font-700 text-slate-900 truncate">${esc(z.name)}</p><p class="text-[11.5px] text-slate-500 truncate">${esc(z.headline)}</p></div>
          <span class="text-[11px] font-600 shrink-0" style="color:${zs.c}">${zs.label}</span>
          <span class="text-slate-300 shrink-0">${svg("chev", 15, 2)}</span>
        </button>`;
      }).join("")}</div>`;
  }
  function vitalsContent() {
    return `<div class="rounded-2xl bg-white border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
      ${H.VITALS.map(v => `<div class="flex items-center gap-3 px-4 py-3"><span class="text-slate-400 shrink-0">${svg(v.icon, 16, 2)}</span><span class="flex-1 text-[13px] text-slate-600">${esc(v.label)}</span><span class="shrink-0"><span class="font-mono font-700 text-[14.5px] text-slate-900">${esc(v.value)}</span> <span class="text-[11px] text-slate-400">${esc(v.unit)}</span></span></div>`).join("")}</div>`;
  }
  function habitsContent() {
    return `<div class="rounded-2xl bg-white border border-slate-200/70 overflow-hidden divide-y divide-slate-100">
      ${state.health.lifestyle.map(m => {
        const pct = Math.min(100, Math.round(m.value / m.goal * 100));
        return `<div class="flex items-center gap-3 px-4 py-3">
          <span class="size-8 rounded-xl grid place-items-center shrink-0" style="background:${m.bg};color:${m.color}">${svg(m.icon, 16, 2)}</span>
          <div class="flex-1 min-w-0"><div class="flex items-baseline justify-between gap-2"><span class="text-[12.5px] font-600 text-slate-700">${esc(m.label)}</span><span class="text-[12px] text-slate-400"><b class="text-slate-900 font-700">${H.lfmt(m.id, m.value)}</b> / ${H.lfmt(m.id, m.goal)} ${esc(m.unit)}</span></div>
          <div class="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${m.color}"></div></div></div>
          <div class="flex items-center gap-1.5 shrink-0"><button data-act="logLife" data-arg="${m.id}:-" class="size-7 rounded-lg bg-slate-100 text-slate-500 grid place-items-center tap text-[16px] leading-none font-700">–</button><button data-act="logLife" data-arg="${m.id}:+" class="size-7 rounded-lg text-white grid place-items-center tap text-[15px] leading-none font-700" style="background:${m.color}">+</button></div>
        </div>`;
      }).join("")}</div>`;
  }

  render.body = function () {
    ensureStyles();
    setStatusBar(false);
    if (!state.health.sel) state.health.sel = (state.health.zones.find(z => z.status === "watch") || state.health.zones[0]).id;
    const score = state.health.score;
    const tab = state.health.tab || "areas";
    const sel = state.health.zones.find(z => z.id === state.health.sel);
    const seg = (id, label) => `<button data-act="setHealthTab" data-arg="${id}" class="${tab === id ? "on" : ""}">${label}</button>`;
    const content = tab === "vitals" ? vitalsContent() : tab === "habits" ? habitsContent() : areasContent();

    $("#scroll").innerHTML = `<div class="screen-in pb-5">
      <div class="px-5 pt-3.5 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-700 tracking-[0.1em] uppercase text-slate-400">Body report</p>
          <h1 class="font-display font-800 text-[22px] text-slate-900 leading-tight truncate">${esc(NZA.P.PATIENT.first)}'s health</h1>
          <p class="text-[11.5px] text-slate-400 mt-0.5">${esc(score.sub)}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div class="text-center">${scoreRing(score.value)}<p class="text-[10px] font-700 -mt-1" style="color:${scoreColor(score.value)}">${esc(score.label)}</p></div>
          <button data-act="startScan" class="size-9 rounded-full bg-slate-100 text-slate-500 grid place-items-center tap" title="Scan a report">${svg("camera", 17, 2)}</button>
        </div>
      </div>

      <!-- anatomical figure -->
      <div class="px-5 mt-2">
        <div id="bodyStage" class="bstage relative rounded-[24px] border border-slate-200/60 overflow-hidden" style="height:392px;background:radial-gradient(78% 50% at 50% 12%, #FBE9F4 0%, #EFE6F6 46%, #E4E1F2 100%)">
          <div class="absolute pointer-events-none" style="top:-6%;left:50%;transform:translateX(-50%);width:76%;height:48%;background:radial-gradient(closest-side, rgba(255,80,185,.28), transparent 72%);filter:blur(6px)"></div>
          <div class="absolute top-3 left-0 right-0 text-center text-[10.5px] font-600 text-[#a978a0] pointer-events-none" id="bodyHint">↺ drag to rotate · tap a point</div>
          <div class="brot" id="bodyRot">
            <div class="bface front" id="bodyFront">${figureSVG("front")}</div>
            <div class="bface back" id="bodyBack">${figureSVG("back")}</div>
          </div>
          ${cardHTML(sel)}
          <div class="absolute bottom-3.5 right-3.5"><div class="btoggle"><button data-bside="front" class="on">Front</button><button data-bside="back">Back</button></div></div>
        </div>
      </div>

      <div class="px-5 mt-4">
        <div class="hseg">${seg("areas", "Areas")}${seg("vitals", "Vitals")}${seg("habits", "Habits")}</div>
        <div class="mt-3">${content}</div>
      </div>
    </div>`;

    initFigure();
  };

  // ── rotation + marker interaction ──
  function initFigure() {
    const stage = $("#bodyStage"), rot = $("#bodyRot");
    if (!stage || !rot) return;
    const front = $("#bodyFront"), back = $("#bodyBack");
    let angle = state.health.rot || 0, dragging = false, startX = 0, startA = 0, moved = false;

    function norm(a) { return ((a % 360) + 360) % 360; }
    function isBack() { return Math.abs(norm(angle) - 180) < 90; }
    function updateVis(animating) {
      const b = isBack();
      if (animating) { front.classList.remove("hide"); back.classList.remove("hide"); }
      else { front.classList.toggle("hide", b); back.classList.toggle("hide", !b); }
      $$(".btoggle button", stage).forEach(btn => btn.classList.toggle("on", (btn.dataset.bside === "back") === b));
    }
    function apply(animate) {
      rot.style.transition = animate ? "transform .5s cubic-bezier(.22,.61,.36,1)" : "transform .04s linear";
      rot.style.transform = `rotateY(${angle}deg)`;
    }
    apply(false); updateVis(false);

    stage.addEventListener("pointerdown", e => {
      if (e.target.closest(".btoggle") || e.target.closest(".bcard")) return;
      dragging = true; moved = false; startX = e.clientX; startA = angle;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      const hint = $("#bodyHint"); if (hint) hint.style.opacity = "0";
    });
    stage.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - startX; if (Math.abs(dx) > 4) { moved = true; updateVis(true); }
      angle = startA + dx * 0.7; apply(false);
    });
    function end() {
      if (!dragging) return; dragging = false;
      angle = Math.round(angle / 180) * 180; state.health.rot = angle;
      apply(true); setTimeout(() => updateVis(false), 480);
    }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);

    $$(".btoggle button", stage).forEach(btn => btn.addEventListener("click", () => {
      angle = btn.dataset.bside === "back" ? 180 : 0; state.health.rot = angle;
      apply(true); setTimeout(() => updateVis(false), 480); updateVis(true);
    }));

    [front, back].forEach(face => face.addEventListener("click", e => {
      if (moved) return;
      const g = e.target.closest(".mk"); if (!g) return;
      selectZone(g.dataset.zone);
    }));
  }

  function selectZone(id) {
    state.health.sel = id;
    // refresh marker emphasis + card without losing rotation; face click
    // listeners are bound on the persistent face elements in initFigure.
    const fr = $("#bodyFront"), bk = $("#bodyBack");
    if (fr) fr.innerHTML = figureSVG("front");
    if (bk) bk.innerHTML = figureSVG("back");
    const z = state.health.zones.find(x => x.id === id);
    const old = $(".bcard");
    if (old && z) { const tmp = document.createElement("div"); tmp.innerHTML = cardHTML(z); old.replaceWith(tmp.firstElementChild); }
  }

  // ── zone detail sheet ──
  function zoneDetail(id) {
    const z = state.health.zones.find(x => x.id === id);
    if (!z) return;
    const zs = ZS[z.status], c = z.source && z.source.clinic ? clinic(z.source.clinic) : null;
    const metrics = z.metrics.map(m => {
      const col = flagColor(m.flag);
      return `<div class="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
        <div class="min-w-0"><p class="text-[13px] text-slate-800">${esc(m.label)}</p>${m.range && m.range !== "—" ? `<p class="text-[11px] text-slate-400 font-mono">Normal ${esc(m.range)}</p>` : ""}</div>
        <div class="text-right shrink-0"><span class="font-mono font-700 text-[15px]" style="color:${col}">${esc(m.value)}</span> <span class="text-[11px] text-slate-400">${esc(m.unit)}</span>${m.flag && m.flag !== "normal" ? `<span class="block text-[10px] font-700 uppercase" style="color:${col}">${esc(m.flag)}</span>` : ""}</div></div>`;
    }).join("");
    openSheet(bottomSheet({
      title: z.name, maxH: 80,
      body: `<div class="-mt-1">
        <div class="flex items-center gap-2 flex-wrap"><span class="text-[11px] font-700 px-2 py-0.5 rounded-full" style="background:${zs.soft};color:${zs.c}">${zs.label}</span><span class="text-[12.5px] text-slate-500">${esc(z.sub)} · ${esc(z.headline)}</span></div>
        ${z.condition ? `<div class="mt-3 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-[12.5px] text-slate-700 flex items-center gap-2">${svg("info", 14, 2)} ${esc(z.condition)}</div>` : ""}
        <div class="mt-3 rounded-2xl border border-slate-200/70 bg-white p-3">${metrics}</div>
        <div class="mt-3 rounded-2xl bg-brand-50 border border-brand-100 p-3.5 flex gap-2.5 text-[12.5px] text-slate-600"><span class="text-brand-500 shrink-0 mt-0.5">${svg("ai", 15, 2)}</span><p>${esc(z.note)}</p></div>
        ${c ? `<div class="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-400"><span class="inline-grid place-items-center size-4 rounded text-[8px] font-800" style="background:${c.bg};color:${c.fg}">${esc(c.initials)}</span>Source: ${esc(c.name)} · ${esc(z.source.date)}</div>` : ""}
      </div>`,
    }));
  }

  Object.assign(actions, {
    zoneDetail: (id) => { selectZone(id); zoneDetail(id); },
    setHealthTab: (t) => { state.health.tab = t; render.body(); },
    logLife: (arg) => {
      const [id, op] = arg.split(":");
      const m = state.health.lifestyle.find(x => x.id === id);
      if (!m) return;
      m.value = Math.max(0, +(m.value + (op === "+" ? m.step : -m.step)).toFixed(2));
      render.body();
    },
  });
})();
