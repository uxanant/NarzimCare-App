// Search and New Appointment modals

// Searchable patient combobox. Calls `onRequestAdd(query)` to launch a full
// "add new patient" dialog (handled by parent) when no match is found.
function PatientSearchCombobox({ patients, value, onChange, onRequestAdd }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [pos, setPos] = React.useState(null); // {top,left,width,placement}
  const wrapRef = React.useRef(null);
  const popoverRef = React.useRef(null);

  const selected = patients.find(p => p.id === value);
  const q = query.trim().toLowerCase();
  const matches = q
    ? patients.filter(p => p.name.toLowerCase().includes(q) || (p.mrn || "").toLowerCase().includes(q))
    : patients;
  const exactNameMatch = q && patients.some(p => p.name.toLowerCase() === q);

  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popH = 320;
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placement = (spaceBelow < popH + margin && spaceAbove > spaceBelow) ? "top" : "bottom";
    const maxH = Math.min(
      popH,
      Math.max(180, placement === "bottom" ? spaceBelow - margin : spaceAbove - margin)
    );
    setPos({
      left: r.left,
      width: r.width,
      top: placement === "bottom" ? r.bottom + 4 : Math.max(margin, r.top - 4 - maxH),
      maxH,
      placement,
    });
  }, []);

  React.useEffect(() => {
    if (!open) { setQuery(""); setPos(null); return; }
    computePos();
    const onScroll = () => computePos();
    const onResize = () => computePos();
    const onDoc = (e) => {
      const inTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const inPop = popoverRef.current && popoverRef.current.contains(e.target);
      if (!inTrigger && !inPop) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, computePos]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 pl-3 pr-8 text-left flex items-center focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <BabyAvatar size={20} swatch={selected.swatch} name={selected.name} />
            <span className="truncate">{selected.name}</span>
            <span className="text-slate-400 text-[11px] font-mono shrink-0">{selected.mrn}</span>
          </span>
        ) : (
          <span className="text-slate-400">Search or select patient…</span>
        )}
        <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5l3 3 3-3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && pos && ReactDOM.createPortal(
        <div
          ref={popoverRef}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxH,
            zIndex: 70,
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 shrink-0">
            <Icon.search size={14} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or MRN…"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-700">
                <Icon.close size={12} />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {matches.length > 0 ? matches.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); }}
                className={cx(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-50 transition",
                  p.id === value && "bg-sky-50/70"
                )}
              >
                <BabyAvatar size={26} swatch={p.swatch} name={p.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {p.mrn}{p.age && p.age !== "—" ? ` · ${p.age}` : ""}
                  </div>
                </div>
                {p.isCustom && (
                  <span className="text-[9.5px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">New</span>
                )}
              </button>
            )) : (
              <div className="px-3 py-5 text-center text-[12.5px] text-slate-500">
                No patients match{query ? ` "${query}"` : ""}.
              </div>
            )}
          </div>

          {!exactNameMatch && (
            <div className="border-t border-slate-200 bg-gradient-to-b from-sky-50 to-sky-100/60 shrink-0">
              <button
                type="button"
                onClick={() => { setOpen(false); onRequestAdd(query); }}
                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-sky-200/40 transition"
              >
                <div className="size-8 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Icon.plus size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-sky-900 truncate">
                    Add new patient{query ? ` \u201C${query}\u201D` : ""}
                  </div>
                  <div className="text-[11.5px] text-sky-700/80 truncate">
                    Enter demographics, insurance, and contacts
                  </div>
                </div>
                <Icon.chevRight size={14} />
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// Rich practitioner picker — shows name with department subtitle under it.
function PractitionerSelect({ value, onChange, practitioners }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const selected = practitioners.find(p => p.id === value);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dot = (p) => (
    <span
      className="size-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
      style={{ background: p.color }}
    >
      {p.initials}
    </span>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-2.5 pr-8 text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
      >
        {selected ? (
          <React.Fragment>
            {dot(selected)}
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-slate-900 truncate leading-tight">{selected.name}</span>
              <span className="block text-[11px] text-slate-500 truncate leading-tight">{selected.department || selected.role}</span>
            </span>
          </React.Fragment>
        ) : (
          <span className="text-[13px] text-slate-400">Select practitioner…</span>
        )}
        <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5l3 3 3-3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden">
          {practitioners.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={cx(
                "w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-sky-50 transition",
                p.id === value && "bg-sky-50/70"
              )}
            >
              {dot(p)}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-slate-900 truncate leading-tight">{p.name}</div>
                <div className="text-[11px] text-slate-500 truncate leading-tight">{p.department || p.role}</div>
              </div>
              {p.id === value && <Icon.check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchScreen({ onClose, onOpenPatient }) {
  const { PATIENTS, PRACTITIONERS, INVOICES } = window.CHAVITOS;
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => {
      const el = document.getElementById("global-search-input");
      el && el.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const patientMatches = PATIENTS.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.mrn.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const invoiceMatches = INVOICES.filter(i => !q || i.id.toLowerCase().includes(q.toLowerCase())).slice(0, 3);

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center pt-28">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-[640px] max-w-[92%] bg-white rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.28)] border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Icon.search size={18} />
          <input
            id="global-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patients, invoices, appointments…"
            className="flex-1 bg-transparent text-[15px] outline-none"
          />
          <kbd className="text-[10.5px] text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div className="max-h-[480px] overflow-y-auto p-2">
          {patientMatches.length > 0 && (
            <div className="px-2 pt-2 pb-1 text-[10.5px] uppercase tracking-wide text-slate-500 font-medium">Patients</div>
          )}
          {patientMatches.map(p => (
            <button key={p.id} onClick={() => { onOpenPatient(p.id); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sky-50 text-left">
              <BabyAvatar size={32} swatch={p.swatch} name={p.name} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-slate-900 truncate">{p.name}</div>
                <div className="text-[11.5px] text-slate-500 font-mono">{p.mrn} · {p.age}</div>
              </div>
              <Icon.chevRight size={14} />
            </button>
          ))}

          {invoiceMatches.length > 0 && (
            <div className="px-2 pt-3 pb-1 text-[10.5px] uppercase tracking-wide text-slate-500 font-medium">Invoices</div>
          )}
          {invoiceMatches.map(inv => (
            <div key={inv.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sky-50">
              <div className="size-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><Icon.invoice size={14} /></div>
              <div className="flex-1">
                <div className="text-[13.5px] font-medium text-slate-900 font-mono">{inv.id}</div>
                <div className="text-[11.5px] text-slate-500">${inv.amount.toLocaleString()} · {inv.status}</div>
              </div>
            </div>
          ))}

          <div className="px-2 pt-3 pb-1 text-[10.5px] uppercase tracking-wide text-slate-500 font-medium">Quick actions</div>
          {[
            { i: <Icon.plus size={14}/>, t: "New appointment", k: "⌘N", onClick: () => { onClose(); window.dispatchEvent(new CustomEvent("chavitos:new-appt")); } },
          ].map((a, i) => (
            <div key={i} onClick={a.onClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sky-50 text-[13.5px] cursor-pointer">
              <div className="size-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">{a.i}</div>
              <div className="flex-1">{a.t}</div>
              <kbd className="text-[10.5px] text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">{a.k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// New Appointment Dialog
function NewAppointmentDialog({ open, onClose, onCreate, presetPatientId }) {
  const { PATIENTS, PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const [step, setStep] = React.useState(1);
  const [addedPatients, setAddedPatients] = React.useState([]);
  const [newPatientOpen, setNewPatientOpen] = React.useState(false);
  const [newPatientSeed, setNewPatientSeed] = React.useState("");
  const allPatients = React.useMemo(() => [...addedPatients, ...PATIENTS], [addedPatients, PATIENTS]);
  const [data, setData] = React.useState({
    patient: "", practitioner: "miguel", location: "chavitos", date: "2026-04-10", time: "10:00", type: "Wellness exam", reason: "", reminder: true,
    referring: "none", referringExternal: "", source: "Walk-in",
    // Payment / billing
    fee: 850, discount: 0, discountType: "amount", paymentMethod: "Cash", paymentStatus: "Pay later", payerNote: "",
  });
  const reset = () => {
    setStep(1);
    setAddedPatients([]);
    setNewPatientOpen(false);
    setNewPatientSeed("");
    setData({ patient: "", practitioner: "miguel", location: "chavitos", date: "2026-04-10", time: "10:00", type: "Wellness exam", reason: "", reminder: true, referring: "none", referringExternal: "", source: "Walk-in", fee: 850, discount: 0, discountType: "amount", paymentMethod: "Cash", paymentStatus: "Pay later", payerNote: "" });
  };
  const close = () => { onClose(); setTimeout(reset, 200); };

  // When opened from a patient's 360 profile, pre-select that patient but
  // stay on step 1 so the user still picks visit type / reason manually.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      if (presetPatientId && PATIENTS.some(p => p.id === presetPatientId)) {
        setData(d => ({ ...d, patient: presetPatientId }));
      }
    }
    wasOpen.current = open;
  }, [open, presetPatientId]);

  const SLOTS = ["09:00","09:30","09:45","10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00"];
  const TYPES = ["Wellness exam","Sick visit","Vaccination","Follow-up","Cardiology","Telehealth"];
  // Default fees in MXN by visit type — pre-fill the payment step.
  const FEE_BY_TYPE = {
    "Wellness exam":  850,
    "Sick visit":     750,
    "Vaccination":    600,
    "Follow-up":      500,
    "Cardiology":    1400,
    "Telehealth":     450,
  };

  // Keep fee in sync with type if user hasn't manually overridden it.
  const [feeTouched, setFeeTouched] = React.useState(false);
  React.useEffect(() => {
    if (!feeTouched) setData(d => ({ ...d, fee: FEE_BY_TYPE[d.type] || 750 }));
  }, [data.type, feeTouched]);

  // Money helpers
  const fmtMx = (n) => `$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const subtotal = Number(data.fee || 0);
  const discountValue = data.discountType === "percent"
    ? Math.min(subtotal, Math.round(subtotal * (Number(data.discount || 0) / 100)))
    : Math.min(subtotal, Number(data.discount || 0));
  const total = Math.max(0, subtotal - discountValue);

  return (
    <React.Fragment>
    <Dialog open={open} onClose={close} width={620}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
        <div className="text-[14.5px] font-semibold text-slate-900">New appointment</div>
        <button onClick={close} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1.5 px-5 pt-4 shrink-0">
        {["Patient","Schedule","Payment","Confirm"].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={cx(
              "size-5 rounded-full text-[11px] font-semibold flex items-center justify-center",
              step > i+1 ? "bg-emerald-500 text-white" : step === i+1 ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-500"
            )}>{step > i+1 ? <Icon.check size={11}/> : i+1}</div>
            <div className={cx("text-[12.5px]", step >= i+1 ? "text-slate-900 font-medium" : "text-slate-500")}>{s}</div>
            {i < 3 && <div className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-3">
            <Field label="Patient">
              <PatientSearchCombobox
                patients={allPatients}
                value={data.patient}
                onChange={(v) => setData({ ...data, patient: v })}
                onRequestAdd={(seed) => { setNewPatientSeed(seed); setNewPatientOpen(true); }}
              />
            </Field>
            <Field label="Visit type">
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setData({...data, type: t})}
                    className={cx("h-9 rounded-lg border text-[12.5px] font-medium transition",
                      data.type === t ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}>{t}</button>
                ))}
              </div>
            </Field>
            <Field label="Reason for visit (optional)">
              <Textarea rows={3} value={data.reason} onChange={(e) => setData({...data, reason: e.target.value})}
                placeholder="Cough since Monday, low fever, no rashes…" />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Practitioner">
                <PractitionerSelect
                  value={data.practitioner}
                  onChange={(v) => setData({ ...data, practitioner: v })}
                  practitioners={PRACTITIONERS}
                />
              </Field>
              <Field label="Location">
                <Select value={data.location} onChange={(v) => setData({...data, location: v})}
                  options={Object.entries(LOCATIONS).map(([k,v]) => ({ value: k, label: v.name }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Referring practitioner">
                <Select
                  value={data.referring}
                  onChange={(v) => setData({ ...data, referring: v, referringExternal: v === "external" ? data.referringExternal : "" })}
                  options={[
                    { value: "none", label: "None / Self-referred" },
                    ...PRACTITIONERS.map(p => ({ value: p.id, label: `${p.name} · ${p.department || p.role}` })),
                    { value: "external", label: "External practitioner…" },
                  ]}
                />
                {data.referring === "external" && (
                  <Input
                    className="mt-2"
                    value={data.referringExternal}
                    onChange={(e) => setData({ ...data, referringExternal: e.target.value })}
                    placeholder="Name, clinic (e.g. Dr. Rivas, Hospital ABC)"
                  />
                )}
              </Field>
              <Field label="Source">
                <Select
                  value={data.source}
                  onChange={(v) => setData({ ...data, source: v })}
                  options={[
                    "Walk-in",
                    "Phone call",
                    "Online booking",
                    "WhatsApp",
                    "Referral",
                    "Returning patient",
                    "Insurance directory",
                    "Other",
                  ].map(s => ({ value: s, label: s }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input type="date" value={data.date} onChange={(e) => setData({...data, date: e.target.value})} />
              </Field>
              <Field label="Available slots">
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {SLOTS.map(s => (
                    <button key={s} onClick={() => setData({...data, time: s})}
                      className={cx("h-8 rounded-lg border text-[12px] font-medium",
                        data.time === s ? "border-sky-400 bg-sky-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}>{s}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-[13px] text-slate-800">Send WhatsApp reminder 24h before</div>
              <Switch checked={data.reminder} onChange={(v) => setData({...data, reminder: v})} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {/* Charges card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Charges</div>
                <div className="text-[10.5px] text-slate-500">All amounts in MXN</div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-[13px] text-slate-700">
                    {data.type}
                    <div className="text-[10.5px] text-slate-500">Consultation fee</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] text-slate-400">$</span>
                    <input
                      type="number"
                      value={data.fee}
                      onChange={(e) => { setFeeTouched(true); setData({ ...data, fee: Number(e.target.value) || 0 }); }}
                      className="h-9 w-28 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 text-right px-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                    />
                  </div>
                </div>

                {/* Discount row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-[13px] text-slate-700">
                    Discount
                    <div className="text-[10.5px] text-slate-500">Optional · waived courtesy / promo</div>
                  </div>
                  <div className="inline-flex p-0.5 rounded-md bg-slate-100 mr-1">
                    {[
                      { v: "amount",  label: "$"  },
                      { v: "percent", label: "%"  },
                    ].map(o => (
                      <button key={o.v} type="button"
                        onClick={() => setData({ ...data, discountType: o.v })}
                        className={cx(
                          "h-7 w-7 rounded text-[11.5px] font-semibold transition",
                          data.discountType === o.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                        )}
                      >{o.label}</button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={data.discount}
                    onChange={(e) => setData({ ...data, discount: Number(e.target.value) || 0 })}
                    className="h-9 w-28 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 text-right px-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 mt-3 pt-3 space-y-1 text-[12.5px]">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span className="font-mono">{fmtMx(subtotal)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount {data.discountType === "percent" ? `(${data.discount}%)` : ""}</span>
                    <span className="font-mono">− {fmtMx(discountValue)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-[13px] font-semibold text-slate-900">Total due</span>
                  <span className="text-[18px] font-bold text-slate-900 font-mono">{fmtMx(total)}</span>
                </div>
              </div>
            </Card>

            {/* Payment status: Pay now vs Pay later */}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Payment status</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "Paid now",  title: "Mark as paid",     desc: "Patient is paying right now", tone: "emerald", icon: <Icon.check size={14}/> },
                  { v: "Pay later", title: "Pay after visit",  desc: "Collect when checkup completes", tone: "amber",   icon: <Icon.calendar size={14}/> },
                ].map(opt => {
                  const on = data.paymentStatus === opt.v;
                  const tones = {
                    emerald: { ring: "ring-emerald-400 bg-emerald-50",  iconBg: "bg-emerald-500 text-white" },
                    amber:   { ring: "ring-amber-400 bg-amber-50",      iconBg: "bg-amber-500   text-white" },
                  };
                  const t = tones[opt.tone];
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setData({ ...data, paymentStatus: opt.v })}
                      className={cx(
                        "flex items-center gap-2.5 p-3 rounded-xl border text-left transition",
                        on ? cx("ring-2", t.ring, "border-transparent") : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span className={cx("size-8 rounded-lg flex items-center justify-center shrink-0", on ? t.iconBg : "bg-slate-100 text-slate-500")}>
                        {opt.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold text-slate-900">{opt.title}</span>
                        <span className="block text-[10.5px] text-slate-500 truncate">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment method — visible only when Paid now */}
            {data.paymentStatus === "Paid now" && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2">Payment method</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "Cash",         label: "Cash",       icon: <Icon.invoice size={14}/> },
                    { v: "Card",         label: "Card",       icon: <Icon.invoice size={14}/> },
                    { v: "Bank transfer",label: "Transfer",   icon: <Icon.invoice size={14}/> },
                  ].map(m => {
                    const on = data.paymentMethod === m.v;
                    return (
                      <button
                        key={m.v}
                        type="button"
                        onClick={() => setData({ ...data, paymentMethod: m.v })}
                        className={cx(
                          "h-10 px-3 rounded-lg border text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition",
                          on ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >{m.icon}{m.label}</button>
                    );
                  })}
                </div>
                <input
                  value={data.payerNote}
                  onChange={(e) => setData({ ...data, payerNote: e.target.value })}
                  placeholder="Optional · receipt #, transaction ref, payer name"
                  className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                />
              </div>
            )}

            {data.paymentStatus === "Pay later" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-900">
                <Icon.alert size={14}/>
                <div>
                  <div className="font-semibold">Marked as Pending</div>
                  <div>You'll see a "Collect payment" reminder on the appointment row when the encounter is completed. The front desk can mark it paid then.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <Card className="p-4 bg-sky-50/40 border-sky-100">
              <div className="text-[11px] text-slate-500 uppercase mb-1">Summary</div>
              <SummaryRow k="Patient"      v={allPatients.find(p=>p.id===data.patient)?.name} />
              <SummaryRow k="Visit type"   v={data.type} />
              <SummaryRow k="Practitioner" v={(() => {
                const p = PRACTITIONERS.find(p=>p.id===data.practitioner);
                return p ? `${p.name} · ${p.department || p.role}` : null;
              })()} />
              <SummaryRow k="Location"     v={LOCATIONS[data.location].name} />
              <SummaryRow k="Referred by"  v={
                data.referring === "none" ? "Self-referred"
                : data.referring === "external"
                  ? (data.referringExternal || "External practitioner")
                  : (() => { const p = PRACTITIONERS.find(p=>p.id===data.referring); return p ? `${p.name} · ${p.department || p.role}` : "—"; })()
              } />
              <SummaryRow k="Source"       v={data.source} />
              <SummaryRow k="When"         v={`${data.date} · ${data.time}`} />
              {data.reason && <SummaryRow k="Reason" v={data.reason} />}
              <SummaryRow k="Reminder"     v={data.reminder ? "WhatsApp 24h before" : "Off"} />
            </Card>

            <Card className="p-4">
              <div className="text-[11px] text-slate-500 uppercase mb-2 font-semibold">Billing</div>
              <div className="flex items-center justify-between text-[13px] text-slate-700">
                <span>Consultation fee</span>
                <span className="font-mono">{fmtMx(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex items-center justify-between text-[13px] text-rose-600">
                  <span>Discount{data.discountType === "percent" ? ` (${data.discount}%)` : ""}</span>
                  <span className="font-mono">− {fmtMx(discountValue)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 mt-2 pt-2">
                <span className="text-[13px] font-semibold text-slate-900">Total {data.paymentStatus === "Paid now" ? "paid" : "due"}</span>
                <span className="text-[18px] font-bold text-slate-900 font-mono">{fmtMx(total)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {data.paymentStatus === "Paid now" ? (
                  <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>Paid · {data.paymentMethod}</Badge>
                ) : (
                  <Badge color={{ bg:"#FEF3C7", text:"#92400E" }}>Pending · collect after visit</Badge>
                )}
                {data.payerNote && <span className="text-[11px] text-slate-500 truncate">Ref: {data.payerNote}</span>}
              </div>
            </Card>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[12.5px] text-emerald-800">
              <Icon.check size={14}/>
              Slot available. Practitioner has no conflicts.
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/40 shrink-0">
        <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
        <div className="flex items-center gap-2">
          {step > 1 && <Button variant="secondary" size="sm" onClick={() => setStep(step-1)}>Back</Button>}
          {step < 4
            ? <Button variant="primary" size="sm" iconRight={<Icon.chevRight size={14}/>} disabled={step === 1 && !data.patient} onClick={() => setStep(step+1)}>Continue</Button>
            : <Button variant="primary" size="sm" icon={<Icon.check size={14}/>} onClick={() => {
                onCreate({ ...data, fee: subtotal, discountValue, total });
                close();
              }}>Schedule appointment</Button>
          }
        </div>
      </div>
    </Dialog>

    <NewPatientDialog
      open={newPatientOpen}
      seedName={newPatientSeed}
      onClose={() => setNewPatientOpen(false)}
      onCreate={(patient) => {
        setAddedPatients(prev => [patient, ...prev]);
        setData(d => ({ ...d, patient: patient.id }));
        setNewPatientOpen(false);
      }}
    />
    </React.Fragment>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium text-slate-700 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function SummaryRow({ k, v }) {
  return (
    <div className="flex items-start gap-3 py-1 text-[13px]">
      <div className="w-28 text-slate-500 shrink-0">{k}</div>
      <div className="text-slate-900 font-medium">{v}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// New Patient Dialog — full demographics + insurance + contacts.
// Opens on top of the NewAppointmentDialog. Returns a constructed
// patient object via onCreate(patient).
// ──────────────────────────────────────────────────────────────
const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Unknown"];
const RELATIONS = ["Mother", "Father", "Guardian", "Grandparent", "Sibling", "Other"];

function calcAgeYears(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years;
}

function emptyContact() {
  return { id: Math.random().toString(36).slice(2, 9), name: "", relation: "Mother", email: "", phone: "", primary: false };
}
function emptyEmergency() {
  return { id: Math.random().toString(36).slice(2, 9), name: "", relation: "Other", email: "", phone: "" };
}

function NewPatientDialog({ open, onClose, onCreate, seedName = "" }) {
  const [name, setName] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [gender, setGender] = React.useState("Female");
  const [bloodGroup, setBloodGroup] = React.useState("Unknown");
  const [allergies, setAllergies] = React.useState("");
  const [chronicCare, setChronicCare] = React.useState("");

  const [hasInsurance, setHasInsurance] = React.useState(false);
  const [insurances, setInsurances] = React.useState([
    { id: Math.random().toString(36).slice(2,9), provider: "", policy: "", group: "", holder: "", primary: true }
  ]);

  const [parentContacts, setParentContacts] = React.useState([{ ...emptyContact(), primary: true }]);
  const [ownPhone, setOwnPhone] = React.useState("");
  const [ownEmail, setOwnEmail] = React.useState("");
  const [emergencyContacts, setEmergencyContacts] = React.useState([]);

  // Seed name when the dialog opens
  React.useEffect(() => {
    if (open) setName(seedName || "");
  }, [open, seedName]);

  // Reset on close
  const reset = () => {
    setName(""); setDob(""); setGender("Female"); setBloodGroup("Unknown");
    setAllergies(""); setChronicCare("");
    setHasInsurance(false);
    setInsurances([{ id: Math.random().toString(36).slice(2,9), provider: "", policy: "", group: "", holder: "", primary: true }]);
    setParentContacts([{ ...emptyContact(), primary: true }]);
    setOwnPhone(""); setOwnEmail("");
    setEmergencyContacts([]);
  };
  const close = () => { onClose(); setTimeout(reset, 220); };

  const ageYears = calcAgeYears(dob);
  const isMinor = ageYears !== null && ageYears < 16;
  const isAdult = ageYears !== null && ageYears >= 16;

  const setPrimary = (idx) => {
    setParentContacts(arr => arr.map((c, i) => ({ ...c, primary: i === idx })));
  };

  const canSubmit = name.trim() && dob && (
    isMinor ? parentContacts.some(c => c.name.trim() && (c.phone.trim() || c.email.trim()))
            : isAdult ? (ownPhone.trim() || ownEmail.trim())
            : true
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    const seq = String(Math.floor(Math.random() * 900) + 100);
    const ageStr = ageYears !== null
      ? (ageYears < 2
          ? `${Math.max(0, ageYears)} Yrs`
          : `${ageYears} Yrs`)
      : "—";

    const patient = {
      id: `p-new-${Date.now()}`,
      name: name.trim(),
      mrn: `MRN-2026-04-000${seq}`,
      dob,
      age: ageStr,
      sex: gender === "Male" ? "M" : gender === "Female" ? "F" : gender[0],
      gender,
      bloodGroup,
      allergies: allergies.trim() ? allergies.split(",").map(s => s.trim()).filter(Boolean) : [],
      chronicCare: chronicCare.trim() ? chronicCare.split(",").map(s => s.trim()).filter(Boolean) : [],
      insurance: hasInsurance ? insurances.filter(i => i.provider.trim() || i.policy.trim()) : [],
      contacts: isMinor ? parentContacts.filter(c => c.name.trim()) : [],
      ownContact: isAdult ? { phone: ownPhone, email: ownEmail } : null,
      emergencyContacts: isAdult ? emergencyContacts.filter(c => c.name.trim()) : [],
      swatch: Math.floor(Math.random() * 8),
      isNew: true,
      isCustom: true,
    };
    onCreate(patient);
    setTimeout(reset, 220);
  };

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        style={{ width: 680, height: "85%", maxHeight: 720 }}
      >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-sky-500 text-white flex items-center justify-center"><Icon.plus size={16}/></div>
          <div>
            <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">New patient</div>
            <div className="text-[11.5px] text-slate-500">Demographics, insurance, and contacts</div>
          </div>
        </div>
        <button onClick={close} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
      </div>

      <div className="px-5 py-4 space-y-5 overflow-y-auto min-h-0 flex-1">
        {/* ── Demographics ── */}
        <Section title="Demographics">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. María José Pérez García" />
            </Field>
            <Field label="Date of birth *">
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
            <Field label="Gender">
              <Select value={gender} onChange={setGender} options={GENDERS.map(g => ({ value: g, label: g }))} />
            </Field>
            <Field label="Blood group">
              <Select value={bloodGroup} onChange={setBloodGroup} options={BLOOD_GROUPS.map(b => ({ value: b, label: b }))} />
            </Field>
          </div>
          {ageYears !== null && (
            <div className="mt-2 flex items-center gap-2 text-[11.5px]">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">Age: {ageYears} yrs</span>
              <span className={cx(
                "px-2 py-0.5 rounded-full font-medium",
                isMinor ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
              )}>
                {isMinor ? "Minor — parent/guardian required" : "Adult — own contact required"}
              </span>
            </div>
          )}
        </Section>

        {/* ── Clinical ── */}
        <Section title="Clinical (optional)">
          <div className="space-y-3">
            <Field label="Allergies">
              <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Penicillin, peanuts… (comma-separated)" />
            </Field>
            <Field label="Chronic care">
              <Input value={chronicCare} onChange={(e) => setChronicCare(e.target.value)} placeholder="Asthma, diabetes type 1… (comma-separated)" />
            </Field>
          </div>
        </Section>

        {/* ── Insurance ── */}
        <Section
          title="Insurance"
          subtitle={hasInsurance ? "Add one or more policies. Mark one as primary." : undefined}
          right={
            <div className="flex items-center gap-2">
              {hasInsurance && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Icon.plus size={12} />}
                  onClick={() => setInsurances(arr => [
                    ...arr,
                    { id: Math.random().toString(36).slice(2,9), provider: "", policy: "", group: "", holder: "", primary: false }
                  ])}
                >
                  Add insurance
                </Button>
              )}
              <label className="flex items-center gap-2 text-[12.5px] text-slate-700">
                <span>Has insurance</span>
                <Switch checked={hasInsurance} onChange={setHasInsurance} />
              </label>
            </div>
          }
        >
          {hasInsurance ? (
            <div className="space-y-2.5">
              {insurances.map((ins, idx) => (
                <InsuranceCard
                  key={ins.id}
                  insurance={ins}
                  index={idx}
                  total={insurances.length}
                  onChange={(patch) => setInsurances(arr => arr.map((x, i) => i === idx ? { ...x, ...patch } : x))}
                  onSetPrimary={() => setInsurances(arr => arr.map((x, i) => ({ ...x, primary: i === idx })))}
                  onRemove={insurances.length > 1 ? () => setInsurances(arr => {
                    const next = arr.filter((_, i) => i !== idx);
                    // ensure something is still primary
                    if (!next.some(x => x.primary) && next.length > 0) next[0] = { ...next[0], primary: true };
                    return next;
                  }) : null}
                />
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] text-slate-500 italic">Self-pay — no insurance on file.</div>
          )}
        </Section>

        {/* ── Contacts (conditional) ── */}
        {ageYears === null && (
          <Section title="Contacts">
            <div className="text-[12.5px] text-slate-500 italic">
              Enter a date of birth above to configure parent or emergency contacts.
            </div>
          </Section>
        )}

        {isMinor && (
          <Section
            title="Parent / guardian contacts"
            subtitle="Patient is under 16. At least one parent or guardian is required."
            right={
              <Button variant="ghost" size="sm" icon={<Icon.plus size={12}/>}
                onClick={() => setParentContacts(arr => [...arr, emptyContact()])}>
                Add contact
              </Button>
            }
          >
            <div className="space-y-2.5">
              {parentContacts.map((c, idx) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  primary={c.primary}
                  onChange={(patch) => setParentContacts(arr => arr.map((x, i) => i === idx ? { ...x, ...patch } : x))}
                  onSetPrimary={() => setPrimary(idx)}
                  onRemove={parentContacts.length > 1 ? () => setParentContacts(arr => arr.filter((_, i) => i !== idx)) : null}
                />
              ))}
            </div>
          </Section>
        )}

        {isAdult && (
          <React.Fragment>
            <Section title="Patient contact" subtitle="Patient is 16+. Their own contact details are required.">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone *">
                  <Input value={ownPhone} onChange={(e) => setOwnPhone(e.target.value)} placeholder="+52 …" />
                </Field>
                <Field label="Email">
                  <Input value={ownEmail} onChange={(e) => setOwnEmail(e.target.value)} placeholder="name@example.com" />
                </Field>
              </div>
            </Section>

            <Section
              title="Emergency contacts"
              subtitle="Optional. Add anyone we should call in case of emergency."
              right={
                <Button variant="ghost" size="sm" icon={<Icon.plus size={12}/>}
                  onClick={() => setEmergencyContacts(arr => [...arr, emptyEmergency()])}>
                  Add emergency contact
                </Button>
              }
            >
              {emergencyContacts.length === 0 ? (
                <div className="text-[12.5px] text-slate-500 italic">No emergency contacts added.</div>
              ) : (
                <div className="space-y-2.5">
                  {emergencyContacts.map((c, idx) => (
                    <ContactCard
                      key={c.id}
                      contact={c}
                      onChange={(patch) => setEmergencyContacts(arr => arr.map((x, i) => i === idx ? { ...x, ...patch } : x))}
                      onRemove={() => setEmergencyContacts(arr => arr.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              )}
            </Section>
          </React.Fragment>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
        <div className="text-[11.5px] text-slate-500">
          {canSubmit ? "Ready to add" : "Fill in required fields (*)"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.plus size={12}/>} onClick={handleSubmit} disabled={!canSubmit}>
            Add patient
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, right, children }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-700">{title}</div>
          {subtitle && <div className="text-[11.5px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        {children}
      </div>
    </div>
  );
}

function InsuranceCard({ insurance, index, total, onChange, onSetPrimary, onRemove }) {
  return (
    <div className={cx(
      "rounded-lg border p-2.5 transition",
      insurance.primary && total > 1 ? "border-sky-300 bg-sky-50/40" : "border-slate-200 bg-slate-50/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Insurance {index + 1}
          {total > 1 && insurance.primary && (
            <span className="ml-2 text-[10px] text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded normal-case tracking-normal">Primary</span>
          )}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove}
            className="text-[11.5px] text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md flex items-center gap-1">
            <Icon.close size={12}/> Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Field label="Provider">
          <Input value={insurance.provider} onChange={(e) => onChange({ provider: e.target.value })} placeholder="GNP Seguros, AXA…" />
        </Field>
        <Field label="Policy number">
          <Input value={insurance.policy} onChange={(e) => onChange({ policy: e.target.value })} placeholder="POL-2026-…" />
        </Field>
        <Field label="Group #">
          <Input value={insurance.group} onChange={(e) => onChange({ group: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Policy holder">
          <Input value={insurance.holder} onChange={(e) => onChange({ holder: e.target.value })} placeholder="If different from patient" />
        </Field>
      </div>
      {total > 1 && (
        <button
          type="button"
          onClick={onSetPrimary}
          className={cx(
            "text-[11.5px] font-medium px-2 py-1 rounded-md transition flex items-center gap-1.5",
            insurance.primary
              ? "bg-sky-500 text-white"
              : "text-slate-600 hover:bg-slate-200/60"
          )}
        >
          <span className={cx(
            "size-3.5 rounded-full border-2 flex items-center justify-center",
            insurance.primary ? "border-white bg-white" : "border-slate-400"
          )}>
            {insurance.primary && <span className="size-1.5 rounded-full bg-sky-500" />}
          </span>
          {insurance.primary ? "Primary insurance" : "Set as primary"}
        </button>
      )}
    </div>
  );
}

function ContactCard({ contact, primary = false, onChange, onSetPrimary, onRemove }) {
  return (
    <div className={cx(
      "rounded-lg border p-2.5 transition",
      primary ? "border-sky-300 bg-sky-50/40" : "border-slate-200 bg-slate-50/30"
    )}>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Field label="Name">
          <Input value={contact.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Full name" />
        </Field>
        <Field label="Relation">
          <Select
            value={contact.relation}
            onChange={(v) => onChange({ relation: v })}
            options={RELATIONS.map(r => ({ value: r, label: r }))}
          />
        </Field>
        <Field label="Email">
          <Input value={contact.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="name@example.com" />
        </Field>
        <Field label="Phone">
          <Input value={contact.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+52 …" />
        </Field>
      </div>
      <div className="flex items-center justify-between">
        {onSetPrimary ? (
          <button
            type="button"
            onClick={onSetPrimary}
            className={cx(
              "text-[11.5px] font-medium px-2 py-1 rounded-md transition flex items-center gap-1.5",
              primary
                ? "bg-sky-500 text-white"
                : "text-slate-600 hover:bg-slate-200/60"
            )}
          >
            <span className={cx(
              "size-3.5 rounded-full border-2 flex items-center justify-center",
              primary ? "border-white bg-white" : "border-slate-400"
            )}>
              {primary && <span className="size-1.5 rounded-full bg-sky-500" />}
            </span>
            {primary ? "Primary contact" : "Set as primary"}
          </button>
        ) : <span />}
        {onRemove && (
          <button type="button" onClick={onRemove}
            className="text-[11.5px] text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md flex items-center gap-1">
            <Icon.close size={12}/> Remove
          </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SearchScreen, NewAppointmentDialog });
