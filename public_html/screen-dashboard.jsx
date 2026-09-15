// Appointments / Front Desk Dashboard table — matches the Figma reference

// Per-column filter header. Renders the title as a button; opens a portaled
// dropdown of unique values to filter by. `current` is the active filter value
// (or null for none). `options` is an array of {value, label, sub?}.
function ColumnFilter({ title, options, current, onChange, align = "left" }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);

  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      left: align === "right" ? Math.max(8, r.right - 240) : r.left,
      width: 240,
    });
  }, [align]);

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

  const active = current != null;
  const currentLabel = active ? (options.find(o => o.value === current)?.label || current) : null;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cx(
          "inline-flex items-center gap-1 rounded -mx-1 px-1 py-0.5 transition",
          active
            ? "text-sky-700 bg-sky-100/70 hover:bg-sky-100"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
        )}
        title={active ? `Filtered by ${currentLabel}` : `Filter by ${title}`}
      >
        <span>{title}</span>
        <svg
          viewBox="0 0 24 24" width="11" height="11" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M3 5h18l-7 9v6l-4-2v-4z" />
        </svg>
      </button>

      {open && pos && ReactDOM.createPortal(
        <div
          ref={popRef}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: 320, zIndex: 70 }}
        >
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between">
            <span>Filter by {title}</span>
            {active && (
              <button onClick={() => { onChange(null); setOpen(false); }}
                className="text-[10.5px] font-medium text-rose-600 hover:underline normal-case tracking-normal">
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className={cx(
                "w-full px-3 py-2 flex items-center gap-2 text-[12.5px] text-left hover:bg-slate-50 transition",
                !active && "bg-sky-50/40 text-sky-700 font-medium"
              )}
            >
              <span className="size-3.5 rounded-sm border-2 border-slate-300 flex items-center justify-center shrink-0">
                {!active && <Icon.check size={9} />}
              </span>
              All
            </button>
            {options.map(o => (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cx(
                  "w-full px-3 py-2 flex items-center gap-2 text-[12.5px] text-left hover:bg-slate-50 transition",
                  current === o.value && "bg-sky-50/40 text-sky-700 font-medium"
                )}
              >
                <span className={cx(
                  "size-3.5 rounded-sm border-2 flex items-center justify-center shrink-0",
                  current === o.value ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300"
                )}>
                  {current === o.value && <Icon.check size={9} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block text-[10.5px] text-slate-500 truncate">{o.sub}</span>}
                </span>
                {o.count != null && (
                  <span className="text-[10.5px] text-slate-500">{o.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Date-aware column filter. Supports a single date OR a date range.
// `current` is null | { mode: "single", date: "YYYY-MM-DD" } | { mode: "range", from, to }
function DateRangeColumnFilter({ title, current, onChange, align = "left" }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const [mode, setMode] = React.useState(current?.mode || "single");
  const [date, setDate] = React.useState(current?.date || "");
  const [from, setFrom] = React.useState(current?.from || "");
  const [to, setTo] = React.useState(current?.to || "");
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);

  // Sync internal state when external changes (e.g. cleared from a chip)
  React.useEffect(() => {
    setMode(current?.mode || "single");
    setDate(current?.date || "");
    setFrom(current?.from || "");
    setTo(current?.to || "");
  }, [current]);

  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 280;
    setPos({
      top: r.bottom + 6,
      left: align === "right" ? Math.max(8, r.right - w) : Math.max(8, Math.min(window.innerWidth - w - 8, r.left)),
      width: w,
    });
  }, [align]);

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

  const fmt = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
  };
  const today = (offset = 0) => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const startOfWeek = () => {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d.toISOString().slice(0, 10);
  };
  const startOfMonth = () => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  };

  const active = current != null;
  const triggerLabel = title;

  const apply = () => {
    if (mode === "single") {
      if (!date) return;
      onChange({ mode: "single", date });
    } else {
      if (!from || !to) return;
      const lo = from <= to ? from : to;
      const hi = from <= to ? to : from;
      onChange({ mode: "range", from: lo, to: hi });
    }
    setOpen(false);
  };

  const PRESETS = [
    { label: "Today",       apply: () => { setMode("single"); setDate(today(0)); } },
    { label: "Yesterday",   apply: () => { setMode("single"); setDate(today(-1)); } },
    { label: "Tomorrow",    apply: () => { setMode("single"); setDate(today(1)); } },
    { label: "Last 7 days", apply: () => { setMode("range"); setFrom(today(-6));   setTo(today(0));  } },
    { label: "Next 7 days", apply: () => { setMode("range"); setFrom(today(0));    setTo(today(6));  } },
    { label: "This week",   apply: () => { setMode("range"); setFrom(startOfWeek()); setTo(today(6 - ((new Date().getDay() + 6) % 7))); } },
    { label: "This month",  apply: () => {
      const d = new Date();
      const start = startOfMonth();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      setMode("range"); setFrom(start); setTo(end);
    } },
  ];

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cx(
          "inline-flex items-center gap-1 rounded -mx-1 px-1 py-0.5 transition max-w-full",
          active
            ? "text-sky-700 bg-sky-100/70 hover:bg-sky-100"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
        )}
        title={active
          ? (current.mode === "single"
              ? `Filtered: ${fmt(current.date)}`
              : `Filtered: ${fmt(current.from)} – ${fmt(current.to)}`)
          : `Filter by ${title}`}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M3 5h18l-7 9v6l-4-2v-4z" />
        </svg>
      </button>

      {open && pos && ReactDOM.createPortal(
        <div
          ref={popRef}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 70 }}
        >
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between">
            <span>Filter by {title}</span>
            {active && (
              <button onClick={() => { onChange(null); setOpen(false); }}
                className="text-[10.5px] font-medium text-rose-600 hover:underline normal-case tracking-normal">
                Clear
              </button>
            )}
          </div>

          {/* Mode toggle */}
          <div className="p-3 pb-2">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 w-full">
              {[
                { v: "single", label: "Specific date" },
                { v: "range",  label: "Date range"    },
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setMode(opt.v)}
                  className={cx(
                    "flex-1 h-7 rounded-md text-[11.5px] font-medium transition",
                    mode === opt.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date inputs */}
          <div className="px-3 pb-2 space-y-2">
            {mode === "single" ? (
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10.5px] font-medium text-slate-500 mb-1">From</div>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <div className="text-[10.5px] font-medium text-slate-500 mb-1">To</div>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="px-3 pb-2">
            <div className="text-[10.5px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Quick presets</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={p.apply}
                  className="h-7 px-2.5 rounded-full bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-[11.5px] font-medium text-slate-700 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/60">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={apply}
              disabled={mode === "single" ? !date : (!from || !to)}
            >
              Apply
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Generic single-or-range filter shell, matching the DateRangeColumnFilter
// look-and-feel. `singleNode` renders the picker for "specific" mode,
// `rangeNode` renders the picker for "range" mode. `summary` formats the
// active filter into a tooltip label.
function SingleOrRangeShell({
  title, active, summary, singleLabel = "Specific", rangeLabel = "Range",
  mode, setMode, canApply, onApply, onClear, onCancel, children, align = "left",
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);

  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 280;
    setPos({
      top: r.bottom + 6,
      left: align === "right" ? Math.max(8, r.right - w) : Math.max(8, Math.min(window.innerWidth - w - 8, r.left)),
      width: w,
    });
  }, [align]);

  React.useEffect(() => {
    if (!open) return;
    computePos();
    const onScroll = () => computePos();
    const onResize = () => computePos();
    const onDoc = (e) => {
      const inTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const inPop = popRef.current && popRef.current.contains(e.target);
      if (!inTrigger && !inPop) { setOpen(false); onCancel && onCancel(); }
    };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); onCancel && onCancel(); } };
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
  }, [open, computePos, onCancel]);

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cx(
          "inline-flex items-center gap-1 rounded -mx-1 px-1 py-0.5 transition max-w-full",
          active
            ? "text-sky-700 bg-sky-100/70 hover:bg-sky-100"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
        )}
        title={active ? `Filtered: ${summary}` : `Filter by ${title}`}
      >
        <span className="whitespace-nowrap">{title}</span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M3 5h18l-7 9v6l-4-2v-4z" />
        </svg>
      </button>

      {open && pos && ReactDOM.createPortal(
        <div
          ref={popRef}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: 420, zIndex: 70 }}
        >
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between shrink-0">
            <span>Filter by {title}</span>
            {active && (
              <button onClick={() => { onClear(); setOpen(false); }}
                className="text-[10.5px] font-medium text-rose-600 hover:underline normal-case tracking-normal">
                Clear
              </button>
            )}
          </div>

          <div className="p-3 pb-2 shrink-0">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 w-full">
              {[
                { v: "single", label: singleLabel },
                { v: "range",  label: rangeLabel  },
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setMode(opt.v)}
                  className={cx(
                    "flex-1 h-7 rounded-md text-[11.5px] font-medium transition",
                    mode === opt.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pb-2 flex-1 overflow-y-auto">{children}</div>

          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); onCancel && onCancel(); }}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!canApply} onClick={() => { onApply(); setOpen(false); }}>Apply</Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Helpers
