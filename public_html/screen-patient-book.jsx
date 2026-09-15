// Patient Book — searchable, filterable directory of all patients.

// Resolve a patient's last activity OR upcoming appointment into a small
// display object: { kind, title, sub, tone }
function patientLastActivity(p, helpers) {
  const { LOCATIONS, PRACTITIONERS } = helpers;
  const loc = LOCATIONS[p.loc];
  const pr  = PRACTITIONERS.find(x => x.id === p.pract);
  const where = pr ? `${pr.name.replace(/^Dra?\. /, "Dr. ")}` : "";

  // Prefer the richer activity object if present.
  const a = p.activity;
  if (a?.kind === "upcoming") {
    const inLabel = a.daysAhead === 1 ? "Tomorrow" :
                    a.daysAhead <= 7  ? `in ${a.daysAhead} days` :
                    a.daysAhead <= 14 ? "Next week" :
                    a.daysAhead <= 30 ? `in ${a.daysAhead} days` :
                    `in ${Math.round(a.daysAhead/30)} months`;
    return { kind: "upcoming", title: "Upcoming appointment", sub: `${a.date} · ${a.time} · ${a.type}${where ? ` · ${where}` : ""}`, badge: inLabel, tone: "sky" };
  }
  if (a?.kind === "past") {
    const ago = a.daysAgo < 7  ? `${a.daysAgo} day${a.daysAgo===1?'':'s'} ago` :
                a.daysAgo < 28 ? `${Math.round(a.daysAgo/7)} week${Math.round(a.daysAgo/7)===1?'':'s'} ago` :
                a.daysAgo < 365? `${Math.round(a.daysAgo/30)} month${Math.round(a.daysAgo/30)===1?'':'s'} ago` :
                                 `${Math.round(a.daysAgo/365)} year${Math.round(a.daysAgo/365)===1?'':'s'} ago`;
    const recent = a.daysAgo < 30;
    return { kind: "completed", title: `Last visit · ${ago}`, sub: `${a.date} · ${a.type || "Visit"}${where ? ` · ${where}` : ""}`, tone: recent ? "amber" : "slate" };
  }
  if (a?.kind === "none") {
    return { kind: "none", title: "No appointments yet", sub: "Newly enrolled · invite to schedule", tone: "violet" };
  }

  // Fall back to today's appointment status
  const when = `Today · ${p.time}`;
  switch (p.status) {
    case "Scheduled":
    case "Confirmed":
      return { kind: "upcoming", title: "Upcoming appointment", sub: `${when}${where ? ` · ${where}` : ""}`, badge: "Today", tone: "sky" };
    case "Checked-in":
      return { kind: "current", title: "Checked-in today", sub: `Arrived ${p.time}${where ? ` · ${where}` : ""}`, badge: "Now", tone: "cyan" };
    case "Ready for Provider":
      return { kind: "current", title: "Ready for provider", sub: `Today · ${p.time}${where ? ` · ${where}` : ""}`, badge: "Now", tone: "emerald" };
    case "Checked-out":
      return { kind: "completed", title: "Visit completed today", sub: `${p.time}${where ? ` · ${where}` : ""}`, tone: "amber" };
    case "No Show":
      return { kind: "noshow", title: "No-show today", sub: `${p.time}${where ? ` · ${where}` : ""}`, tone: "rose" };
    case "Cancelled":
      return { kind: "cancelled", title: "Appointment cancelled", sub: `${p.time}${where ? ` · ${where}` : ""}`, tone: "slate" };
    default:
      return { kind: "none", title: "No recent activity", sub: "", tone: "slate" };
  }
}

