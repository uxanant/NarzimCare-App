// Patient detail / EHR record screen

// Helpers — synthesize / parse demographic data that isn't on every patient.
const BLOOD_GROUPS = ["O+", "A+", "B+", "O−", "A−", "AB+", "B−", "AB−"];
const INSURANCE_PROVIDERS = [
  { provider: "GNP Seguros",     network: "Premier" },
  { provider: "AXA Mexico",      network: "Plus" },
  { provider: "Seguros Monterrey", network: "Familias" },
  { provider: "BUPA Mexico",     network: "Health 200" },
  { provider: "MetLife",         network: "Niños" },
];
const RELATIONS = ["Mother", "Father", "Guardian", "Sibling", "Grandparent"];

// Deterministic per-patient hash so synthesized details stay stable across renders.
function patHash(id, salt = 0) {
  let h = salt;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Compute age from DOB string ("MM/DD/YYYY" or "YYYY-MM-DD").
function calcAgeFromDob(dob) {
  if (!dob) return null;
  let y, m, d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    [y, m, d] = dob.split("-").map(Number);
  } else {
    const parts = dob.split("/").map(Number);
    if (parts.length !== 3) return null;
    [m, d, y] = parts;
  }
  const today = new Date();
  let years = today.getFullYear() - y;
  let months = today.getMonth() + 1 - m;
  let days = today.getDate() - d;
  if (days < 0) months--;
  if (months < 0) { years--; months += 12; }
  return { years, months: Math.max(0, months) };
}
function formatAge(age) {
  if (!age) return "—";
  if (age.years === 0) return `${age.months} months`;
  if (age.years < 3) return `${age.years} yr${age.years===1?'':'s'} ${String(age.months).padStart(2,'0')} months`;
  return `${age.years} yr${age.years===1?'':'s'}`;
}

function bloodGroupFor(p)         { return BLOOD_GROUPS[patHash(p.id, 11) % BLOOD_GROUPS.length]; }
function hasInsuranceFor(p)       { return (patHash(p.id, 13) % 100) < 70; } // 70% have insurance
function insuranceFor(p) {
  const ins = INSURANCE_PROVIDERS[patHash(p.id, 17) % INSURANCE_PROVIDERS.length];
  const policy = `POL-${String(patHash(p.id, 19) % 900000 + 100000)}`;
  return { ...ins, policy };
}
function emergencyContactsFor(p) {
  // 1–2 emergency contacts for adults.
  const count = (patHash(p.id, 23) % 2) + 1;
  const names = ["Carmen", "Patricia", "Roberto", "Diana", "Manuel", "Elena", "Pablo", "Mónica"];
  return Array.from({ length: count }, (_, i) => {
    const h = patHash(p.id, 31 + i * 7);
    return {
      name: `${names[h % names.length]} ${(p.name || "").split(" ").slice(-2, -1)[0] || "Familia"}`,
      relation: RELATIONS[h % RELATIONS.length],
      phone: `+52 999 ${String(100 + (h % 900)).padStart(3,'0')} ${String(1000 + (h % 9000)).padStart(4,'0')}`,
      email: `contact${(h % 99) + 1}@familia.mx`,
    };
  });
}
function guardianDetailFor(p) {
  const h = patHash(p.id, 41);
  return {
    name: p.guardian || `${["Mariana","Sofía","Pablo","Lucía","Carmen"][h % 5]} ${(p.name || "").split(" ").slice(-2, -1)[0] || "Familia"}`,
    relation: RELATIONS[h % 3], // weight toward parental
    phone: p.phone,
    email: p.email,
  };
}

