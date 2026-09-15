// Messages screen — simple two-tab inbox (Staff / Patients)

function MessagesScreen({ onClose }) {
  const { MESSAGES, MESSAGE_THREAD, PATIENTS, PRACTITIONERS } = window.CHAVITOS;
  const SWATCH_COLORS = ["#FECDD3","#FED7AA","#FDE68A","#A7F3D0","#BAE6FD","#DDD6FE","#FBCFE8","#C7D2FE"];
  const SWATCH_COLOR = (i) => SWATCH_COLORS[(i || 0) % SWATCH_COLORS.length];

  // Bucket conversations by role.
  // Staff = Practitioners + external partners (pharmacy, lab, etc.)
  // Patients = Parents / guardians (the patient portal contacts).
  const STAFF_ROLES = new Set(["Practitioner", "External", "Staff", "Reception"]);
  const PATIENT_ROLES = new Set(["Parent", "Patient", "Guardian"]);

  // Locally-created conversations from search ("start a new chat").
  const [extraConvs, setExtraConvs] = React.useState([]);
  // Per-conversation threads (key = conv id). Default conversations are
  // seeded lazily on first selection.
  const [threads, setThreads] = React.useState({ m1: MESSAGE_THREAD });

  const allConversations = [...extraConvs, ...MESSAGES];
  const staffConversations   = allConversations.filter(m => STAFF_ROLES.has(m.role));
  const patientConversations = allConversations.filter(m => PATIENT_ROLES.has(m.role));

  const [tab, setTab] = React.useState("patients");
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  // Existing conversations matching the query
  const visibleConvs = (tab === "staff" ? staffConversations : patientConversations)
    .filter(m => !q || m.from.toLowerCase().includes(q) || (m.last || "").toLowerCase().includes(q));

  // Directory matches for "start new chat" when search returns nothing.
  // Patients tab → search PATIENTS for guardian or patient name.
  // Staff tab    → search PRACTITIONERS.
  const directoryMatches = React.useMemo(() => {
    if (!q) return [];
    const taken = new Set(allConversations.map(c => c.from.toLowerCase()));
    if (tab === "patients") {
      return PATIENTS
        .filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.guardian || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q) ||
          (p.email || "").toLowerCase().includes(q)
        )
        .filter(p => {
          const name = p.guardian || p.name;
          return !taken.has(name.toLowerCase());
        })
        .slice(0, 8)
        .map(p => ({
          kind: "directory",
          key: `dir-pat-${p.id}`,
          from: p.guardian || p.name,
          role: "Parent",
          patientId: p.id,
          patientName: p.name,
          color: SWATCH_COLOR(p.swatch),
        }));
    }
    // Staff
    return PRACTITIONERS
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q) ||
        (p.role || "").toLowerCase().includes(q)
      )
      .filter(p => !taken.has(p.name.toLowerCase()))
      .slice(0, 8)
      .map(p => ({
        kind: "directory",
        key: `dir-staff-${p.id}`,
        from: p.name,
        role: "Practitioner",
        department: p.department || p.role,
        color: p.color,
        initials: p.initials,
      }));
  }, [q, tab, allConversations.length]);

  // Start a new conversation from a directory match.
  const startConv = (entry) => {
    const id = `conv-${Date.now()}`;
    const newConv = {
      id,
      from: entry.from,
      role: entry.role,
      last: "",
      time: "New",
      unread: 0,
      online: false,
      color: entry.color,
      ...(entry.patientId ? { patientId: entry.patientId } : {}),
    };
    setExtraConvs(prev => [newConv, ...prev]);
    setThreads(prev => ({ ...prev, [id]: [] }));
    setSelectedId(id);
    setQuery("");
  };

  const [selectedId, setSelectedId] = React.useState(null);
  React.useEffect(() => {
    const firstId = (tab === "staff" ? staffConversations : patientConversations)[0]?.id || null;
    setSelectedId(firstId);
  }, [tab]);

  const current = allConversations.find(m => m.id === selectedId) || null;
  const [draft, setDraft] = React.useState("");

  // Lazily seed a thread for default conversations on selection.
  React.useEffect(() => {
    if (!current) return;
    setThreads(prev => {
      if (prev[current.id]) return prev;
      if (current.id === "m1") return { ...prev, m1: MESSAGE_THREAD };
      const seed = current.last ? [{ from: "them", text: current.last, time: current.time }] : [];
      return { ...prev, [current.id]: seed };
    });
    setDraft("");
  }, [selectedId]);
  const thread = (current && threads[current.id]) || [];

  const send = () => {
    if (!draft.trim() || !current) return;
    const id = current.id;
    setThreads(prev => ({ ...prev, [id]: [...(prev[id] || []), { from: "me", text: draft, time: "Just now" }] }));
    setDraft("");
    setTimeout(() => {
      setThreads(prev => ({ ...prev, [id]: [...(prev[id] || []), { from: "them", text: "Recibido 👍", time: "Just now" }] }));
    }, 1100);
  };

  const isPatientThread = current && PATIENT_ROLES.has(current.role);
  // Best-effort link a parent conversation to a patient.
  const linkedPatient = React.useMemo(() => {
    if (!isPatientThread || !current) return null;
    if (current.patientId) return PATIENTS.find(p => p.id === current.patientId) || null;
    const lastName = (current.from || "").split(" ").slice(-1)[0]?.toLowerCase();
    if (!lastName) return null;
    return PATIENTS.find(p => p.name.toLowerCase().includes(lastName)) || null;
  }, [current, isPatientThread]);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm shrink-0">
        <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700">
          <Icon.chevLeft size={18} />
        </button>
        <div className="text-[13px] text-slate-500">Front desk</div>
        <Icon.chevRight size={12} />
        <div className="text-[13px] font-semibold text-slate-900">Messages</div>
        <div className="flex-1" />
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-[340px_1fr] min-h-0">
        {/* Conversation list */}
        <div className="border-r border-slate-200/70 flex flex-col bg-slate-50/30 min-h-0">
          {/* Tabs */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 w-full">
              {[
                { v: "patients", label: "Patient chats", count: patientConversations.length },
                { v: "staff",    label: "Staff chats",   count: staffConversations.length },
              ].map(t => (
                <button
                  key={t.v}
                  onClick={() => setTab(t.v)}
                  className={cx(
                    "flex-1 h-8 rounded-md text-[12px] font-medium transition flex items-center justify-center gap-1.5",
                    tab === t.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t.label}
                  <span className={cx(
                    "h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center",
                    tab === t.v ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"
                  )}>{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pb-2 shrink-0">
            <div className="h-9 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
              <Icon.search size={13} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "staff" ? "Search staff conversations…" : "Search patient conversations…"}
                className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            {visibleConvs.length === 0 && directoryMatches.length === 0 && (
              <div className="px-3 py-10 text-center text-[12.5px] text-slate-500 italic">
                {q ? `No matches for "${query}".` : "No conversations in this folder."}
              </div>
            )}
            {visibleConvs.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={cx(
                  "w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white transition",
                  selectedId === m.id && "bg-white shadow-sm"
                )}
              >
                <div className="relative shrink-0">
                  <div className="size-10 rounded-full flex items-center justify-center font-semibold text-slate-700" style={{ background: m.color }}>
                    {m.from.split(" ").map(s => s[0]).slice(0,2).join("")}
                  </div>
                  {m.online && <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-[13px] font-medium text-slate-900 truncate">{m.from}</div>
                    <div className="text-[10.5px] text-slate-500 shrink-0">{m.time}</div>
                  </div>
                  <div className="text-[10.5px] text-slate-500">{m.role}</div>
                  <div className="text-[12px] text-slate-600 truncate mt-0.5">{m.last || <span className="italic text-slate-400">No messages yet</span>}</div>
                </div>
                {m.unread > 0 && (
                  <div className="size-5 rounded-full bg-sky-500 text-white text-[10.5px] font-semibold flex items-center justify-center shrink-0 mt-2">{m.unread}</div>
                )}
              </button>
            ))}

            {directoryMatches.length > 0 && (
              <React.Fragment>
                <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
                  <Icon.plus size={10}/> Start a new chat
                </div>
                {directoryMatches.map(e => (
                  <button
                    key={e.key}
                    onClick={() => startConv(e)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-sky-50 transition border-l-2 border-transparent hover:border-sky-400"
                  >
                    <div className="shrink-0 size-10 rounded-full flex items-center justify-center font-semibold text-slate-700" style={{ background: e.color }}>
                      {e.initials || e.from.split(" ").map(s => s[0]).slice(0,2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{e.from}</div>
                      <div className="text-[10.5px] text-slate-500 truncate">
                        {e.role}{e.patientName ? ` · Patient: ${e.patientName}` : ""}{e.department ? ` · ${e.department}` : ""}
                      </div>
                      <div className="text-[11px] text-sky-700 font-medium mt-0.5">Start chat →</div>
                    </div>
                  </button>
                ))}
              </React.Fragment>
            )}
          </div>
        </div>

        {/* Thread */}
        {current ? (
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 shrink-0">
              <div className="size-9 rounded-full flex items-center justify-center font-semibold text-slate-700" style={{ background: current.color }}>
                {current.from.split(" ").map(s => s[0]).slice(0,2).join("")}
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-slate-900 truncate">{current.from}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {current.online ? "Online · " : ""}{current.role}
                  {linkedPatient && (
                    <React.Fragment>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>Patient: {linkedPatient.name}</span>
                    </React.Fragment>
                  )}
                </div>
              </div>
              <div className="flex-1" />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5 bg-slate-50/40">
              <div className="text-center my-2">
                <span className="text-[10.5px] text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">Today</span>
              </div>
              {thread.map((t, i) => (
                <div key={i} className={cx("flex", t.from === "me" ? "justify-end" : "justify-start")}>
                  <div className={cx(
                    "max-w-[70%] px-3.5 py-2 rounded-2xl text-[13.5px] shadow-sm",
                    t.from === "me"
                      ? "bg-[#0098E4] text-white rounded-br-sm"
                      : "bg-white text-slate-900 rounded-bl-sm border border-slate-100"
                  )}>
                    <div>{t.text}</div>
                    <div className={cx("text-[10px] mt-0.5", t.from === "me" ? "text-sky-100" : "text-slate-400")}>{t.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer — extra bottom padding clears the floating dock */}
            <div className="border-t border-slate-200/70 px-3 pt-3 pb-28 bg-white shrink-0">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-300/40 transition">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Write a message…"
                  className="flex-1 bg-transparent outline-none text-[13.5px] resize-none py-1"
                />
                <button onClick={send} className="size-8 rounded-lg bg-[#0098E4] text-white flex items-center justify-center disabled:opacity-40" disabled={!draft.trim()}>
                  <Icon.send size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-[13px] text-slate-500 italic">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MessagesScreen });