function parseAgeMonths(s) {
  if (!s) return null;
  const yrs = parseInt((/(\d+)\s*(?:y|yr|yrs|year|years)/i.exec(s) || [])[1] || "0", 10);
  const mos = parseInt((/(\d+)\s*(?:m|mo|mos|month|months)/i.exec(s) || [])[1] || "0", 10);
  if (Number.isNaN(yrs) && Number.isNaN(mos)) return null;
  return yrs * 12 + mos;
}
function parseTime12(s) {
  // "09:00 AM" → minutes since midnight
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + parseInt(m[2], 10);
}
function timeMinutesFrom24(hhmm) {
  // "14:30" → 870
  if (!hhmm) return null;
  const [h, mi] = hhmm.split(":").map(Number);
  return h * 60 + (mi || 0);
}
function formatTime24To12(hhmm) {
  if (!hhmm) return "";
  const [h, mi] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${String(hh).padStart(2,"0")}:${String(mi || 0).padStart(2,"0")} ${period}`;
}

function AgeRangeColumnFilter({ title, options, current, onChange }) {
  const [mode, setMode] = React.useState(current?.mode || "single");
  const [value, setValue] = React.useState(current?.mode === "single" ? current.value : "");
  const [min, setMin] = React.useState(current?.mode === "range" ? current.minYears : "");
  const [max, setMax] = React.useState(current?.mode === "range" ? current.maxYears : "");

  React.useEffect(() => {
    setMode(current?.mode || "single");
    setValue(current?.mode === "single" ? current.value : "");
    setMin(current?.mode === "range" ? current.minYears : "");
    setMax(current?.mode === "range" ? current.maxYears : "");
  }, [current]);

  const active = current != null;
  const summary = active
    ? current.mode === "single"
      ? current.value
      : `${current.minYears ?? "0"}–${current.maxYears ?? "∞"} yrs`
    : "";

  const canApply = mode === "single" ? !!value : (min !== "" || max !== "");

  return (
    <SingleOrRangeShell
      title={title} active={active} summary={summary}
      singleLabel="Specific age" rangeLabel="Age range"
      mode={mode} setMode={setMode}
      canApply={canApply}
      onApply={() => onChange(mode === "single"
        ? { mode: "single", value }
        : { mode: "range", minYears: min === "" ? null : Number(min), maxYears: max === "" ? null : Number(max) })}
      onClear={() => onChange(null)}
    >
      {mode === "single" ? (
        <div className="space-y-1 -mx-1">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue(o.value)}
              className={cx(
                "w-full px-3 py-2 flex items-center gap-2 text-[12.5px] rounded-md hover:bg-slate-50 text-left transition",
                value === o.value && "bg-sky-50/70 text-sky-700 font-medium"
              )}
            >
              <span className={cx(
                "size-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                value === o.value ? "border-sky-500" : "border-slate-300"
              )}>
                {value === o.value && <span className="size-1.5 rounded-full bg-sky-500" />}
              </span>
              <span className="flex-1 truncate">{o.label}</span>
              {o.count != null && <span className="text-[10.5px] text-slate-500">{o.count}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10.5px] font-medium text-slate-500 mb-1">Min (years)</div>
              <Input type="number" min="0" step="1" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-[10.5px] font-medium text-slate-500 mb-1">Max (years)</div>
              <Input type="number" min="0" step="1" value={max} onChange={(e) => setMax(e.target.value)} placeholder="18" />
            </div>
          </div>
          <div className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide mt-2">Quick</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Infants (0–1)", lo: 0, hi: 1 },
              { label: "Toddlers (1–3)", lo: 1, hi: 3 },
              { label: "Children (4–12)", lo: 4, hi: 12 },
              { label: "Teens (13–18)", lo: 13, hi: 18 },
            ].map(p => (
              <button key={p.label} type="button" onClick={() => { setMin(p.lo); setMax(p.hi); }}
                className="h-7 px-2.5 rounded-full bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-[11.5px] font-medium text-slate-700 transition">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </SingleOrRangeShell>
  );
}

function TimeRangeColumnFilter({ title, options, current, onChange }) {
  const [mode, setMode] = React.useState(current?.mode || "single");
  const [value, setValue] = React.useState(current?.mode === "single" ? current.value : "");
  const [from, setFrom] = React.useState(current?.mode === "range" ? current.from : "");
  const [to, setTo] = React.useState(current?.mode === "range" ? current.to : "");

  React.useEffect(() => {
    setMode(current?.mode || "single");
    setValue(current?.mode === "single" ? current.value : "");
    setFrom(current?.mode === "range" ? current.from : "");
    setTo(current?.mode === "range" ? current.to : "");
  }, [current]);

  const active = current != null;
  const summary = active
    ? current.mode === "single"
      ? current.value
      : `${formatTime24To12(current.from)} – ${formatTime24To12(current.to)}`
    : "";

  const canApply = mode === "single" ? !!value : (!!from && !!to);

  return (
    <SingleOrRangeShell
      title={title} active={active} summary={summary}
      singleLabel="Specific time" rangeLabel="Time range"
      mode={mode} setMode={setMode}
      canApply={canApply}
      onApply={() => onChange(mode === "single"
        ? { mode: "single", value }
        : { mode: "range", from, to })}
      onClear={() => onChange(null)}
      align="right"
    >
      {mode === "single" ? (
        <div className="space-y-1 -mx-1">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue(o.value)}
              className={cx(
                "w-full px-3 py-2 flex items-center gap-2 text-[12.5px] rounded-md hover:bg-slate-50 text-left transition font-mono",
                value === o.value && "bg-sky-50/70 text-sky-700 font-medium"
              )}
            >
              <span className={cx(
                "size-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                value === o.value ? "border-sky-500" : "border-slate-300"
              )}>
                {value === o.value && <span className="size-1.5 rounded-full bg-sky-500" />}
              </span>
              <span className="flex-1 truncate">{o.label}</span>
              {o.count != null && <span className="text-[10.5px] text-slate-500 font-sans">{o.count}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10.5px] font-medium text-slate-500 mb-1">From</div>
              <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <div className="text-[10.5px] font-medium text-slate-500 mb-1">To</div>
              <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide mt-2">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Morning",   from: "08:00", to: "12:00" },
              { label: "Afternoon", from: "12:00", to: "17:00" },
              { label: "Evening",   from: "17:00", to: "21:00" },
              { label: "Business",  from: "09:00", to: "18:00" },
            ].map(p => (
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }}
                className="h-7 px-2.5 rounded-full bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-[11.5px] font-medium text-slate-700 transition">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </SingleOrRangeShell>
  );
}

// Text-search column filter — filters by free-text across multiple fields.
// Optional `items` shows live suggestions matching the typed text.
function TextSearchColumnFilter({ title, placeholder = "Search…", current, onChange, items = [], itemMatch }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const [text, setText] = React.useState(current || "");
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => { setText(current || ""); }, [current]);

  const q = text.trim().toLowerCase();
  const suggestions = !q ? [] : (items || []).filter(it => itemMatch
    ? itemMatch(it, q)
    : [it.name, it.mrn, it.phone, it.email, it.guardian].filter(Boolean).join(" ").toLowerCase().includes(q)
  ).slice(0, 5);

  const highlight = (str) => {
    if (!str) return "";
    const i = str.toLowerCase().indexOf(q);
    if (i < 0) return str;
    return (
      <React.Fragment>
        {str.slice(0, i)}
        <mark className="bg-yellow-200/70 text-slate-900 rounded px-0.5">{str.slice(i, i + q.length)}</mark>
        {str.slice(i + q.length)}
      </React.Fragment>
    );
  };

  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 320;
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left)),
      width: w,
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    computePos();
    setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
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

  const active = !!current;

  const pickSuggestion = (it) => {
    setText(it.name);
    onChange(it.name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cx(
          "inline-flex items-center gap-1 rounded -mx-1 px-1 py-0.5 transition max-w-full",
          active
            ? "text-sky-700 bg-sky-100/70 hover:bg-sky-100"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
        )}
        title={active ? `Filtered: "${current}"` : `Search ${title}`}
      >
        <span className="whitespace-nowrap">{title}</span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M3 5h18l-7 9v6l-4-2v-4z" />
        </svg>
      </button>

      {open && pos && ReactDOM.createPortal(
        <div
          ref={popRef}
          className="bg-white rounded-xl border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden flex flex-col"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: 440, zIndex: 70 }}
        >
          <div className="px-3 py-2 text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold border-b border-slate-100 flex items-center justify-between shrink-0">
            <span>Search {title}</span>
            {active && (
              <button onClick={() => { onChange(null); setText(""); setOpen(false); }}
                className="text-[10.5px] font-medium text-rose-600 hover:underline normal-case tracking-normal">
                Clear
              </button>
            )}
          </div>
          <div className="p-3 space-y-2 shrink-0">
            <div className="h-9 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
              <Icon.search size={14} />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { onChange(text.trim() || null); setOpen(false); } }}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-slate-400"
              />
              {text && (
                <button onClick={() => setText("")} className="text-slate-400 hover:text-slate-700">
                  <Icon.close size={12} />
                </button>
              )}
            </div>
            <div className="text-[10.5px] text-slate-500">Matches name, MRN, phone, or email.</div>
          </div>

          {q && (
            <div className="flex-1 overflow-y-auto border-t border-slate-100">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide font-semibold text-slate-500 flex items-center justify-between">
                <span>Suggestions</span>
                <span className="text-slate-400 normal-case tracking-normal font-normal">{suggestions.length}</span>
              </div>
              {suggestions.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12px] text-slate-500">
                  No patients match "{text}"
                </div>
              ) : suggestions.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => pickSuggestion(it)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-sky-50 transition"
                >
                  <BabyAvatar size={28} swatch={it.swatch} name={it.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-slate-900 truncate">{highlight(it.name)}</div>
                    <div className="text-[10.5px] text-slate-500 font-mono truncate">{highlight(it.mrn)}</div>
                    {(it.phone || it.email) && (
                      <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1.5">
                        {it.phone && <span>{highlight(it.phone)}</span>}
                        {it.phone && it.email && <span className="text-slate-300">·</span>}
                        {it.email && <span className="truncate">{highlight(it.email)}</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => { onChange(text.trim() || null); setOpen(false); }}>
              Apply
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DashboardScreen({ patients, filter, role = "frontdesk", onOpenPatient, onChangeStatus, onSaveVitals, onAskRemedyAbout, pendingUndo = {} }) {
  const ROLE = window.CHAVITOS_ROLES?.[role] || window.CHAVITOS_ROLES?.frontdesk;
  const CAPS = ROLE?.capabilities || {};
  // Role-aware "My queue" focus. Nurses focus on Checked-in patients (need
  // vitals); practitioners focus on Ready-for-Provider (their patients).
  // Front desk sees everything.
  const ROLE_QUEUE_STATUS = role === "nurse" ? "Checked-in" : role === "practitioner" ? "Ready for Provider" : null;
  const [roleShowAll, setRoleShowAll] = React.useState(false);
  React.useEffect(() => { setRoleShowAll(false); }, [role]);
  // Stat-strip click filter — clicking a tile narrows the table to its slice.
  // null = no narrowing. Click the active tile again to clear.
  const [statFilter, setStatFilter] = React.useState(null); // null | "all" | "checked-in" | "ready" | "pending-payment"
  React.useEffect(() => { setStatFilter(null); }, [role]);
  const { PATIENTS, LOCATIONS, PRACTITIONERS } = window.CHAVITOS;
  const [openStatusFor, setOpenStatusFor] = React.useState(null);
  const [collectPaymentFor, setCollectPaymentFor] = React.useState(null);
  const [openApptFor, setOpenApptFor] = React.useState(null); // a patient object
  // After a row's status flips to Rescheduled, animate it out and then hide it.
  const [leavingIds, setLeavingIds] = React.useState(() => new Set());
  const [hiddenIds, setHiddenIds]   = React.useState(() => new Set());
  const prevPatientsRef = React.useRef(patients);

  React.useEffect(() => {
    const prev = prevPatientsRef.current;
    const newlyResched = patients
      .filter(p => p.status === "Rescheduled" && prev.find(x => x.id === p.id)?.status !== "Rescheduled")
      .map(p => p.id);
    if (newlyResched.length > 0) {
      setLeavingIds(s => {
        const next = new Set(s);
        newlyResched.forEach(id => next.add(id));
        return next;
      });
      setTimeout(() => {
        setLeavingIds(s => {
          const next = new Set(s);
          newlyResched.forEach(id => next.delete(id));
          return next;
        });
        setHiddenIds(s => {
          const next = new Set(s);
          newlyResched.forEach(id => next.add(id));
          return next;
        });
      }, 520);
    }
    prevPatientsRef.current = patients;
  }, [patients]);
  const [colFilters, setColFilters] = React.useState({ q: null, loc: null, pract: null, age: null, date: null, time: null, status: null });

  // Apply both the top-bar "filter" AND any column filters.
  const data = React.useMemo(() => {
    // Only patients with a today's appointment (status set) appear in the dashboard.
    // Once a row finishes the leave animation, hide it (e.g. rescheduled).
    let rows = patients.filter(p => !!p.status && (statFilter === "rescheduled" || !hiddenIds.has(p.id)));
    // Role-specific default queue — narrows to the actionable status for the
    // current role unless the user has clicked "View all" to broaden it.
    if (ROLE_QUEUE_STATUS && !roleShowAll && !statFilter) {
      rows = rows.filter(p => p.status === ROLE_QUEUE_STATUS);
    }
    // Stat-tile narrowing.
    if (statFilter === "checked-in")        rows = rows.filter(p => p.status === "Checked-in");
    else if (statFilter === "ready")         rows = rows.filter(p => p.status === "Ready for Provider");
    else if (statFilter === "pending-payment") rows = rows.filter(p => p.status === "Completed" && p.billing?.status === "Pending" && p.billing?.reminderActive);
    else if (statFilter === "no-show")     rows = rows.filter(p => p.status === "No Show");
    else if (statFilter === "rescheduled") rows = rows.filter(p => p.status === "Rescheduled");
    else if (statFilter === "cancelled")   rows = rows.filter(p => p.status === "Cancelled");
    if (filter === "new") rows = rows.filter(p => p.isNew);
    else if (filter === "today") rows = rows.filter(p => p.status === "Confirmed");
    else if (filter === "noshow") rows = rows.filter(p => p.status === "No Show");
    else if (filter !== "all") rows = rows.filter(p => p.status === filter);

    if (colFilters.q) {
      const needle = colFilters.q.toLowerCase();
      rows = rows.filter(p => {
        const blob = [p.name, p.mrn, p.phone, p.email, p.guardian].filter(Boolean).join(" ").toLowerCase();
        return blob.includes(needle);
      });
    }
    if (colFilters.status) rows = rows.filter(p => p.status === colFilters.status);
    if (colFilters.loc)   rows = rows.filter(p => p.loc === colFilters.loc);
    if (colFilters.pract) rows = rows.filter(p => p.pract === colFilters.pract);
    if (colFilters.age) {
      const a = colFilters.age;
      rows = rows.filter(p => {
        if (a.mode === "single") return p.age === a.value;
        const m = parseAgeMonths(p.age);
        if (m == null) return false;
        const min = a.minYears != null ? a.minYears * 12 : -Infinity;
        const max = a.maxYears != null ? (a.maxYears + 1) * 12 - 1 : Infinity;
        return m >= min && m <= max;
      });
    }
    if (colFilters.date) {
      // p.apptDate stored as YYYY-MM-DD if present; otherwise convert from MM/DD/YYYY
      const toIso = (s) => {
        if (!s) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
        return m ? `${m[3]}-${m[1]}-${m[2]}` : s;
      };
      const d = colFilters.date;
      rows = rows.filter(p => {
        const iso = toIso(p.apptDate || "04/09/2026");
        if (d.mode === "single") return iso === d.date;
        return iso >= d.from && iso <= d.to;
      });
    }
    if (colFilters.time) {
      const t = colFilters.time;
      rows = rows.filter(p => {
        if (t.mode === "single") return p.time === t.value;
        const mins = parseTime12(p.time);
        if (mins == null) return false;
        const lo = timeMinutesFrom24(t.from);
        const hi = timeMinutesFrom24(t.to);
        if (lo == null || hi == null) return false;
        const a = Math.min(lo, hi), b = Math.max(lo, hi);
        return mins >= a && mins <= b;
      });
    }
    return rows;
  }, [patients, filter, colFilters, ROLE_QUEUE_STATUS, roleShowAll, hiddenIds, statFilter]);

  // Build option lists from the full patient set (so users can still re-select
  // values that are currently filtered out).
  const todaysPatients = React.useMemo(() => patients.filter(p => !!p.status), [patients]);
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const locationOptions = Object.entries(LOCATIONS).map(([k, v]) => ({
    value: k, label: v.name, sub: v.city,
    count: todaysPatients.filter(p => p.loc === k).length,
  })).filter(o => o.count > 0);
  const practitionerOptions = PRACTITIONERS.map(pr => ({
    value: pr.id, label: pr.name, sub: pr.department || pr.role,
    count: todaysPatients.filter(p => p.pract === pr.id).length,
  })).filter(o => o.count > 0);
  const ageOptions = uniq(todaysPatients.map(p => p.age)).map(a => ({
    value: a, label: a,
    count: todaysPatients.filter(p => p.age === a).length,
  }));
  const dateOptions = uniq(todaysPatients.map(p => p.apptDate || "04/09/2026")).map(d => ({
    value: d, label: d,
    count: todaysPatients.filter(p => (p.apptDate || "04/09/2026") === d).length,
  }));
  const timeOptions = uniq(todaysPatients.map(p => p.time)).sort().map(t => ({
    value: t, label: t,
    count: todaysPatients.filter(p => p.time === t).length,
  }));
  const setCol = (k, v) => setColFilters(prev => ({ ...prev, [k]: v }));
  // Status options shown in filter chips.
  const STATUS_OPTIONS = ["Confirmed","Checked-in","Ready for Provider","Completed","Rescheduled","No Show","Cancelled"];

  // Reason modal for Reschedule / Cancel transitions.
  const [reasonFor, setReasonFor] = React.useState(null); // { pid, action }

  const statusOptions = STATUS_OPTIONS.map(s => ({
    value: s,
    label: (
      <span className="inline-flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: window.CHAVITOS.STATUS_STYLES[s]?.dot }} />
        {s}
      </span>
    ),
    count: todaysPatients.filter(p => p.status === s).length,
  })).filter(o => o.count > 0);

  return (
    <div className="px-5 pt-4 pb-32 h-full overflow-y-auto">
      {patients.length === 0 ? (
        <EmptyDashboardOnboarding onNewAppt={() => window.dispatchEvent(new CustomEvent("chavitos:new-appt"))} />
      ) : (
      <React.Fragment>
      {/* Role-scoped queue banner — shows nurses and practitioners what's
          actionable for them, with a toggle to widen the view. */}
      {ROLE_QUEUE_STATUS && (() => {
        const queueCount = patients.filter(p => p.status === ROLE_QUEUE_STATUS).length;
        const tone = ROLE.tone;
        const headline = role === "nurse"
          ? "Vitals queue · patients waiting for intake"
          : "Provider queue · patients ready for you";
        const empty = role === "nurse"
          ? "No checked-in patients right now. New arrivals show up here automatically."
          : "No patients are ready yet. The nurse will mark them ready after vitals.";
        return (
          <div
            className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl border"
            style={{ background: `linear-gradient(90deg, ${tone.bg} 0%, rgba(255,255,255,0.6) 100%)`, borderColor: tone.dot + "55" }}
          >
            <span className="size-8 rounded-lg flex items-center justify-center text-white text-[11.5px] font-bold shrink-0 shadow-sm" style={{ background: tone.dot }}>
              {ROLE.badge}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: tone.text }}>
                {headline}
              </div>
              <div className="text-[12.5px] text-slate-700 mt-0.5">
                {queueCount > 0 ? (
                  <React.Fragment>
                    <span className="font-semibold" style={{ color: tone.text }}>{queueCount}</span>{" "}
                    patient{queueCount === 1 ? "" : "s"}{" "}
                    {role === "nurse" ? "waiting for vitals" : "ready for the encounter"}
                  </React.Fragment>
                ) : empty}
              </div>
            </div>
            <button
              onClick={() => setRoleShowAll(s => !s)}
              className="h-7 px-3 rounded-md bg-white/80 hover:bg-white border border-slate-200 text-[11.5px] font-semibold text-slate-700 transition"
            >
              {roleShowAll ? "Focus my queue" : "View all today"}
            </button>
          </div>
        );
      })()}
      {/* Stat strip */}
      {(() => {
        const todays = patients.filter(p => !!p.status);
        const withProvider = todays.filter(p => p.status === "Ready for Provider").length;
        const waiting = todays.filter(p => p.status === "Checked-in").length;
        const completed = todays.filter(p => p.status === "Completed").length;
        const noShowCount     = todays.filter(p => p.status === "No Show").length;
        const rescheduledCount = todays.filter(p => p.status === "Rescheduled").length;
        const cancelledCount  = todays.filter(p => p.status === "Cancelled").length;
        const pendingList = todays.filter(p => p.billing?.status === "Pending" && p.billing?.reminderActive && p.status === "Completed");
        const pendingCount = pendingList.length;
        const pendingTotal = pendingList.reduce((s, p) => s + (p.billing?.total || 0), 0);
        return (
          <React.Fragment>
            {/* Payment-to-collect banner — shown when there are completed
                encounters with payment still pending. */}
            {pendingCount > 0 && CAPS.collectPayment && (
              <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 via-amber-100/70 to-white border border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-amber-800">Payments to collect</span>
                </div>
                <span className="text-[16px] font-bold text-amber-900">{pendingCount}</span>
                <span className="text-[12.5px] text-slate-700">
                  patient{pendingCount === 1 ? "" : "s"} checked out, still owe
                  <span className="font-semibold text-amber-900"> ${pendingTotal.toLocaleString()} MXN</span>
                </span>
                <button
                  onClick={() => {
                    const first = pendingList[0];
                    if (first) setCollectPaymentFor(first);
                  }}
                  className="ml-auto h-7 px-3 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[11.5px] font-semibold transition inline-flex items-center gap-1"
                >
                  <Icon.invoice size={11}/> Collect next
                </button>
              </div>
            )}
            <div className="grid grid-cols-7 gap-2.5 mb-4">
              <StatCard
                label="Today's Appointments"
                value={todays.length}
                sub={`${todays.filter(p=>p.status==='Confirmed').length} upcoming`}
                tone="sky" icon={<Icon.calendar size={14} />}
                active={statFilter === "all"}
                onClick={() => setStatFilter(statFilter === "all" ? null : "all")}
              />
              <StatCard
                label="Waiting · Checked-in"
                value={waiting}
                sub="in queue"
                tone="cyan" icon={<Icon.user size={14} />}
                active={statFilter === "checked-in"}
                onClick={() => setStatFilter(statFilter === "checked-in" ? null : "checked-in")}
              />
              <StatCard
                label="In checkup now"
                value={withProvider}
                sub={`${completed} completed`}
                tone="emerald" icon={<Icon.activity size={14} />}
                active={statFilter === "ready"}
                onClick={() => setStatFilter(statFilter === "ready" ? null : "ready")}
              />
              <StatCard
                label="Payment pending"
                value={pendingCount}
                sub={pendingTotal ? `$${pendingTotal.toLocaleString()} MXN` : "all collected"}
                tone="orange" icon={<Icon.invoice size={14} />}
                active={statFilter === "pending-payment"}
                onClick={() => setStatFilter(statFilter === "pending-payment" ? null : "pending-payment")}
              />
              <StatCard
                label="No show"
                value={noShowCount}
                sub={noShowCount === 0 ? "none today" : "today"}
                tone="rose" icon={<Icon.alert size={14} />}
                active={statFilter === "no-show"}
                onClick={() => setStatFilter(statFilter === "no-show" ? null : "no-show")}
              />
              <StatCard
                label="Rescheduled"
                value={rescheduledCount}
                sub={rescheduledCount === 0 ? "none today" : "today"}
                tone="amber" icon={<Icon.calendar size={14} />}
                active={statFilter === "rescheduled"}
                onClick={() => setStatFilter(statFilter === "rescheduled" ? null : "rescheduled")}
              />
              <StatCard
                label="Cancelled"
                value={cancelledCount}
                sub={cancelledCount === 0 ? "none today" : "today"}
                tone="slate" icon={<Icon.close size={14} />}
                active={statFilter === "cancelled"}
                onClick={() => setStatFilter(statFilter === "cancelled" ? null : "cancelled")}
              />
            </div>
          </React.Fragment>
        );
      })()}

      {/* Table */}
      {(() => {
        const activeChips = [];
        if (colFilters.q) activeChips.push({ k: "q", label: `Search: "${colFilters.q}"` });
        if (colFilters.loc) {
          const v = colFilters.loc;
          activeChips.push({ k: "loc", label: `Location: ${LOCATIONS[v]?.name || v}` });
        }
        if (colFilters.pract) {
          const v = colFilters.pract;
          const pr = PRACTITIONERS.find(x => x.id === v);
          activeChips.push({ k: "pract", label: `Practitioner: ${pr?.name || v}` });
        }
        if (colFilters.age) {
          const a = colFilters.age;
          const label = a.mode === "single"
            ? `Age: ${a.value}`
            : `Age: ${a.minYears ?? 0}–${a.maxYears ?? "∞"} yrs`;
          activeChips.push({ k: "age", label });
        }
        if (colFilters.date) {
          const d = colFilters.date;
          const fmt = (iso) => { const [y,m,da] = iso.split("-"); return `${m}/${da}/${y}`; };
          const label = d.mode === "single"
            ? `Date: ${fmt(d.date)}`
            : `Date: ${fmt(d.from)} – ${fmt(d.to)}`;
          activeChips.push({ k: "date", label });
        }
        if (colFilters.time) {
          const t = colFilters.time;
          const label = t.mode === "single"
            ? `Time: ${t.value}`
            : `Time: ${formatTime24To12(t.from)} – ${formatTime24To12(t.to)}`;
          activeChips.push({ k: "time", label });
        }
        if (colFilters.status) activeChips.push({ k: "status", label: `Status: ${colFilters.status}` });
        if (activeChips.length === 0) return null;
        return (
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="text-[11.5px] text-slate-500 font-medium">Filters:</span>
            {activeChips.map(c => (
              <span key={c.k}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-sky-100 text-sky-800 text-[11.5px] font-medium border border-sky-200">
                {c.label}
                <button onClick={() => setCol(c.k, null)} className="hover:bg-sky-200 rounded-full p-0.5">
                  <Icon.close size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setColFilters({ q: null, loc: null, pract: null, age: null, date: null, time: null, status: null })}
              className="text-[11.5px] text-slate-600 hover:text-rose-600 hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        );
      })()}

      <Card className="overflow-hidden">
        <div className="grid items-center text-[11px] font-medium uppercase tracking-wide text-slate-500 px-5 py-3 bg-slate-50/70 border-b border-slate-200/70"
          style={{ gridTemplateColumns: "1.7fr 1.55fr 1.7fr 0.8fr 1fr 0.85fr 1.1fr" }}
        >
          <div>
            <TextSearchColumnFilter
              title="Patient Name"
              placeholder="Name, MRN, phone, or email…"
              current={colFilters.q}
              onChange={(v) => setCol("q", v)}
              items={patients}
            />
          </div>
          <div className="text-left"><ColumnFilter title="Location"     options={locationOptions}     current={colFilters.loc}   onChange={(v) => setCol("loc", v)} /></div>
          <div className="text-left"><ColumnFilter title="Practitioner" options={practitionerOptions} current={colFilters.pract} onChange={(v) => setCol("pract", v)} /></div>
          <div className="text-left"><AgeRangeColumnFilter title="Age" options={ageOptions} current={colFilters.age} onChange={(v) => setCol("age", v)} /></div>
          <div className="text-left"><DateRangeColumnFilter title="Appt. Date" current={colFilters.date} onChange={(v) => setCol("date", v)} /></div>
          <div className="text-left"><TimeRangeColumnFilter title="Appt. Time" options={timeOptions} current={colFilters.time} onChange={(v) => setCol("time", v)} /></div>
          <div className="text-right">
            <ColumnFilter title="Status" options={statusOptions} current={colFilters.status} onChange={(v) => setCol("status", v)} align="right" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {data.map((p, idx) => {
            const loc = LOCATIONS[p.loc];
            const pr  = PRACTITIONERS.find(x => x.id === p.pract);
            return (
              <div
                key={p.id}
                className={cx(
                  "grid items-center px-5 py-3.5 hover:bg-sky-50/40 cursor-pointer transition-all group overflow-hidden",
                  leavingIds.has(p.id) && "opacity-0 -translate-x-6 max-h-0 py-0 pointer-events-none"
                )}
                style={{
                  gridTemplateColumns: "1.7fr 1.55fr 1.7fr 0.8fr 1fr 0.85fr 1.1fr",
                  transitionDuration: "480ms",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onClick={() => setOpenApptFor(p)}
              >
                {/* Patient */}
                <div className="flex items-center gap-3 min-w-0 pr-5">
                  <BabyAvatar size={40} swatch={p.swatch} name={p.name} ring />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 min-w-0">
                      <span className="truncate">{p.name}</span>
                      {p.isNew && (
                        <Badge color={{ bg: "#FFEDD4", text: "#CA3500", border: "#FFD6A8" }} className="!text-[10px] shrink-0">New</Badge>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-500 font-mono">{p.mrn}</div>
                  </div>
                </div>

                {/* Location */}
                <div className="text-[13px] leading-tight">
                  <div className="font-semibold text-slate-900">{loc.name},</div>
                  <div className="text-slate-500">{loc.city}</div>
                </div>

                {/* Practitioner */}
                <div className="flex items-center gap-2 min-w-0">
                  {pr.avatar
                    ? <img src={pr.avatar} className="size-7 rounded-full object-cover" alt="" />
                    : <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white" style={{ background: pr.color }}>{pr.initials}</div>
                  }
                  <div className="text-[13px] text-slate-800 truncate">{pr.name}</div>
                </div>

                {/* Age */}
                <div className="text-[13px] text-slate-700">{p.age}</div>

                {/* Date */}
                <div className="text-[13px] text-slate-700 font-mono">{"04/09/2026"}</div>

                {/* Time */}
                <div className="text-[13px] text-slate-700 font-mono">{p.time}</div>

                {/* Status */}
                <div className="relative flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  {p.billing?.reminderActive && p.billing?.status === "Pending" && CAPS.collectPayment && (
                    <button
                      onClick={() => setCollectPaymentFor(p)}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-semibold transition animate-pulse"
                      title={`Collect $${(p.billing.total || 0).toLocaleString()} MXN`}
                    >
                      <Icon.invoice size={11}/>
                      Collect ${(p.billing.total || 0).toLocaleString()}
                    </button>
                  )}
                  {p.billing?.status === "Paid" && p.status === "Completed" && (
                    <Badge color={{ bg:"#D1FAE5", text:"#065F46" }} className="!text-[10px]">Paid</Badge>
                  )}
                  {pendingUndo[p.id] && pendingUndo[p.id].current === p.status && (
                    <UndoStatusButton
                      deadline={pendingUndo[p.id].deadline}
                      label="Undo"
                      onUndo={() => onChangeStatus(p.id, pendingUndo[p.id].prev, { silent: true })}
                    />
                  )}
                  {!(p.status === "Completed" && p.billing?.reminderActive && p.billing?.status === "Pending" && CAPS.collectPayment) && (
                    <StatusPillTrigger
                      patient={p}
                      role={role}
                      isOpen={openStatusFor === p.id}
                      onToggle={() => setOpenStatusFor(openStatusFor === p.id ? null : p.id)}
                      onClose={() => setOpenStatusFor(null)}
                      pendingUndo={pendingUndo[p.id]}
                      onPick={(s, meta) => {
                        if (s === "Rescheduled" || s === "Cancelled") {
                          setOpenStatusFor(null);
                          setReasonFor({ pid: p.id, action: s });
                          return;
                        }
                        onChangeStatus(p.id, s, meta);
                        setOpenStatusFor(null);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {data.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><Icon.calendar size={20} /></div>
            <div className="text-[13px]">No appointments match this filter.</div>
          </div>
        )}
      </Card>

      {openApptFor && (
        <AppointmentRowDialog
          patientRow={openApptFor}
          role={role}
          onClose={() => setOpenApptFor(null)}
          onOpenPatient={(id, tab) => { setOpenApptFor(null); onOpenPatient(id, tab); }}
          onStartEncounter={(id) => {
            setOpenApptFor(null);
            window.dispatchEvent(new CustomEvent("chavitos:start-encounter", { detail: { patientId: id } }));
          }}
          onChangeStatus={(id, s) => { onChangeStatus(id, s); }}
          onSaveVitals={onSaveVitals}
          onCollectPayment={(patient) => { setOpenApptFor(null); setCollectPaymentFor(patient); }}
        />
      )}

      {collectPaymentFor && (
        <CollectPaymentDialog
          patient={collectPaymentFor}
          onClose={() => setCollectPaymentFor(null)}
          onConfirm={(payment) => {
            window.dispatchEvent(new CustomEvent("chavitos:collect-payment", {
              detail: { patientId: collectPaymentFor.id, payment },
            }));
            setCollectPaymentFor(null);
          }}
        />
      )}

      {reasonFor && (
        <ReasonDialog
          action={reasonFor.action}
          patient={patients.find(p => p.id === reasonFor.pid)}
          onClose={() => setReasonFor(null)}
          onConfirm={(reason) => {
            onChangeStatus(reasonFor.pid, reasonFor.action, { meta: { reason } });
            setReasonFor(null);
          }}
        />
      )}
      </React.Fragment>
      )}
    </div>
  );
}

// ── Vitals intake (nurse capture) ────────────────────────────
// Pediatric-aware abnormal flagging (simplified for the demo). Returns
// "high" | "low" | null. Infants (<1yr, age string in months) get wider
// HR / RR ceilings.
function vitalFlag(key, val, ageStr) {
  const n = parseFloat(val);
  if (val === "" || val == null || Number.isNaN(n)) return null;
  const infant = /month/i.test(ageStr || "");
  switch (key) {
    case "temp": return n >= 37.6 ? "high" : n < 36 ? "low" : null;
    case "hr":   return n > (infant ? 160 : 110) ? "high" : n < (infant ? 90 : 60) ? "low" : null;
    case "rr":   return n > (infant ? 50 : 30) ? "high" : n < (infant ? 24 : 14) ? "low" : null;
    case "spo2": return n < 95 ? "low" : null;
    case "pain": return n >= 7 ? "high" : n >= 4 ? "mid" : null;
    default:     return null;
  }
}

const VITAL_FIELD_KEYS = ["temp","hr","rr","spo2","weight","height","hc","sys","dia","pain"];

function VitalsIntake({ p, role, captured, onSave }) {
  const canCapture = !!(window.CHAVITOS_ROLES?.[role]?.capabilities?.markReady);
  const editable = canCapture && p.status === "Checked-in";

  // Seed values as if pulled from the connected intake station — the nurse
  // confirms or overrides them.
  const seed = React.useMemo(() => {
    const h = (s) => { let n = 0; for (const c of String(s)) n = (n*31 + c.charCodeAt(0)) >>> 0; return n; };
    const vh = h(p.id);
    const infant = /month/i.test(p.age || "");
    return {
      temp:   (36.4 + (vh % 14) / 10).toFixed(1),
      hr:     String(infant ? 120 + (vh % 30) : 92 + (vh % 28)),
      rr:     String(infant ? 32 + (vh % 10) : 20 + (vh % 8)),
      spo2:   String(96 + (vh % 4)),
      weight: infant ? (7 + (vh % 30) / 10).toFixed(1) : String(11 + (vh % 18)),
      height: infant ? String(64 + (vh % 10)) : String(85 + (vh % 35)),
      hc:     (44 + (vh % 80) / 10).toFixed(1),
      sys:    String(88 + (vh % 22)),
      dia:    String(55 + ((vh >> 3) % 18)),
      pain:   String(vh % 3),
    };
  }, [p.id]);

  const [v, setV] = React.useState(() => ({ ...seed, ...(captured || {}) }));
  const set = (k, val) => setV(prev => ({ ...prev, [k]: val }));

  const sig = (o) => VITAL_FIELD_KEYS.map(k => (o?.[k] ?? "")).join("|");
  const [savedSig, setSavedSig] = React.useState(captured ? sig(captured) : null);
  const dirty = sig(v) !== savedSig;
  const isSaved = savedSig != null && !dirty;

  const bmi = (() => {
    const w = parseFloat(v.weight), ht = parseFloat(v.height);
    if (!w || !ht) return null;
    return +(w / Math.pow(ht / 100, 2)).toFixed(1);
  })();
  const anyAbnormal = VITAL_FIELD_KEYS.some(k => vitalFlag(k, v[k], p.age) === "high" || vitalFlag(k, v[k], p.age) === "low");

  const handleSave = () => {
    const payload = {};
    VITAL_FIELD_KEYS.forEach(k => { payload[k] = v[k]; });
    payload.bmi = bmi;
    onSave(payload);
    setSavedSig(sig(v));
  };

  const FIELDS = [
    { key: "temp",   label: "Temp",   unit: "°C",   icon: <Icon.thermo size={12}/> },
    { key: "hr",     label: "HR",     unit: "bpm",  icon: <Icon.heart size={12}/> },
    { key: "rr",     label: "Resp",   unit: "/min", icon: <Icon.activity size={12}/> },
    { key: "spo2",   label: "SpO₂",   unit: "%",    icon: <Icon.drop size={12}/> },
    { key: "weight", label: "Weight", unit: "kg",   icon: <Icon.weight size={12}/> },
    { key: "height", label: "Height", unit: "cm",   icon: <Icon.ruler size={12}/> },
    { key: "hc",     label: "Head",   unit: "cm",   icon: <Icon.ruler size={12}/> },
  ];

  // ── Read-only mode (non-nurse, or nurse looking at a non-checked-in row) ──
  if (!editable) {
    const src = captured || seed;
    const tiles = [
      ...FIELDS.map(f => ({ label: f.label, value: `${src[f.key] ?? "—"} ${f.unit}`, key: f.key, raw: src[f.key] })),
      { label: "BP",   value: `${src.sys}/${src.dia}`, key: "bp" },
      { label: "Pain", value: `${src.pain} / 10`, key: "pain", raw: src.pain },
    ];
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vitals intake</div>
          {captured ? (
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Icon.check size={10}/> Captured by {captured.by} · {captured.at}
            </span>
          ) : (
            <span className="text-[10.5px] text-slate-400">From intake station · not yet confirmed</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {tiles.map(t => {
            const flag = vitalFlag(t.key, t.raw, p.age);
            const abn = flag === "high" || flag === "low";
            return (
              <div key={t.label} className={cx("p-2.5 rounded-lg border", abn ? "bg-rose-50/70 border-rose-200" : "bg-sky-50/60 border-sky-100")}>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{t.label}</div>
                  {abn && <span className="text-[9px] font-semibold text-rose-600">{flag === "high" ? "High" : "Low"}</span>}
                </div>
                <div className={cx("text-[14px] font-bold mt-0.5", abn ? "text-rose-700" : "text-slate-900")}>{t.value}</div>
              </div>
            );
          })}
        </div>
        {!captured && (
          <div className="mt-2 text-[11.5px] text-slate-500 flex items-center gap-1.5">
            <Icon.alert size={12}/> Awaiting nurse confirmation. The nurse captures and signs off vitals at intake.
          </div>
        )}
      </div>
    );
  }

  // ── Editable mode (nurse, checked-in) ──
  return (
    <div className={cx("rounded-xl border p-3.5", isSaved ? "border-emerald-200 bg-emerald-50/30" : "border-violet-200 bg-violet-50/30")}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="size-7 rounded-lg bg-violet-500 text-white flex items-center justify-center"><Icon.activity size={13}/></span>
          <div>
            <div className="text-[12.5px] font-semibold text-slate-900 leading-tight">Capture vitals</div>
            <div className="text-[10.5px] text-slate-500">Confirm or override the readings from the intake station.</div>
          </div>
        </div>
        {isSaved && (
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            <Icon.check size={10}/> Saved {captured?.at ? `· ${captured.at}` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {FIELDS.map(f => {
          const flag = vitalFlag(f.key, v[f.key], p.age);
          const abn = flag === "high" || flag === "low";
          return (
            <div key={f.key} className={cx(
              "rounded-lg border px-2.5 py-1.5 bg-white transition",
              abn ? "border-rose-300 ring-1 ring-rose-200/60" : "border-slate-200 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] uppercase tracking-wide font-semibold text-slate-500 flex items-center gap-1">
                  <span className={abn ? "text-rose-500" : "text-slate-400"}>{f.icon}</span>{f.label}
                </span>
                {abn && <span className="text-[8.5px] font-bold text-rose-600 uppercase">{flag}</span>}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <input
                  value={v[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  className={cx("w-full bg-transparent outline-none text-[16px] font-bold font-mono", abn ? "text-rose-700" : "text-slate-900")}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
                <span className="text-[10px] text-slate-400">{f.unit}</span>
              </div>
            </div>
          );
        })}

        {/* Blood pressure — paired sys/dia */}
        <div className="rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition">
          <div className="text-[9.5px] uppercase tracking-wide font-semibold text-slate-500 flex items-center gap-1">
            <span className="text-slate-400"><Icon.drop size={12}/></span>BP
          </div>
          <div className="flex items-baseline gap-0.5 mt-0.5">
            <input value={v.sys} onChange={(e) => set("sys", e.target.value)} inputMode="numeric" placeholder="—"
              className="w-8 bg-transparent outline-none text-[16px] font-bold font-mono text-slate-900 text-right" style={{ fontVariantNumeric: "tabular-nums" }} />
            <span className="text-[15px] font-bold text-slate-400">/</span>
            <input value={v.dia} onChange={(e) => set("dia", e.target.value)} inputMode="numeric" placeholder="—"
              className="w-8 bg-transparent outline-none text-[16px] font-bold font-mono text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }} />
            <span className="text-[10px] text-slate-400 ml-auto">mmHg</span>
          </div>
        </div>
      </div>

      {/* Secondary row — pain scale + computed BMI */}
      <div className="grid grid-cols-[1fr_auto] gap-3 items-center mt-2.5">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] uppercase tracking-wide font-semibold text-slate-500">Pain (0–10)</span>
            <span className="text-[10px] font-mono font-semibold text-slate-700">{v.pain || "0"}/10</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 11 }, (_, i) => {
              const active = parseInt(v.pain, 10) === i;
              const tone = i >= 7 ? "bg-rose-500" : i >= 4 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <button key={i} type="button" onClick={() => set("pain", String(i))}
                  className={cx("flex-1 h-5 rounded text-[9.5px] font-semibold transition",
                    active ? cx(tone, "text-white") : "bg-slate-100 text-slate-400 hover:bg-slate-200")}>
                  {i}
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-center px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[9.5px] uppercase tracking-wide font-semibold text-slate-500">BMI</div>
          <div className="text-[15px] font-bold text-slate-900 font-mono">{bmi ?? "—"}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-[10.5px] text-slate-500">
          {anyAbnormal
            ? <span className="text-rose-600 font-medium inline-flex items-center gap-1"><Icon.alert size={11}/> Out-of-range readings flagged for the provider.</span>
            : isSaved ? <span className="text-emerald-700 inline-flex items-center gap-1"><Icon.check size={11}/> Vitals on file. You can mark this patient ready.</span>
            : "Readings stay on the chart and carry into the encounter."}
        </div>
        <Button
          variant={dirty ? "primary" : "secondary"}
          size="sm"
          icon={<Icon.check size={12}/>}
          disabled={!dirty}
          onClick={handleSave}
        >
          {!dirty && isSaved ? "Saved" : captured ? "Save changes" : "Save vitals"}
        </Button>
      </div>
    </div>
  );
}

// ── Appointment row dialog (clicked from the dashboard / appointment book) ──
// Today-centric: shows today's vitals intake, reason for visit, clinical
// summaries, and contextual CTAs based on the appointment status.
function AppointmentRowDialog({ patientRow, role = "frontdesk", onClose, onOpenPatient, onStartEncounter, onChangeStatus, onSaveVitals, onCollectPayment }) {
  const { PRACTITIONERS, LOCATIONS, MEDICATIONS, IMMUNIZATIONS, STATUS_STYLES } = window.CHAVITOS;
  const CAPS = (window.CHAVITOS_ROLES?.[role] || window.CHAVITOS_ROLES?.frontdesk)?.capabilities || {};
  const ROLE_USER = (window.CHAVITOS_ROLES?.[role] || {}).user || {};
  const p = patientRow;
  const pr = PRACTITIONERS.find(x => x.id === p.pract);
  const loc = LOCATIONS[p.loc];
  const style = STATUS_STYLES[p.status] || { dot: "#94A3B8" };

  const isActive    = ["Scheduled","Confirmed","Checked-in","Ready for Provider"].includes(p.status);
  const isCompleted = p.status === "Checked-out";
  const isNegative  = p.status === "No Show" || p.status === "Cancelled";

  const activeMeds = MEDICATIONS.filter(m => m.status === "Active");
  const recentImms = IMMUNIZATIONS.slice(0, 3);

  // Vitals captured by the nurse this session (mirrors patient.vitalsIntake).
  const [captured, setCaptured] = React.useState(p.vitalsIntake || null);
  const handleSaveVitals = (vitals) => {
    const at = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setCaptured({ ...vitals, by: ROLE_USER.name || "Nurse", at });
    onSaveVitals && onSaveVitals(p.id, vitals);
  };

  const QUICK_STATUSES = ["Scheduled","Confirmed","Checked-in","Ready for Provider","Checked-out","No Show","Cancelled"];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[760px] max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={cx(
          "px-5 py-3.5 border-b border-slate-200 shrink-0 flex items-center justify-between",
          isActive    ? "bg-gradient-to-r from-sky-50 to-white" :
          isCompleted ? "bg-gradient-to-r from-emerald-50 to-white" :
                        "bg-gradient-to-r from-slate-50 to-white"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <BabyAvatar size={42} swatch={p.swatch} name={p.name} ring />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[15px] font-semibold text-slate-900 truncate">{p.name}</div>
                {p.isNew && <Badge color={{ bg:"#FFEDD4", text:"#CA3500", border:"#FFD6A8" }}>New</Badge>}
              </div>
              <div className="text-[11.5px] text-slate-500 truncate">
                <span className="font-mono">{p.mrn}</span> · {p.age} · {p.sex === "M" ? "Male" : "Female"}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        {/* Appointment meta row */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 text-[12px] shrink-0">
          <div className="flex items-center gap-1.5"><Icon.calendar size={12}/><span className="text-slate-700">Today, May 27 · {p.time}</span></div>
          {pr && (
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="size-4 rounded-full text-[8.5px] text-white font-bold inline-flex items-center justify-center" style={{ background: pr.color }}>{pr.initials}</span>
              <span>{pr.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{pr.department || pr.role}</span>
            </div>
          )}
          {loc && <div className="flex items-center gap-1.5 text-slate-500 ml-auto">{loc.name} · {loc.city}</div>}
        </div>

        {/* Status pill */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <span className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold">Status</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-medium" style={{ background: style.bg, color: style.text }}>
            <span className="size-1.5 rounded-full bg-white/80" /> {p.status}
          </span>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {isActive && (
            <React.Fragment>
              <VitalsIntake p={p} role={role} captured={captured} onSave={handleSaveVitals} />

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10.5px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Reason for visit</div>
                  <div className="text-[12.5px] text-slate-800">Routine well-child exam · age-appropriate developmental screening</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                  <div className="text-[10.5px] uppercase tracking-wide text-rose-700 font-semibold mb-1">Allergies</div>
                  <div className="text-[12.5px] text-slate-800">{(p.allergies || []).join(", ") || "No known allergies"}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <ApptSummaryMini title="Clinical history" icon={<Icon.heart size={12}/>} tone="amber"
                  items={(p.chronicCare && p.chronicCare.length > 0) ? p.chronicCare : ["No chronic conditions on file"]} />
                <ApptSummaryMini title="Active medications" icon={<Icon.pill size={12}/>} tone="sky"
                  items={activeMeds.length ? activeMeds.map(m => `${m.name} · ${m.dose}`) : ["No active medications"]} />
                <ApptSummaryMini title="Recent immunizations" icon={<Icon.syringe size={12}/>} tone="emerald"
                  items={recentImms.length ? recentImms.map(i => `${i.name} · ${i.date}`) : ["—"]} />
              </div>
            </React.Fragment>
          )}

          {isCompleted && (
            <React.Fragment>
              {p.billing?.status === "Pending" ? (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Icon.invoice size={16}/>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-amber-900">Payment pending</div>
                      <div className="text-[12.5px] text-slate-700">
                        Visit completed. Collect <span className="font-semibold">${(p.billing.total || 0).toLocaleString()} MXN</span> in cash, card, or bank transfer.
                      </div>
                    </div>
                    <Button variant="primary" size="sm" icon={<Icon.invoice size={12}/>} onClick={() => onCollectPayment(p)} disabled={!CAPS.collectPayment} title={!CAPS.collectPayment ? "Only front desk can collect payments" : undefined}>
                      Collect now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[13px] font-semibold text-emerald-900 mb-1">Visit completed</div>
                  <div className="text-[12.5px] text-slate-700">
                    {p.billing?.status === "Paid"
                      ? `Paid $${(p.billing.total || 0).toLocaleString()} MXN via ${p.billing.method}.`
                      : "Check out finished. Provider notes were saved during the encounter."}
                  </div>
                </div>
              )}
            </React.Fragment>
          )}

          {isNegative && (
            <div className={cx(
              "p-4 rounded-xl border",
              p.status === "No Show" ? "bg-rose-50/60 border-rose-200" : "bg-slate-50 border-slate-200"
            )}>
              <div className="text-[13px] font-semibold mb-1 text-slate-900">
                {p.status === "No Show" ? "Patient did not arrive" : "Appointment cancelled"}
              </div>
              <div className="text-[12.5px] text-slate-700">
                {p.status === "No Show"
                  ? "Reach out to the family to reschedule. You can change the status back to Scheduled or Confirmed once the visit is rebooked."
                  : "This appointment was cancelled. The slot is now available for other bookings."}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <Button variant="ghost" size="sm" icon={<Icon.user size={12}/>} onClick={() => onOpenPatient(p.id, "vitals")}>
            Open patient chart
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            {isActive && CAPS.checkIn && p.status === "Confirmed" && (
              <Button variant="primary" size="sm" icon={<Icon.check size={12}/>} onClick={() => { onChangeStatus(p.id, "Checked-in"); onClose(); }}>
                Mark checked-in
              </Button>
            )}
            {isActive && CAPS.markReady && p.status === "Checked-in" && (
              <Button
                variant="primary"
                size="sm"
                icon={<Icon.activity size={12}/>}
                disabled={!captured}
                title={!captured ? "Capture and save vitals first" : undefined}
                onClick={() => { onChangeStatus(p.id, "Ready for Provider"); onClose(); }}
              >
                {captured ? "Vitals done · Ready for provider" : "Capture vitals to continue"}
              </Button>
            )}
            {isActive && CAPS.startEncounter && p.status === "Ready for Provider" && (
              <Button variant="primary" size="sm" icon={<Icon.stetho size={14}/>} onClick={() => onStartEncounter(p.id)}>
                Start encounter
              </Button>
            )}
            {isCompleted && CAPS.invoices && (
              <Button variant="primary" size="sm" icon={<Icon.invoice size={12}/>} onClick={() => onOpenPatient(p.id, "visits")}>
                View report
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ApptSummaryMini({ title, icon, tone, items }) {
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

// Portaled status pill trigger so the dropdown escapes the table's overflow-hidden card.
function StatusPillTrigger({ patient, role = "frontdesk", isOpen, onToggle, onClose, pendingUndo, onPick }) {
  const btnRef = React.useRef(null);
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState(null);

  React.useEffect(() => {
    if (!isOpen) { setPos(null); return; }
    const compute = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = 208;
      setPos({ top: r.bottom + 6, left: Math.max(8, r.right - w), width: w });
    };
    compute();
    const onDoc = (e) => {
      const inTrigger = btnRef.current && btnRef.current.contains(e.target);
      const inPop = popRef.current && popRef.current.contains(e.target);
      if (!inTrigger && !inPop) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [isOpen, onClose]);

  return (
    <React.Fragment>
      <button ref={btnRef} onClick={onToggle}>
        <StatusPill status={patient.status} />
      </button>
      {isOpen && pos && ReactDOM.createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 90 }}
        >
          <StatusDropdown patient={patient} role={role} pendingUndo={pendingUndo} onClose={onClose} onPick={onPick} />
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}

// ── Context-sensitive status dropdown ─────────────────────────
// Confirmed              → Checked-in [sep] Reschedule, No Show, Cancelled
// Checked-in (in undo)   → Confirmed, Ready for Provider [sep] Reschedule, Cancelled
// Checked-in (locked)    →             Ready for Provider [sep] Reschedule, Cancelled
// Ready for Provider     → Checked-in (if within undo window) — else no options
// No Show (in undo)      → Confirmed
// Anything terminal      → (no dropdown)
function StatusDropdown({ patient, role = "frontdesk", pendingUndo, onClose, onPick }) {
  const { STATUS_STYLES } = window.CHAVITOS;
  const CAPS = (window.CHAVITOS_ROLES?.[role] || window.CHAVITOS_ROLES?.frontdesk)?.capabilities || {};
  let primary = [];
  let secondary = [];

  if (patient.status === "Confirmed") {
    if (CAPS.checkIn) primary.push("Checked-in");
    if (CAPS.rescheduleCancel) secondary.push("Rescheduled");
    if (CAPS.noShow) secondary.push("No Show");
    if (CAPS.rescheduleCancel) secondary.push("Cancelled");
  } else if (patient.status === "Checked-in") {
    if (pendingUndo && CAPS.checkIn) primary.push("Confirmed");
    if (CAPS.markReady) primary.push("Ready for Provider");
    if (CAPS.rescheduleCancel) secondary.push("Rescheduled", "Cancelled");
  } else if (patient.status === "Ready for Provider") {
    if (pendingUndo && CAPS.markReady) primary.push("Checked-in");
  } else if (patient.status === "No Show") {
    // No Show stays reversible all day for the role that can mark it.
    if (CAPS.noShow) primary.push("Confirmed");
  }

  const items = [
    ...primary.map(s => ({ s, group: "primary" })),
    ...(primary.length && secondary.length ? [{ separator: true }] : []),
    ...secondary.map(s => ({ s, group: "secondary" })),
  ];

  if (items.length === 0) {
    const reason =
      role === "nurse"        ? "Nurses can only move Checked-in patients to Ready for Provider." :
      role === "practitioner" ? "Practitioners advance status by completing the encounter." :
                                "No further status changes available.";
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl py-3 px-3 text-[12px] text-slate-500 italic">
        {reason}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xl py-1.5">
      {items.map((it, i) => {
        if (it.separator) {
          return <div key={`sep-${i}`} className="my-1 mx-2 h-px bg-slate-100" />;
        }
        const styleKey = it.s === "Reschedule" ? "Rescheduled" : it.s;
        const tone = STATUS_STYLES[styleKey];
        return (
          <button
            key={it.s}
            onClick={() => onPick(styleKey)}
            className={cx(
              "w-full px-3 py-2 flex items-center gap-2 text-[12.5px] hover:bg-slate-50 text-left transition",
              it.group === "secondary" ? "text-slate-600" : "text-slate-900"
            )}
          >
            <span className="size-2 rounded-full" style={{ background: tone?.bg || "#94A3B8" }} />
            {it.s === "Rescheduled" ? "Reschedule" : it.s}
          </button>
        );
      })}
    </div>
  );
}

function ReasonDialog({ action, patient, onClose, onConfirm }) {
  const { PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const isResched = action === "Rescheduled";
  const verb = isResched ? "Reschedule" : "Cancel";

  const [reason, setReason] = React.useState("");
  // Reschedule-only fields
  const [date, setDate] = React.useState("2026-06-01");
  const [time, setTime] = React.useState(patient?.time && patient.time !== "—" ? patient.time : "09:00 AM");
  const [practitioner, setPractitioner] = React.useState(patient?.pract || (PRACTITIONERS[0]?.id ?? ""));
  const [location, setLocation] = React.useState(patient?.loc || Object.keys(LOCATIONS)[0]);
  const [notify, setNotify] = React.useState(true);

  const SLOTS = ["08:00 AM","08:30 AM","09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","01:00 PM","01:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM","04:00 PM","04:30 PM"];

  const canConfirm = isResched ? (!!date && !!time && !!practitioner && !!location) : true;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cx(
        "relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]",
        isResched ? "w-[620px]" : "w-[460px]"
      )}>
        <div className={cx(
          "flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0",
          isResched ? "bg-gradient-to-r from-amber-50 to-white" : "bg-gradient-to-r from-slate-100 to-white"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cx("size-8 rounded-lg flex items-center justify-center text-white", isResched ? "bg-amber-500" : "bg-slate-500")}>
              {isResched ? <Icon.calendar size={14}/> : <Icon.close size={14}/>}
            </div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">{verb} appointment</div>
              <div className="text-[11.5px] text-slate-500 truncate">{patient?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {isResched && (
            <React.Fragment>
              {/* Current appointment summary */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11.5px] text-slate-600 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700">Current:</span>
                <span>Today · {patient?.time || "—"}</span>
                <span className="text-slate-400">·</span>
                <span>{PRACTITIONERS.find(p => p.id === patient?.pract)?.name || "—"}</span>
                <span className="text-slate-400">·</span>
                <span>{LOCATIONS[patient?.loc]?.name || "—"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">New date *</div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                  />
                </label>
                <label className="block">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">New time *</div>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                  >
                    {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Practitioner *</div>
                  <select
                    value={practitioner}
                    onChange={(e) => setPractitioner(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                  >
                    {PRACTITIONERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} · {p.department || p.role}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Location *</div>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
                  >
                    {Object.entries(LOCATIONS).map(([k, v]) => (
                      <option key={k} value={k}>{v.name} · {v.city}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-100">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-sky-500"/>
                <span className="text-[12.5px] text-slate-700">Notify family via WhatsApp & email</span>
              </label>
            </React.Fragment>
          )}

          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reason (optional)</div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={isResched
                ? "e.g. family traveling, provider conflict, child sick at school…"
                : "e.g. family no longer needs visit, double-booked, insurance issue…"
              }
              className="w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition resize-none"
            />
          </label>
          <div className="text-[11px] text-slate-500">This will be saved with the status change for the audit log.</div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Icon.check size={12}/>}
            disabled={!canConfirm}
            onClick={() => onConfirm(
              isResched
                ? { reason: reason.trim() || null, date, time, practitioner, location, notify }
                : reason.trim() || null
            )}
          >
            {isResched ? "Confirm reschedule" : "Cancel appointment"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Manual "Mark as paid" dialog. Front desk records the method (cash/card/transfer),
// optional reference, and confirms. There's no real payment processing.
function CollectPaymentDialog({ patient, onClose, onConfirm }) {
  const b = patient.billing || {};
  const [method, setMethod] = React.useState(b.method || "Cash");
  const [note, setNote] = React.useState("");
  const total = b.total || 0;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Icon.invoice size={14}/>
            </div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">Collect payment</div>
              <div className="text-[11.5px] text-slate-500 truncate">{patient.name} · Encounter completed</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <Icon.close size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-[12.5px] text-slate-600">
              <span>Consultation fee</span>
              <span className="font-mono">${(b.fee || 0).toLocaleString()}</span>
            </div>
            {(b.discount || 0) > 0 && (
              <div className="flex items-center justify-between text-[12.5px] text-rose-600 mt-1">
                <span>Discount{b.discountType === "percent" ? ` (${b.discountInput}%)` : ""}</span>
                <span className="font-mono">− ${(b.discount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 mt-2 pt-2">
              <span className="text-[13px] font-semibold text-slate-900">Total due</span>
              <span className="text-[20px] font-bold text-slate-900 font-mono">${total.toLocaleString()} MXN</span>
            </div>
          </div>

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Payment method</div>
            <div className="grid grid-cols-3 gap-2">
              {["Cash","Card","Bank transfer"].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cx(
                    "h-10 px-3 rounded-lg border text-[12.5px] font-medium transition",
                    method === m ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >{m}</button>
              ))}
            </div>
          </div>

          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reference (optional)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Receipt #, last 4 digits, transaction ref…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
            />
          </label>

          <div className="text-[11px] text-slate-500 italic">
            This is a manual record. No card or cash is processed by the system — confirm only after receiving payment.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>}
            onClick={() => onConfirm({ method, note: note.trim(), at: "After visit", total })}
          >
            Mark as paid
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UndoStatusButton({ deadline, label = "Undo", onUndo }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);
  const remain = Math.max(0, Math.ceil((deadline - now) / 1000));
  if (remain <= 0) return null;
  const pct = remain / 5;
  return (
    <button
      onClick={onUndo}
      className="inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2 rounded-full bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-[11px] font-semibold transition"
      title={label}
    >
      <svg width="18" height="18" viewBox="0 0 36 36" className="shrink-0">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#cffafe" strokeWidth="4"/>
        <circle
          cx="18" cy="18" r="14" fill="none"
          stroke="#0891b2" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={88}
          strokeDashoffset={88 * (1 - pct)}
          transform="rotate(-90 18 18)"
        />
        <text x="18" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0e7490">{remain}</text>
      </svg>
      <span>{label}</span>
    </button>
  );
}

function UndoCheckInButton({ deadline, onUndo }) {
  // Kept for backwards-compat — delegates to UndoStatusButton.
  return <UndoStatusButton deadline={deadline} label="Undo" onUndo={onUndo} />;
}

function EmptyDashboardOnboarding({ onNewAppt }) {
  const STEPS = [
    { n: 1, title: "Book the first appointment", body: "Click the blue + New Appointment button. Pick a patient, schedule a slot, and choose Pay now or Pay later.", icon: <Icon.calendar size={14}/>, tone: "sky", action: { label: "+ New Appointment", run: onNewAppt } },
    { n: 2, title: "Check the patient in",       body: "From the Appointment Book row, click the status pill and pick Checked-in. You have 5 seconds to undo.", icon: <Icon.user size={14}/>, tone: "cyan" },
    { n: 3, title: "Move to Ready for provider", body: "Once vitals are taken, mark Ready for Provider. The doctor will be notified.", icon: <Icon.activity size={14}/>, tone: "emerald" },
    { n: 4, title: "Run the patient encounter",  body: "Open the active visit and click Start encounter. Document chief complaint, exam, plan, prescriptions, and orders.", icon: <Icon.stetho size={14}/>, tone: "violet" },
    { n: 5, title: "Collect payment",            body: "After encounter completes, a Collect $… pill appears next to the row. Click it to record cash, card, or transfer.", icon: <Icon.invoice size={14}/>, tone: "amber" },
  ];
  const TONES = {
    sky:     { ring: "ring-sky-200", iconBg: "bg-sky-500 text-white",     numBg: "bg-sky-100 text-sky-700" },
    cyan:    { ring: "ring-cyan-200", iconBg: "bg-cyan-500 text-white",   numBg: "bg-cyan-100 text-cyan-700" },
    emerald: { ring: "ring-emerald-200", iconBg: "bg-emerald-500 text-white", numBg: "bg-emerald-100 text-emerald-700" },
    violet:  { ring: "ring-violet-200", iconBg: "bg-violet-500 text-white",  numBg: "bg-violet-100 text-violet-700" },
    amber:   { ring: "ring-amber-200",  iconBg: "bg-amber-500 text-white",   numBg: "bg-amber-100 text-amber-700" },
  };
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-br from-sky-50 via-white to-violet-50/40 border-b border-slate-100 flex items-center gap-4">
        <div className="size-12 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white flex items-center justify-center shadow-sm">
          <Icon.sparkles size={20}/>
        </div>
        <div className="flex-1">
          <div className="text-[18px] font-bold text-slate-900">Welcome to your clinic 👋</div>
          <div className="text-[13px] text-slate-600 mt-0.5">
            Your dashboard is empty. Follow the steps below to run your first patient end-to-end — or switch to <span className="font-semibold text-slate-800">Test data</span> in the top bar to explore with sample appointments.
          </div>
        </div>
        <Button variant="primary" size="sm" icon={<Icon.plus size={14}/>} onClick={onNewAppt}>
          New Appointment
        </Button>
      </div>
      <div className="p-5 grid grid-cols-5 gap-3">
        {STEPS.map(s => {
          const t = TONES[s.tone];
          return (
            <div key={s.n} className={cx("rounded-xl p-3.5 ring-1 bg-white", t.ring)}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cx("size-6 rounded-full text-[11px] font-bold flex items-center justify-center", t.numBg)}>{s.n}</span>
                <span className={cx("size-7 rounded-md flex items-center justify-center", t.iconBg)}>{s.icon}</span>
              </div>
              <div className="text-[12.5px] font-semibold text-slate-900 leading-tight">{s.title}</div>
              <div className="text-[11px] text-slate-600 leading-snug mt-1">{s.body}</div>
              {s.action && (
                <button onClick={s.action.run} className="mt-2 text-[11px] font-semibold text-sky-700 hover:underline">
                  {s.action.label} →
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-5 pb-5">
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[11.5px] text-slate-600 flex items-center gap-2">
          <Icon.alert size={12}/>
          Need to skip the tour? Switch the dropdown next to the logo to <span className="font-semibold text-slate-800">Test data</span> to load a fully-populated demo clinic.
        </div>
      </div>
    </Card>
  );
}

function StatCard({ label, value, sub, tone = "sky", icon, active = false, onClick }) {
  const TONES = {
    sky:     { ring: "ring-sky-100",     icon: "bg-sky-100 text-sky-700",         active: "ring-sky-400 bg-sky-50/60" },
    cyan:    { ring: "ring-cyan-100",    icon: "bg-cyan-100 text-cyan-700",       active: "ring-cyan-400 bg-cyan-50/60" },
    emerald: { ring: "ring-emerald-100", icon: "bg-emerald-100 text-emerald-700", active: "ring-emerald-400 bg-emerald-50/60" },
    orange:  { ring: "ring-orange-100",  icon: "bg-orange-100 text-orange-700",   active: "ring-orange-400 bg-orange-50/60" },
    rose:    { ring: "ring-rose-100",    icon: "bg-rose-100 text-rose-700",       active: "ring-rose-400 bg-rose-50/60" },
    amber:   { ring: "ring-amber-100",   icon: "bg-amber-100 text-amber-700",     active: "ring-amber-400 bg-amber-50/60" },
    slate:   { ring: "ring-slate-200",   icon: "bg-slate-100 text-slate-600",     active: "ring-slate-400 bg-slate-50/60" },
  };
  const t = TONES[tone];
  const interactive = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={cx(
        "p-3.5 flex items-center gap-3 transition",
        active ? cx("ring-2", t.active) : t.ring,
        interactive && "cursor-pointer hover:shadow-md hover:-translate-y-px"
      )}
    >
      <div className={cx("size-9 rounded-lg flex items-center justify-center shrink-0", t.icon)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] text-slate-500 truncate">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <div className="text-[20px] font-semibold text-slate-900 leading-none">{value}</div>
          <div className="text-[11.5px] text-slate-500">{sub}</div>
        </div>
      </div>
      {active && (
        <span className="size-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0" title="Clear filter">
          <Icon.close size={10} />
        </span>
      )}
    </Card>
  );
}

Object.assign(window, { DashboardScreen });
