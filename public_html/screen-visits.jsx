// Visits tab — split into Today (active) and Past (completed / cancelled / rescheduled).
// Row click opens an in-tab detail panel:
//  • Today: today's vitals + clinical summary + Start encounter CTA.
//  • Past completed: official-letterhead-style report with View report,
//    Download PDF, Share via WhatsApp / Email, and View invoice actions.
//  • Past cancelled / rescheduled: compact reason card.

function VisitsTab({ patient, role = "frontdesk" }) {
  const { VISITS, PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const [selected, setSelected] = React.useState(null); // visit object
  const [reportFor, setReportFor] = React.useState(null);
  const [invoiceFor, setInvoiceFor] = React.useState(null);

  const today = VISITS.filter(v => v.status === "Today");
  const past  = VISITS.filter(v => v.status !== "Today");

  const STATUS_STYLES = {
    Today:       { bg:"#DBEAFE", text:"#1E40AF" },
    Completed:   { bg:"#D1FAE5", text:"#065F46" },
    Cancelled:   { bg:"#FECACA", text:"#991B1B" },
    Rescheduled: { bg:"#FEF3C7", text:"#92400E" },
  };

  const renderRow = (v) => {
    const p = PRACTITIONERS.find(x => x.id === v.pract);
    return (
      <div
        key={`${v.date}-${v.type}`}
        onClick={() => setSelected(v)}
        className="grid items-center px-5 py-3 text-[13px] hover:bg-sky-50/40 cursor-pointer transition"
        style={{ gridTemplateColumns: "1.2fr 1.3fr 1.6fr 2.6fr 1fr" }}
      >
        <div className="text-slate-900 font-medium">
          <div>{v.date}</div>
          {v.time && <div className="text-[11px] text-slate-500">{v.time}</div>}
        </div>
        <div className="text-slate-700">{v.type}</div>
        <div className="flex items-center gap-2 min-w-0">
          {p?.avatar
            ? <img src={p.avatar} className="size-6 rounded-full object-cover shrink-0" />
            : <div className="size-6 rounded-full text-[9px] text-white flex items-center justify-center font-semibold shrink-0" style={{ background: p?.color || "#94a3b8" }}>{p?.initials}</div>}
          <span className="text-slate-700 truncate">{p?.name}</span>
        </div>
        <div className="text-slate-600 truncate">{v.summary}</div>
        <div className="text-right">
          <Badge color={STATUS_STYLES[v.status] || STATUS_STYLES.Completed}>{v.status}</Badge>
        </div>
      </div>
    );
  };

  const headerRow = (
    <div className="grid items-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 px-5 py-2.5 bg-slate-50/70 border-b border-slate-100"
      style={{ gridTemplateColumns: "1.2fr 1.3fr 1.6fr 2.6fr 1fr" }}
    >
      <div>Date</div>
      <div>Type</div>
      <div>Practitioner</div>
      <div>Summary</div>
      <div className="text-right">Status</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Today / Ongoing */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/70 flex items-center justify-between">
          <SectionHeader title="Today" sub={today.length ? "Active visit — click to open" : "No active visit"} />
          <Badge color={today.length ? { bg:"#DBEAFE", text:"#1E40AF" } : { bg:"#F1F5F9", text:"#475569" }}>
            {today.length} active
          </Badge>
        </div>
        {today.length > 0 && (
          <React.Fragment>
            {headerRow}
            <div className="divide-y divide-slate-100">{today.map(renderRow)}</div>
          </React.Fragment>
        )}
        {today.length === 0 && (
          <div className="px-5 py-6 text-center text-slate-500 text-[12.5px] italic">No appointment scheduled for today.</div>
        )}
      </Card>

      {/* Past */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/70">
          <SectionHeader title="Past visits" sub={`${past.length} on record · click any row for details`} />
        </div>
        {headerRow}
        <div className="divide-y divide-slate-100">{past.map(renderRow)}</div>
      </Card>

      {selected && (
        <VisitDetailDialog
          visit={selected}
          patient={patient}
          role={role}
          onClose={() => setSelected(null)}
          onViewReport={() => setReportFor(selected)}
          onViewInvoice={() => setInvoiceFor(selected)}
          onStartEncounter={() => {
            setSelected(null);
            // Dispatch a custom event so the host (PatientScreen / App)
            // can launch its encounter flow.
            window.dispatchEvent(new CustomEvent("chavitos:start-encounter", { detail: { patientId: patient.id } }));
          }}
        />
      )}

      {reportFor && (
        <VisitReportOverlay
          visit={reportFor}
          patient={patient}
          onClose={() => setReportFor(null)}
        />
      )}

      {invoiceFor && (
        <VisitInvoiceOverlay
          visit={invoiceFor}
          patient={patient}
          onClose={() => setInvoiceFor(null)}
        />
      )}
    </div>
  );
}

// ── Visit detail modal (compact) ─────────────────────────────
function VisitDetailDialog({ visit, patient, role = "frontdesk", onClose, onViewReport, onViewInvoice, onStartEncounter }) {
  const { PRACTITIONERS, LOCATIONS, MEDICATIONS, IMMUNIZATIONS } = window.CHAVITOS;
  const CAPS = (window.CHAVITOS_ROLES?.[role] || window.CHAVITOS_ROLES?.frontdesk)?.capabilities || {};
  const pr = PRACTITIONERS.find(x => x.id === visit.pract);
  const loc = LOCATIONS[visit.loc];
  const isActive = visit.status === "Today";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[720px] max-h-[88vh] overflow-hidden flex flex-col">
        <div className={cx(
          "flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0",
          isActive ? "bg-gradient-to-r from-sky-50 to-white" : "bg-gradient-to-r from-emerald-50 to-white"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cx("size-8 rounded-lg flex items-center justify-center text-white", isActive ? "bg-sky-500" : "bg-emerald-500")}>
              {isActive ? <Icon.stetho size={14}/> : <Icon.check size={14}/>}
            </div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">{visit.type}</div>
              <div className="text-[11.5px] text-slate-500">{visit.date}{visit.time ? ` · ${visit.time}` : ""} · {pr?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status chips */}
          <div className="flex items-center gap-2 text-[11.5px]">
            <Badge color={
              visit.status === "Today"       ? { bg:"#DBEAFE", text:"#1E40AF" } :
              visit.status === "Completed"   ? { bg:"#D1FAE5", text:"#065F46" } :
              visit.status === "Cancelled"   ? { bg:"#FECACA", text:"#991B1B" } :
              visit.status === "Rescheduled" ? { bg:"#FEF3C7", text:"#92400E" } :
                                               { bg:"#F1F5F9", text:"#475569" }
            }>{visit.status}</Badge>
            {visit.rescheduledTo && (
              <span className="text-slate-500">Rescheduled to <span className="text-slate-700 font-medium">{visit.rescheduledTo}</span></span>
            )}
            {loc && (
              <span className="text-slate-500 ml-auto">{loc.name} · {loc.city}</span>
            )}
          </div>

          {isActive ? (
            <ActiveVisitBody visit={visit} patient={patient} />
          ) : visit.status === "Completed" ? (
            <CompletedVisitBody visit={visit} patient={patient} />
          ) : (
            <SimpleVisitBody visit={visit} />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          {isActive && CAPS.startEncounter && (
            <Button variant="primary" size="sm" icon={<Icon.stetho size={14}/>} onClick={onStartEncounter}>
              Start encounter
            </Button>
          )}
          {!isActive && visit.status === "Completed" && (
            <React.Fragment>
              <Button variant="secondary" size="sm" icon={<Icon.invoice size={12}/>} onClick={onViewInvoice}>View invoice</Button>
              <Button variant="primary" size="sm" icon={<Icon.print size={12}/>} onClick={onViewReport}>View report</Button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Active visit body — today's vitals + clinical summary ────
function ActiveVisitBody({ visit, patient }) {
  const { MEDICATIONS, IMMUNIZATIONS } = window.CHAVITOS;
  const activeMeds = MEDICATIONS.filter(m => m.status === "Active");
  const recentImms = IMMUNIZATIONS.slice(0, 3);

  return (
    <React.Fragment>
      {/* Today's vitals */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Today's vitals (intake)</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Temp",   value: "36.8 °C" },
            { label: "HR",     value: "104 bpm" },
            { label: "Weight", value: "14.5 kg" },
            { label: "Height", value: "100 cm" },
            { label: "SpO₂",   value: "98 %" },
            { label: "BP",     value: "94 / 58" },
            { label: "RR",     value: "22 /min" },
            { label: "Pain",   value: "0 / 10" },
          ].map(v => (
            <div key={v.label} className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100">
              <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold">{v.label}</div>
              <div className="text-[14px] font-bold text-slate-900 mt-0.5">{v.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Reason for visit</div>
          <div className="text-[12.5px] text-slate-800">{visit.reason || visit.summary}</div>
        </div>
        <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
          <div className="text-[10.5px] uppercase tracking-wide text-rose-700 font-semibold mb-1">Allergies</div>
          <div className="text-[12.5px] text-slate-800">{(patient.allergies || []).join(", ") || "No known allergies"}</div>
        </div>
      </div>

      {/* Quick summaries */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryMini
          title="Clinical history"
          icon={<Icon.heart size={12}/>}
          tone="amber"
          items={
            (patient.chronicCare && patient.chronicCare.length > 0)
              ? patient.chronicCare
              : ["No chronic conditions on file"]
          }
        />
        <SummaryMini
          title="Active medications"
          icon={<Icon.pill size={12}/>}
          tone="sky"
          items={
            activeMeds.length
              ? activeMeds.map(m => `${m.name} · ${m.dose}`)
              : ["No active medications"]
          }
        />
        <SummaryMini
          title="Recent immunizations"
          icon={<Icon.syringe size={12}/>}
          tone="emerald"
          items={recentImms.length ? recentImms.map(i => `${i.name} · ${i.date}`) : ["—"]}
        />
      </div>
    </React.Fragment>
  );
}

function SummaryMini({ title, icon, tone, items }) {
  const TONES = {
    sky:     { bg:"bg-sky-50/60",     border:"border-sky-100",     iconBg:"bg-sky-500     text-white" },
    amber:   { bg:"bg-amber-50/60",   border:"border-amber-100",   iconBg:"bg-amber-500   text-white" },
    emerald: { bg:"bg-emerald-50/60", border:"border-emerald-100", iconBg:"bg-emerald-500 text-white" },
  }[tone] || { bg:"bg-slate-50", border:"border-slate-200", iconBg:"bg-slate-400 text-white" };
  return (
    <div className={cx("p-3 rounded-xl border", TONES.bg, TONES.border)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cx("size-6 rounded-md flex items-center justify-center", TONES.iconBg)}>{icon}</span>
        <span className="text-[10.5px] uppercase tracking-wide text-slate-700 font-semibold">{title}</span>
      </div>
      <ul className="space-y-0.5">
        {items.slice(0, 4).map((it, i) => (
          <li key={i} className="text-[12px] text-slate-700 truncate">• {it}</li>
        ))}
      </ul>
    </div>
  );
}

function CompletedVisitBody({ visit, patient }) {
  const n = visit.notes || {};
  return (
    <div className="space-y-3">
      <KV label="Chief complaint" value={n.chief || visit.reason || visit.summary} />
      <KV label="Examination findings" value={n.exam || "—"} />
      <div className="grid grid-cols-2 gap-3">
        <KV label="Diagnosis" value={n.dx || "—"} />
        <KV label="Plan" value={n.plan || "—"} />
      </div>
      {n.rx && n.rx.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Prescribed</div>
          <ul className="text-[12.5px] text-slate-700 space-y-1">
            {n.rx.map((r, i) => <li key={i}>• {r.name} — <span className="text-slate-500">{r.dose}</span></li>)}
          </ul>
        </div>
      )}
      {n.imms && n.imms.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Immunizations administered</div>
          <ul className="text-[12.5px] text-slate-700 space-y-1">
            {n.imms.map((m, i) => <li key={i}>• {m.name} — lot {m.lot}, {m.site}</li>)}
          </ul>
        </div>
      )}
      {n.next && <KV label="Next steps" value={n.next} />}
    </div>
  );
}

function SimpleVisitBody({ visit }) {
  const tone = visit.status === "Cancelled" ? "rose" : "amber";
  const t = tone === "rose" ? "bg-rose-50/60 border-rose-100 text-rose-900" : "bg-amber-50/60 border-amber-100 text-amber-900";
  return (
    <div className={cx("p-4 rounded-xl border", t)}>
      <div className="text-[13px] font-semibold mb-1">
        {visit.status === "Cancelled" ? "Appointment cancelled" : "Appointment rescheduled"}
      </div>
      <div className="text-[12.5px]">{visit.summary}</div>
      {visit.rescheduledTo && (
        <div className="text-[12.5px] mt-1">New date: <span className="font-semibold">{visit.rescheduledTo}</span></div>
      )}
    </div>
  );
}

// ── Letterhead-style report overlay ──────────────────────────
function VisitReportOverlay({ visit, patient, onClose }) {
  const { PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const pr = PRACTITIONERS.find(x => x.id === visit.pract);
  const loc = LOCATIONS[visit.loc];
  const [shareOpen, setShareOpen] = React.useState(null); // 'whatsapp' | 'email' | null
  const [downloaded, setDownloaded] = React.useState(false);

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 w-[860px] max-h-[92vh] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center"><Icon.print size={14}/></div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900 leading-tight">Visit report</div>
              <div className="text-[11.5px] text-slate-500">{patient.name} · {visit.date}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Icon.download size={12}/>} onClick={handleDownload}>
              {downloaded ? "Downloaded" : "Download PDF"}
            </Button>
            <Button variant="ghost" size="sm" icon={<Icon.phone size={12}/>} onClick={() => setShareOpen("whatsapp")}>WhatsApp</Button>
            <Button variant="ghost" size="sm" icon={<Icon.mail size={12}/>} onClick={() => setShareOpen("email")}>Email</Button>
            <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
          </div>
        </div>

        {/* Letterhead */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex items-start justify-center">
          <div className="bg-white shadow-xl border border-slate-200 w-full max-w-[760px] mx-auto">
            {/* Header */}
            <div className="px-10 py-6 border-b-[3px] border-double border-sky-600 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={(window.__resources&&window.__resources.chavitosLogo)||"assets/chavitos-logo.png"} alt="Chavitos" className="h-14 w-auto" />
                <div>
                  <div className="text-[18px] font-bold text-sky-700 tracking-tight">Chavitos Clinic</div>
                  <div className="text-[10.5px] text-slate-600 leading-snug">{loc?.name || "Pediatric Care Center"}</div>
                  <div className="text-[10.5px] text-slate-500 leading-snug">{loc?.city || "Mérida, Yucatán, Mexico"}</div>
                </div>
              </div>
              <div className="text-right">
                {pr?.avatar
                  ? <img src={pr.avatar} className="size-14 rounded-full object-cover ml-auto border-2 border-white shadow-sm" />
                  : <div className="size-14 rounded-full ml-auto flex items-center justify-center text-[16px] font-bold text-white shadow-sm" style={{ background: pr?.color }}>{pr?.initials}</div>}
                <div className="mt-1 text-[12.5px] font-semibold text-slate-900">{pr?.name}</div>
                <div className="text-[10px] text-slate-500">{pr?.department || pr?.role}</div>
              </div>
            </div>

            {/* Patient block */}
            <div className="px-10 pt-5 pb-3 grid grid-cols-4 gap-4 text-[11px]">
              <div><div className="text-slate-500 uppercase tracking-wide font-semibold">Patient</div><div className="text-slate-900 text-[12.5px] font-medium">{patient.name}</div></div>
              <div><div className="text-slate-500 uppercase tracking-wide font-semibold">MRN</div><div className="text-slate-900 font-mono">{patient.mrn}</div></div>
              <div><div className="text-slate-500 uppercase tracking-wide font-semibold">DOB</div><div className="text-slate-900">{patient.dob}</div></div>
              <div><div className="text-slate-500 uppercase tracking-wide font-semibold">Visit date</div><div className="text-slate-900">{visit.date}{visit.time ? `, ${visit.time}` : ""}</div></div>
            </div>

            {/* Title */}
            <div className="px-10 pt-5">
              <div className="text-[10px] uppercase tracking-[0.16em] text-sky-700 font-bold">Clinical Visit Summary</div>
              <h2 className="text-[20px] font-bold text-slate-900 leading-tight">{visit.type}</h2>
              <div className="text-[12px] text-slate-500 italic mt-0.5">{visit.summary}</div>
            </div>

            {/* Body */}
            <div className="px-10 pt-5 pb-8 space-y-4 text-[12.5px] text-slate-800 leading-relaxed">
              <ReportSection title="Chief complaint">
                {visit.notes?.chief || visit.reason || visit.summary}
              </ReportSection>
              <ReportSection title="Examination findings">
                {visit.notes?.exam || "Vitals stable. No acute findings on exam."}
              </ReportSection>
              <div className="grid grid-cols-2 gap-5">
                <ReportSection title="Assessment / Diagnosis">
                  {visit.notes?.dx || "—"}
                </ReportSection>
                <ReportSection title="Plan">
                  {visit.notes?.plan || "—"}
                </ReportSection>
              </div>
              {(visit.notes?.rx?.length > 0) && (
                <ReportSection title="Prescribed medications">
                  <ul className="space-y-1 mt-1">
                    {visit.notes.rx.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-sky-700 font-bold">℞</span>
                        <span><span className="font-semibold">{r.name}</span> — {r.dose}</span>
                      </li>
                    ))}
                  </ul>
                </ReportSection>
              )}
              {(visit.notes?.imms?.length > 0) && (
                <ReportSection title="Immunizations administered">
                  <ul className="space-y-1 mt-1">
                    {visit.notes.imms.map((m, i) => (
                      <li key={i}>• <span className="font-semibold">{m.name}</span> — lot {m.lot}, {m.site}</li>
                    ))}
                  </ul>
                </ReportSection>
              )}
              {visit.notes?.next && (
                <ReportSection title="Follow-up / Next steps">
                  {visit.notes.next}
                </ReportSection>
              )}
            </div>

            {/* Signature */}
            <div className="px-10 pt-2 pb-8 flex items-end justify-between">
              <div>
                <div className="text-[10.5px] text-slate-500 uppercase tracking-wide font-semibold">Issued</div>
                <div className="text-[12px] text-slate-800">{visit.date}{visit.time ? `, ${visit.time}` : ""}</div>
              </div>
              <div className="text-right">
                <div className="font-serif italic text-[22px] text-slate-700 leading-none mb-1" style={{ fontFamily: '"Brush Script MT","Lucida Handwriting",cursive' }}>
                  {pr?.name.replace(/^Dra?\.\s*/, "")}
                </div>
                <div className="w-56 border-t border-slate-400"></div>
                <div className="text-[11px] text-slate-700 mt-1">{pr?.name}</div>
                <div className="text-[10.5px] text-slate-500">{pr?.department || pr?.role} · ProfLic. {pr?.id.toUpperCase()}-{patHash(pr?.id, 7) % 99999}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[10px] text-slate-500">
              <span>Chavitos Clinic · {loc?.city || "Mérida, Yucatán, Mexico"} · +52 999 123 4567</span>
              <span>This document is generated by Narzim EHR · For medical use only</span>
            </div>
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareDialog
          channel={shareOpen}
          patient={patient}
          visit={visit}
          onClose={() => setShareOpen(null)}
        />
      )}
    </div>,
    document.body
  );
}

function ReportSection({ title, children }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-sky-700 font-bold mb-1.5">{title}</div>
      <div className="text-[12.5px] text-slate-800">{children}</div>
    </div>
  );
}

function ShareDialog({ channel, patient, visit, onClose }) {
  const isWa = channel === "whatsapp";
  const [to, setTo] = React.useState(isWa ? (patient.phone || "") : (patient.email || ""));
  const defaultBody = `Hi ${patient.guardian || patient.name}, here is the report from ${patient.name}'s visit on ${visit.date} at Chavitos Clinic. Please reply if you have any questions.\n\n— Chavitos Clinic`;
  const [body, setBody] = React.useState(defaultBody);
  const [sent, setSent] = React.useState(false);

  const handleSend = () => {
    setSent(true);
    setTimeout(() => onClose(), 1200);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[480px] overflow-hidden">
        <div className={cx(
          "flex items-center justify-between px-5 py-3.5 border-b border-slate-200",
          isWa ? "bg-gradient-to-r from-emerald-50 to-white" : "bg-gradient-to-r from-sky-50 to-white"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cx("size-8 rounded-lg flex items-center justify-center text-white", isWa ? "bg-emerald-500" : "bg-sky-500")}>
              {isWa ? <Icon.phone size={14}/> : <Icon.mail size={14}/>}
            </div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">
                {isWa ? "Share via WhatsApp" : "Share via Email"}
              </div>
              <div className="text-[11.5px] text-slate-500">PDF report will be attached</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label={isWa ? "Phone number" : "Email address"}>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={isWa ? "+52 999 …" : "name@example.com"} />
          </Field>
          {!isWa && (
            <Field label="Subject">
              <Input defaultValue={`Visit report — ${patient.name} · ${visit.date}`} />
            </Field>
          )}
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition resize-none"
            />
          </Field>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <Icon.print size={14}/>
            <div className="text-[12px] text-slate-700">
              <span className="font-semibold">visit-report-{visit.date.replace(/[,\s]+/g, "-")}.pdf</span>
              <span className="text-slate-500 ml-2">· 1 page · letterhead format</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} disabled={!to.trim() || sent} onClick={handleSend}>
            {sent ? "Sent ✓" : (isWa ? "Send via WhatsApp" : "Send email")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Invoice overlay (lightweight, reuses letterhead pattern) ─
function VisitInvoiceOverlay({ visit, patient, onClose }) {
  const { PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const pr = PRACTITIONERS.find(x => x.id === visit.pract);
  const loc = LOCATIONS[visit.loc];
  // Deterministic line items per visit type
  const lineItems = (() => {
    const items = [];
    if (visit.type === "Well-child visit") {
      items.push({ desc: "Consultation — well-child exam", qty: 1, unit: 850 });
      items.push({ desc: "Developmental screening",        qty: 1, unit: 350 });
      items.push({ desc: "Growth & nutrition counseling",  qty: 1, unit: 200 });
    } else if (visit.type === "Sick visit") {
      items.push({ desc: "Consultation — acute illness",   qty: 1, unit: 750 });
      items.push({ desc: "Rapid strep test",               qty: 1, unit: 280 });
    } else if (visit.type === "Vaccination") {
      items.push({ desc: "Vaccine administration fee",     qty: 1, unit: 200 });
      items.push({ desc: "MMR booster (1 dose)",           qty: 1, unit: 950 });
    } else {
      items.push({ desc: visit.type,                       qty: 1, unit: 600 });
    }
    return items;
  })();
  const subtotal = lineItems.reduce((s, it) => s + it.qty * it.unit, 0);
  const tax = Math.round(subtotal * 0.16);
  const total = subtotal + tax;
  const invoiceNo = `INV-2026-${String(patHash(visit.date + visit.type, 11) % 9000 + 1000)}`;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 w-[760px] max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><Icon.invoice size={14}/></div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900 leading-tight">Invoice</div>
              <div className="text-[11.5px] text-slate-500">{invoiceNo} · {patient.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Icon.download size={12}/>}>Download PDF</Button>
            <Button variant="ghost" size="sm" icon={<Icon.mail size={12}/>}>Email</Button>
            <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex items-start justify-center">
          <div className="bg-white shadow-xl border border-slate-200 w-full max-w-[680px] mx-auto">
            <div className="px-10 py-6 border-b-[3px] border-double border-orange-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={(window.__resources&&window.__resources.chavitosLogo)||"assets/chavitos-logo.png"} alt="Chavitos" className="h-12 w-auto" />
                <div>
                  <div className="text-[16px] font-bold text-orange-700 tracking-tight">Chavitos Clinic</div>
                  <div className="text-[10.5px] text-slate-600">{loc?.name}</div>
                  <div className="text-[10.5px] text-slate-500">{loc?.city}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.14em] text-orange-700 font-bold">Invoice</div>
                <div className="text-[16px] font-bold font-mono text-slate-900">{invoiceNo}</div>
                <div className="text-[11px] text-slate-500">Issued {visit.date}</div>
              </div>
            </div>
            <div className="px-10 py-5 grid grid-cols-2 gap-6 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Bill to</div>
                <div className="text-slate-900 font-semibold">{patient.guardian || patient.name}</div>
                <div className="text-slate-600">{patient.phone}</div>
                <div className="text-slate-600">{patient.email}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Visit</div>
                <div className="text-slate-900 font-semibold">{visit.type}</div>
                <div className="text-slate-600">{visit.date}{visit.time ? `, ${visit.time}` : ""}</div>
                <div className="text-slate-600">{pr?.name}</div>
              </div>
            </div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50/50 text-[10.5px] uppercase tracking-wide text-slate-600">
                  <th className="px-10 py-2 text-left font-semibold">Description</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit</th>
                  <th className="px-10 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-10 py-2.5 text-slate-800">{it.desc}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{it.qty}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700 font-mono">${it.unit.toLocaleString()}</td>
                    <td className="px-10 py-2.5 text-right text-slate-900 font-mono">${(it.qty * it.unit).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-10 py-4 flex justify-end">
              <div className="w-64 space-y-1 text-[12.5px]">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono text-slate-800">${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IVA (16%)</span><span className="font-mono text-slate-800">${tax.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1">
                  <span className="text-slate-900 font-bold">Total (MXN)</span>
                  <span className="font-mono font-bold text-orange-700">${total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="px-10 py-4 border-t border-slate-200 bg-slate-50 text-[10.5px] text-slate-500 flex items-center justify-between">
              <span>Chavitos Clinic · RFC: CHA-260101-A1B</span>
              <span>Payable within 30 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { VisitsTab, VisitDetailDialog, VisitReportOverlay, VisitInvoiceOverlay });
