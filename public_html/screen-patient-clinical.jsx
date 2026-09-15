// ═══════════════════════════════════════════════════════════════
// Clinical-history governance for the Patient 360 view
//   · Provenance (who + which org added each allergy / condition)
//   · Cross-org items are read-only (no delete) — you annotate instead
//   · Annotations are attributed, timestamped & shared across clinics
//   · Items can be pinned into the compiled Patient 360° report
//   Exposes: window.useClinicalRecord, window.Patient360Report,
//            window.ClinicalListCard, window.LockIcon, window.PinIcon
// ═══════════════════════════════════════════════════════════════

// ── tiny inline glyphs the shared Icon set doesn't have ──
function LockIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function PinIcon({ size = 14, filled = false }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 2 2.6 6.5L21 9.3l-5 4.4L17.5 21 12 17.3 6.5 21 8 13.7l-5-4.4 6.4-.8z" />
    </svg>
  );
}

// External organizations whose records appear in this patient's chart.
const EXTERNAL_ORGS = [
  { name: "Sunrise Children's Hospital", short: "Sunrise", author: "Dr. Priya Nair" },
  { name: "Hospital Ángeles",            short: "H. Ángeles", author: "Dr. Renata Cruz" },
];

// May 27, 2026 — the demo "today".
const REC_TODAY = new Date(2026, 4, 27);
const daysAgoStr = (n) => {
  const d = new Date(REC_TODAY); d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─────────────────────────────────────────────────────────────
// useClinicalRecord — owns allergies + conditions with provenance,
// annotations and 360° inclusion. Lifted to PatientScreen so both the
// Clinical tab and the 360° report read the same source of truth.
// ─────────────────────────────────────────────────────────────
function useClinicalRecord(patient, currentUser, currentOrg) {
  const seed = React.useCallback((names, kind, defaultDetail) => {
    return (names || []).map((name, i) => {
      const h = patHash(patient.id, (kind === "allergy" ? 100 : 200) + i);
      // First entry of each list is seeded as a verified external record so the
      // read-only / annotate behavior is visible out of the box.
      const isExternal = i === 0 && (names.length > 1);
      const ext = EXTERNAL_ORGS[h % EXTERNAL_ORGS.length];
      const addedDays = 60 + (h % 400);
      const base = {
        id: `${kind}-${patHash(patient.id, 300 + i)}-${i}`,
        kind,
        name,
        detail: defaultDetail,
        severity: "Active",
        in360: true,
        comments: [],
      };
      if (isExternal) {
        return {
          ...base,
          org: ext.name,
          orgShort: ext.short,
          author: ext.author,
          addedAt: daysAgoStr(addedDays),
          external: true,
          comments: [{
            id: `cm-${base.id}`,
            author: "Dr. Miguel Soto",
            org: currentOrg,
            at: daysAgoStr(addedDays - 30),
            text: kind === "allergy"
              ? "Parent reports the reaction has been milder since 2025. Recommend re-test before next surgical clearance."
              : "Reviewed at well-child visit — well controlled on current plan. No medication change.",
          }],
        };
      }
      return {
        ...base,
        org: currentOrg,
        orgShort: "This clinic",
        author: i === 1 ? "Dr. Miguel Soto" : "Lourdes Méndez, RN",
        addedAt: daysAgoStr(addedDays),
        external: false,
      };
    });
  }, [patient.id, currentOrg]);

  const [allergies, setAllergies] = React.useState(() =>
    seed(patient.allergies, "allergy", "Reaction not specified"));
  const [conditions, setConditions] = React.useState(() =>
    seed(patient.chronicCare, "condition", "Ongoing management"));

  const setterFor = (kind) => (kind === "allergy" ? setAllergies : setConditions);

  const addItem = (kind, name, detail) => {
    const setter = setterFor(kind);
    setter(prev => {
      if (prev.some(x => x.name.toLowerCase() === name.trim().toLowerCase())) return prev;
      return [...prev, {
        id: `${kind}-new-${Date.now()}`,
        kind,
        name: name.trim(),
        detail,
        severity: "Active",
        org: currentOrg,
        orgShort: "This clinic",
        author: currentUser,
        addedAt: daysAgoStr(0),
        external: false,
        in360: true,
        comments: [],
      }];
    });
  };

  // Only this clinic's own items can be removed; external entries are protected.
  const removeItem = (kind, id) => {
    setterFor(kind)(prev => prev.filter(x => x.id !== id || x.external));
  };

  const addComment = (kind, id, text) => {
    if (!text || !text.trim()) return;
    setterFor(kind)(prev => prev.map(x => x.id === id ? {
      ...x,
      comments: [...x.comments, {
        id: `cm-${Date.now()}`,
        author: currentUser,
        org: currentOrg,
        at: daysAgoStr(0),
        text: text.trim(),
      }],
    } : x));
  };

  const toggle360 = (kind, id) => {
    setterFor(kind)(prev => prev.map(x => x.id === id ? { ...x, in360: !x.in360 } : x));
  };

  return { allergies, conditions, currentUser, currentOrg, addItem, removeItem, addComment, toggle360 };
}

// ─────────────────────────────────────────────────────────────
// Patient360Report — printable compiled record. Pulls every item
// flagged `in360`, with provenance + the cross-clinic annotation
// timeline. Wired to the chart's Print button.
// ─────────────────────────────────────────────────────────────
function Patient360Report({ open, onClose, patient, record, currentOrg }) {
  if (!open) return null;

  const sections = [
    { key: "allergy",   title: "Allergies",    items: record.allergies.filter(i => i.in360),  accent: "#E11D48" },
    { key: "condition", title: "Chronic care", items: record.conditions.filter(i => i.in360), accent: "#D97706" },
  ];
  const totalPinned = sections.reduce((n, s) => n + s.items.length, 0);
  const totalNotes  = sections.reduce((n, s) => n + s.items.reduce((m, i) => m + i.comments.length, 0), 0);
  const age = (window.calcAgeFromDob && window.calcAgeFromDob(patient.dob));

  return ReactDOM.createPortal(
    <div className="p360-print-overlay fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto py-8">
      <style>{`
        @media print {
          body > #root { display: none !important; }
          .p360-print-overlay { position: static !important; overflow: visible !important; padding: 0 !important; }
          .p360-backdrop { display: none !important; }
          .p360-no-print { display: none !important; }
          .p360-print-card { box-shadow: none !important; border: none !important; width: 100% !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; }
        }
      `}</style>
      <div className="p360-backdrop absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="p360-print-card relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[820px] max-w-[92vw] overflow-hidden my-auto">
        {/* Toolbar (screen only) */}
        <div className="p360-no-print flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Icon.sparkles size={15}/></div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900 leading-tight">Patient 360° report</div>
              <div className="text-[11.5px] text-slate-500">{totalPinned} pinned entries · {totalNotes} shared annotations</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon={<Icon.print size={13}/>} onClick={() => window.print()}>Print / PDF</Button>
            <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500"><Icon.close size={16}/></button>
          </div>
        </div>

        {/* Document body */}
        <div className="px-8 py-7 max-h-[72vh] overflow-y-auto p360-doc">
          {/* Letterhead */}
          <div className="flex items-start justify-between pb-5 border-b border-slate-200">
            <div>
              <div className="text-[20px] font-bold text-slate-900 leading-none">{patient.name}</div>
              <div className="mt-1.5 text-[12.5px] text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="font-mono">{patient.mrn}</span><span>·</span>
                <span>DOB {patient.dob}</span>
                {age && (<><span>·</span><span>{window.formatAge ? window.formatAge(age) : `${age.years} yrs`}</span></>)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                <span className="logo-mark" style={{ width: 16, height: 16 }} /> Narzim 360°
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Compiled {daysAgoStr(0)}</div>
              <div className="text-[11px] text-slate-500">by {currentOrg}</div>
            </div>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
            This report compiles clinical entries from every participating clinic. Entries are attributed to their
            originating organization and are read-only outside it — annotations are added without altering the source record.
          </p>

          {sections.map((s) => (
            <div key={s.key} className="mt-7">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.accent }} />
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-700">{s.title}</h3>
                <span className="text-[11px] text-slate-400">{s.items.length}</span>
              </div>

              {s.items.length === 0 ? (
                <div className="text-[12.5px] text-slate-400 italic">No entries pinned to this report.</div>
              ) : (
                <div className="space-y-4">
                  {s.items.map((it) => (
                    <div key={it.id} className="break-inside-avoid">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-[14px] font-semibold text-slate-900">{it.name}</div>
                        <div className="text-[11px] text-slate-400 shrink-0">{it.detail}</div>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-slate-500">
                        {it.external ? "Verified by " : "Recorded by "}
                        <span className="font-medium text-slate-700">{it.author}</span> · {it.org} · {it.addedAt}
                      </div>

                      {it.comments.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-2">
                          {it.comments.map((c) => (
                            <div key={c.id} className="text-[12px]">
                              <div className="text-slate-700 leading-snug">{c.text}</div>
                              <div className="text-[10.5px] text-slate-400 mt-0.5">— {c.author}, {c.org} · {c.at}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="mt-8 pt-4 border-t border-slate-200 text-[10.5px] text-slate-400 leading-relaxed">
            Generated by Narzim for {currentOrg}. Annotations are visible to all participating clinics. Originating
            organizations retain control of their source entries; this document does not modify them.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { useClinicalRecord, Patient360Report, LockIcon, PinIcon });