function LastActivityCell({ patient }) {
  const { LOCATIONS, PRACTITIONERS } = window.CHAVITOS;
  const a = patientLastActivity(patient, { LOCATIONS, PRACTITIONERS });
  const TONES = {
    sky:     { bg: "bg-sky-50",     ring: "ring-sky-200/70",     icon: "bg-sky-500     text-white", badge: "bg-sky-100 text-sky-800" },
    cyan:    { bg: "bg-cyan-50",    ring: "ring-cyan-200/70",    icon: "bg-cyan-500    text-white", badge: "bg-cyan-100 text-cyan-800" },
    emerald: { bg: "bg-emerald-50", ring: "ring-emerald-200/70", icon: "bg-emerald-500 text-white", badge: "bg-emerald-100 text-emerald-800" },
    amber:   { bg: "bg-amber-50",   ring: "ring-amber-200/70",   icon: "bg-amber-500   text-white", badge: "bg-amber-100 text-amber-800" },
    rose:    { bg: "bg-rose-50",    ring: "ring-rose-200/70",    icon: "bg-rose-500    text-white", badge: "bg-rose-100 text-rose-800" },
    slate:   { bg: "bg-slate-50",   ring: "ring-slate-200/70",   icon: "bg-slate-400   text-white", badge: "bg-slate-200 text-slate-700" },
    violet:  { bg: "bg-violet-50",  ring: "ring-violet-200/70",  icon: "bg-violet-500  text-white", badge: "bg-violet-100 text-violet-800" },
  };
  const t = TONES[a.tone] || TONES.slate;

  const ICONS = {
    upcoming:  (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
    current:   (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
    completed: (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
    noshow:    (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 8 0"/></svg>),
    cancelled: (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
    none:      (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>),
  };

  return (
    <div className={cx("inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg ring-1", t.bg, t.ring, "min-w-0 max-w-full")}>
      <div className={cx("size-7 rounded-md flex items-center justify-center shrink-0", t.icon)}>
        {ICONS[a.kind] || ICONS.none}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="text-[12px] font-semibold text-slate-900 truncate leading-tight">{a.title}</div>
          {a.badge && (
            <span className={cx("text-[9.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0", t.badge)}>{a.badge}</span>
          )}
        </div>
        {a.sub && (
          <div className="text-[10.5px] text-slate-600 leading-tight truncate">{a.sub}</div>
        )}
      </div>
    </div>
  );
}

function PatientBookScreen({ onClose, onOpenPatient }) {
  const { PATIENTS, LOCATIONS, PRACTITIONERS, STATUS_STYLES } = window.CHAVITOS;
  const [q, setQ] = React.useState("");
  const [tab, setTab] = React.useState("all"); // all | new | hasInsurance | minors

  const data = React.useMemo(() => {
    let rows = PATIENTS;
    if (tab === "new")      rows = rows.filter(p => p.isNew);
    if (tab === "upcoming") rows = rows.filter(p => p.activity?.kind === "upcoming" || p.status === "Scheduled" || p.status === "Confirmed");
    if (tab === "inactive") rows = rows.filter(p => p.activity?.kind === "past" && p.activity.daysAgo > 180);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter(p => {
        const blob = [p.name, p.mrn, p.phone, p.email, p.guardian].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(needle);
      });
    }
    return rows;
  }, [PATIENTS, q, tab]);

  const highlight = (text) => {
    const needle = q.trim().toLowerCase();
    if (!needle || !text) return text;
    const i = text.toLowerCase().indexOf(needle);
    if (i < 0) return text;
    return (
      <React.Fragment>
        {text.slice(0, i)}
        <mark className="bg-yellow-200/70 text-slate-900 rounded px-0.5">{text.slice(i, i + needle.length)}</mark>
        {text.slice(i + needle.length)}
      </React.Fragment>
    );
  };

  const TABS = [
    { id: "all",      label: "All patients", count: PATIENTS.length },
    { id: "new",      label: "New",          count: PATIENTS.filter(p => p.isNew).length },
    { id: "upcoming", label: "Upcoming",     count: PATIENTS.filter(p => p.activity?.kind === "upcoming" || p.status === "Scheduled" || p.status === "Confirmed").length },
    { id: "inactive", label: "Inactive",     count: PATIENTS.filter(p => p.activity?.kind === "past" && p.activity.daysAgo > 180).length },
  ];

  return (
    <div className="absolute inset-0 z-30 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white shrink-0">
        <button onClick={onClose} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600">
          <Icon.chevLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-slate-900 leading-tight">Patient Book</div>
          <div className="text-[11.5px] text-slate-500">Directory of all patients in your clinic · {PATIENTS.length} total</div>
        </div>
        <div className="h-10 w-[340px] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
          <Icon.search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, MRN, phone, or email…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-slate-400"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-700">
              <Icon.close size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/40 shrink-0">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                "h-8 px-3 text-[12.5px] rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2",
                tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.label}
              <span className={cx(
                "h-5 min-w-5 px-1.5 rounded-full text-[10.5px] font-semibold inline-flex items-center justify-center",
                tab === t.id ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"
              )}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="text-[12px] text-slate-500">
          Showing <span className="font-semibold text-slate-700">{data.length}</span> of {PATIENTS.length}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <Card className="overflow-hidden">
          <div className="grid items-center text-[11px] font-medium uppercase tracking-wide text-slate-500 px-5 py-3 bg-slate-50/70 border-b border-slate-200/70"
            style={{ gridTemplateColumns: "1.9fr 1.2fr 0.7fr 0.55fr 1.4fr 1.3fr 2fr" }}
          >
            <div>Patient</div>
            <div>MRN</div>
            <div>Age</div>
            <div>Sex</div>
            <div>Phone</div>
            <div>Email</div>
            <div>Last Activity</div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.map(p => {
              const loc = LOCATIONS[p.loc];
              const pr  = PRACTITIONERS.find(x => x.id === p.pract);
              return (
                <div
                  key={p.id}
                  onClick={() => onOpenPatient(p.id)}
                  className="grid items-center px-5 py-3 hover:bg-sky-50/40 cursor-pointer transition group"
                  style={{ gridTemplateColumns: "1.9fr 1.2fr 0.7fr 0.55fr 1.4fr 1.3fr 2fr" }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-5">
                    <BabyAvatar size={36} swatch={p.swatch} name={p.name} ring />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 min-w-0">
                        <span className="truncate">{highlight(p.name)}</span>
                        {p.isNew && (
                          <Badge color={{ bg: "#FFEDD4", text: "#CA3500", border: "#FFD6A8" }} className="!text-[10px] shrink-0">New</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {loc && <span>{loc.name}</span>}
                        {pr && <span> · {pr.name.replace(/^Dra?\. /, "Dr. ")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-[12px] text-slate-600 font-mono truncate">{highlight(p.mrn)}</div>
                  <div className="text-[12.5px] text-slate-700 truncate">{p.age}</div>
                  <div className="text-[12.5px] text-slate-700">{p.sex}</div>
                  <div className="text-[12.5px] text-slate-700 truncate font-mono">{highlight(p.phone)}</div>
                  <div className="text-[12px] text-slate-700 truncate">{highlight(p.email)}</div>
                  <div className="min-w-0">
                    <LastActivityCell patient={p} />
                  </div>
                </div>
              );
            })}
          </div>

          {data.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Icon.user size={20} />
              </div>
              <div className="text-[13px]">No patients match your search.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { PatientBookScreen });
