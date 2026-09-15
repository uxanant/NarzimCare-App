// ═══════════════════════════════════════════════════════════════
// Patient 360 — LETTERHEAD redesign
// A single, top-to-bottom clinical document (no tabs). Patient-first
// masthead, a small Chavitos mark in the corner, prominent growth
// chart, and every part of the record laid out as clean document
// sections. Read-first: editing tools live tucked into section
// headers and reuse the existing dialogs.
//
// Overrides window.PatientScreen (loaded after screen-patient.jsx).
// ═══════════════════════════════════════════════════════════════

// Reuse helpers / dialogs / chart exported from screen-patient.jsx.
const {
  patHash, calcAgeFromDob, formatAge,
  bloodGroupFor, hasInsuranceFor, insuranceFor, emergencyContactsFor, guardianDetailFor,
  GrowthChart, RecordVitalsDialog, MedicationEditorDialog, ImmunizationEditorDialog,
  ContactEditorDialog, ConfirmRemoveDialog, PolicyEditorDialog, RemovePolicyDialog,
  parseLongDate: p360ParseLong, formatLongDate: p360FmtLong, isoFromDate: p360Iso, dateFromIso: p360FromIso,
  addDays: p360AddDays, durationDays: p360DurDays, STATUS_STYLES_MEDS,
} = window;

const P360_TODAY = new Date(2026, 4, 27); // demo "today" — matches the rest of the app
const P360_COMPILED = "May 27, 2026";
const CHAVITOS_LOGO = (window.__resources && window.__resources.chavitosLogo) || "assets/chavitos-logo.png";

const P360_METRICS = {
  weight: { label: "Weight",     unit: "kg", color: "#0098E4", yRange: [2, 24],   bands: { p3: -3,  p50: 0, p97: 3  } },
  height: { label: "Height",     unit: "cm", color: "#8B5CF6", yRange: [40, 130], bands: { p3: -10, p50: 0, p97: 10 } },
  hc:     { label: "Head circ.", unit: "cm", color: "#06B6D4", yRange: [33, 55],  bands: { p3: -2,  p50: 0, p97: 2  } },
  bmi:    { label: "BMI",        unit: "",   color: "#10B981", yRange: [12, 22],  bands: { p3: -2,  p50: 0, p97: 2  } },
};

// ── Deterministic vitals history (mirrors the original Vitals tab) ──
function buildVitalsRows(patient) {
  const today = P360_TODAY;
  const rows = [];
  const visits = 8 + (patHash(patient.id, 3) % 4);
  let weight = 13.5 + (patHash(patient.id, 5) % 60) / 10;
  let height = 88   + (patHash(patient.id, 7) % 150) / 10;
  let hc     = 47   + (patHash(patient.id, 9) % 25) / 10;
  for (let i = 0; i < visits; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i * 60 - (patHash(patient.id, 17 + i) % 14));
    const h = patHash(patient.id, 23 + i);
    const t = +(36.4 + (h % 12) / 10).toFixed(1);
    const hr = 80 + (h % 40);
    const sys = 90 + (h % 25); const dia = 55 + ((h >> 3) % 20);
    const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);
    const a = calcAgeFromDob(patient.dob);
    const ageAtVisit = (() => {
      if (!a) return "—";
      const visitYears = a.years - i * 0.16;
      if (visitYears < 1) return `${Math.max(0, Math.round((a.months + a.years * 12 - i * 2) % 12))} mo`;
      return `${Math.max(0, Math.floor(visitYears))} yr${visitYears < 2 ? "" : "s"}`;
    })();
    rows.push({
      id: `vh-${i}`, date: d,
      dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ageAtVisit, weight: +weight.toFixed(1), height: +height.toFixed(1), hc: +hc.toFixed(1),
      bmi, temp: t, hr, sys, dia,
      source: i === 0 ? "Today" : (i < 3 ? "Well-child" : (i % 2 ? "Sick visit" : "Follow-up")),
    });
    weight -= 0.6 + (h % 5) / 10;
    height -= 1.4 + (h % 4) / 10;
    hc     -= 0.15;
  }
  return rows;
}