function PatientScreen({ patient, role = "frontdesk", onBack, onAskRemedy, onCreateInvoice, onStartEncounter, breadcrumbLabel = "Patients", initialTab = "visits" }) {
  const [tab, setTab] = React.useState(initialTab);
  const { LOCATIONS, PRACTITIONERS, VITALS_HISTORY, VISITS, MEDICATIONS, IMMUNIZATIONS } = window.CHAVITOS;
  const loc = LOCATIONS[patient.loc];
  const pr  = PRACTITIONERS.find(x => x.id === patient.pract);

  // Current actor + organization, for clinical-record provenance.
  const ROLE = (window.CHAVITOS_ROLES && window.CHAVITOS_ROLES[role]) || {};
  const currentUser = (ROLE.user && ROLE.user.fullName) || "Clinician";
  const currentOrg = "Chavitos Clinic";
  const record = useClinicalRecord(patient, currentUser, currentOrg);
  const [reportOpen, setReportOpen] = React.useState(false);

  return (
    <div className="h-full overflow-y-auto pb-32">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={onBack} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700">
          <Icon.chevLeft size={18} />
        </button>
        <button
          onClick={onBack}
          className="text-[13px] text-slate-500 hover:text-sky-700 hover:underline transition"
        >
          {breadcrumbLabel}
        </button>
        <Icon.chevRight size={12} />
        <div className="text-[13px] font-semibold text-slate-900">{patient.name}</div>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" icon={<Icon.print size={14} />} onClick={() => setReportOpen(true)}>360° report</Button>
        <Button variant="secondary" size="sm" icon={<Icon.mail size={14} />}>Email summary</Button>
        <Button variant="soft" size="sm" icon={<Icon.sparkles size={14} />} onClick={() => onAskRemedy(`Summarize ${patient.name}'s chart for me`)}>Ask Narzim</Button>
      </div>

      {/* Hero card */}
      <div className="px-5 pt-5">
        <Card className="p-5">
          {(() => {
            const age = calcAgeFromDob(patient.dob);
            const bloodGroup = bloodGroupFor(patient);
            return (
              <div className="flex items-center gap-5">
                <BabyAvatar size={72} swatch={patient.swatch} name={patient.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[22px] font-bold text-slate-900">{patient.name}</h1>
                    {patient.isNew && (
                      <Badge color={{ bg: "#FFEDD4", text: "#CA3500", border: "#FFD6A8" }}>New patient</Badge>
                    )}
                    <Badge color={{ bg: "#F1F5F9", text: "#0F172A" }}>{patient.sex === "M" ? "Male" : "Female"}</Badge>
                  </div>
                  <div className="mt-1 text-[13px] text-slate-500 flex items-center gap-3 flex-wrap">
                    <span className="font-mono">{patient.mrn}</span>
                    <span>•</span>
                    <span>DOB {patient.dob}</span>
                    <span>•</span>
                    <span>{formatAge(age)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center size-4 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">B</span>
                      Blood {bloodGroup}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-5">
        <Tabs value={tab} onChange={setTab} items={[
          { value: "visits",          label: "Visits" },
          { value: "vitals",          label: "Vitals & growth" },
          { value: "clinical",        label: "Clinical history" },
          { value: "medications",     label: "Medications" },
          { value: "immunizations",   label: "Immunizations" },
          { value: "insurance",       label: "Insurance" },
          { value: "contact",         label: "Contact" },
        ]}/>
      </div>

      {/* Content */}
      <div className="px-5 pt-4">
        {tab === "vitals" && <VitalsTab patient={patient} />}

        {tab === "clinical" && <ClinicalTab patient={patient} record={record} onOpenReport={() => setReportOpen(true)} />}

        {tab === "insurance" && <InsuranceTab patient={patient} />}

        {tab === "contact" && <ContactTab patient={patient} />}

        {tab === "visits" && <VisitsTab patient={patient} role={role} />}

        {tab === "medications" && <MedicationsTab patient={patient} />}

        {tab === "immunizations" && <ImmunizationsTab patient={patient} />}
      </div>

      <Patient360Report
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        patient={patient}
        record={record}
        currentOrg={currentOrg}
      />
    </div>
  );
}

function InfoCell({ icon, label, value, sub, prefix }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-[13.5px] font-medium text-slate-900 mt-1 truncate">{prefix ? <span className="text-slate-500 font-normal">{prefix} </span> : null}{value}</div>
      {sub && <div className="text-[11.5px] text-slate-500 truncate">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Immunizations tab — staff can add, edit and remove vaccine records.
// Common pediatric vaccines are exposed as autocomplete suggestions
// so doctors don't have to type the full name. Dose/site are optional
// extras shown in the editor.
// ──────────────────────────────────────────────────────────────
const COMMON_VACCINES = [
  "DTaP", "Tdap", "Hep A", "Hep B", "Hib", "HPV", "MMR", "MMRV",
  "Influenza", "Meningococcal", "Pneumococcal (PCV13)", "Polio (IPV)",
  "Rotavirus", "Varicella", "COVID-19", "BCG",
];
const ADMIN_SITES = ["Left deltoid", "Right deltoid", "Left thigh", "Right thigh", "Oral", "Nasal", "Other"];

function ImmunizationsTab({ patient }) {
  const seed = React.useMemo(() => {
    return window.CHAVITOS.IMMUNIZATIONS.map((m, i) => ({
      id: `imm-${i}`,
      name: m.name,
      date: parseLongDate(m.date) || new Date(),
      lot: m.lot,
      by: m.by,
      dose: "",
      site: "",
      note: "",
    }));
  }, []);
  const [records, setRecords] = React.useState(seed);
  const [editing, setEditing] = React.useState(null); // record or {id:null} for new
  const [removing, setRemoving] = React.useState(null);

  const handleSave = (data) => {
    if (data.id) {
      setRecords(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
    } else {
      setRecords(prev => [{ ...data, id: `imm-${Date.now()}` }, ...prev]);
    }
    setEditing(null);
  };

  const handleRemove = () => {
    setRecords(prev => prev.filter(r => r.id !== removing.id));
    setRemoving(null);
  };

  // Sort by date descending for display
  const sorted = [...records].sort((a, b) => b.date - a.date);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200/70 flex items-center justify-between">
        <SectionHeader title="Immunizations" sub={`${records.length} on file`} />
        <Button
          variant="soft"
          size="sm"
          icon={<Icon.plus size={12}/>}
          onClick={() => setEditing({
            id: null,
            name: "",
            date: new Date(2026, 4, 27),
            lot: "",
            by: "Dr. Miguel Soto",
            dose: "",
            site: "",
            note: "",
          })}
        >
          Add immunization
        </Button>
      </div>

      <div className="grid items-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 px-5 py-2.5 bg-slate-50/70 border-b border-slate-100"
        style={{ gridTemplateColumns: "1.8fr 1.1fr 1fr 1fr 1.6fr 0.8fr" }}
      >
        <div>Vaccine</div>
        <div>Date</div>
        <div>Lot</div>
        <div>Site</div>
        <div>Administered by</div>
        <div className="text-right">Edit</div>
      </div>

      <div className="divide-y divide-slate-100">
        {sorted.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500">
            <div className="mx-auto size-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><Icon.syringe size={18}/></div>
            <div className="text-[13.5px] font-semibold text-slate-700">No immunizations on file</div>
            <div className="text-[12px] text-slate-500 mt-0.5">Click "Add immunization" to record this patient's first vaccine.</div>
          </div>
        ) : sorted.map((r) => (
          <div
            key={r.id}
            className="group grid items-center px-5 py-3 text-[13px] hover:bg-emerald-50/30 transition"
            style={{ gridTemplateColumns: "1.8fr 1.1fr 1fr 1fr 1.6fr 0.8fr" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Icon.syringe size={14}/></div>
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{r.name}</div>
                {(r.dose || r.note) && (
                  <div className="text-[10.5px] text-slate-500 truncate">
                    {r.dose && <span>{r.dose}</span>}
                    {r.dose && r.note && <span> · </span>}
                    {r.note && <span>{r.note}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="text-slate-700 truncate">{formatLongDate(r.date)}</div>
            <div className="text-slate-700 font-mono truncate">{r.lot || <span className="text-slate-400">—</span>}</div>
            <div className="text-slate-700 truncate">{r.site || <span className="text-slate-400">—</span>}</div>
            <div className="text-slate-700 truncate">{r.by}</div>
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => setEditing(r)}
                className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100"
                title="Edit"
              >
                <Icon.edit size={13}/>
              </button>
              <button
                onClick={() => setRemoving(r)}
                className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                title="Remove"
              >
                <Icon.trash size={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ImmunizationEditorDialog
          record={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleSave}
        />
      )}
      {removing && (
        <ConfirmRemoveDialog
          title="Remove immunization"
          name={`${removing.name} · ${formatLongDate(removing.date)}`}
          description="This vaccine record will be removed from the patient's immunization history. This action cannot be undone."
          onClose={() => setRemoving(null)}
          onConfirm={handleRemove}
        />
      )}
    </Card>
  );
}

function ImmunizationEditorDialog({ record, onClose, onSubmit }) {
  const isNew = !record.id;
  const [name, setName] = React.useState(record.name || "");
  const [dateIso, setDateIso] = React.useState(isoFromDate(record.date));
  const [lot, setLot] = React.useState(record.lot || "");
  const [site, setSite] = React.useState(record.site || "");
  const [dose, setDose] = React.useState(record.dose || "");
  const [note, setNote] = React.useState(record.note || "");
  const [by, setBy] = React.useState(record.by || "Dr. Miguel Soto");
  const [vaccineOpen, setVaccineOpen] = React.useState(false);

  const vaccineSuggestions = COMMON_VACCINES.filter(v =>
    !name || v.toLowerCase().includes(name.toLowerCase())
  );

  const canSubmit = name.trim() && dateIso && by.trim();

  const handleSubmit = () => {
    onSubmit({
      id: record.id,
      name: name.trim(),
      date: dateFromIso(dateIso),
      lot: lot.trim(),
      site, dose: dose.trim(), note: note.trim(),
      by: by.trim(),
    });
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[600px] max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Icon.syringe size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">{isNew ? "Add immunization" : "Edit immunization"}</div>
              <div className="text-[11.5px] text-slate-500">{isNew ? "Record a new vaccine for this patient" : `${record.name} · ${formatLongDate(record.date)}`}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <Field label="Vaccine *">
            <div className="relative">
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setVaccineOpen(true); }}
                onFocus={() => setVaccineOpen(true)}
                onBlur={() => setTimeout(() => setVaccineOpen(false), 150)}
                placeholder="DTaP, MMR, Influenza…"
              />
              {vaccineOpen && vaccineSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg max-h-44 overflow-y-auto">
                  {vaccineSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => { setName(s); setVaccineOpen(false); }}
                      className="w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-emerald-50 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date administered *">
              <Input type="date" value={dateIso} onChange={(e) => setDateIso(e.target.value)} />
            </Field>
            <Field label="Lot #">
              <Input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="AX-29841" />
            </Field>
            <Field label="Dose">
              <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 0.5 mL · 2nd dose" />
            </Field>
            <Field label="Site">
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
              >
                <option value="">—</option>
                {ADMIN_SITES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Administered by *">
              <Input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Dr. Miguel Soto" />
            </Field>
            <Field label="Notes">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mild redness, no adverse reaction…" />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} disabled={!canSubmit} onClick={handleSubmit}>
            {isNew ? "Add immunization" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────
// Medications tab — read-only "Add" (only doctors can prescribe via an
// encounter), but the staff CAN edit existing meds — duration, end date,
// and status. Setting a duration auto-computes an end date; once the
// end date is in the past, status is forced to "Completed". Users can
// also manually mark a med Active/Completed/Stopped at any time.
// ──────────────────────────────────────────────────────────────
const STATUS_STYLES_MEDS = {
  Active:    { bg:"#D1FAE5", text:"#065F46", dot:"#10B981" },
  Completed: { bg:"#F1F5F9", text:"#475569", dot:"#94A3B8" },
  Stopped:   { bg:"#FECACA", text:"#991B1B", dot:"#EF4444" },
};

// Date helpers
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function parseLongDate(s) {
  // "Jan 14, 2026" or "Oct 22, 2025"
  if (!s) return null;
  const m = /^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const monthIdx = MONTHS_SHORT.findIndex(x => x.toLowerCase() === m[1].toLowerCase());
  if (monthIdx < 0) return null;
  return new Date(parseInt(m[3],10), monthIdx, parseInt(m[2],10));
}
function formatLongDate(d) {
  if (!d) return "";
  return `${MONTHS_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()}`;
}
function isoFromDate(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateFromIso(s) {
  if (!s) return null;
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function addDays(d, days) {
  const n = new Date(d); n.setDate(n.getDate() + days); return n;
}
function durationDays({ value, unit }) {
  const v = parseInt(value, 10);
  if (Number.isNaN(v) || v <= 0) return null;
  switch (unit) {
    case "days":   return v;
    case "weeks":  return v * 7;
    case "months": return v * 30;
    default:       return v;
  }
}

function MedicationsTab({ patient }) {
  const NOW = new Date(2026, 4, 27); // May 27, 2026 (today)

  // Seed from data.js, normalize into rich records.
  const seedMeds = React.useMemo(() => {
    return window.CHAVITOS.MEDICATIONS.map((m, i) => {
      const startDate = parseLongDate(m.start);
      // Try to infer a duration from the dose string ("× 7 days").
      const durMatch = /×\s*(\d+)\s*(days?|weeks?|months?)/i.exec(m.dose || "");
      const dur = durMatch
        ? { value: parseInt(durMatch[1], 10), unit: durMatch[2].toLowerCase().replace(/s$/, "") + "s" }
        : null;
      let endDate = null;
      if (dur && startDate) endDate = addDays(startDate, durationDays(dur) - 1);
      return {
        id: `med-${i}`,
        name: m.name,
        dose: m.dose,
        frequency: "",
        route: "Oral",
        instructions: "",
        startDate,
        durationValue: dur ? String(dur.value) : "",
        durationUnit: dur ? dur.unit : "days",
        endDate,
        manualStatus: null, // null = derived; otherwise overrides
        derivedStatus: m.status, // initial fallback
        by: m.by,
      };
    });
  }, []);

  const [meds, setMeds] = React.useState(seedMeds);
  const [editingId, setEditingId] = React.useState(null);

  // Derive effective status: manual override > end-date past = Completed > Active.
  const effectiveStatus = (m) => {
    if (m.manualStatus) return m.manualStatus;
    if (m.endDate && m.endDate < NOW) return "Completed";
    return "Active";
  };

  const handleSave = (data) => {
    setMeds(prev => prev.map(m => m.id === editingId ? { ...m, ...data } : m));
    setEditingId(null);
  };
  const handleQuickStatus = (id, status) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, manualStatus: status } : m));
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200/70 flex items-center justify-between">
        <SectionHeader title="Medications" sub={`${meds.length} on file`} />
        <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5">
          <Icon.alert size={13}/>
          <span>New medications can only be prescribed during an encounter.</span>
        </div>
      </div>

      <div className="grid items-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 px-5 py-2.5 bg-slate-50/70 border-b border-slate-100"
        style={{ gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1fr 1.4fr 1fr 0.7fr" }}
      >
        <div>Medication</div>
        <div>Dose</div>
        <div>Status</div>
        <div>Start</div>
        <div>End</div>
        <div>Prescribed by</div>
        <div>Duration</div>
        <div className="text-right">Edit</div>
      </div>

      <div className="divide-y divide-slate-100">
        {meds.map((m) => {
          const status = effectiveStatus(m);
          const style = STATUS_STYLES_MEDS[status] || STATUS_STYLES_MEDS.Active;
          const autoCompleted = !m.manualStatus && m.endDate && m.endDate < NOW;
          return (
            <div
              key={m.id}
              className="grid items-center px-5 py-3 text-[13px] hover:bg-slate-50/50 transition"
              style={{ gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1fr 1.4fr 1fr 0.7fr" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0"><Icon.pill size={14}/></div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{m.name}</div>
                  {m.route && <div className="text-[10.5px] text-slate-500 truncate">{m.route}{m.instructions ? ` · ${m.instructions}` : ""}</div>}
                </div>
              </div>
              <div className="text-slate-700 truncate">{m.dose}</div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge color={{ bg: style.bg, text: style.text }}>{status}</Badge>
                {autoCompleted && (
                  <span className="text-[10px] text-slate-500 italic" title="Auto-marked complete because end date has passed">auto</span>
                )}
              </div>
              <div className="text-slate-600 truncate">{m.startDate ? formatLongDate(m.startDate) : "—"}</div>
              <div className="text-slate-600 truncate">{m.endDate ? formatLongDate(m.endDate) : <span className="text-slate-400">Ongoing</span>}</div>
              <div className="text-slate-700 truncate">{m.by}</div>
              <div className="text-slate-600 truncate">
                {m.durationValue ? `${m.durationValue} ${m.durationUnit}` : <span className="text-slate-400">—</span>}
              </div>
              <div className="flex items-center justify-end gap-1">
                {/* Quick toggle: Active ↔ Stopped (manual override) */}
                {status === "Active" ? (
                  <button
                    onClick={() => handleQuickStatus(m.id, "Stopped")}
                    className="text-[11px] text-rose-600 hover:bg-rose-50 px-1.5 py-1 rounded-md transition"
                    title="Stop now"
                  >
                    Stop
                  </button>
                ) : status === "Stopped" ? (
                  <button
                    onClick={() => handleQuickStatus(m.id, "Active")}
                    className="text-[11px] text-emerald-700 hover:bg-emerald-50 px-1.5 py-1 rounded-md transition"
                    title="Resume"
                  >
                    Resume
                  </button>
                ) : null}
                <button
                  onClick={() => setEditingId(m.id)}
                  className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100"
                  title="Edit"
                >
                  <Icon.edit size={13}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingId && (
        <MedicationEditorDialog
          med={meds.find(m => m.id === editingId)}
          today={NOW}
          onClose={() => setEditingId(null)}
          onSubmit={handleSave}
        />
      )}
    </Card>
  );
}

function MedicationEditorDialog({ med, today, onClose, onSubmit }) {
  const [dose, setDose] = React.useState(med.dose || "");
  const [route, setRoute] = React.useState(med.route || "Oral");
  const [instructions, setInstructions] = React.useState(med.instructions || "");
  const [startIso, setStartIso] = React.useState(isoFromDate(med.startDate));
  const [endIso, setEndIso] = React.useState(isoFromDate(med.endDate));
  const [durValue, setDurValue] = React.useState(med.durationValue || "");
  const [durUnit, setDurUnit] = React.useState(med.durationUnit || "days");
  const [manualStatus, setManualStatus] = React.useState(med.manualStatus || ""); // "" = auto

  // Track whether the user has explicitly typed an end date; that takes
  // priority over the derived-from-duration end date.
  const [endDirty, setEndDirty] = React.useState(!!med.endDate && !med.durationValue);

  // Recompute end date when duration changes (and user hasn't manually edited end).
  React.useEffect(() => {
    if (endDirty) return;
    const start = dateFromIso(startIso);
    const days  = durationDays({ value: durValue, unit: durUnit });
    if (start && days) {
      setEndIso(isoFromDate(addDays(start, days - 1)));
    } else if (!durValue) {
      setEndIso(""); // ongoing
    }
  }, [startIso, durValue, durUnit, endDirty]);

  const previewStatus = (() => {
    if (manualStatus) return manualStatus;
    const end = dateFromIso(endIso);
    if (end && end < today) return "Completed";
    return "Active";
  })();
  const style = STATUS_STYLES_MEDS[previewStatus] || STATUS_STYLES_MEDS.Active;

  const handleSubmit = () => {
    onSubmit({
      dose,
      route,
      instructions,
      startDate: dateFromIso(startIso),
      endDate: dateFromIso(endIso),
      durationValue: durValue,
      durationUnit: durUnit,
      manualStatus: manualStatus || null,
    });
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[640px] max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sky-500 text-white flex items-center justify-center"><Icon.pill size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">Edit medication</div>
              <div className="text-[11.5px] text-slate-500 truncate">{med.name} · prescribed by {med.by}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose">
              <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="5 mg daily, 100 mcg PRN…" />
            </Field>
            <Field label="Route">
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
              >
                {["Oral", "Inhaled", "Topical", "Injection", "Nasal", "Ophthalmic", "Other"].map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Instructions">
            <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="With food, before bed, …" />
          </Field>

          <div className="border-t border-slate-100 pt-3 mt-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Schedule</div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Start date">
                <Input type="date" value={startIso} onChange={(e) => { setStartIso(e.target.value); setEndDirty(false); }} />
              </Field>
              <Field label="Duration (optional)">
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min="1"
                    value={durValue}
                    onChange={(e) => { setDurValue(e.target.value); setEndDirty(false); }}
                    placeholder="—"
                    className="flex-1"
                  />
                  <select
                    value={durUnit}
                    onChange={(e) => { setDurUnit(e.target.value); setEndDirty(false); }}
                    className="h-9 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-2 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                  >
                    {["days","weeks","months"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="End date">
                <Input
                  type="date"
                  value={endIso}
                  onChange={(e) => { setEndIso(e.target.value); setEndDirty(true); }}
                />
              </Field>
            </div>
            <div className="mt-2 text-[11.5px] text-slate-500">
              {durValue && !endDirty
                ? <>End date is auto-computed from the duration. Leave duration empty for an <span className="font-medium">ongoing</span> medication.</>
                : (endDirty
                    ? <>End date manually set — duration won't override it.</>
                    : <>Leave duration and end date empty for an <span className="font-medium">ongoing</span> medication.</>)
              }
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Status</div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { v: "",          label: "Auto",      desc: "Derived from end date" },
                { v: "Active",    label: "Active",    desc: "In use" },
                { v: "Completed", label: "Completed", desc: "Course finished" },
                { v: "Stopped",   label: "Stopped",   desc: "Discontinued early" },
              ].map(opt => (
                <button
                  key={opt.v || "auto"}
                  type="button"
                  onClick={() => setManualStatus(opt.v)}
                  className={cx(
                    "p-2 rounded-lg border text-left transition",
                    manualStatus === opt.v
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="text-[12.5px] font-semibold text-slate-900">{opt.label}</div>
                  <div className="text-[10.5px] text-slate-500 truncate">{opt.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[12px]">
              <span className="text-slate-500">Preview:</span>
              <Badge color={{ bg: style.bg, text: style.text }}>{previewStatus}</Badge>
              {!manualStatus && dateFromIso(endIso) && dateFromIso(endIso) < today && (
                <span className="text-slate-500 italic">auto-completed because end date is in the past</span>
              )}
              {!manualStatus && (!dateFromIso(endIso) || dateFromIso(endIso) >= today) && (
                <span className="text-slate-500 italic">will stay Active until end date passes</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} onClick={handleSubmit}>Save changes</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────
// Contact tab — handles two flows:
//  • Minor (<16): list of guardian(s), one marked primary. Add/edit/remove.
//    No separate emergency-contact section — guardians ARE the emergency
//    contacts; an explanatory hint is shown instead.
//  • Adult (16+): patient's own contact card (edit) + a separate list of
//    emergency contacts. Add/edit/remove.
// All buttons are wired with modal dialogs.
// ──────────────────────────────────────────────────────────────
const CONTACT_RELATIONS_MINOR = ["Mother", "Father", "Guardian", "Grandparent", "Aunt", "Uncle", "Sibling", "Other"];
const CONTACT_RELATIONS_ADULT = ["Spouse", "Parent", "Sibling", "Friend", "Partner", "Roommate", "Colleague", "Other"];
const PREFERRED_CONTACTS = ["WhatsApp", "Phone call", "SMS", "Email"];

function ContactTab({ patient }) {
  const age = calcAgeFromDob(patient.dob);
  const isMinor = !age || age.years < 16;

  // ── Minor: guardians ───────────────────────────────────────
  const initialGuardians = React.useMemo(() => {
    if (!isMinor) return [];
    const g = guardianDetailFor(patient);
    return [{
      id: "g-primary",
      name: g.name,
      relation: g.relation === "Mother" ? "Father" : (g.relation || "Mother"),
      phone: patient.phone,
      email: patient.email,
      address: "Calle 32 #456, García Ginerés, Mérida",
      preferred: "WhatsApp",
      primary: true,
    }];
  }, [patient.id, isMinor]);
  const [guardians, setGuardians] = React.useState(initialGuardians);

  // ── Adult: own contact + emergency contacts ────────────────
  const [selfContact, setSelfContact] = React.useState({
    phone: patient.phone,
    email: patient.email,
    address: "Calle 60 #312, Centro, Mérida",
    preferred: "WhatsApp",
  });
  const initialEmergency = React.useMemo(() => {
    if (isMinor) return [];
    return emergencyContactsFor(patient).map((c, i) => ({
      id: `e-${i}`,
      name: c.name,
      relation: c.relation,
      phone: c.phone,
      email: c.email,
      primary: i === 0,
    }));
  }, [patient.id, isMinor]);
  const [emergency, setEmergency] = React.useState(initialEmergency);

  // Dialog state
  const [editingTarget, setEditingTarget] = React.useState(null); // { kind: 'guardian'|'emergency'|'self', record? }
  const [removingTarget, setRemovingTarget] = React.useState(null);

  // ── Mutations ──────────────────────────────────────────────
  const setGuardianPrimary = (id) => setGuardians(prev => prev.map(g => ({ ...g, primary: g.id === id })));
  const setEmergencyPrimary = (id) => setEmergency(prev => prev.map(c => ({ ...c, primary: c.id === id })));

  const saveGuardian = (data) => {
    if (data.id) {
      setGuardians(prev => prev.map(g => g.id === data.id ? { ...g, ...data } : g));
    } else {
      const id = `g-${Date.now()}`;
      const wantsPrimary = data.primary || guardians.length === 0;
      setGuardians(prev => [
        ...(wantsPrimary ? prev.map(g => ({ ...g, primary: false })) : prev),
        { ...data, id, primary: wantsPrimary },
      ]);
    }
    setEditingTarget(null);
  };
  const saveEmergency = (data) => {
    if (data.id) {
      setEmergency(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
    } else {
      const id = `e-${Date.now()}`;
      const wantsPrimary = data.primary || emergency.length === 0;
      setEmergency(prev => [
        ...(wantsPrimary ? prev.map(c => ({ ...c, primary: false })) : prev),
        { ...data, id, primary: wantsPrimary },
      ]);
    }
    setEditingTarget(null);
  };
  const saveSelf = (data) => { setSelfContact(prev => ({ ...prev, ...data })); setEditingTarget(null); };

  const removeGuardian = (id) => {
    setGuardians(prev => {
      const next = prev.filter(g => g.id !== id);
      if (!next.some(g => g.primary) && next.length > 0) next[0].primary = true;
      return [...next];
    });
    setRemovingTarget(null);
  };
  const removeEmergency = (id) => {
    setEmergency(prev => {
      const next = prev.filter(c => c.id !== id);
      if (!next.some(c => c.primary) && next.length > 0) next[0].primary = true;
      return [...next];
    });
    setRemovingTarget(null);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Left: minors → guardians; adults → patient contact */}
      <Card className="p-5 col-span-2">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader
            title={isMinor ? "Guardians" : "Patient contact"}
            sub={isMinor
              ? "Patient is under 16. At least one legal guardian is required."
              : "Patient is 16+. Their own contact details below."}
          />
          {isMinor && (
            <Button variant="soft" size="sm" icon={<Icon.plus size={12}/>}
              onClick={() => setEditingTarget({ kind: "guardian", record: null })}>
              Add guardian
            </Button>
          )}
          {!isMinor && (
            <Button variant="ghost" size="sm" icon={<Icon.edit size={12}/>}
              onClick={() => setEditingTarget({ kind: "self", record: { ...selfContact, id: "self" } })}>
              Edit contact
            </Button>
          )}
        </div>

        {isMinor ? (
          guardians.length === 0 ? (
            <EmptyAdd
              icon={<Icon.user size={20}/>}
              title="No guardian on file"
              hint="Add a parent or legal guardian to enable scheduling, billing, and emergency notifications."
              ctaLabel="Add guardian"
              onCtaClick={() => setEditingTarget({ kind: "guardian", record: null })}
            />
          ) : (
            <div className="space-y-2.5">
              {guardians.map((g) => (
                <PersonCard
                  key={g.id}
                  person={g}
                  iconBg="bg-sky-500"
                  tone="sky"
                  onSetPrimary={!g.primary ? () => setGuardianPrimary(g.id) : null}
                  onEdit={() => setEditingTarget({ kind: "guardian", record: g })}
                  onRemove={guardians.length > 1 ? () => setRemovingTarget({ kind: "guardian", record: g }) : null}
                />
              ))}
            </div>
          )
        ) : (
          <PersonCard
            person={{ name: patient.name, relation: "Self", phone: selfContact.phone, email: selfContact.email, address: selfContact.address, preferred: selfContact.preferred, primary: true }}
            avatar={<BabyAvatar size={40} swatch={patient.swatch} name={patient.name} />}
            tone="sky"
            hideRelationBadge
            primaryLabel="Patient"
            onEdit={() => setEditingTarget({ kind: "self", record: { ...selfContact, id: "self" } })}
          />
        )}
      </Card>

      {/* Right: minors → hint; adults → emergency contacts */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader
            title="Emergency contacts"
            sub={isMinor
              ? "Guardians act as emergency contacts"
              : (emergency.length === 0 ? "None on file" : `${emergency.length} on file`)}
          />
          {!isMinor && (
            <Button variant="soft" size="sm" icon={<Icon.plus size={12}/>}
              onClick={() => setEditingTarget({ kind: "emergency", record: null })}>
              Add
            </Button>
          )}
        </div>

        {isMinor ? (
          <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-100 text-[12.5px] text-slate-700 leading-relaxed">
            For patients under 16, the listed <span className="font-semibold">guardians</span> are automatically the emergency contacts.
            Manage them on the left.
          </div>
        ) : (
          emergency.length === 0 ? (
            <EmptyAdd
              icon={<Icon.alert size={18}/>}
              title="No emergency contact"
              hint="Add at least one trusted contact we can reach in case of emergency."
              ctaLabel="Add contact"
              onCtaClick={() => setEditingTarget({ kind: "emergency", record: null })}
              tone="rose"
              compact
            />
          ) : (
            <div className="space-y-2">
              {emergency.map((c) => (
                <PersonCard
                  key={c.id}
                  person={c}
                  iconBg="bg-rose-500"
                  tone="rose"
                  compact
                  onSetPrimary={!c.primary ? () => setEmergencyPrimary(c.id) : null}
                  onEdit={() => setEditingTarget({ kind: "emergency", record: c })}
                  onRemove={() => setRemovingTarget({ kind: "emergency", record: c })}
                />
              ))}
            </div>
          )
        )}
      </Card>

      {editingTarget && (
        <ContactEditorDialog
          target={editingTarget}
          isMinor={isMinor}
          canSetPrimary={editingTarget.kind === "guardian" ? guardians.length > 0 || !!editingTarget.record : emergency.length > 0 || !!editingTarget.record}
          onClose={() => setEditingTarget(null)}
          onSubmit={(data) => {
            if (editingTarget.kind === "guardian") saveGuardian(data);
            else if (editingTarget.kind === "emergency") saveEmergency(data);
            else if (editingTarget.kind === "self") saveSelf(data);
          }}
        />
      )}
      {removingTarget && (
        <ConfirmRemoveDialog
          title={removingTarget.kind === "guardian" ? "Remove guardian" : "Remove emergency contact"}
          name={removingTarget.record.name}
          description={removingTarget.kind === "guardian"
            ? "This person will no longer be listed as a legal guardian. If they were the primary contact, the next guardian will be promoted automatically."
            : "This emergency contact will be removed from the patient's record."}
          onClose={() => setRemovingTarget(null)}
          onConfirm={() => {
            if (removingTarget.kind === "guardian") removeGuardian(removingTarget.record.id);
            else removeEmergency(removingTarget.record.id);
          }}
        />
      )}
    </div>
  );
}

function PersonCard({ person, avatar, iconBg = "bg-sky-500", tone = "sky", compact = false, hideRelationBadge = false, primaryLabel = "Primary", onSetPrimary, onEdit, onRemove }) {
  const TONES = {
    sky:  { border: "border-sky-200",  bg: "bg-gradient-to-br from-sky-50 to-white" },
    rose: { border: "border-rose-200", bg: "bg-gradient-to-br from-rose-50 to-white" },
  }[tone] || { border: "border-slate-200", bg: "bg-white" };
  return (
    <div className={cx("group p-4 rounded-xl border", TONES.border, TONES.bg)}>
      <div className="flex items-center gap-3 mb-2">
        {avatar || (
          <span className={cx("size-10 rounded-full text-white flex items-center justify-center shrink-0", iconBg)}>
            <Icon.user size={16}/>
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold text-slate-900 truncate">{person.name}</div>
          <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5 flex-wrap">
            {!hideRelationBadge && person.relation && (
              <Badge color={{ bg:"#E0F2FE", text:"#0369A1" }}>{person.relation}</Badge>
            )}
            {person.primary && (
              <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>{primaryLabel}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
          {onSetPrimary && (
            <button onClick={onSetPrimary} className="text-[11px] font-medium text-sky-700 hover:bg-sky-50 px-2 py-1 rounded-md transition">
              Set as primary
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Edit">
              <Icon.edit size={13}/>
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Remove">
              <Icon.trash size={13}/>
            </button>
          )}
        </div>
      </div>
      <div className={cx("grid gap-3", compact ? "grid-cols-1" : "grid-cols-2")}>
        <KV label="Phone" value={person.phone ? <span className="font-mono">{person.phone}</span> : "—"} />
        <KV label="Email" value={person.email || "—"} />
        {!compact && <KV label="Address" value={person.address || "—"} />}
        {!compact && <KV label="Preferred contact" value={person.preferred || "WhatsApp"} />}
      </div>
    </div>
  );
}

function EmptyAdd({ icon, title, hint, ctaLabel, onCtaClick, tone = "sky", compact = false }) {
  const tint = tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700";
  return (
    <div className={cx("rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center", compact ? "p-4" : "p-6")}>
      <div className={cx("mx-auto size-10 rounded-full flex items-center justify-center mb-2", tint)}>{icon}</div>
      <div className="text-[13.5px] font-semibold text-slate-800">{title}</div>
      {hint && <div className="text-[11.5px] text-slate-500 mt-0.5 px-2">{hint}</div>}
      <Button variant="primary" size="sm" icon={<Icon.plus size={12}/>} className="mt-3" onClick={onCtaClick}>{ctaLabel}</Button>
    </div>
  );
}

function ContactEditorDialog({ target, isMinor, canSetPrimary, onClose, onSubmit }) {
  const isSelf = target.kind === "self";
  const isGuardian = target.kind === "guardian";
  const isEmergency = target.kind === "emergency";
  const r = target.record || {};
  const [data, setData] = React.useState({
    id: r.id,
    name: r.name || "",
    relation: r.relation || (isGuardian ? "Mother" : (isEmergency ? "Spouse" : "")),
    phone: r.phone || "",
    email: r.email || "",
    address: r.address || "",
    preferred: r.preferred || "WhatsApp",
    primary: r.primary ?? false,
  });
  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const title = isSelf
    ? "Edit patient contact"
    : (isGuardian ? (r.id ? "Edit guardian" : "Add guardian")
                  : (r.id ? "Edit emergency contact" : "Add emergency contact"));

  const canSubmit = isSelf
    ? data.phone.trim() || data.email.trim()
    : data.name.trim() && (data.phone.trim() || data.email.trim());

  const relationOptions = isGuardian ? CONTACT_RELATIONS_MINOR : CONTACT_RELATIONS_ADULT;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[560px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sky-500 text-white flex items-center justify-center"><Icon.user size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">{title}</div>
              <div className="text-[11.5px] text-slate-500">{isSelf ? "Update patient's own contact details" : "Required: name + phone or email"}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3">
          {!isSelf && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name *">
                <Input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Relation">
                <select
                  value={data.relation}
                  onChange={(e) => set("relation", e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                >
                  {relationOptions.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={isSelf ? "Phone *" : "Phone *"}>
              <Input value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+52 …" />
            </Field>
            <Field label="Email">
              <Input value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" />
            </Field>
          </div>

          {(isSelf || isGuardian) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Address">
                <Input value={data.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, neighborhood, city" />
              </Field>
              <Field label="Preferred contact">
                <select
                  value={data.preferred}
                  onChange={(e) => set("preferred", e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                >
                  {PREFERRED_CONTACTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
          )}

          {!isSelf && (
            <label className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                checked={!!data.primary}
                onChange={(e) => set("primary", e.target.checked)}
                className="size-4 accent-emerald-500"
              />
              <span className="text-[12.5px] text-slate-700">Set as primary contact</span>
              <span className="ml-auto text-[11px] text-slate-500">Reached first for reminders & emergencies</span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} disabled={!canSubmit} onClick={() => onSubmit(data)}>
            {r.id || isSelf ? "Save changes" : "Add contact"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ConfirmRemoveDialog({ title, name, description, onClose, onConfirm }) {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[440px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-rose-500 text-white flex items-center justify-center"><Icon.alert size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">{title}</div>
              <div className="text-[11.5px] text-slate-500 truncate">{name}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>
        <div className="p-5">
          <div className="text-[12.5px] text-slate-700 leading-relaxed">{description}</div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <button
            onClick={onConfirm}
            className="h-8 px-3 rounded-lg bg-rose-500 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-rose-600 transition"
          >
            <Icon.trash size={12}/> Remove
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────
// Insurance tab — multi-policy with full add/remove/archive flow.
// Removal of a policy that has historical claims is NOT destructive:
// the policy is archived (kept as read-only audit record) so all prior
// invoices and EOB claim history stay intact and reconciled. Only
// policies with zero claims can be hard-deleted.
// ──────────────────────────────────────────────────────────────
const INSURANCE_PROVIDER_DB = [
  "GNP Seguros", "AXA Mexico", "Seguros Monterrey", "BUPA Mexico",
  "MetLife", "MAPFRE Tepeyac", "Mediaccess", "Allianz Mexico",
  "Pan-American Life", "Bupa Global", "Chubb Mexico", "Plan Seguro",
];

function defaultClaimsFor(patient, providerName) {
  // Deterministic seed claims for the "existing" first policy only.
  const base = patHash(patient.id + providerName, 53);
  const count = 1 + (base % 3); // 1–3 claims
  const tones = ["sky", "emerald", "rose"];
  const statuses = ["Submitted", "Paid", "Denied"];
  const months = ["Feb", "Mar", "Apr"];
  return Array.from({ length: count }, (_, i) => {
    const h = patHash(patient.id, 71 + i);
    const day = 1 + (h % 28);
    const tone = tones[i % 3];
    return {
      id: `cl-${i}-${base}`,
      date: `${months[i % months.length]} ${String(day).padStart(2,"0")}, 2026`,
      dateValue: new Date(2026, (i % 3) + 1, day).getTime(),
      amount: 320 + (h % 1500),
      status: statuses[i % 3],
      tone,
      invoice: `INV-${String(8000 + (h % 999))}`,
    };
  });
}

function newPolicyId() {
  return `pol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function InsuranceTab({ patient }) {
  const hasInitial = hasInsuranceFor(patient);
  const initialIns = hasInitial ? insuranceFor(patient) : null;

  const initialPolicies = React.useMemo(() => {
    if (!hasInitial) return [];
    return [{
      id: "pol-existing",
      provider: initialIns.provider,
      plan: initialIns.network,
      policyNumber: initialIns.policy,
      groupNumber: `GRP-${String(patHash(patient.id, 91) % 9000 + 1000)}`,
      holder: patient.guardian || patient.name,
      relation: patient.guardian ? "Parent / Guardian" : "Self",
      effective: "Jan 1, 2026",
      renews: "Dec 31, 2026",
      copay: "150 MXN",
      deductible: "2,500 MXN",
      deductibleMet: "800 MXN",
      primary: true,
      status: "active", // active | archived
      claims: defaultClaimsFor(patient, initialIns.provider),
    }];
  }, [patient.id, hasInitial]);

  const [policies, setPolicies] = React.useState(initialPolicies);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [removeTarget, setRemoveTarget] = React.useState(null); // {policy, action}

  const activePolicies = policies.filter(p => p.status === "active");
  const archivedPolicies = policies.filter(p => p.status === "archived");

  const setPrimary = (id) => {
    setPolicies(prev => prev.map(p => ({ ...p, primary: p.status === "active" && p.id === id })));
  };

  const handleSave = (data) => {
    if (editingId) {
      setPolicies(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p));
      setEditingId(null);
    } else {
      const id = newPolicyId();
      const isPrimary = activePolicies.length === 0;
      // If the new one is marked primary, demote others.
      const shouldDemote = data.primary || isPrimary;
      setPolicies(prev => [
        ...(shouldDemote ? prev.map(p => ({ ...p, primary: false })) : prev),
        { ...data, id, status: "active", claims: [], primary: shouldDemote },
      ]);
      setAddOpen(false);
    }
  };

  const handleRequestRemove = (policy) => {
    const hasClaims = (policy.claims || []).length > 0;
    setRemoveTarget({ policy, hasClaims, action: hasClaims ? "archive" : "delete" });
  };

  const confirmRemove = () => {
    const { policy, action } = removeTarget;
    if (action === "delete") {
      setPolicies(prev => {
        const next = prev.filter(p => p.id !== policy.id);
        // Ensure something is primary.
        if (!next.some(p => p.primary && p.status === "active") && next.some(p => p.status === "active")) {
          const firstActive = next.find(p => p.status === "active");
          if (firstActive) firstActive.primary = true;
        }
        return [...next];
      });
    } else {
      // archive
      setPolicies(prev => {
        const next = prev.map(p => p.id === policy.id ? { ...p, status: "archived", primary: false, archivedOn: "May 27, 2026" } : p);
        if (!next.some(p => p.primary && p.status === "active") && next.some(p => p.status === "active")) {
          const firstActive = next.find(p => p.status === "active");
          if (firstActive) firstActive.primary = true;
        }
        return next;
      });
    }
    setRemoveTarget(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            title="Insurance policies"
            sub={
              activePolicies.length === 0
                ? "Self-pay account · no active policies"
                : `${activePolicies.length} active${archivedPolicies.length ? ` · ${archivedPolicies.length} archived` : ""}`
            }
          />
          <Button variant="soft" size="sm" icon={<Icon.plus size={12}/>} onClick={() => setAddOpen(true)}>Add policy</Button>
        </div>

        {activePolicies.length === 0 && (
          <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <div className="mx-auto size-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><Icon.invoice size={20}/></div>
            <div className="text-[14px] font-semibold text-slate-700">Self-pay account</div>
            <div className="text-[12px] text-slate-500 mt-1">No active insurance policies. Invoices will be billed directly to the patient.</div>
            <Button variant="primary" size="sm" icon={<Icon.plus size={12}/>} className="mt-3" onClick={() => setAddOpen(true)}>Add insurance</Button>
          </div>
        )}

        {activePolicies.length > 0 && (
          <div className="space-y-3">
            {activePolicies.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onSetPrimary={() => setPrimary(p.id)}
                onEdit={() => setEditingId(p.id)}
                onRemove={() => handleRequestRemove(p)}
              />
            ))}
          </div>
        )}
      </Card>

      {archivedPolicies.length > 0 && (
        <Card className="p-5">
          <SectionHeader title="Archived policies" sub="Read-only · preserved for audit and reconciliation of past claims" />
          <div className="space-y-2">
            {archivedPolicies.map((p) => (
              <ArchivedPolicyRow key={p.id} policy={p} onReactivate={() => {
                setPolicies(prev => prev.map(x => {
                  if (x.id !== p.id) return x;
                  return { ...x, status: "active", archivedOn: null };
                }));
              }} />
            ))}
          </div>
        </Card>
      )}

      {(addOpen || editingId) && (
        <PolicyEditorDialog
          open
          patient={patient}
          existing={editingId ? policies.find(p => p.id === editingId) : null}
          canSetPrimary={activePolicies.length > 0 || !!editingId}
          onClose={() => { setAddOpen(false); setEditingId(null); }}
          onSubmit={handleSave}
        />
      )}

      {removeTarget && (
        <RemovePolicyDialog
          policy={removeTarget.policy}
          hasClaims={removeTarget.hasClaims}
          onClose={() => setRemoveTarget(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

function PolicyCard({ policy, onSetPrimary, onEdit, onRemove }) {
  const totalClaims = (policy.claims || []).length;
  const paidClaims = (policy.claims || []).filter(c => c.status === "Paid").length;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className={cx(
        "col-span-2 p-4 rounded-xl border",
        policy.primary ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-slate-200 bg-white"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cx(
              "size-7 rounded-md flex items-center justify-center shrink-0",
              policy.primary ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
            )}><Icon.invoice size={14}/></span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold text-slate-900 truncate">{policy.provider}</div>
              <div className="text-[11.5px] text-slate-500 truncate">Plan: {policy.plan || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {policy.primary ? (
              <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>Primary</Badge>
            ) : (
              <button
                type="button"
                onClick={onSetPrimary}
                className="text-[11px] font-medium text-sky-700 hover:bg-sky-50 px-2 py-1 rounded-md transition"
              >
                Set as primary
              </button>
            )}
            <button onClick={onEdit} className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Edit">
              <Icon.edit size={13}/>
            </button>
            <button onClick={onRemove} className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Remove">
              <Icon.trash size={13}/>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <KV label="Policy #"   value={<span className="font-mono">{policy.policyNumber || "—"}</span>} />
          <KV label="Holder"     value={<span><span>{policy.holder}</span><span className="text-slate-400 ml-1">· {policy.relation || "Self"}</span></span>} />
          <KV label="Effective"  value={policy.effective || "—"} />
          <KV label="Renews"     value={policy.renews || "—"} />
          <KV label="Co-pay"     value={policy.copay ? `$${policy.copay}` : "—"} />
          <KV label="Deductible" value={policy.deductible ? `$${policy.deductible}${policy.deductibleMet ? ` (met: $${policy.deductibleMet})` : ""}` : "—"} />
        </div>
      </div>
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Recent claims</div>
          <span className="text-[10.5px] text-slate-500">{totalClaims} total · {paidClaims} paid</span>
        </div>
        {totalClaims === 0 ? (
          <div className="text-[12px] text-slate-500 italic py-2">No claims filed yet against this policy.</div>
        ) : (
          <div className="space-y-2">
            {policy.claims.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-[12px]">
                <span className="text-slate-600">{c.date}</span>
                <span className="font-mono text-slate-900">${c.amount.toLocaleString()}</span>
                <Badge color={
                  c.tone === "sky"     ? { bg:"#E0F2FE", text:"#075985" } :
                  c.tone === "emerald" ? { bg:"#D1FAE5", text:"#065F46" } :
                                         { bg:"#FECACA", text:"#991B1B" }
                }>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArchivedPolicyRow({ policy, onReactivate }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
      <span className="size-7 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"><Icon.invoice size={13}/></span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-slate-700 truncate">{policy.provider}</span>
          <Badge color={{ bg:"#F1F5F9", text:"#475569" }}>Archived</Badge>
          <span className="text-[11px] text-slate-500">{policy.claims?.length || 0} historical claim{(policy.claims?.length || 0) === 1 ? "" : "s"}</span>
        </div>
        <div className="text-[11px] text-slate-500 truncate">
          Policy {policy.policyNumber} · {policy.plan || "—"} · archived {policy.archivedOn || "earlier"}
        </div>
      </div>
      <button onClick={onReactivate} className="text-[11.5px] font-medium text-sky-700 hover:bg-sky-50 px-2.5 py-1 rounded-md transition">
        Reactivate
      </button>
    </div>
  );
}

// ── Add / edit dialog ────────────────────────────────────────
function PolicyEditorDialog({ open, patient, existing, canSetPrimary, onClose, onSubmit }) {
  const [data, setData] = React.useState(() => ({
    provider: existing?.provider || "",
    plan: existing?.plan || "",
    policyNumber: existing?.policyNumber || "",
    groupNumber: existing?.groupNumber || "",
    holder: existing?.holder || patient.guardian || patient.name,
    relation: existing?.relation || (patient.guardian ? "Parent / Guardian" : "Self"),
    effective: existing?.effective || "Jan 1, 2026",
    renews: existing?.renews || "Dec 31, 2026",
    copay: existing?.copay || "",
    deductible: existing?.deductible || "",
    deductibleMet: existing?.deductibleMet || "",
    primary: existing?.primary ?? !canSetPrimary, // first policy is automatically primary
  }));
  const [providerOpen, setProviderOpen] = React.useState(false);
  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));
  const providerSuggestions = INSURANCE_PROVIDER_DB.filter(p =>
    !data.provider || p.toLowerCase().includes(data.provider.toLowerCase())
  );
  const canSubmit = data.provider.trim() && data.policyNumber.trim() && data.holder.trim();

  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[640px] max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Icon.invoice size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">
                {existing ? "Edit insurance policy" : "Add insurance policy"}
              </div>
              <div className="text-[11.5px] text-slate-500">{existing ? "Update coverage details" : "Capture new coverage for this patient"}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {/* Provider with autocomplete */}
          <Field label="Insurance provider *">
            <div className="relative">
              <Input
                value={data.provider}
                onChange={(e) => { set("provider", e.target.value); setProviderOpen(true); }}
                onFocus={() => setProviderOpen(true)}
                onBlur={() => setTimeout(() => setProviderOpen(false), 150)}
                placeholder="e.g. BUPA Mexico, AXA, GNP Seguros…"
              />
              {providerOpen && providerSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg max-h-44 overflow-y-auto">
                  {providerSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => { set("provider", s); setProviderOpen(false); }}
                      className="w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-sky-50 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan / Network">
              <Input value={data.plan} onChange={(e) => set("plan", e.target.value)} placeholder="e.g. Premier, Plus, Familias" />
            </Field>
            <Field label="Policy number *">
              <Input value={data.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} placeholder="POL-…" />
            </Field>
            <Field label="Group #">
              <Input value={data.groupNumber} onChange={(e) => set("groupNumber", e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Relation">
              <select
                value={data.relation}
                onChange={(e) => set("relation", e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
              >
                {["Self", "Parent / Guardian", "Spouse", "Other"].map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Policy holder *">
              <Input value={data.holder} onChange={(e) => set("holder", e.target.value)} placeholder="Full name" />
            </Field>
            <div />
            <Field label="Effective">
              <Input value={data.effective} onChange={(e) => set("effective", e.target.value)} placeholder="Jan 1, 2026" />
            </Field>
            <Field label="Renews">
              <Input value={data.renews} onChange={(e) => set("renews", e.target.value)} placeholder="Dec 31, 2026" />
            </Field>
            <Field label="Co-pay (MXN)">
              <Input value={data.copay} onChange={(e) => set("copay", e.target.value)} placeholder="150" />
            </Field>
            <Field label="Deductible (MXN)">
              <Input value={data.deductible} onChange={(e) => set("deductible", e.target.value)} placeholder="2,500" />
            </Field>
            <Field label="Deductible met (MXN)">
              <Input value={data.deductibleMet} onChange={(e) => set("deductibleMet", e.target.value)} placeholder="0" />
            </Field>
          </div>

          <label className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              checked={!!data.primary}
              onChange={(e) => set("primary", e.target.checked)}
              className="size-4 accent-emerald-500"
            />
            <span className="text-[12.5px] text-slate-700">Set as primary policy</span>
            <span className="ml-auto text-[11px] text-slate-500">Primary is used by default for new claims</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} disabled={!canSubmit} onClick={() => onSubmit(data)}>
            {existing ? "Save changes" : "Add policy"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Remove / archive dialog ──────────────────────────────────
function RemovePolicyDialog({ policy, hasClaims, onClose, onConfirm }) {
  const [confirmed, setConfirmed] = React.useState(false);
  const claimCount = (policy.claims || []).length;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[520px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-rose-500 text-white flex items-center justify-center"><Icon.alert size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">
                Remove {policy.provider}?
              </div>
              <div className="text-[11.5px] text-slate-500">Policy {policy.policyNumber}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3">
          {hasClaims ? (
            <React.Fragment>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <Icon.alert size={16}/>
                <div className="text-[12.5px] text-amber-900 leading-relaxed">
                  This policy has <span className="font-semibold">{claimCount} historical claim{claimCount === 1 ? "" : "s"}</span> linked to invoices.
                  It can't be permanently deleted — that would break invoice reconciliation and the clinic's audit trail.
                </div>
              </div>

              <div className="text-[12.5px] text-slate-700 leading-relaxed">
                Instead, the policy will be <span className="font-semibold">archived</span>:
              </div>
              <ul className="space-y-1.5 text-[12.5px] text-slate-700 ml-1">
                <li className="flex items-start gap-2"><Icon.check size={14} /> <span>Removed from active coverage — new invoices won't bill it.</span></li>
                <li className="flex items-start gap-2"><Icon.check size={14} /> <span>Past invoices and EOB claims remain linked to it (read-only).</span></li>
                <li className="flex items-start gap-2"><Icon.check size={14} /> <span>If primary, the next active policy is promoted automatically.</span></li>
                <li className="flex items-start gap-2"><Icon.check size={14} /> <span>You can reactivate it later from the "Archived policies" section.</span></li>
              </ul>

              <label className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-4 accent-rose-500" />
                <span className="text-[12.5px] text-slate-700">I understand past claims will be preserved as read-only history.</span>
              </label>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className="text-[13px] text-slate-700 leading-relaxed">
                No claims have been filed against this policy yet, so it can be safely removed.
              </div>
              <div className="text-[12px] text-slate-500">
                This permanently deletes the policy from this patient's record.
              </div>
              <label className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-4 accent-rose-500" />
                <span className="text-[12.5px] text-slate-700">I'm sure — remove this policy.</span>
              </label>
            </React.Fragment>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          {hasClaims ? (
            <Button variant="primary" size="sm" icon={<Icon.invoice size={12}/>} disabled={!confirmed} onClick={onConfirm}>
              Archive policy
            </Button>
          ) : (
            <button
              onClick={onConfirm}
              disabled={!confirmed}
              className="h-8 px-3 rounded-lg bg-rose-500 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Icon.trash size={12}/> Delete permanently
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ClinicalTab({ patient, record, onOpenReport }) {
  const ALLERGY_SUGGESTIONS = [
    "Penicillin", "Amoxicillin", "Sulfa drugs", "Aspirin", "Ibuprofen", "NSAIDs",
    "Latex", "Peanuts", "Tree nuts", "Shellfish", "Eggs", "Dairy / Lactose",
    "Soy", "Wheat / Gluten", "Sesame", "Strawberries",
    "Pollen", "Dust mites", "Pet dander", "Bee stings", "Mosquito bites",
  ];
  const CHRONIC_SUGGESTIONS = [
    "Asthma (controlled)", "Asthma (moderate)", "Allergic rhinitis", "Eczema / Atopic dermatitis",
    "Type 1 diabetes", "Type 2 diabetes", "Hypothyroidism", "Hyperthyroidism",
    "ADHD", "Autism spectrum", "Epilepsy", "Sickle cell trait", "Cerebral palsy",
    "Congenital heart defect", "Mild scoliosis", "Cystic fibrosis", "Anemia (iron-deficient)",
    "Migraine", "Anxiety", "Depression", "GERD",
  ];

  const pinnedCount =
    record.allergies.filter(i => i.in360).length +
    record.conditions.filter(i => i.in360).length;

  return (
    <div className="space-y-4">
      {/* Governance banner — explains the cross-org rules */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
        <span className="size-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5"><LockIcon size={13}/></span>
        <div className="flex-1 min-w-0 text-[12px] leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Shared clinical record.</span> Every entry shows who added it and at which clinic. Verified entries from other organizations are read-only — add a note to flag a concern instead of editing. Notes are visible to all clinics and pinned entries flow into the 360° report.
        </div>
        <Button variant="soft" size="sm" icon={<Icon.sparkles size={13}/>} onClick={onOpenReport}>
          360° report{pinnedCount ? ` · ${pinnedCount}` : ""}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ClinicalListCard
          title="Allergies"
          tone="rose"
          icon={<Icon.alert size={14}/>}
          emptyLabel="No known allergies."
          items={record.allergies}
          suggestions={ALLERGY_SUGGESTIONS}
          addLabel="Add allergy"
          newItemNote="Reaction not specified"
          onAdd={(name) => record.addItem("allergy", name, "Reaction not specified")}
          onRemove={(id) => record.removeItem("allergy", id)}
          onComment={(id, text) => record.addComment("allergy", id, text)}
          onToggle360={(id) => record.toggle360("allergy", id)}
        />
        <ClinicalListCard
          title="Chronic care"
          tone="amber"
          icon={<Icon.heart size={14}/>}
          emptyLabel="No chronic conditions on file."
          items={record.conditions}
          suggestions={CHRONIC_SUGGESTIONS}
          addLabel="Add condition"
          newItemNote="Ongoing management"
          onAdd={(name) => record.addItem("condition", name, "Ongoing management")}
          onRemove={(id) => record.removeItem("condition", id)}
          onComment={(id, text) => record.addComment("condition", id, text)}
          onToggle360={(id) => record.toggle360("condition", id)}
        />
      </div>
    </div>
  );
}

// One allergy / condition row: provenance line, pin-to-360°, shared-note
// composer, and a lock (external) or delete (own) affordance.
function ClinicalItemRow({ it, icon, tones, newItemNote, onRemove, onComment, onToggle360 }) {
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const submit = () => { if (note.trim()) { onComment(it.id, note); setNote(""); setNoteOpen(false); } };

  return (
    <div className={cx("rounded-lg border", tones.bg, tones.border)}>
      <div className="group flex items-center gap-3 p-3">
        <span className={cx("size-8 rounded-lg flex items-center justify-center shrink-0", tones.iconBg)}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13.5px] font-semibold text-slate-900 truncate">{it.name}</span>
            {it.external && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-600 text-[10px] font-semibold">
                <LockIcon size={9}/> {it.orgShort}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{it.detail || newItemNote}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
            {it.external ? "Verified by " : "Added by "}
            <span className="text-slate-500 font-medium">{it.author}</span> · {it.org} · {it.addedAt}
          </div>
        </div>
        <Badge color={tones.badge}>{it.severity || "Active"}</Badge>

        {/* Pin to 360° */}
        <button
          type="button"
          onClick={() => onToggle360(it.id)}
          title={it.in360 ? "Pinned to 360° report — click to unpin" : "Pin to 360° report"}
          className={cx("size-7 rounded-md flex items-center justify-center transition shrink-0",
            it.in360 ? "text-amber-500 hover:bg-amber-100" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500")}
        >
          <PinIcon size={14} filled={it.in360} />
        </button>

        {/* Add shared note */}
        <button
          type="button"
          onClick={() => setNoteOpen(o => !o)}
          title="Add a shared note"
          className={cx("size-7 rounded-md flex items-center justify-center transition shrink-0",
            noteOpen ? "bg-sky-100 text-sky-600" : "text-slate-400 hover:bg-sky-100 hover:text-sky-600")}
        >
          <Icon.message size={14}/>
        </button>

        {/* Delete (own) or lock (external) */}
        {it.external ? (
          <span className="size-7 rounded-md flex items-center justify-center text-slate-300 shrink-0" title="Owned by another clinic — read-only">
            <LockIcon size={13}/>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onRemove(it.id)}
            title="Remove"
            className="size-7 rounded-md flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600 transition shrink-0"
          >
            <Icon.trash size={13}/>
          </button>
        )}
      </div>

      {/* Annotation timeline */}
      {it.comments.length > 0 && (
        <div className="px-3 pb-3 pl-[52px] space-y-2">
          {it.comments.map(c => (
            <div key={c.id} className="rounded-lg bg-white/70 border border-slate-200/70 px-3 py-2">
              <div className="text-[12px] text-slate-700 leading-snug">{c.text}</div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 mt-1 flex-wrap">
                <Icon.user size={10}/>
                <span className="font-medium text-slate-500">{c.author}</span> · {c.org} · {c.at}
                <span className="ml-auto inline-flex items-center gap-1 text-emerald-600/80"><Icon.check size={10}/> Visible to all clinics</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note composer */}
      {noteOpen && (
        <div className="px-3 pb-3 pl-[52px]">
          <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-2.5">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={it.external
                ? `Flag a concern or add context for ${it.orgShort} and other clinics…`
                : "Add a note to this entry…"}
            />
            <div className="flex items-center justify-between mt-2 gap-2">
              <span className="text-[10.5px] text-slate-400 leading-tight">Shared with all clinics · doesn't change the original entry</span>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setNoteOpen(false); setNote(""); }}>Cancel</Button>
                <Button variant="primary" size="sm" icon={<Icon.send size={12}/>} disabled={!note.trim()} onClick={submit}>Post note</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicalListCard({ title, tone, icon, items, emptyLabel, suggestions, addLabel, newItemNote, onAdd, onRemove, onComment, onToggle360 }) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const inputRef = React.useRef(null);

  const TONES = {
    rose:  { bg: "bg-rose-50/60",  border: "border-rose-100",  iconBg: "bg-rose-500 text-white",  badge: { bg:"#FECACA", text:"#991B1B" }, chip: "bg-white text-rose-700 border-rose-200 hover:bg-rose-50" },
    amber: { bg: "bg-amber-50/60", border: "border-amber-100", iconBg: "bg-amber-500 text-white", badge: { bg:"#FEF3C7", text:"#92400E" }, chip: "bg-white text-amber-800 border-amber-200 hover:bg-amber-50" },
  }[tone] || { bg: "bg-slate-50", border: "border-slate-100", iconBg: "bg-slate-400 text-white", badge: { bg:"#F1F5F9", text:"#475569" }, chip: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50" };

  React.useEffect(() => {
    if (addOpen) {
      setText("");
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    }
  }, [addOpen]);

  const q = text.trim().toLowerCase();
  const existing = new Set(items.map(i => i.name.toLowerCase()));
  const recs = suggestions.filter(s => !existing.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q))).slice(0, 8);
  const isCustom = !!q && !suggestions.some(s => s.toLowerCase() === q) && !existing.has(q);

  const commit = (name) => {
    if (!name || !name.trim()) return;
    if (existing.has(name.trim().toLowerCase())) return;
    onAdd(name.trim());
    setText("");
  };

  return (
    <Card className="p-5">
      <SectionHeader title={title} sub={`${items.length} on file`} />
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((it) => (
            <ClinicalItemRow
              key={it.id}
              it={it}
              icon={icon}
              tones={TONES}
              newItemNote={newItemNote}
              onRemove={onRemove}
              onComment={onComment}
              onToggle360={onToggle360}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-50 text-[12.5px] text-slate-500 italic">{emptyLabel}</div>
      )}

      {/* Add affordance */}
      {!addOpen ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="mt-3 text-[12px] font-medium text-sky-700 hover:underline inline-flex items-center gap-1"
        >
          <Icon.plus size={12}/> {addLabel}
        </button>
      ) : (
        <div className="mt-3 p-3 rounded-xl border border-sky-200 bg-sky-50/40 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-9 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
              <Icon.search size={14} />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commit(text); }
                  if (e.key === "Escape") { setAddOpen(false); }
                }}
                placeholder={`Search or type a new ${title.toLowerCase()}…`}
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-slate-400"
              />
            </div>
            <Button variant="primary" size="sm" onClick={() => commit(text)} disabled={!text.trim()}>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>

          {recs.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {q ? "Matching suggestions" : "Common options"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recs.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => commit(s)}
                    className={cx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11.5px] font-medium transition", TONES.chip)}
                  >
                    <Icon.plus size={10}/>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isCustom && (
            <div className="text-[11.5px] text-slate-600">
              Press Enter or click <span className="font-semibold text-sky-700">Add</span> to save
              <span className="font-semibold text-slate-900"> "{text.trim()}"</span> as a custom {title.toLowerCase().replace(/s$/, "")}.
            </div>
          )}
          {recs.length === 0 && !isCustom && !q && (
            <div className="text-[11.5px] text-slate-500 italic">All common options are already on file.</div>
          )}
        </div>
      )}
    </Card>
  );
}

function VitalsTab({ patient }) {
  const today = new Date(2026, 4, 27); // May 27, 2026

  // Build initial vitals rows from a stable hash (most recent first).
  const initialRows = React.useMemo(() => {
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
      const sys = 90 + (h % 25); const dia = 55 + ((h>>3) % 20);
      const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);
      const ageAtVisit = (() => {
        const a = calcAgeFromDob(patient.dob);
        if (!a) return "—";
        const visitYears = a.years - i * 0.16;
        if (visitYears < 1) return `${Math.max(0, Math.round((a.months + a.years*12 - i*2) % 12))} mo`;
        return `${Math.max(0, Math.floor(visitYears))} yr${visitYears < 2 ? '' : 's'}`;
      })();
      rows.push({
        id: `vh-${i}`,
        date: d,
        dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        ageAtVisit,
        weight: +weight.toFixed(1),
        height: +height.toFixed(1),
        hc: +hc.toFixed(1),
        bmi, temp: t, hr, sys, dia,
        source: i === 0 ? "Today" : (i < 3 ? "Well-child" : (i % 2 ? "Sick visit" : "Follow-up")),
      });
      weight -= 0.6 + (h % 5) / 10;
      height -= 1.4 + (h % 4) / 10;
      hc     -= 0.15;
    }
    return rows;
  }, [patient.id]);

  const [extraRows, setExtraRows] = React.useState([]);
  const rows = React.useMemo(
    () => [...extraRows, ...initialRows].sort((a, b) => b.date - a.date),
    [extraRows, initialRows]
  );

  const [metric, setMetric] = React.useState("weight");
  const [recordOpen, setRecordOpen] = React.useState(false);

  // ── Date / range filter for the vitals history table ──
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayISO = isoOf(today);
  const RANGE_PRESETS = [
    { key: "all", label: "All" },
    { key: "3m",  label: "3M",  months: 3 },
    { key: "6m",  label: "6M",  months: 6 },
    { key: "1y",  label: "1Y",  months: 12 },
    { key: "2y",  label: "2Y",  months: 24 },
  ];
  const [rangePreset, setRangePreset] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate]     = React.useState("");

  const applyPreset = (p) => {
    setRangePreset(p.key);
    if (p.key === "all") { setFromDate(""); setToDate(""); return; }
    const from = new Date(today); from.setMonth(from.getMonth() - p.months);
    setFromDate(isoOf(from));
    setToDate(todayISO);
  };
  const onFromChange = (e) => { setFromDate(e.target.value); setRangePreset("custom"); };
  const onToChange   = (e) => { setToDate(e.target.value);   setRangePreset("custom"); };

  const METRICS = {
    weight:  { label: "Weight",     unit: "kg",  color: "#0098E4", yRange: [2, 24],  bands: { p3: -3,   p50: 0,   p97: 3   } },
    height:  { label: "Height",     unit: "cm",  color: "#8B5CF6", yRange: [40, 130], bands: { p3: -10,  p50: 0,   p97: 10  } },
    hc:      { label: "Head circ.", unit: "cm",  color: "#06B6D4", yRange: [33, 55],  bands: { p3: -2,   p50: 0,   p97: 2   } },
    bmi:     { label: "BMI",        unit: "",    color: "#10B981", yRange: [12, 22],  bands: { p3: -2,   p50: 0,   p97: 2   } },
  };

  const latest = rows[0] || {};

  // Rows passing the active date-range filter (table only; chart keeps full history).
  const filteredRows = React.useMemo(() => {
    const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const to   = toDate   ? new Date(toDate   + "T23:59:59") : null;
    return rows.filter(r => (!from || r.date >= from) && (!to || r.date <= to));
  }, [rows, fromDate, toDate]);

  // ── Pagination for the vitals history table ──
  const PAGE_SIZE = 8;
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  // Snap back into range whenever the filtered set shrinks (e.g. new range applied).
  React.useEffect(() => { setPage(p => Math.min(p, pageCount - 1)); }, [pageCount]);
  React.useEffect(() => { setPage(0); }, [fromDate, toDate]);
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filteredRows.length, (page + 1) * PAGE_SIZE);

  // Sort rows by date ascending for chart plotting
  const chartPoints = React.useMemo(() => {
    return rows
      .slice()
      .sort((a, b) => a.date - b.date)
      .map(r => ({
        x: r.date.getTime(),
        y: r[metric],
        date: r.dateStr,
      }));
  }, [rows, metric]);

  const handleRecord = (entry) => {
    const d = new Date(entry.date || today);
    const weight = parseFloat(entry.weight) || latest.weight || 0;
    const height = parseFloat(entry.height) || latest.height || 0;
    const newRow = {
      id: `vh-new-${Date.now()}`,
      date: d,
      dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ageAtVisit: latest.ageAtVisit || "—",
      weight,
      height,
      hc: parseFloat(entry.hc) || latest.hc || 0,
      bmi: height > 0 ? +(weight / Math.pow(height / 100, 2)).toFixed(1) : 0,
      temp: parseFloat(entry.temp) || latest.temp || 36.7,
      hr: parseInt(entry.hr, 10) || latest.hr || 0,
      sys: parseInt(entry.sys, 10) || latest.sys || 0,
      dia: parseInt(entry.dia, 10) || latest.dia || 0,
      source: "Manual",
    };
    setExtraRows(prev => [newRow, ...prev]);
    setRecordOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Growth chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="Growth chart" sub={`${METRICS[metric].label} · WHO percentiles · plotted from recorded visits`} />
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100">
              {Object.entries(METRICS).map(([k, m]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMetric(k)}
                  className={cx(
                    "h-7 px-2.5 text-[11.5px] font-medium rounded-md transition",
                    metric === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >{m.label}</button>
              ))}
            </div>
            <Button variant="soft" size="sm" icon={<Icon.plus size={12}/>} onClick={() => setRecordOpen(true)}>
              Record vitals
            </Button>
          </div>
        </div>
        <GrowthChart
          metric={METRICS[metric]}
          points={chartPoints}
        />
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: METRICS[metric].color }} />Patient</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: METRICS[metric].color, opacity: 0.4 }} />3rd · 50th · 97th percentile</span>
          <span className="ml-auto">
            Latest <span className="font-semibold text-slate-700">{latest[metric]} {METRICS[metric].unit}</span> · within normal range
          </span>
        </div>
      </Card>

      {/* Vitals history table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/70 flex items-center justify-between">
          <SectionHeader title="Vitals history" sub={
            filteredRows.length === rows.length
              ? `${rows.length} recorded visits`
              : `${filteredRows.length} of ${rows.length} visits in range`
          } />
          <Button variant="ghost" size="sm" icon={<Icon.download size={12}/>}>Export</Button>
        </div>

        {/* Date / range filter */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-2 bg-slate-50/30">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
            <Icon.filter size={13}/> Range
          </div>
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100">
            {RANGE_PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p)}
                className={cx(
                  "h-7 px-2.5 text-[11.5px] font-medium rounded-md transition",
                  rangePreset === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >{p.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Input type="date" value={fromDate} max={toDate || todayISO} onChange={onFromChange} className="w-[150px]" />
            <span className="text-slate-400 text-[12px]">to</span>
            <Input type="date" value={toDate} min={fromDate} max={todayISO} onChange={onToChange} className="w-[150px]" />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => applyPreset(RANGE_PRESETS[0])}
                className="h-8 px-2.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-1 transition"
              ><Icon.close size={12}/> Clear</button>
            )}
          </div>
        </div>

        <div className="grid items-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 px-5 py-2.5 bg-slate-50/70 border-b border-slate-100"
          style={{ gridTemplateColumns: "1.4fr 0.9fr 0.9fr 1fr 0.8fr 0.7fr 0.9fr 1fr 0.7fr 1.1fr" }}
        >
          <div>Date</div>
          <div>Age</div>
          <div>Weight</div>
          <div>Height</div>
          <div>Head</div>
          <div>BMI</div>
          <div>Temp</div>
          <div>BP</div>
          <div>HR</div>
          <div>Visit</div>
        </div>
        <div className="divide-y divide-slate-100">
          {pagedRows.map((r, i) => (
            <div key={r.id} className={cx(
              "grid items-center px-5 py-2.5 text-[12.5px] text-slate-700 hover:bg-sky-50/40 transition",
              r.id === rows[0]?.id && "bg-sky-50/40"
            )} style={{ gridTemplateColumns: "1.4fr 0.9fr 0.9fr 1fr 0.8fr 0.7fr 0.9fr 1fr 0.7fr 1.1fr" }}>
              <div className="flex items-center gap-2 min-w-0">
                {r.id === rows[0]?.id && <span className="size-1.5 rounded-full bg-sky-500" />}
                <span className="text-slate-900 font-medium truncate">{r.dateStr}</span>
              </div>
              <div className="text-slate-600 truncate">{r.ageAtVisit}</div>
              <div className="font-mono"><span className="text-slate-900">{r.weight}</span><span className="text-slate-400"> kg</span></div>
              <div className="font-mono"><span className="text-slate-900">{r.height}</span><span className="text-slate-400"> cm</span></div>
              <div className="font-mono"><span className="text-slate-900">{r.hc}</span><span className="text-slate-400"> cm</span></div>
              <div className="font-mono text-slate-900">{r.bmi}</div>
              <div className="font-mono"><span className="text-slate-900">{r.temp}</span><span className="text-slate-400">°</span></div>
              <div className="font-mono"><span className="text-slate-900">{r.sys}/{r.dia}</span></div>
              <div className="font-mono"><span className="text-slate-900">{r.hr}</span></div>
              <div className="truncate">
                <Badge color={
                  r.source === "Today"      ? { bg:"#E0F2FE", text:"#075985" } :
                  r.source === "Well-child" ? { bg:"#D1FAE5", text:"#065F46" } :
                  r.source === "Sick visit" ? { bg:"#FFEDD4", text:"#9A3412" } :
                  r.source === "Manual"     ? { bg:"#EDE9FE", text:"#5B21B6" } :
                                              { bg:"#F1F5F9", text:"#475569" }
                }>{r.source}</Badge>
              </div>
            </div>
          ))}
          {filteredRows.length === 0 && (
            <div className="px-5 py-10 flex flex-col items-center justify-center text-center gap-2">
              <div className="size-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><Icon.calendar size={16}/></div>
              <div className="text-[13px] font-medium text-slate-600">No vitals recorded in this range</div>
              <button
                type="button"
                onClick={() => applyPreset(RANGE_PRESETS[0])}
                className="text-[12px] font-medium text-sky-600 hover:text-sky-700"
              >Clear filter</button>
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {filteredRows.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="text-[12px] text-slate-500">
              Showing <span className="font-medium text-slate-700">{rangeStart}–{rangeEnd}</span> of <span className="font-medium text-slate-700">{filteredRows.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 px-2 rounded-lg text-[12px] font-medium inline-flex items-center gap-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
              ><Icon.chevLeft size={14}/> Prev</button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={cx(
                      "size-8 rounded-lg text-[12px] font-medium transition",
                      i === page ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >{i + 1}</button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="h-8 px-2 rounded-lg text-[12px] font-medium inline-flex items-center gap-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
              >Next <Icon.chevRight size={14}/></button>
            </div>
          </div>
        )}
      </Card>

      <RecordVitalsDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSubmit={handleRecord}
        defaults={latest}
      />
    </div>
  );
}

// Parametric growth chart used by the Vitals tab.
function GrowthChart({ metric, points }) {
  const w = 760, h = 280, pad = 36;
  const [yMin, yMax] = metric.yRange;
  const xs = points.length > 0 ? points.map(p => p.x) : [];
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const xPad = (xMax - xMin) * 0.05 || 1;
  const x0 = xMin - xPad, x1 = xMax + xPad;
  const X = (x) => pad + ((x - x0) / (x1 - x0)) * (w - pad * 2);
  const Y = (y) => h - pad - ((y - yMin) / (yMax - yMin)) * (h - pad * 2);

  // Synthetic percentile bands using linear progression across the X axis
  const bandPath = (off) => {
    const start = (yMin + yMax) / 2 * 0.85 + off;
    const end   = (yMin + yMax) / 2 * 1.15 + off;
    return `M ${X(x0)},${Y(start)} L ${X(x1)},${Y(end)}`;
  };

  const linePath = points.length === 0
    ? ""
    : "M " + points.map(p => `${X(p.x)},${Y(p.y)}`).join(" L ");

  // Y axis ticks
  const ticks = 5;
  const yTicks = Array.from({ length: ticks }, (_, i) => yMin + (i / (ticks - 1)) * (yMax - yMin));
  // X axis ticks — sample 6 dates between x0 and x1
  const xTicks = Array.from({ length: 6 }, (_, i) => x0 + (i / 5) * (x1 - x0));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="280">
      {/* Y grid */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pad} x2={w - pad} y1={Y(v)} y2={Y(v)} stroke="#E2E8F0" strokeDasharray="2 4" />
          <text x={pad - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="#64748B">
            {Math.round(v * 10) / 10}{metric.unit ? metric.unit : ""}
          </text>
        </g>
      ))}
      {/* X grid + labels */}
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={X(t)} x2={X(t)} y1={pad} y2={h - pad} stroke="#E2E8F0" />
          <text x={X(t)} y={h - 12} textAnchor="middle" fontSize="10" fill="#64748B">
            {new Date(t).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          </text>
        </g>
      ))}
      {/* Bands */}
      <path d={bandPath(metric.bands.p3)}  stroke={metric.color} strokeOpacity="0.25" fill="none" strokeDasharray="4 4" />
      <path d={bandPath(metric.bands.p50)} stroke={metric.color} strokeOpacity="0.35" fill="none" strokeDasharray="4 4" />
      <path d={bandPath(metric.bands.p97)} stroke={metric.color} strokeOpacity="0.25" fill="none" strokeDasharray="4 4" />
      {/* Patient line */}
      {points.length > 1 && (
        <path d={linePath} stroke={metric.color} strokeWidth="2.5" fill="none" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={X(p.x)} cy={Y(p.y)} r="3.5" fill="white" stroke={metric.color} strokeWidth="2">
          <title>{`${p.date}: ${p.y} ${metric.unit || ''}`}</title>
        </circle>
      ))}
      {/* Latest value label */}
      {points.length > 0 && (() => {
        const p = points[points.length - 1];
        return (
          <text x={X(p.x) - 4} y={Y(p.y) - 8} textAnchor="end" fontSize="11" fontWeight="600" fill={metric.color}>
            {p.y} {metric.unit}
          </text>
        );
      })()}
    </svg>
  );
}

function RecordVitalsDialog({ open, onClose, onSubmit, defaults = {} }) {
  const today = "2026-05-27";
  const [date, setDate]     = React.useState(today);
  const [weight, setWeight] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [hc, setHc]         = React.useState("");
  const [temp, setTemp]     = React.useState("");
  const [hr, setHr]         = React.useState("");
  const [sys, setSys]       = React.useState("");
  const [dia, setDia]       = React.useState("");

  React.useEffect(() => {
    if (open) {
      setDate(today);
      setWeight(""); setHeight(""); setHc(""); setTemp(""); setHr(""); setSys(""); setDia("");
    }
  }, [open]);

  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[520px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sky-500 text-white flex items-center justify-center"><Icon.activity size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">Record vitals</div>
              <div className="text-[11.5px] text-slate-500">Add a new measurement to this patient's history</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Weight (kg)"><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={defaults.weight ? `${defaults.weight}` : "0.0"} /></Field>
            <Field label="Height (cm)"><Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={defaults.height ? `${defaults.height}` : "0.0"} /></Field>
            <Field label="Head circ. (cm)"><Input type="number" step="0.1" value={hc} onChange={(e) => setHc(e.target.value)} placeholder={defaults.hc ? `${defaults.hc}` : "0.0"} /></Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Temp (°C)"><Input type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="36.7" /></Field>
            <Field label="HR (bpm)"><Input type="number" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="100" /></Field>
            <Field label="BP sys"><Input type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="100" /></Field>
            <Field label="BP dia"><Input type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="65" /></Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>}
            onClick={() => onSubmit({ date, weight, height, hc, temp, hr, sys, dia })}
          >
            Save vitals
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function VitalKPI({ label, value, unit, sub, tone = "sky", icon }) {
  const TONES = {
    sky:     { bg: "bg-sky-50",     ring: "ring-sky-100",     iconBg: "bg-sky-500     text-white", val: "text-sky-900" },
    violet:  { bg: "bg-violet-50",  ring: "ring-violet-100",  iconBg: "bg-violet-500  text-white", val: "text-violet-900" },
    cyan:    { bg: "bg-cyan-50",    ring: "ring-cyan-100",    iconBg: "bg-cyan-500    text-white", val: "text-cyan-900" },
    emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", iconBg: "bg-emerald-500 text-white", val: "text-emerald-900" },
    rose:    { bg: "bg-rose-50",    ring: "ring-rose-100",    iconBg: "bg-rose-500    text-white", val: "text-rose-900" },
    amber:   { bg: "bg-amber-50",   ring: "ring-amber-100",   iconBg: "bg-amber-500   text-white", val: "text-amber-900" },
  }[tone] || { bg: "bg-slate-50", ring: "ring-slate-100", iconBg: "bg-slate-400 text-white", val: "text-slate-900" };
  return (
    <div className={cx("p-3 rounded-xl ring-1", TONES.bg, TONES.ring)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cx("size-6 rounded-md flex items-center justify-center", TONES.iconBg)}>{icon}</span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cx("text-[20px] font-bold leading-none", TONES.val)}>{value}</span>
        {unit && <span className="text-[11px] text-slate-500">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-[13px] text-slate-800 mt-0.5 truncate">{value}</div>
    </div>
  );
}

function ChipList({ tone, icon, title, items, emptyLabel }) {
  const TONES = {
    rose:  { bg: "bg-rose-50/70",  border: "border-rose-100",  iconBg: "bg-rose-100 text-rose-700",  chip: "bg-white text-rose-700 border-rose-200" },
    amber: { bg: "bg-amber-50/70", border: "border-amber-100", iconBg: "bg-amber-100 text-amber-800", chip: "bg-white text-amber-800 border-amber-200" },
  }[tone] || { bg: "bg-slate-50", border: "border-slate-100", iconBg: "bg-slate-100 text-slate-700", chip: "bg-white text-slate-700 border-slate-200" };
  const empty = !items || items.length === 0;
  return (
    <div className={cx("p-3 rounded-xl border", TONES.bg, TONES.border)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cx("size-6 rounded-md flex items-center justify-center", TONES.iconBg)}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{title}</span>
        {!empty && (
          <span className="ml-auto text-[10.5px] font-medium text-slate-500">{items.length}</span>
        )}
      </div>
      {empty ? (
        <div className="text-[12.5px] text-slate-500 italic">{emptyLabel}</div>
      ) : (
        <div className="flex items-center flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span key={i} className={cx("inline-flex items-center px-2 py-0.5 rounded-full border text-[12px] font-medium", TONES.chip)}>
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ tone, icon, title, items, muted }) {
  const T = {
    rose:  muted ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-rose-50 text-rose-800 border-rose-100",
    amber: muted ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-amber-50 text-amber-800 border-amber-100",
  };
  return (
    <div className={cx("rounded-xl border p-3", T[tone])}>
      <div className="text-[11px] font-medium flex items-center gap-1.5">{icon} {title.toUpperCase()}</div>
      <div className="mt-1 text-[13px] flex flex-wrap gap-1.5">
        {items.map((it,i) => (
          <span key={i} className={cx("rounded-md px-2 py-0.5 text-[12px] whitespace-nowrap", muted ? "bg-white border border-slate-100" : "bg-white/70 border border-current/10")}>{it}</span>
        ))}
      </div>
    </div>
  );
}

function VitalTile({ icon, label, value, unit, tone, trend }) {
  const T = {
    sky:     "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange:  "bg-orange-50 text-orange-700 ring-orange-100",
    rose:    "bg-rose-50 text-rose-700 ring-rose-100",
    cyan:    "bg-cyan-50 text-cyan-700 ring-cyan-100",
    violet:  "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className={cx("size-7 rounded-lg flex items-center justify-center", T[tone])}>{icon}</div>
        <div className="text-[10.5px] text-slate-500">{trend}</div>
      </div>
      <div className="mt-2 text-[11.5px] text-slate-500">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <div className="text-[18px] font-semibold text-slate-900 leading-none">{value}</div>
        <div className="text-[11px] text-slate-500">{unit}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, data, color }) {
  const max = Math.max(...data.map(d => d.v));
  const min = Math.min(...data.map(d => d.v));
  const range = (max - min) || 1;
  const w = 280, h = 90, pad = 8;
  const pts = data.map((d,i) => {
    const x = pad + (i / (data.length-1)) * (w - pad*2);
    const y = h - pad - ((d.v - min) / range) * (h - pad*2);
    return [x,y,d];
  });
  const path = "M " + pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const area = path + ` L ${pts[pts.length-1][0]},${h} L ${pts[0][0]},${h} Z`;
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[12px] text-slate-500">{title}</div>
        <div className="text-[14px] font-semibold text-slate-900">{pts[pts.length-1][2].v}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="90">
        <defs>
          <linearGradient id={"g"+title} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"  stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g${title})`} />
        <path d={path} stroke={color} strokeWidth="2" fill="none" />
        {pts.map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="white" stroke={color} strokeWidth="2"/>
        ))}
      </svg>
      <div className="flex justify-between text-[10.5px] text-slate-500 mt-1">
        {data.map((d,i) => <span key={i}>{d.d}</span>)}
      </div>
    </div>
  );
}

function BigChart() {
  // WHO percentile bands
  const w = 760, h = 280, pad = 30;
  const months = Array.from({ length: 13 }, (_,i) => i * 6); // 0..72
  // synthetic percentile curves
  const curve = (off, slope) => months.map(m => 8 + off + slope * Math.sqrt(m));
  const bands = [
    { k: "3rd",  data: curve(-3, 2.0), color: "rgba(0,152,228,0.10)" },
    { k: "50th", data: curve(0,  2.3), color: "rgba(0,152,228,0.20)" },
    { k: "97th", data: curve(3,  2.6), color: "rgba(0,152,228,0.10)" },
  ];
  const child = [ [0,3.5],[6,7.8],[12,10.1],[18,11.6],[24,12.8],[30,13.4],[36,14.0],[42,14.3] ];
  const xs = (x) => pad + (x/72) * (w-pad*2);
  const ys = (y) => h - pad - ((y-2)/22) * (h - pad*2);
  const linePath = (data, xfn) => "M " + data.map((y,i) => `${xs(xfn(i))},${ys(y)}`).join(" L ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="280">
      {/* grid */}
      {[0,5,10,15,20,25].map(v => (
        <line key={v} x1={pad} x2={w-pad} y1={ys(v)} y2={ys(v)} stroke="#E2E8F0" strokeDasharray="2 4" />
      ))}
      {[0,12,24,36,48,60,72].map(m => (
        <line key={m} x1={xs(m)} x2={xs(m)} y1={pad} y2={h-pad} stroke="#E2E8F0" />
      ))}
      {/* bands */}
      {bands.map(b => (
        <path key={b.k} d={linePath(b.data, i => months[i])} stroke="#0098E4" strokeOpacity="0.25" fill="none" strokeDasharray="4 4" />
      ))}
      {/* child curve */}
      <path d={"M " + child.map(([m,v]) => `${xs(m)},${ys(v)}`).join(" L ")} stroke="#0098E4" strokeWidth="2.5" fill="none" />
      {child.map(([m,v],i) => (
        <circle key={i} cx={xs(m)} cy={ys(v)} r="3.5" fill="white" stroke="#0098E4" strokeWidth="2" />
      ))}
      {/* axis labels */}
      {[0,12,24,36,48,60,72].map(m => (
        <text key={m} x={xs(m)} y={h-10} textAnchor="middle" fontSize="10" fill="#64748B">{m}m</text>
      ))}
      {[5,10,15,20].map(v => (
        <text key={v} x={pad-6} y={ys(v)+3} textAnchor="end" fontSize="10" fill="#64748B">{v}kg</text>
      ))}
      <text x={xs(42)+8} y={ys(14.3)-6} fontSize="11" fontWeight="600" fill="#0098E4">14.3 kg · 52nd %</text>
    </svg>
  );
}

function PlanRow({ done, text }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      <div className={cx("size-4 rounded-md flex items-center justify-center border", done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white")}>
        {done && <Icon.check size={10} />}
      </div>
      <span className={cx(done && "text-slate-400 line-through")}>{text}</span>
    </div>
  );
}

function TimelineItem({ time, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-[11px] text-slate-500 mt-0.5 w-16 shrink-0">{time}</div>
      <div className="size-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
      <div className="text-slate-800">{text}</div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-3">
      <div className="text-[13.5px] font-semibold text-slate-900">{title}</div>
      {sub && <div className="text-[11.5px] text-slate-500">{sub}</div>}
    </div>
  );
}

function BillingSection({ patient, onCreateInvoice }) {
  const { INVOICES } = window.CHAVITOS;
  const list = INVOICES.filter(i => i.patient === patient.id);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/70 border-b border-slate-200/70">
        <SectionHeader title="Invoices for this patient" />
      </div>
      <div className="divide-y divide-slate-100">
        {list.length === 0 && <div className="px-5 py-12 text-center text-slate-500 text-[13px]">No invoices on file for this patient.</div>}
        {list.map(inv => (
          <div key={inv.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] px-5 py-3.5 text-[13px] items-center">
            <div className="font-mono font-medium text-slate-900">{inv.id}</div>
            <div className="text-slate-700">{inv.date}</div>
            <div className="text-slate-700">${inv.amount.toLocaleString()} MXN</div>
            <div className="text-slate-500">{inv.method}</div>
            <div className="text-right">
              <Badge color={
                inv.status === "Paid" ? { bg:"#D1FAE5", text:"#065F46" } :
                inv.status === "Pending" ? { bg:"#FEF3C7", text:"#92400E" } :
                inv.status === "Overdue" ? { bg:"#FEE2E2", text:"#991B1B" } :
                { bg:"#F1F5F9", text:"#475569" }
              }>{inv.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

Object.assign(window, {
  PatientScreen,
  // Helpers + dialogs reused by the letterhead Patient 360 redesign (screen-patient-360.jsx)
  patHash, calcAgeFromDob, formatAge,
  bloodGroupFor, hasInsuranceFor, insuranceFor, emergencyContactsFor, guardianDetailFor,
  GrowthChart, RecordVitalsDialog, MedicationEditorDialog, ImmunizationEditorDialog,
  ContactEditorDialog, ConfirmRemoveDialog, PolicyEditorDialog, RemovePolicyDialog,
  parseLongDate, formatLongDate, isoFromDate, dateFromIso, addDays, durationDays,
  STATUS_STYLES_MEDS, COMMON_VACCINES, ADMIN_SITES,
  INSURANCE_PROVIDER_DB, defaultClaimsFor, newPolicyId,
  PatientField: Field, PatientKV: KV,
});
