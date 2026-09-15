// Top toolbar (logo + date controls + user) and floating bottom dock

// User avatar — shows the photo when one exists, otherwise a colored
// initials chip (used by roles without a portrait, e.g. the nurse).
function UserAvatar({ user, px, className = "" }) {
  const dim = { width: px, height: px };
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} style={dim} className={cx("rounded-full object-cover ring-2 ring-white shadow-sm", className)} />;
  }
  const initials = user?.initials
    || (user?.name ? user.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?");
  return (
    <span
      style={{ ...dim, background: user?.swatch || "#94A3B8", fontSize: Math.round(px * 0.4) }}
      className={cx("rounded-full ring-2 ring-white shadow-sm flex items-center justify-center font-semibold text-white select-none leading-none", className)}
    >{initials}</span>
  );
}

// Global patient quick-search — name / MRN / phone / email
function PatientGlobalSearch({ onOpenPatient }) {
  const { PATIENTS } = window.CHAVITOS;
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);

  const query = q.trim().toLowerCase();
  const matches = !query ? [] : PATIENTS.filter(p => {
    const blob = [p.name, p.mrn, p.phone, p.email, p.guardian]
      .filter(Boolean).join(" ").toLowerCase();
    return blob.includes(query);
  }).slice(0, 8);

  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    computePos();
    const onScroll = () => computePos();
    const onResize = () => computePos();
    const onDoc = (e) => {
      const inTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const inPop = popRef.current && popRef.current.contains(e.target);
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

  const highlight = (text, q) => {
    if (!q || !text) return text;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return text;
    return (
      <React.Fragment>
        {text.slice(0, i)}
        <mark className="bg-yellow-200/70 text-slate-900 rounded px-0.5">{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </React.Fragment>
    );
  };

  const showPop = open && query.length > 0;

  return (
    <div ref={wrapRef} className="relative w-[340px]">
      <div className="h-10 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
        <Icon.search size={15} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search patient by name, MRN, phone, email…"
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-slate-400"
        />
        {q && (
          <button onClick={() => { setQ(""); setOpen(false); }} className="text-slate-400 hover:text-slate-700">
            <Icon.close size={12} />
          </button>
        )}
      </div>

      {showPop && pos && ReactDOM.createPortal(
        <div
          ref={popRef}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: 380, zIndex: 70 }}
        >
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between">
            <span>{matches.length} {matches.length === 1 ? "match" : "matches"}</span>
            <span className="text-slate-400 normal-case tracking-normal font-normal">Name · MRN · Phone · Email</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {matches.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12.5px] text-slate-500">
                No patients found for <span className="font-medium text-slate-700">"{q}"</span>
              </div>
            ) : matches.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onOpenPatient(p.id); setOpen(false); setQ(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-sky-50 transition border-b border-slate-100 last:border-b-0"
              >
                <BabyAvatar size={32} swatch={p.swatch} name={p.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-slate-900 truncate">{highlight(p.name, query)}</div>
                  <div className="text-[11.5px] text-slate-500 font-mono truncate">{highlight(p.mrn, query)} · {p.age}</div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                    {p.phone && <span>{highlight(p.phone, query)}</span>}
                    {p.email && (
                      <React.Fragment>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{highlight(p.email, query)}</span>
                      </React.Fragment>
                    )}
                  </div>
                </div>
                <Icon.chevRight size={14} />
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Data mode dropdown (test data vs empty/onboarding) ─────────
function DataModeMenu({ mode, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const label = mode === "test" ? "Test data" : "No test data";
  const dot = mode === "test" ? "bg-emerald-500" : "bg-slate-400";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cx(
          "h-8 px-2.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition",
          open ? "border-sky-300 bg-sky-50/60 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        )}
      >
        <span className={cx("size-1.5 rounded-full", dot)} />
        {label}
        <Icon.chevDown size={11} />
      </button>
      {open && (
        <div className="absolute z-50 top-10 left-0 w-60 bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden animate-fade-in">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100">
            Demo data
          </div>
          {[
            { v: "test",  title: "Test data",     desc: "Pre-filled patients & appointments", dot: "bg-emerald-500" },
            { v: "empty", title: "No test data",  desc: "Empty clinic · guided onboarding",   dot: "bg-slate-400" },
          ].map(o => (
            <button key={o.v}
              onClick={() => { onChange(o.v); setOpen(false); }}
              className={cx(
                "w-full px-3 py-2.5 flex items-start gap-2.5 text-left hover:bg-slate-50 transition",
                mode === o.v && "bg-sky-50/50"
              )}
            >
              <span className={cx("mt-1 size-2 rounded-full shrink-0", o.dot)} />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-slate-900">{o.title}</span>
                <span className="block text-[10.5px] text-slate-500">{o.desc}</span>
              </span>
              {mode === o.v && <Icon.check size={13}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Roles ────────────────────────────────────────────────────
// Three personas the user can switch between. Permissions are read from
// `window.CHAVITOS_ROLES[role]` everywhere — the top bar shows a dropdown
// next to the Chavitos logo for switching.
const CHAVITOS_ROLES = {
  frontdesk: {
    id: "frontdesk",
    label: "Front desk",
    short: "Front desk",
    badge: "FD",
    user: {
      name: "Aminata",
      fullName: "Aminata Salinas",
      title: "Front desk · Chavitos Clinic",
      avatar: ((window.__resources&&window.__resources.userAminata)||"assets/user-aminata.png"),
    },
    tone: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6", ring: "ring-sky-400" },
    dockItems: ["search","patient360","messages","invoices","notes"],
    capabilities: {
      newAppt: true,
      collectPayment: true,
      checkIn: true,        // Confirmed → Checked-in
      markReady: false,     // Checked-in → Ready for Provider
      startEncounter: false,
      rescheduleCancel: true,
      noShow: true,
      invoices: true,
    },
    description: "Add appointments, mark check-in, collect payments, manage invoices.",
  },
  nurse: {
    id: "nurse",
    label: "Nurse",
    short: "Nurse",
    badge: "RN",
    user: {
      name: "Lourdes",
      fullName: "Lourdes Méndez",
      title: "Nurse · Chavitos Clinic",
      avatar: null,
      initials: "LM",
      swatch: "#A78BFA",
    },
    tone: { bg: "#F3E8FF", text: "#6B21A8", dot: "#A855F7", ring: "ring-violet-400" },
    dockItems: ["search","patient360","messages","notes"],
    capabilities: {
      newAppt: false,
      collectPayment: false,
      checkIn: false,
      markReady: true,
      startEncounter: false,
      rescheduleCancel: false,
      noShow: false,
      invoices: false,
    },
    description: "Capture vitals for checked-in patients, then mark ready for the provider.",
  },
  practitioner: {
    id: "practitioner",
    label: "Practitioner",
    short: "Practitioner",
    badge: "Dr",
    user: {
      name: "Miguel",
      fullName: "Dr. Miguel Soto",
      title: "Pediatric Surgeon · Chavitos",
      avatar: ((window.__resources&&window.__resources.drMiguel)||"assets/dr-miguel.png"),
    },
    tone: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981", ring: "ring-emerald-400" },
    dockItems: ["search","patient360","messages","notes"],
    capabilities: {
      newAppt: false,
      collectPayment: false,
      checkIn: false,
      markReady: false,
      startEncounter: true,
      rescheduleCancel: false,
      noShow: false,
      invoices: false,
    },
    description: "Review your queue of patients ready for you and run the encounter.",
  },
};
window.CHAVITOS_ROLES = CHAVITOS_ROLES;

function RoleMenu({ role, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const r = CHAVITOS_ROLES[role] || CHAVITOS_ROLES.frontdesk;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cx(
          "h-10 pl-2 pr-3 rounded-xl border flex items-center gap-2 text-[12.5px] font-semibold transition",
          open ? "border-slate-300 shadow-sm" : "border-slate-200 bg-white/80 hover:bg-white",
        )}
        style={{
          background: open ? r.tone.bg : undefined,
          color: r.tone.text,
        }}
        title={`Acting as ${r.label}. Click to switch role.`}
      >
        <span
          className="size-6 rounded-md flex items-center justify-center text-white text-[10.5px] font-bold shrink-0 shadow-sm"
          style={{ background: r.tone.dot }}
        >
          {r.badge}
        </span>
        <span className="leading-tight">
          <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium -mb-0.5">Acting as</span>
          <span className="block text-[12.5px] font-semibold" style={{ color: r.tone.text }}>{r.label}</span>
        </span>
        <Icon.chevDown size={12} />
      </button>

      {open && (
        <div className="absolute z-50 top-12 left-0 w-[300px] bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden animate-fade-in">
          <div className="px-3.5 py-2.5 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between">
            <span>Switch role</span>
            <span className="text-slate-400 normal-case tracking-normal font-normal">Permissions update instantly</span>
          </div>
          {Object.values(CHAVITOS_ROLES).map(o => {
            const active = role === o.id;
            return (
              <button
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={cx(
                  "w-full px-3.5 py-3 flex items-start gap-3 text-left hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0",
                  active && "bg-slate-50/80"
                )}
              >
                <span
                  className="size-9 rounded-lg flex items-center justify-center text-white text-[12.5px] font-bold shrink-0 shadow-sm"
                  style={{ background: o.tone.dot }}
                >
                  {o.badge}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-900">{o.label}</span>
                    {active && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: o.tone.bg, color: o.tone.text }}>
                        Current
                      </span>
                    )}
                  </span>
                  <span className="block text-[11.5px] text-slate-600 leading-snug mt-0.5">{o.description}</span>
                  <span className="block text-[10.5px] text-slate-400 mt-1">Signed in as <span className="font-medium text-slate-600">{o.user.fullName}</span></span>
                </span>
                {active && <Icon.check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChavitosTopBar({ onNewAppt, user, showNewAppt = true, dataMode = "test", onChangeDataMode = () => {}, role = "frontdesk", onChangeRole = () => {} }) {

  const r = CHAVITOS_ROLES[role] || CHAVITOS_ROLES.frontdesk;
  const canNewAppt = showNewAppt && r.capabilities.newAppt;

  return (
    <div className="relative z-30 flex items-center gap-3 px-5 py-3 bg-white/70 backdrop-blur-xl border-b border-slate-200/70">
      <img src={(window.__resources&&window.__resources.chavitosLogo)||"assets/chavitos-logo.png"} alt="Chavitos Clinic" className="h-11 w-auto select-none" draggable="false" />
      <RoleMenu role={role} onChange={onChangeRole} />
      <DataModeMenu mode={dataMode} onChange={onChangeDataMode} />
      <div className="flex-1" />

      {canNewAppt && (
        <button
          onClick={onNewAppt}
          className="h-10 px-4 rounded-xl bg-[#0098E4] hover:bg-[#0086cc] text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition"
        >
          <Icon.plus size={16} />
          <span>New Appointment</span>
        </button>
      )}

      {canNewAppt && <div className="h-7 w-px bg-slate-200 mx-1.5" />}

      <UserMenu user={user} roleTitle={r.user.title} />
    </div>
  );
}

function UserMenu({ user, roleTitle }) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(null); // 'profile' | 'schedule' | 'notifications' | 'settings'
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { key: "profile",       icon: <Icon.user size={13}/>,     label: "My profile",       sub: "View & edit your details" },
    { key: "schedule",      icon: <Icon.calendar size={13}/>, label: "My schedule",      sub: "Shifts & time off" },
    { key: "notifications", icon: <Icon.activity size={13}/>, label: "Notifications",    sub: "12 unread" },
    { key: "settings",      icon: <Icon.invoice size={13}/>,  label: "Clinic settings",  sub: "Locations, billing, taxes" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cx(
          "flex items-center gap-2 pr-2 pl-1.5 py-1 rounded-full hover:bg-slate-100 transition",
          open && "bg-slate-100"
        )}
      >
        <UserAvatar user={user} px={36} />
        <div className="text-[13px] font-medium text-slate-900 whitespace-nowrap">Hola, {user.name} <span>👋</span></div>
        <Icon.chevDown size={12} />
      </button>

      {open && (
        <div className="absolute z-50 top-12 right-0 w-72 bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden animate-fade-in">
          <div className="flex items-center gap-3 p-3 border-b border-slate-100 bg-gradient-to-br from-sky-50 to-white">
            <UserAvatar user={user} px={44} />
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-slate-900 truncate">{user.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{roleTitle || "Front desk · Chavitos Clinic"}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Online
              </div>
            </div>
          </div>
          <div className="py-1">
            {items.map((it) => (
              <button key={it.key}
                onClick={() => { setOpen(false); setView(it.key); }}
                className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-slate-50 transition">
                <span className="size-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">{it.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-medium text-slate-900">{it.label}</span>
                  <span className="block text-[10.5px] text-slate-500 truncate">{it.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 py-1">
            <button onClick={() => { setOpen(false); window.location.href = "Narzim Login.html"; }} className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-rose-50 text-rose-600 transition">
              <span className="size-7 rounded-md bg-rose-50 flex items-center justify-center shrink-0"><Icon.close size={12}/></span>
              <span className="text-[12.5px] font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}
      {view && (
        <UserMenuView view={view} user={user} onClose={() => setView(null)} />
      )}
    </div>
  );
}

function UserMenuView({ view, user, onClose }) {
  const titles = {
    profile:       { title: "My profile",      sub: "View & edit your personal details", icon: <Icon.user size={14}/>,     tone: "sky" },
    schedule:      { title: "My schedule",     sub: "Shifts, time off & coverage",       icon: <Icon.calendar size={14}/>, tone: "violet" },
    notifications: { title: "Notifications",   sub: "12 unread",                          icon: <Icon.activity size={14}/>, tone: "amber" },
    settings:      { title: "Clinic settings", sub: "Locations, billing, taxes",          icon: <Icon.invoice size={14}/>,  tone: "emerald" },
  }[view];
  const toneStyles = {
    sky: "from-sky-50 to-white", violet: "from-violet-50 to-white",
    amber: "from-amber-50 to-white", emerald: "from-emerald-50 to-white",
  }[titles.tone];
  const iconBg = {
    sky: "bg-sky-500", violet: "bg-violet-500", amber: "bg-amber-500", emerald: "bg-emerald-500",
  }[titles.tone];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[680px] max-h-[88vh] overflow-hidden flex flex-col">
        <div className={cx("flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r", toneStyles)}>
          <div className="flex items-center gap-2.5">
            <div className={cx("size-8 rounded-lg flex items-center justify-center text-white", iconBg)}>{titles.icon}</div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">{titles.title}</div>
              <div className="text-[11.5px] text-slate-500">{titles.sub}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {view === "profile"       && <ProfileBody user={user} />}
          {view === "schedule"      && <ScheduleBody />}
          {view === "notifications" && <NotificationsBody />}
          {view === "settings"      && <SettingsBody />}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} onClick={onClose}>Save changes</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProfileBody({ user }) {
  const fields = [
    ["Full name", "Aminata Salinas Cruz"], ["Role", "Front desk · Senior"],
    ["Phone", "+52 999 234 5678"], ["Email", "aminata@chavitosclinic.mx"],
    ["Locations", "Chavitos · Pensiones · Mérida"], ["Language", "Español (México)"],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <UserAvatar user={user} px={56} />
        <div className="flex-1">
          <div className="text-[14.5px] font-semibold text-slate-900">{user.name} Salinas</div>
          <div className="text-[12px] text-slate-500">Front desk · Chavitos Clinic</div>
        </div>
        <Button variant="secondary" size="sm">Change photo</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([l, v]) => (
          <label key={l} className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{l}</div>
            <input defaultValue={v} className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition" />
          </label>
        ))}
      </div>
      <div className="p-3 rounded-xl border border-slate-200">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Security</div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span>Two-factor authentication</span>
          <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>Enabled</Badge>
        </div>
        <div className="flex items-center justify-between text-[12.5px] mt-1.5">
          <span>Password last changed</span>
          <span className="text-slate-500">Mar 12, 2026</span>
        </div>
      </div>
    </div>
  );
}

function ScheduleBody() {
  const days = [
    ["Mon", "May 25", "07:30 — 16:00", "Chavitos", "Completed"],
    ["Tue", "May 26", "07:30 — 16:00", "Chavitos", "Completed"],
    ["Wed", "May 27", "08:00 — 17:00", "Chavitos", "Today"],
    ["Thu", "May 28", "07:30 — 16:00", "Pensiones", "Upcoming"],
    ["Fri", "May 29", "12:00 — 20:00", "Chavitos", "Upcoming"],
    ["Sat", "May 30", "—", "Off", "Off"],
    ["Sun", "May 31", "—", "Off", "Off"],
  ];
  const tone = (s) =>
    s === "Today"     ? { bg:"#DBEAFE", text:"#1E40AF" } :
    s === "Upcoming"  ? { bg:"#E0F2FE", text:"#075985" } :
    s === "Completed" ? { bg:"#D1FAE5", text:"#065F46" } :
                        { bg:"#F1F5F9", text:"#475569" };
  return (
    <div className="space-y-3">
      <div className="text-[11.5px] text-slate-500">Week of May 25 — 31, 2026</div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {days.map((d, i) => (
          <div key={i} className={cx("grid items-center px-4 py-2.5 text-[12.5px]", i > 0 && "border-t border-slate-100", d[4] === "Today" && "bg-sky-50/40")}
            style={{ gridTemplateColumns: "0.6fr 0.8fr 1.4fr 1fr 1fr" }}>
            <div className="font-semibold text-slate-900">{d[0]}</div>
            <div className="text-slate-600">{d[1]}</div>
            <div className="font-mono text-slate-900">{d[2]}</div>
            <div className="text-slate-700">{d[3]}</div>
            <div><Badge color={tone(d[4])}>{d[4]}</Badge></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-slate-200">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Time off balance</div>
          <div className="text-[20px] font-bold text-slate-900 font-mono">12 <span className="text-[12px] font-normal text-slate-500">days remaining</span></div>
          <button className="mt-2 text-[12px] font-medium text-sky-700 hover:underline inline-flex items-center gap-1"><Icon.plus size={11}/> Request time off</button>
        </div>
        <div className="p-3 rounded-xl border border-slate-200">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Pending swap</div>
          <div className="text-[12.5px] text-slate-700">Trade Fri (12:00 → 20:00) with <span className="font-semibold">Rodrigo M.</span></div>
          <div className="text-[11px] text-amber-700 mt-0.5">Awaiting approval</div>
        </div>
      </div>
    </div>
  );
}

function NotificationsBody() {
  const items = [
    { tone: "amber",   icon: <Icon.invoice size={12}/>,  title: "Payment to collect", body: "Maximiliano Iván — $850 MXN pending after today's visit.", time: "2m ago", unread: true },
    { tone: "sky",     icon: <Icon.calendar size={12}/>, title: "New appointment booked", body: "Lucía Hernández confirmed for May 30, 10:30 AM.", time: "18m ago", unread: true },
    { tone: "emerald", icon: <Icon.check size={12}/>,    title: "Encounter signed", body: "Dr. Miguel signed encounter for Daniela Andrés M.", time: "1h ago", unread: true },
    { tone: "rose",    icon: <Icon.alert size={12}/>,    title: "No-show", body: "Sebastián Fernández did not arrive for his 09:00 AM slot.", time: "2h ago", unread: false },
    { tone: "violet",  icon: <Icon.user size={12}/>,     title: "New patient registered", body: "José Alejandro J. added by Reception.", time: "Yesterday", unread: false },
  ];
  const TONES = { amber:"bg-amber-500", emerald:"bg-emerald-500", sky:"bg-sky-500", rose:"bg-rose-500", violet:"bg-violet-500" };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11.5px] text-slate-500">Last 24 hours · 3 unread</div>
        <button className="text-[11.5px] text-sky-700 font-medium hover:underline">Mark all as read</button>
      </div>
      {items.map((n, i) => (
        <div key={i} className={cx("flex items-start gap-3 p-3 rounded-lg border transition", n.unread ? "border-sky-100 bg-sky-50/30" : "border-slate-100 bg-white")}>
          <span className={cx("size-7 rounded-md flex items-center justify-center text-white shrink-0", TONES[n.tone])}>{n.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-semibold text-slate-900 truncate">{n.title}</div>
              {n.unread && <span className="size-1.5 rounded-full bg-sky-500" />}
            </div>
            <div className="text-[12px] text-slate-600 truncate">{n.body}</div>
            <div className="text-[10.5px] text-slate-400 mt-0.5">{n.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsBody() {
  const locations = [
    { name: "Chavitos Clinic",          city: "Mérida, Yuc.",   primary: true },
    { name: "Pensiones Medical Center", city: "Mérida, Yuc.",   primary: false },
    { name: "Clínica de Mérida",        city: "García Ginerés", primary: false },
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Locations</div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {locations.map((l, i) => (
            <div key={i} className={cx("flex items-center gap-3 px-3 py-2.5 text-[12.5px]", i > 0 && "border-t border-slate-100")}>
              <span className="size-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center"><Icon.calendar size={12}/></span>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{l.name}</div>
                <div className="text-[11px] text-slate-500">{l.city}</div>
              </div>
              {l.primary && <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>Primary</Badge>}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Currency", "MXN · Peso mexicano"], ["Tax (IVA)", "16%"],
          ["RFC", "CHA-260101-A1B"], ["Invoice prefix", "INV-2026-"],
        ].map(([l, v]) => (
          <div key={l} className="p-3 rounded-xl border border-slate-200">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{l}</div>
            <div className="text-[14px] font-semibold text-slate-900 font-mono">{v}</div>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-xl border border-slate-200">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Reminders</div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span>Default WhatsApp reminder 24h before visit</span>
          <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>On</Badge>
        </div>
        <div className="flex items-center justify-between text-[12.5px] mt-1.5">
          <span>Send patient invoice via email after checkout</span>
          <Badge color={{ bg:"#D1FAE5", text:"#065F46" }}>On</Badge>
        </div>
      </div>
    </div>
  );
}

// ── Floating bottom dock ─────────────────────────────────────
function FloatingDock({ active, onChange, dockItem, role = "frontdesk" }) {
  const [hoveredId, setHoveredId] = React.useState(null);
  const [menuOpenFor, setMenuOpenFor] = React.useState(null);
  const allowed = (CHAVITOS_ROLES[role] || CHAVITOS_ROLES.frontdesk).dockItems;
  const ALL_ITEMS = [
    { id: "search",     label: "Search",       grad: "linear-gradient(180deg,#0098E4,#003E5C)", svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    )},
    { id: "patient360", label: "Patient 360",  grad: "linear-gradient(180deg,#8B5CF6,#4C1D95)", svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19a6 6 0 0 1 11 0"/></svg>
    ), menu: [
      { id: "patientBook",     label: "Patient Book",     icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h7"/></svg>
      )},
      { id: "appointmentBook", label: "Appointment Book", icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      )},
    ]},
    { id: "messages",   label: "Messages",     grad: "linear-gradient(180deg,#00C950,#03522B)", svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>
    )},
    { id: "invoices",   label: "Invoices",     grad: "linear-gradient(180deg,#FF6900,#A24300)", svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
    )},
    { id: "notes",      label: "Sticky Notes", grad: "linear-gradient(180deg,#00BFC9,#005459)", svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
    )},
  ];

  const ITEMS = ALL_ITEMS.filter(i => allowed.includes(i.id));

  // Close menu on outside click / escape
  React.useEffect(() => {
    if (!menuOpenFor) return;
    const onDoc = (e) => {
      if (!e.target.closest("[data-dock-menu]")) setMenuOpenFor(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpenFor(null); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenFor]);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-5 z-50 flex items-end gap-1.5"
      style={{ filter: "drop-shadow(0 12px 30px rgba(15,23,42,0.28))" }}
    >
      <div className="relative">
        {dockItem && !hoveredId && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-700/90 text-white text-[11px] whitespace-nowrap font-medium shadow-md">
            {dockItem}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-700/90 rotate-45" />
          </div>
        )}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-white/55 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.18)]" data-dock-menu>
          {ITEMS.map(it => (
            <div key={it.id} className="relative">
              {hoveredId === it.id && menuOpenFor !== it.id && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-900/95 text-white text-[11.5px] whitespace-nowrap font-medium shadow-lg pointer-events-none animate-fade-in">
                  {it.label}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900/95 rotate-45" />
                </div>
              )}
              {/* Sub-menu (e.g. Patient 360 → Patient Book / Appointment Book) */}
              {menuOpenFor === it.id && it.menu && (
                <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 min-w-[180px] bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.25)] py-1.5 animate-fade-in" data-dock-menu>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100 mb-1">
                    {it.label}
                  </div>
                  {it.menu.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => { onChange(sub.id); setMenuOpenFor(null); }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 text-[13px] text-slate-800 hover:bg-sky-50 transition text-left"
                    >
                      <span className="text-slate-500">{sub.icon}</span>
                      <span className="flex-1">{sub.label}</span>
                    </button>
                  ))}
                  {/* Tail */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
                </div>
              )}
              <button
                onClick={() => {
                  if (it.menu) {
                    setMenuOpenFor(menuOpenFor === it.id ? null : it.id);
                  } else {
                    setMenuOpenFor(null);
                    onChange(it.id);
                  }
                }}
                onMouseEnter={() => setHoveredId(it.id)}
                onMouseLeave={() => setHoveredId(h => h === it.id ? null : h)}
                className={cx(
                  "relative size-12 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95",
                  active === it.id ? "ring-2 ring-white/90 shadow-lg scale-110" : ""
                )}
                style={{ background: it.grad }}
                aria-label={it.label}
              >
                {it.svg}
                {active === it.id && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 size-1 rounded-full bg-white" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChavitosTopBar, FloatingDock });