function buildMeds(patient) {
  return window.CHAVITOS.MEDICATIONS.map((m, i) => {
    const startDate = p360ParseLong(m.start);
    const durMatch = /×\s*(\d+)\s*(days?|weeks?|months?)/i.exec(m.dose || "");
    const dur = durMatch ? { value: parseInt(durMatch[1], 10), unit: durMatch[2].toLowerCase().replace(/s$/, "") + "s" } : null;
    let endDate = null;
    if (dur && startDate) endDate = p360AddDays(startDate, p360DurDays(dur) - 1);
    return {
      id: `med-${i}`, name: m.name, dose: m.dose, route: "Oral", instructions: "",
      startDate, durationValue: dur ? String(dur.value) : "", durationUnit: dur ? dur.unit : "days",
      endDate, manualStatus: null, derivedStatus: m.status, by: m.by,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Document primitives
// ─────────────────────────────────────────────────────────────
function DocLabel({ children, className = "" }) {
  return <div className={cx("text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400", className)}>{children}</div>;
}

// A numbered letterhead section with an optional right-aligned action.
function P360Section({ id, num, title, sub, action, anchorRef, children, last = false }) {
  return (
    <section ref={anchorRef} id={`p360-${id}`} className="px-14 pt-9 pb-9 border-t border-slate-200/80 scroll-mt-4">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-[12px] font-mono text-slate-300 tabular-nums leading-none pt-0.5">{num}</span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">{title}</h2>
            {sub && <div className="text-[11.5px] text-slate-500 mt-1.5">{sub}</div>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

// Field used in the identity/coverage/contact grids.
function DocCell({ label, value, mono = false, wide = false }) {
  return (
    <div className={cx(wide && "col-span-2")}>
      <DocLabel>{label}</DocLabel>
      <div className={cx("text-[13px] text-slate-800 mt-1 leading-snug", mono && "font-mono")}>{value || <span className="text-slate-300">—</span>}</div>
    </div>
  );
}

// Subtle inline action button used in section headers.
function HeaderAction({ icon, children, onClick, tone = "slate" }) {
  const tones = {
    slate: "text-slate-600 hover:bg-slate-100 border-slate-200",
    sky:   "text-sky-700 hover:bg-sky-50 border-sky-200",
  };
  return (
    <button onClick={onClick}
      className={cx("inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border bg-white text-[12px] font-medium transition", tones[tone])}>
      {icon}{children}
    </button>
  );
}

const MED_STATUS_COLOR = {
  Active:    { dot: "#10B981", text: "text-emerald-700" },
  Completed: { dot: "#94A3B8", text: "text-slate-500" },
  Stopped:   { dot: "#EF4444", text: "text-rose-600" },
};

// ─────────────────────────────────────────────────────────────
// MASTHEAD — patient-first, small clinic mark in the corner
// ─────────────────────────────────────────────────────────────
function Masthead({ patient }) {
  const age = calcAgeFromDob(patient.dob);
  const bloodGroup = bloodGroupFor(patient);
  return (
    <header className="px-14 pt-10 pb-7">
      {/* corner clinic mark */}
      <div className="flex items-start justify-between gap-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-semibold pt-1">Comprehensive Patient Record</div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right leading-tight">
            <div className="text-[12px] font-bold text-chavitos-700">Chavitos Clinic</div>
            <div className="text-[9.5px] uppercase tracking-[0.14em] text-slate-400 font-semibold">Alta Especialidad en Pediatría</div>
          </div>
        </div>
      </div>

      {/* patient identity */}
      <div className="mt-7 flex items-center gap-5">
        <BabyAvatar size={66} swatch={patient.swatch} name={patient.name} />
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 leading-none">{patient.name}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
              {patient.sex === "M" ? "Male" : "Female"}
            </span>
            {patient.isNew && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "#FFEDD4", color: "#CA3500" }}>New patient</span>
            )}
          </div>
          <div className="mt-2.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[12.5px] text-slate-500">
            <span className="font-mono text-slate-700">{patient.mrn}</span>
            <P360Dot /> <span>DOB {patient.dob}</span>
            <P360Dot /> <span className="text-slate-700 font-medium">{formatAge(age)}</span>
            <P360Dot />
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center size-4 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">B</span>
              Blood <span className="font-semibold text-slate-700">{bloodGroup}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function P360Dot() { return <span className="text-slate-300">·</span>; }

// ─────────────────────────────────────────────────────────────
// ALERT BAND — allergies + chronic conditions, impossible to miss
// ─────────────────────────────────────────────────────────────
function AlertBand({ allergies, conditions }) {
  const hasA = allergies.length > 0;
  const hasC = conditions.length > 0;
  return (
    <div className="px-14 pb-8 grid grid-cols-2 gap-3">
      <div className={cx("rounded-xl border px-4 py-3", hasA ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/60")}>
        <div className="flex items-center gap-1.5">
          <span className={cx(hasA ? "text-rose-600" : "text-slate-400")}><Icon.alert size={13} /></span>
          <span className={cx("text-[10.5px] font-bold uppercase tracking-[0.14em]", hasA ? "text-rose-700" : "text-slate-400")}>Allergies</span>
        </div>
        {hasA ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allergies.map((a, i) => (
              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-rose-200 text-rose-700 text-[12.5px] font-semibold">{a}</span>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 text-[13px] text-slate-500">No known allergies</div>
        )}
      </div>
      <div className={cx("rounded-xl border px-4 py-3", hasC ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-slate-50/60")}>
        <div className="flex items-center gap-1.5">
          <span className={cx(hasC ? "text-amber-600" : "text-slate-400")}><Icon.heart size={13} /></span>
          <span className={cx("text-[10.5px] font-bold uppercase tracking-[0.14em]", hasC ? "text-amber-700" : "text-slate-400")}>Chronic care</span>
        </div>
        {hasC ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {conditions.map((c, i) => (
              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-amber-200 text-amber-800 text-[12.5px] font-semibold">{c}</span>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 text-[13px] text-slate-500">No chronic conditions on file</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT — latest measurements + care team, as a clean strip
// ─────────────────────────────────────────────────────────────
function SnapshotSection({ anchorRef, latest, pr, loc }) {
  const items = [
    { label: "Weight", value: latest.weight, unit: "kg" },
    { label: "Height", value: latest.height, unit: "cm" },
    { label: "BMI",    value: latest.bmi,    unit: "" },
    { label: "Temp",   value: latest.temp,   unit: "°C" },
    { label: "Blood pressure", value: `${latest.sys}/${latest.dia}`, unit: "mmHg" },
    { label: "Heart rate", value: latest.hr, unit: "bpm" },
  ];
  return (
    <P360Section id="snapshot" num="01" title="At a glance" sub={`Latest measurements · recorded ${latest.dateStr}`} anchorRef={anchorRef}>
      <div className="grid grid-cols-6 rounded-xl border border-slate-200 overflow-hidden divide-x divide-slate-200">
        {items.map((it, i) => (
          <div key={i} className="px-4 py-3.5 bg-white">
            <DocLabel>{it.label}</DocLabel>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-[20px] font-bold text-slate-900 leading-none font-mono tabular-nums">{it.value}</span>
              {it.unit && <span className="text-[11px] text-slate-400">{it.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-1">
        <DocCell label="Attending practitioner" value={pr ? pr.name : "—"} />
        <DocCell label="Specialty" value={pr ? pr.role : "—"} />
        <DocCell label="Home clinic" value={loc ? `${loc.name} · ${loc.city}` : "—"} />
      </div>
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// GROWTH — the hero
// ─────────────────────────────────────────────────────────────
function GrowthSection({ anchorRef, rows, onRecord }) {
  const [metric, setMetric] = React.useState("weight");
  const [recordOpen, setRecordOpen] = React.useState(false);
  const latest = rows[0] || {};
  const M = P360_METRICS[metric];

  const chartPoints = React.useMemo(() => rows.slice().sort((a, b) => a.date - b.date)
    .map(r => ({ x: r.date.getTime(), y: r[metric], date: r.dateStr })), [rows, metric]);

  return (
    <P360Section id="growth" num="02" title="Growth & development"
      sub={`${M.label} · WHO percentiles · plotted from recorded visits`}
      anchorRef={anchorRef}
      action={
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100">
            {Object.entries(P360_METRICS).map(([k, m]) => (
              <button key={k} onClick={() => setMetric(k)}
                className={cx("h-7 px-2.5 text-[11.5px] font-medium rounded-md transition",
                  metric === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>{m.label}</button>
            ))}
          </div>
          <HeaderAction icon={<Icon.plus size={13} />} tone="sky" onClick={() => setRecordOpen(true)}>Record vitals</HeaderAction>
        </div>
      }>
      <div className="rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-2">
        <GrowthChart metric={M} points={chartPoints} />
        <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500 px-2 pb-1">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: M.color }} />Patient</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: M.color, opacity: 0.4 }} />3rd · 50th · 97th percentile</span>
          <span className="ml-auto">Latest <span className="font-semibold text-slate-700">{latest[metric]} {M.unit}</span> · within normal range</span>
        </div>
      </div>
      <RecordVitalsDialog open={recordOpen} onClose={() => setRecordOpen(false)} defaults={latest}
        onSubmit={(entry) => { onRecord(entry); setRecordOpen(false); }} />
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// VITALS HISTORY — clean document table
// ─────────────────────────────────────────────────────────────
function VitalsHistorySection({ anchorRef, rows }) {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? rows : rows.slice(0, 5);
  const cols = "1.5fr 0.8fr 0.9fr 0.9fr 0.8fr 0.7fr 0.8fr 1fr 0.7fr 1fr";
  return (
    <P360Section id="vitals" num="03" title="Vitals history" sub={`${rows.length} recorded visits`} anchorRef={anchorRef}>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400" style={{ gridTemplateColumns: cols }}>
          <div>Date</div><div>Age</div><div>Weight</div><div>Height</div><div>Head</div><div>BMI</div><div>Temp</div><div>BP</div><div>HR</div><div>Visit</div>
        </div>
        <div className="divide-y divide-slate-100">
          {shown.map((r, i) => (
            <div key={r.id} className={cx("grid items-center px-4 py-2.5 text-[12.5px]", i === 0 && !expanded && rows[0].id === r.id ? "bg-sky-50/40" : "bg-white")} style={{ gridTemplateColumns: cols }}>
              <div className="flex items-center gap-1.5 min-w-0">
                {r.id === rows[0].id && <span className="size-1.5 rounded-full bg-sky-500 shrink-0" />}
                <span className="font-medium text-slate-900 truncate">{r.dateStr}</span>
              </div>
              <div className="text-slate-500">{r.ageAtVisit}</div>
              <div className="font-mono text-slate-900">{r.weight}<span className="text-slate-300"> kg</span></div>
              <div className="font-mono text-slate-900">{r.height}<span className="text-slate-300"> cm</span></div>
              <div className="font-mono text-slate-900">{r.hc}<span className="text-slate-300"> cm</span></div>
              <div className="font-mono text-slate-900">{r.bmi}</div>
              <div className="font-mono text-slate-900">{r.temp}<span className="text-slate-300">°</span></div>
              <div className="font-mono text-slate-900">{r.sys}/{r.dia}</div>
              <div className="font-mono text-slate-900">{r.hr}</div>
              <div className="text-slate-500 truncate">{r.source}</div>
            </div>
          ))}
        </div>
      </div>
      {rows.length > 5 && (
        <button onClick={() => setExpanded(e => !e)} className="mt-3 text-[12px] font-medium text-sky-700 hover:underline inline-flex items-center gap-1">
          {expanded ? "Show recent only" : `Show all ${rows.length} visits`}
        </button>
      )}
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// MEDICATIONS
// ─────────────────────────────────────────────────────────────
function MedicationsSection({ anchorRef, patient }) {
  const [meds, setMeds] = React.useState(() => buildMeds(patient));
  const [editingId, setEditingId] = React.useState(null);

  const effectiveStatus = (m) => m.manualStatus ? m.manualStatus : (m.endDate && m.endDate < P360_TODAY ? "Completed" : "Active");
  const handleSave = (data) => { setMeds(prev => prev.map(m => m.id === editingId ? { ...m, ...data } : m)); setEditingId(null); };

  return (
    <P360Section id="meds" num="04" title="Medications" sub={`${meds.length} on file`} anchorRef={anchorRef}
      action={<span className="text-[11px] text-slate-400 inline-flex items-center gap-1.5"><Icon.alert size={12} />New meds are prescribed during an encounter</span>}>
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {meds.map((m) => {
          const status = effectiveStatus(m);
          const sc = MED_STATUS_COLOR[status] || MED_STATUS_COLOR.Active;
          return (
            <div key={m.id} className="group grid items-center gap-4 py-3.5" style={{ gridTemplateColumns: "2.4fr 1.4fr 1.2fr 1.6fr 0.5fr" }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><Icon.pill size={14} /></span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-900 truncate">{m.name}</div>
                  <div className="text-[11px] text-slate-400">{m.route}{m.startDate ? ` · started ${p360FmtLong(m.startDate)}` : ""}</div>
                </div>
              </div>
              <div className="text-[12.5px] text-slate-700">{m.dose}</div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: sc.dot }} />
                <span className={cx("text-[12.5px] font-medium", sc.text)}>{status}</span>
              </div>
              <div className="text-[12px] text-slate-500 truncate">{m.by}</div>
              <div className="flex justify-end">
                <button onClick={() => setEditingId(m.id)} className="size-7 rounded-md flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition" title="Edit">
                  <Icon.edit size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {editingId && (
        <MedicationEditorDialog med={meds.find(m => m.id === editingId)} today={P360_TODAY}
          onClose={() => setEditingId(null)} onSubmit={handleSave} />
      )}
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// IMMUNIZATIONS
// ─────────────────────────────────────────────────────────────
function ImmunizationsSection({ anchorRef }) {
  const seed = React.useMemo(() => window.CHAVITOS.IMMUNIZATIONS.map((m, i) => ({
    id: `imm-${i}`, name: m.name, date: p360ParseLong(m.date) || new Date(), lot: m.lot, by: m.by, dose: "", site: "", note: "",
  })), []);
  const [records, setRecords] = React.useState(seed);
  const [editing, setEditing] = React.useState(null);
  const [removing, setRemoving] = React.useState(null);

  const handleSave = (data) => {
    setRecords(prev => data.id ? prev.map(r => r.id === data.id ? { ...r, ...data } : r) : [{ ...data, id: `imm-${Date.now()}` }, ...prev]);
    setEditing(null);
  };
  const sorted = [...records].sort((a, b) => b.date - a.date);
  const cols = "2fr 1.1fr 1fr 1.3fr 1.6fr 0.5fr";

  return (
    <P360Section id="imms" num="05" title="Immunizations" sub={`${records.length} on file`} anchorRef={anchorRef}
      action={<HeaderAction icon={<Icon.plus size={13} />} tone="sky" onClick={() => setEditing({ id: null, name: "", date: new Date(2026, 4, 27), lot: "", by: "Dr. Miguel Soto", dose: "", site: "", note: "" })}>Add immunization</HeaderAction>}>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400" style={{ gridTemplateColumns: cols }}>
          <div>Vaccine</div><div>Date</div><div>Lot</div><div>Site</div><div>Administered by</div><div></div>
        </div>
        <div className="divide-y divide-slate-100">
          {sorted.map((r) => (
            <div key={r.id} className="group grid items-center px-4 py-3 bg-white text-[12.5px]" style={{ gridTemplateColumns: cols }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Icon.syringe size={13} /></span>
                <span className="font-semibold text-slate-900 truncate">{r.name}</span>
              </div>
              <div className="text-slate-600">{p360FmtLong(r.date)}</div>
              <div className="font-mono text-slate-700">{r.lot || <span className="text-slate-300">—</span>}</div>
              <div className="text-slate-600 truncate">{r.site || <span className="text-slate-300">—</span>}</div>
              <div className="text-slate-600 truncate">{r.by}</div>
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditing(r)} className="size-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100" title="Edit"><Icon.edit size={13} /></button>
                <button onClick={() => setRemoving(r)} className="size-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove"><Icon.trash size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editing && <ImmunizationEditorDialog record={editing} onClose={() => setEditing(null)} onSubmit={handleSave} />}
      {removing && (
        <ConfirmRemoveDialog title="Remove immunization" name={`${removing.name} · ${p360FmtLong(removing.date)}`}
          description="This vaccine record will be removed from the patient's immunization history. This action cannot be undone."
          onClose={() => setRemoving(null)} onConfirm={() => { setRecords(prev => prev.filter(r => r.id !== removing.id)); setRemoving(null); }} />
      )}
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// CLINICAL HISTORY — allergies + conditions with provenance,
// pin-to-360 and shared annotations (reuses useClinicalRecord)
// ─────────────────────────────────────────────────────────────
function ClinicalRow({ it, accent, onComment, onToggle360, onRemove }) {
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  return (
    <div className="group py-3.5">
      <div className="flex items-start gap-3">
        <span className="size-1.5 rounded-full mt-2 shrink-0" style={{ background: accent }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-semibold text-slate-900">{it.name}</span>
            {it.external && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold"><window.LockIcon size={9} /> {it.orgShort}</span>
            )}
            <span className="text-[11px] text-slate-400">· {it.detail}</span>
          </div>
          <div className="text-[10.5px] text-slate-400 mt-1">
            {it.external ? "Verified by " : "Added by "}<span className="text-slate-500 font-medium">{it.author}</span> · {it.org} · {it.addedAt}
          </div>
          {it.comments.length > 0 && (
            <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-1.5">
              {it.comments.map(c => (
                <div key={c.id} className="text-[11.5px]">
                  <span className="text-slate-700">{c.text}</span>
                  <span className="text-slate-400"> — {c.author}, {c.org} · {c.at}</span>
                </div>
              ))}
            </div>
          )}
          {noteOpen && (
            <div className="mt-2">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={it.external ? `Flag a concern for ${it.orgShort}…` : "Add a note to this entry…"} />
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <Button variant="ghost" size="sm" onClick={() => { setNoteOpen(false); setNote(""); }}>Cancel</Button>
                <Button variant="primary" size="sm" icon={<Icon.send size={12} />} disabled={!note.trim()} onClick={() => { onComment(it.id, note); setNote(""); setNoteOpen(false); }}>Post note</Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onToggle360(it.id)} title={it.in360 ? "Pinned to 360° report" : "Pin to 360° report"}
            className={cx("size-7 rounded-md flex items-center justify-center transition", it.in360 ? "text-amber-500 hover:bg-amber-50" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100")}>
            <window.PinIcon size={13} filled={it.in360} />
          </button>
          <button onClick={() => setNoteOpen(o => !o)} title="Add a shared note"
            className={cx("size-7 rounded-md flex items-center justify-center transition", noteOpen ? "bg-sky-100 text-sky-600" : "text-slate-300 hover:text-sky-600 hover:bg-sky-50")}>
            <Icon.message size={13} />
          </button>
          {it.external ? (
            <span className="size-7 rounded-md flex items-center justify-center text-slate-200" title="Owned by another clinic — read-only"><window.LockIcon size={13} /></span>
          ) : (
            <button onClick={() => onRemove(it.id)} title="Remove" className="size-7 rounded-md flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition"><Icon.trash size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

function ClinicalAddRow({ label, suggestions, existingNames, onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const q = text.trim().toLowerCase();
  const have = new Set(existingNames.map(n => n.toLowerCase()));
  const recs = suggestions.filter(s => !have.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q))).slice(0, 6);
  const commit = (name) => { if (name && name.trim() && !have.has(name.trim().toLowerCase())) { onAdd(name.trim()); setText(""); setOpen(false); } };
  if (!open) return (
    <button onClick={() => setOpen(true)} className="mt-2 text-[12px] font-medium text-sky-700 hover:underline inline-flex items-center gap-1"><Icon.plus size={12} /> {label}</button>
  );
  return (
    <div className="mt-3 p-3 rounded-xl border border-sky-200 bg-sky-50/40">
      <div className="flex items-center gap-2">
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(text); } if (e.key === "Escape") setOpen(false); }}
          placeholder={`Search or type…`} className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400" />
        <Button variant="primary" size="sm" onClick={() => commit(text)} disabled={!text.trim()}>Add</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      {recs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recs.map(s => <button key={s} onClick={() => commit(s)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11.5px] font-medium text-slate-700 hover:bg-slate-50"><Icon.plus size={10} />{s}</button>)}
        </div>
      )}
    </div>
  );
}

const ALLERGY_SUGGEST = ["Penicillin", "Amoxicillin", "Sulfa drugs", "Aspirin", "Ibuprofen", "NSAIDs", "Latex", "Peanuts", "Tree nuts", "Shellfish", "Eggs", "Dairy / Lactose", "Soy", "Wheat / Gluten", "Sesame", "Pollen", "Dust mites", "Pet dander", "Bee stings"];
const CHRONIC_SUGGEST = ["Asthma (controlled)", "Asthma (moderate)", "Allergic rhinitis", "Eczema / Atopic dermatitis", "Type 1 diabetes", "Type 2 diabetes", "Hypothyroidism", "ADHD", "Autism spectrum", "Epilepsy", "Sickle cell trait", "Congenital heart defect", "Mild scoliosis", "Anemia (iron-deficient)", "Migraine", "GERD"];

function ClinicalSection({ anchorRef, record, onOpenReport }) {
  const pinned = record.allergies.filter(i => i.in360).length + record.conditions.filter(i => i.in360).length;
  return (
    <P360Section id="clinical" num="06" title="Clinical history"
      sub="Shared record · entries are attributed to their originating clinic"
      anchorRef={anchorRef}
      action={<HeaderAction icon={<Icon.sparkles size={13} />} onClick={onOpenReport}>360° report{pinned ? ` · ${pinned}` : ""}</HeaderAction>}>
      <div className="grid grid-cols-2 gap-x-10">
        <div>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="size-2 rounded-full bg-rose-500" />
            <DocLabel className="text-rose-700">Allergies</DocLabel>
            <span className="text-[11px] text-slate-400 ml-auto">{record.allergies.length}</span>
          </div>
          {record.allergies.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {record.allergies.map(it => (
                <ClinicalRow key={it.id} it={it} accent="#E11D48"
                  onComment={(id, t) => record.addComment("allergy", id, t)}
                  onToggle360={(id) => record.toggle360("allergy", id)}
                  onRemove={(id) => record.removeItem("allergy", id)} />
              ))}
            </div>
          ) : <div className="py-3 text-[12.5px] text-slate-400 italic">No known allergies.</div>}
          <ClinicalAddRow label="Add allergy" suggestions={ALLERGY_SUGGEST} existingNames={record.allergies.map(i => i.name)} onAdd={(name) => record.addItem("allergy", name, "Reaction not specified")} />
        </div>
        <div>
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="size-2 rounded-full bg-amber-500" />
            <DocLabel className="text-amber-700">Chronic care</DocLabel>
            <span className="text-[11px] text-slate-400 ml-auto">{record.conditions.length}</span>
          </div>
          {record.conditions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {record.conditions.map(it => (
                <ClinicalRow key={it.id} it={it} accent="#D97706"
                  onComment={(id, t) => record.addComment("condition", id, t)}
                  onToggle360={(id) => record.toggle360("condition", id)}
                  onRemove={(id) => record.removeItem("condition", id)} />
              ))}
            </div>
          ) : <div className="py-3 text-[12.5px] text-slate-400 italic">No chronic conditions on file.</div>}
          <ClinicalAddRow label="Add condition" suggestions={CHRONIC_SUGGEST} existingNames={record.conditions.map(i => i.name)} onAdd={(name) => record.addItem("condition", name, "Ongoing management")} />
        </div>
      </div>
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// VISITS — timeline
// ─────────────────────────────────────────────────────────────
const VISIT_STATUS = {
  Completed:   { color: "#10B981", text: "text-emerald-700", bg: "bg-emerald-50" },
  Today:       { color: "#0098E4", text: "text-sky-700",     bg: "bg-sky-50" },
  Cancelled:   { color: "#EF4444", text: "text-rose-600",    bg: "bg-rose-50" },
  Rescheduled: { color: "#F59E0B", text: "text-amber-700",   bg: "bg-amber-50" },
};
function VisitsSection({ anchorRef, patient, role }) {
  const { VISITS, PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const past = VISITS.filter(v => v.status !== "Today");
  const [expanded, setExpanded] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [reportFor, setReportFor] = React.useState(null);
  const [invoiceFor, setInvoiceFor] = React.useState(null);
  const shown = expanded ? past : past.slice(0, 4);

  const VisitDetailDialog = window.VisitDetailDialog;
  const VisitReportOverlay = window.VisitReportOverlay;
  const VisitInvoiceOverlay = window.VisitInvoiceOverlay;

  return (
    <P360Section id="visits" num="07" title="Past visits" sub={`${past.length} encounters on record · click any visit for details`} anchorRef={anchorRef}>
      <div className="relative pl-1">
        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-slate-200" />
        <div className="space-y-0">
          {shown.map((v, i) => {
            const pr = PRACTITIONERS.find(x => x.id === v.pract);
            const loc = LOCATIONS[v.loc];
            const st = VISIT_STATUS[v.status] || { color: "#94A3B8", text: "text-slate-500", bg: "bg-slate-50" };
            return (
              <button key={i} onClick={() => setSelected(v)}
                className="group/v relative w-full text-left pl-7 pb-6 last:pb-0 block">
                <span className="absolute left-0 top-1 size-[11px] rounded-full border-2 border-white" style={{ background: st.color, boxShadow: "0 0 0 1px " + st.color }} />
                <div className="rounded-lg -mx-2 px-2 py-1.5 group-hover/v:bg-slate-50 transition">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[13.5px] font-semibold text-slate-900 group-hover/v:text-sky-700 transition">{v.type}</div>
                    <span className={cx("text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded", st.bg, st.text)}>{v.status}</span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">{v.date} · {v.time} · {pr ? pr.name : "—"}{loc ? ` · ${loc.name}` : ""}</div>
                  <div className="text-[12.5px] text-slate-600 mt-1.5">{v.summary}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {past.length > 4 && (
        <button onClick={() => setExpanded(e => !e)} className="mt-1 text-[12px] font-medium text-sky-700 hover:underline">{expanded ? "Show recent only" : `Show all ${past.length} past visits`}</button>
      )}

      {selected && VisitDetailDialog && (
        <VisitDetailDialog
          visit={selected} patient={patient} role={role}
          onClose={() => setSelected(null)}
          onViewReport={() => setReportFor(selected)}
          onViewInvoice={() => setInvoiceFor(selected)}
          onStartEncounter={() => setSelected(null)}
        />
      )}
      {reportFor && VisitReportOverlay && (
        <VisitReportOverlay visit={reportFor} patient={patient} onClose={() => setReportFor(null)} />
      )}
      {invoiceFor && VisitInvoiceOverlay && (
        <VisitInvoiceOverlay visit={invoiceFor} patient={patient} onClose={() => setInvoiceFor(null)} />
      )}
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// INSURANCE — compact coverage block
// ─────────────────────────────────────────────────────────────
function InsuranceSection({ anchorRef, patient }) {
  const has = hasInsuranceFor(patient);
  const ins = has ? insuranceFor(patient) : null;
  const [policy, setPolicy] = React.useState(has ? {
    id: "pol-existing", provider: ins.provider, plan: ins.network, policyNumber: ins.policy,
    groupNumber: `GRP-${String(patHash(patient.id, 91) % 9000 + 1000)}`, holder: patient.guardian || patient.name,
    relation: patient.guardian ? "Parent / Guardian" : "Self", effective: "Jan 1, 2026", renews: "Dec 31, 2026",
    copay: "150 MXN", deductible: "2,500 MXN", deductibleMet: "800 MXN", primary: true, status: "active", claims: [],
  } : null);
  const [editing, setEditing] = React.useState(false);

  return (
    <P360Section id="coverage" num="08" title="Insurance & billing" sub={policy ? "Primary coverage on file" : "Self-pay account"} anchorRef={anchorRef}
      action={<HeaderAction icon={policy ? <Icon.edit size={13} /> : <Icon.plus size={13} />} onClick={() => setEditing(true)}>{policy ? "Edit policy" : "Add insurance"}</HeaderAction>}>
      {policy ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <span className="size-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center"><Icon.invoice size={14} /></span>
            <span className="text-[14px] font-bold text-slate-900">{policy.provider}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">Primary</span>
            <span className="text-[11.5px] text-slate-400 ml-auto">Plan · {policy.plan}</span>
          </div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-3 mt-3.5">
            <DocCell label="Policy number" value={policy.policyNumber} mono />
            <DocCell label="Group" value={policy.groupNumber} mono />
            <DocCell label="Holder" value={`${policy.holder} · ${policy.relation}`} />
            <DocCell label="Effective" value={policy.effective} />
            <DocCell label="Renews" value={policy.renews} />
            <DocCell label="Co-pay" value={`$${policy.copay}`} />
            <DocCell label="Deductible" value={`$${policy.deductible} · met $${policy.deductibleMet}`} wide />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-6 text-center">
          <div className="text-[13.5px] font-semibold text-slate-700">Self-pay account</div>
          <div className="text-[12px] text-slate-500 mt-1">No active insurance policies. Invoices are billed directly to the patient.</div>
        </div>
      )}
      {editing && (
        <PolicyEditorDialog open patient={patient} existing={policy} canSetPrimary={!!policy}
          onClose={() => setEditing(false)}
          onSubmit={(data) => { setPolicy(prev => prev ? { ...prev, ...data } : { ...data, id: "pol-1", status: "active", claims: [], primary: true }); setEditing(false); }} />
      )}
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTACTS — guardians (minor) or patient + emergency (adult)
// ─────────────────────────────────────────────────────────────
function ContactsSection({ anchorRef, patient }) {
  const age = calcAgeFromDob(patient.dob);
  const isMinor = !age || age.years < 16;

  const [guardians, setGuardians] = React.useState(() => isMinor ? [{
    id: "g-primary", name: guardianDetailFor(patient).name, relation: guardianDetailFor(patient).relation || "Mother",
    phone: patient.phone, email: patient.email, address: "Calle 32 #456, García Ginerés, Mérida", preferred: "WhatsApp", primary: true,
  }] : []);
  const [selfContact, setSelfContact] = React.useState({ phone: patient.phone, email: patient.email, address: "Calle 60 #312, Centro, Mérida", preferred: "WhatsApp" });
  const [emergency, setEmergency] = React.useState(() => isMinor ? [] : emergencyContactsFor(patient).map((c, i) => ({ id: `e-${i}`, name: c.name, relation: c.relation, phone: c.phone, email: c.email, primary: i === 0 })));
  const [editing, setEditing] = React.useState(null);
  const [removing, setRemoving] = React.useState(null);

  const people = isMinor
    ? guardians.map(g => ({ ...g, _kind: "guardian", _role: g.primary ? "Primary guardian" : "Guardian" }))
    : [{ ...selfContact, _kind: "self", id: "self", name: patient.name, relation: "Self", _role: "Patient", primary: true }, ...emergency.map(e => ({ ...e, _kind: "emergency", _role: e.primary ? "Primary emergency" : "Emergency" }))];

  const save = (kind, data) => {
    if (kind === "self") setSelfContact(prev => ({ ...prev, ...data }));
    else if (kind === "guardian") setGuardians(prev => data.id ? prev.map(g => g.id === data.id ? { ...g, ...data } : g) : [...prev, { ...data, id: `g-${Date.now()}`, primary: prev.length === 0 }]);
    else setEmergency(prev => data.id ? prev.map(e => e.id === data.id ? { ...e, ...data } : e) : [...prev, { ...data, id: `e-${Date.now()}`, primary: prev.length === 0 }]);
    setEditing(null);
  };

  return (
    <P360Section id="contacts" num="09" title={isMinor ? "Guardians & contacts" : "Contacts"} sub={isMinor ? "Patient is under 16 — guardians act as emergency contacts" : "Patient contact and emergency contacts"} anchorRef={anchorRef}
      action={<HeaderAction icon={<Icon.plus size={13} />} onClick={() => setEditing({ kind: isMinor ? "guardian" : "emergency", record: null })}>{isMinor ? "Add guardian" : "Add emergency contact"}</HeaderAction>}>
      <div className="grid grid-cols-2 gap-x-10 gap-y-5">
        {people.map((p) => (
          <div key={p.id} className="group">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-[13.5px] font-semibold text-slate-900">{p.name}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10.5px] font-semibold">{p.relation}</span>
              <span className="text-[10.5px] text-slate-400">{p._role}</span>
              <button onClick={() => setEditing({ kind: p._kind, record: p._kind === "self" ? { ...selfContact, id: "self" } : p })} className="ml-auto size-6 rounded flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 transition"><Icon.edit size={12} /></button>
              {p._kind === "emergency" && (
                <button onClick={() => setRemoving(p)} className="size-6 rounded flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition"><Icon.trash size={12} /></button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-2.5">
              <DocCell label="Phone" value={p.phone} mono />
              <DocCell label="Email" value={p.email} />
              {p.address && <DocCell label="Address" value={p.address} wide />}
              {p.preferred && <DocCell label="Preferred contact" value={p.preferred} />}
            </div>
          </div>
        ))}
      </div>
      {isMinor && (
        <div className="mt-5 px-3.5 py-2.5 rounded-lg bg-sky-50/60 border border-sky-100 text-[12px] text-slate-600">
          For patients under 16, listed <span className="font-semibold text-slate-700">guardians</span> are automatically the emergency contacts.
        </div>
      )}
      {editing && (
        <ContactEditorDialog target={editing} isMinor={isMinor} canSetPrimary={true}
          onClose={() => setEditing(null)} onSubmit={(data) => save(editing.kind, data)} />
      )}
      {removing && (
        <ConfirmRemoveDialog title="Remove emergency contact" name={removing.name}
          description="This emergency contact will be removed from the patient's record."
          onClose={() => setRemoving(null)} onConfirm={() => { setEmergency(prev => prev.filter(e => e.id !== removing.id)); setRemoving(null); }} />
      )}
    </P360Section>
  );
}

// ─────────────────────────────────────────────────────────────
// ASK NARZIM — always-open right-side chat, answers from the record
// ─────────────────────────────────────────────────────────────
function buildNarzimAnswer(q, ctx) {
  const t = q.toLowerCase();
  const has = (...ks) => ks.some(k => t.includes(k));
  const { name, first, allergies, conditions, latest, meds, imms, lastVisit, insurance, contact, ageStr, sex } = ctx;

  if (has("allerg")) {
    return allergies.length
      ? `${first} has ${allergies.length} recorded ${allergies.length === 1 ? "allergy" : "allergies"}: ${allergies.join(", ")}. Cross-check any new prescription against these before ordering.`
      : `No known allergies are on file for ${first}. It's still worth confirming verbally at each visit.`;
  }
  if (has("chronic", "condition", "diagnos")) {
    return conditions.length
      ? `Chronic care on file: ${conditions.join(", ")}. These are pinned into the 360° report.`
      : `No chronic conditions are on file for ${first}.`;
  }
  if (has("medication", "meds", "drug", "prescrib", "taking")) {
    const active = meds.filter(m => m.status === "Active");
    return active.length
      ? `Active medications: ${active.map(m => `${m.name} (${m.dose})`).join("; ")}. New medications can only be added during an encounter.`
      : `${first} has no active medications right now.`;
  }
  if (has("vaccin", "immuniz", "shot", "booster")) {
    return imms.length
      ? `${imms.length} immunizations on record. Most recent: ${imms.slice(0, 3).map(i => `${i.name} (${i.date})`).join(", ")}.`
      : `No immunizations are on file yet.`;
  }
  if (has("growth", "weight", "height", "bmi", "percentile", "trend")) {
    return `Latest measurements (${latest.dateStr}): weight ${latest.weight} kg, height ${latest.height} cm, BMI ${latest.bmi}. The growth curve is tracking within the normal WHO percentile band — steady gains across recorded visits.`;
  }
  if (has("vital", "temperature", "temp", "blood pressure", "bp", "heart")) {
    return `Most recent vitals (${latest.dateStr}): temp ${latest.temp}°C · HR ${latest.hr} bpm · BP ${latest.sys}/${latest.dia} mmHg. All within expected range for age.`;
  }
  if (has("visit", "last seen", "appointment", "history")) {
    return lastVisit
      ? `Most recent past visit: ${lastVisit.type} on ${lastVisit.date} — ${lastVisit.summary} Click that visit in the record to open the full report or invoice.`
      : `No past visits are on record yet.`;
  }
  if (has("insurance", "coverage", "policy", "billing")) {
    return insurance
      ? `Coverage: ${insurance.provider} (${insurance.plan}), policy ${insurance.policyNumber}, holder ${insurance.holder}. Co-pay ${insurance.copay}.`
      : `${first} is on a self-pay account — no active insurance policy on file.`;
  }
  if (has("contact", "guardian", "parent", "phone", "email", "reach")) {
    return contact
      ? `Primary contact: ${contact.name} (${contact.relation}) · ${contact.phone} · ${contact.email}.`
      : `No contact on file.`;
  }
  if (has("summary", "summarize", "overview", "tell me about", "who is", "brief")) {
    return `${name} — ${ageStr}, ${sex}. ${allergies.length ? `Allergies: ${allergies.join(", ")}.` : "No known allergies."} ${conditions.length ? `Chronic: ${conditions.join(", ")}.` : "No chronic conditions."} ${meds.filter(m => m.status === "Active").length ? `On ${meds.filter(m => m.status === "Active").length} active medication(s).` : "No active meds."} Latest weight ${latest.weight} kg / height ${latest.height} cm (${latest.dateStr}), growth within normal range. ${lastVisit ? `Last seen ${lastVisit.date} for a ${lastVisit.type.toLowerCase()}.` : ""}`;
  }
  return `I can answer from ${first}'s record — try asking about allergies, chronic conditions, medications, immunizations, growth, vitals, past visits, insurance, or contacts. For example: “Summarize this chart” or “Any allergy risks?”`;
}

function NarzimChat({ patient, ctx }) {
  const greeting = { role: "bot", text: `Hi — I'm Narzim. Ask me anything about ${ctx.first}'s record and I'll answer from this chart.` };
  const [messages, setMessages] = React.useState([greeting]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const listRef = React.useRef(null);

  const SUGGESTIONS = ["Summarize this chart", "Any allergy risks?", "Active medications", "Latest growth trend", "When was the last visit?"];

  React.useEffect(() => {
    const el = listRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const answer = buildNarzimAnswer(q, ctx);
      setMessages(prev => [...prev, { role: "bot", text: answer }]);
      setTyping(false);
    }, 650 + Math.random() * 500);
  };

  return (
    <aside className="w-[360px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-2.5 shrink-0 bg-gradient-to-r from-sky-50/70 to-white">
        <div className="size-8 rounded-lg bg-[#0098E4] text-white flex items-center justify-center"><Icon.sparkles size={15} /></div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-slate-900 leading-tight">Ask Narzim</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" /> Answering from {ctx.first}'s 360° record</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed",
              m.role === "user" ? "bg-[#0098E4] text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm")}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11.5px] font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition">{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Ask about ${ctx.first}…`}
            className="flex-1 resize-none bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400 max-h-24" />
          <button onClick={() => send()} disabled={!input.trim()}
            className="size-8 rounded-lg bg-[#0098E4] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#0086cc] transition shrink-0"><Icon.send size={14} /></button>
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5 text-center">Narzim reads this chart only · responses are AI-generated</div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN — letterhead document
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "snapshot", label: "At a glance" }, { id: "growth", label: "Growth" },
  { id: "vitals", label: "Vitals" }, { id: "meds", label: "Medications" },
  { id: "imms", label: "Immunizations" }, { id: "clinical", label: "Clinical" },
  { id: "visits", label: "Past visits" }, { id: "coverage", label: "Insurance" },
  { id: "contacts", label: "Contacts" },
];

function Patient360Screen({ patient, role = "frontdesk", onBack, onAskRemedy, onStartEncounter, breadcrumbLabel = "Patients" }) {
  const { LOCATIONS, PRACTITIONERS } = window.CHAVITOS;
  const loc = LOCATIONS[patient.loc];
  const pr  = PRACTITIONERS.find(x => x.id === patient.pract);

  // Active (today) appointment → drives the top CTA banner.
  const appt = (patient.activity && patient.activity.kind === "today") ? patient.activity : null;
  const apptType = appt ? ((window.CHAVITOS.VISITS.find(v => v.status === "Today") || {}).type || "Scheduled visit") : null;

  const ROLE = (window.CHAVITOS_ROLES && window.CHAVITOS_ROLES[role]) || {};
  const currentUser = (ROLE.user && ROLE.user.fullName) || "Clinician";
  const currentOrg = "Chavitos Clinic";
  const record = window.useClinicalRecord(patient, currentUser, currentOrg);
  const [reportOpen, setReportOpen] = React.useState(false);

  // Vitals state lifted so snapshot + growth share one source.
  const initialRows = React.useMemo(() => buildVitalsRows(patient), [patient.id]);
  const [extraRows, setExtraRows] = React.useState([]);
  const rows = React.useMemo(() => [...extraRows, ...initialRows].sort((a, b) => b.date - a.date), [extraRows, initialRows]);
  const latest = rows[0] || {};
  const onRecord = (entry) => {
    const d = new Date(entry.date || P360_TODAY);
    const weight = parseFloat(entry.weight) || latest.weight || 0;
    const height = parseFloat(entry.height) || latest.height || 0;
    setExtraRows(prev => [{
      id: `vh-new-${Date.now()}`, date: d, dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ageAtVisit: latest.ageAtVisit || "—", weight, height, hc: parseFloat(entry.hc) || latest.hc || 0,
      bmi: height > 0 ? +(weight / Math.pow(height / 100, 2)).toFixed(1) : 0,
      temp: parseFloat(entry.temp) || latest.temp || 36.7, hr: parseInt(entry.hr, 10) || latest.hr || 0,
      sys: parseInt(entry.sys, 10) || latest.sys || 0, dia: parseInt(entry.dia, 10) || latest.dia || 0, source: "Manual",
    }, ...prev]);
  };

  // Context for the Ask Narzim chat (updates live as the record is edited).
  const meds = React.useMemo(() => buildMeds(patient), [patient.id]);
  const narzimCtx = (() => {
    const ins = hasInsuranceFor(patient) ? insuranceFor(patient) : null;
    const age = calcAgeFromDob(patient.dob);
    const isMinor = !age || age.years < 16;
    const g = guardianDetailFor(patient);
    const pastVisits = window.CHAVITOS.VISITS.filter(v => v.status !== "Today");
    return {
      name: patient.name,
      first: (patient.name || "").split(/\s+/)[0],
      sex: patient.sex === "M" ? "male" : "female",
      ageStr: formatAge(age),
      allergies: record.allergies.map(a => a.name),
      conditions: record.conditions.map(c => c.name),
      latest, meds,
      imms: window.CHAVITOS.IMMUNIZATIONS,
      lastVisit: pastVisits[0] || null,
      insurance: ins ? { provider: ins.provider, plan: ins.network, policyNumber: ins.policy, holder: patient.guardian || patient.name, copay: "150 MXN" } : null,
      contact: isMinor
        ? { name: g.name, relation: g.relation || "Mother", phone: patient.phone, email: patient.email }
        : { name: patient.name, relation: "Self", phone: patient.phone, email: patient.email },
    };
  })();

  const scrollRef = React.useRef(null);
  const [active, setActive] = React.useState("snapshot");

  const jump = (id) => {
    const c = scrollRef.current; if (!c) return;
    const el = c.querySelector(`#p360-${id}`); if (!el) return;
    const top = el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 12;
    c.scrollTo({ top, behavior: "smooth" });
  };

  React.useEffect(() => {
    const c = scrollRef.current; if (!c) return;
    const onScroll = () => {
      const cTop = c.getBoundingClientRect().top;
      let cur = NAV_ITEMS[0].id;
      for (const it of NAV_ITEMS) {
        const el = c.querySelector(`#p360-${it.id}`);
        if (el && el.getBoundingClientRect().top - cTop <= 90) cur = it.id;
      }
      setActive(cur);
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => c.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="h-full flex">
      <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto pb-32 bg-slate-100/50">
      {/* Sticky toolbar + section nav */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="flex items-center gap-3 px-5 py-3">
          <button onClick={onBack} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700"><Icon.chevLeft size={18} /></button>
          <button onClick={onBack} className="text-[13px] text-slate-500 hover:text-sky-700 hover:underline transition">{breadcrumbLabel}</button>
          <Icon.chevRight size={12} />
          <div className="text-[13px] font-semibold text-slate-900 truncate">{patient.name}</div>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" icon={<Icon.print size={14} />} onClick={() => setReportOpen(true)}>360° report</Button>
        </div>
        <div className="flex items-center gap-1.5 px-5 pb-2 flex-wrap">
          {NAV_ITEMS.map(it => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => jump(it.id)}
                style={on ? { background: "#0F172A", color: "#fff" } : undefined}
                className={cx("h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap shrink-0 transition",
                  on ? "" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>{it.label}</button>
            );
          })}
        </div>
      </div>

      {/* Active appointment CTA */}
      {appt && (
        <div className="px-6 pt-5">
          <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white px-5 py-3.5 flex items-center gap-4 shadow-sm">
            <span className="relative flex size-9 items-center justify-center rounded-xl bg-[#0098E4] text-white shrink-0">
              <Icon.stetho size={17} />
              <span className="absolute -top-0.5 -right-0.5 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-sky-500 border-2 border-white" />
              </span>
            </span>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-sky-700">Active appointment · today</div>
              <div className="text-[13.5px] text-slate-800 mt-0.5 truncate">
                <span className="font-semibold text-slate-900">{apptType}</span>
                {appt.time ? <span> · {appt.time}</span> : null}
                {pr ? <span> · {pr.name}</span> : null}
                {appt.status ? <span className="text-slate-500"> · {appt.status}</span> : null}
              </div>
            </div>
            <div className="flex-1" />
            <Button variant="primary" size="md" icon={<Icon.stetho size={15} />}
              onClick={() => onStartEncounter && onStartEncounter()}>
              Start patient encounter
            </Button>
          </div>
        </div>
      )}

      {/* The letterhead sheet */}
      <div className="px-6 py-7">
        <div className="mx-auto max-w-[960px] bg-white rounded-sm shadow-[0_24px_60px_rgba(15,23,42,0.12)] border border-slate-200/80 overflow-hidden">
          <div className="h-1.5" style={{ background: "linear-gradient(90deg,#A5C944 0%,#5FB8C9 50%,#0098E4 100%)" }} />
          <Masthead patient={patient} />
          <AlertBand allergies={record.allergies.map(a => a.name)} conditions={record.conditions.map(c => c.name)} />

          <SnapshotSection latest={latest} pr={pr} loc={loc} />
          <GrowthSection rows={rows} onRecord={onRecord} />
          <VitalsHistorySection rows={rows} />
          <MedicationsSection patient={patient} />
          <ImmunizationsSection />
          <ClinicalSection record={record} onOpenReport={() => setReportOpen(true)} />
          <VisitsSection patient={patient} role={role} />
          <InsuranceSection patient={patient} />
          <ContactsSection patient={patient} />

          {/* Footer */}
          <div className="px-14 py-7 border-t border-slate-200 bg-slate-50/50">
            <div className="flex items-end justify-between gap-6">
              <div className="text-[10.5px] text-slate-400 leading-relaxed max-w-lg">
                Generated by Narzim for {currentOrg}. This record compiles entries from every participating clinic; originating organizations retain control of their source entries. Confidential — handle per applicable privacy regulations.
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-slate-500">Compiled {P360_COMPILED}</div>
                <div className="text-[11px] text-slate-500">by {currentUser}</div>
                <div className="mt-1 flex items-center gap-1.5 justify-end text-[11px] font-bold text-chavitos-700">
                  <img src={CHAVITOS_LOGO} alt="" className="h-4 w-auto" /> Narzim 360°
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <window.Patient360Report open={reportOpen} onClose={() => setReportOpen(false)} patient={patient} record={record} currentOrg={currentOrg} />
      </div>

      <NarzimChat patient={patient} ctx={narzimCtx} />
    </div>
  );
}

// Override the tabbed PatientScreen with the letterhead version.
window.PatientScreen = Patient360Screen;
