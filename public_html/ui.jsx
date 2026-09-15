// shadcn-flavored UI primitives, tuned for Chavitos brand
// Exposes: Button, IconButton, Badge, Card, Avatar, Input, Textarea, Select, Tabs, Switch, Dialog, etc.

const cx = (...xs) => xs.filter(Boolean).join(" ");

// ── Button ───────────────────────────────────────────────────
function Button({ variant = "default", size = "md", icon, iconRight, children, className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 whitespace-nowrap";
  const sizes = {
    xs: "h-7  px-2.5 text-[12px]",
    sm: "h-8  px-3   text-[13px]",
    md: "h-9  px-3.5 text-[13px]",
    lg: "h-10 px-4   text-[14px]",
    icon:"h-9 w-9 p-0",
    iconLg:"h-10 w-10 p-0",
  };
  const variants = {
    default:  "bg-[#0098E4] text-white hover:bg-[#0086cc] shadow-sm",
    primary:  "bg-[#0098E4] text-white hover:bg-[#0086cc] shadow-sm",
    secondary:"bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm",
    soft:     "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-100",
    ghost:    "text-slate-700 hover:bg-slate-100",
    outline:  "border border-slate-200 text-slate-800 hover:bg-slate-50",
    danger:   "bg-rose-500 text-white hover:bg-rose-600",
    success:  "bg-emerald-500 text-white hover:bg-emerald-600",
    glass:    "bg-white/70 backdrop-blur-xl text-slate-800 border border-white/60 hover:bg-white/85 shadow-sm",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────────
function Badge({ children, color, className = "", style = {} }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", className)}
      style={{
        background: color?.bg || "#F1F5F9",
        color: color?.text || "#0F172A",
        border: color?.border ? `1px solid ${color.border}` : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function StatusPill({ status, withCaret = true }) {
  const s = window.CHAVITOS.STATUS_STYLES[status] || { bg: "#94A3B8", text: "#fff" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[12px] font-medium shadow-sm whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="size-1.5 rounded-full bg-white/90" />
      {status}
      {withCaret && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="ml-0.5">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────────
function Card({ children, className = "", ...props }) {
  return (
    <div
      className={cx("bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────
function Avatar({ src, fallback, size = 36, swatch, ring = false }) {
  const bg = swatch != null ? window.CHAVITOS.SWATCH[swatch % window.CHAVITOS.SWATCH.length] : "#E2E8F0";
  return (
    <div
      className={cx("relative shrink-0 rounded-full overflow-hidden flex items-center justify-center text-slate-700 font-medium", ring && "ring-2 ring-white")}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

// Patient avatar — initials in a colorful swatch circle. Falls back to a
// soft person silhouette if no name is provided.
function BabyAvatar({ size = 36, swatch = 0, ring = false, name = "" }) {
  const bg = window.CHAVITOS.SWATCH[swatch % window.CHAVITOS.SWATCH.length];
  const initials = (() => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();
  return (
    <div
      className={cx("relative shrink-0 rounded-full overflow-hidden flex items-center justify-center select-none", ring && "ring-2 ring-white")}
      style={{ width: size, height: size, background: bg }}
    >
      {initials ? (
        <span style={{ fontSize: Math.round(size * 0.38), color: "#0F172A", fontWeight: 700, letterSpacing: 0.3 }}>
          {initials}
        </span>
      ) : (
        <svg viewBox="0 0 40 40" width={size} height={size}>
          <circle cx="20" cy="16" r="6.5" fill="rgba(15,23,42,0.45)" />
          <path d="M7 34 C 7 26 33 26 33 34 Z" fill="rgba(15,23,42,0.45)" />
        </svg>
      )}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────
function Input({ icon, className = "", ...props }) {
  return (
    <div className={cx("relative", className)}>
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input
        className={cx(
          "h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition",
          icon ? "pl-9 pr-3" : "px-3"
        )}
        {...props}
      />
    </div>
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={cx(
        "w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition resize-none",
        className
      )}
      {...props}
    />
  );
}

function Select({ value, onChange, options, className = "" }) {
  return (
    <div className={cx("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 pl-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
      >
        {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5l3 3 3-3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────
function Tabs({ value, onChange, items }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            "h-8 px-3 text-[12.5px] rounded-lg font-medium transition-all whitespace-nowrap",
            value === it.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ── Switch ───────────────────────────────────────────────────
function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cx(
        "h-5 w-9 rounded-full p-0.5 transition-colors",
        checked ? "bg-sky-500" : "bg-slate-200"
      )}
    >
      <span
        className={cx(
          "block size-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── Dialog ───────────────────────────────────────────────────
function Dialog({ open, onClose, children, width = 640 }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 pb-28">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        style={{ width, maxHeight: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Sheet (right side panel) ─────────────────────────────────
function Sheet({ open, onClose, width = 460, children }) {
  return (
    <React.Fragment>
      <div
        className={cx(
          "absolute inset-0 z-30 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute top-0 right-0 bottom-0 z-30 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width }}
      >
        {children}
      </div>
    </React.Fragment>
  );
}

// ── Icons (lucide-style) ─────────────────────────────────────
const Icon = {
  search:  (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>),
  plus:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>),
  filter:  (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg>),
  chevDown:(p) => (<svg viewBox="0 0 24 24" width={p?.size||14} height={p?.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>),
  chevLeft:(p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>),
  chevRight:(p)=> (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>),
  close:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
  message: (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>),
  sparkles:(p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></svg>),
  invoice: (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>),
  note:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>),
  user:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>),
  calendar:(p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  phone:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.94.32 1.85.57 2.74a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.34-1.13a2 2 0 0 1 2.11-.45c.89.25 1.8.44 2.74.57A2 2 0 0 1 22 16.92Z"/></svg>),
  mail:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>),
  pill:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5a7 7 0 0 1-9.9-9.9l9.9-9.9a7 7 0 0 1 9.9 9.9z"/><path d="m8.5 8.5 7 7"/></svg>),
  syringe: (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 2 4 4M17 3l4 4M11 9l8 8M5 15l4 4M3 17l4 4M3 13l8 8M16 8l5-5"/></svg>),
  heart:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>),
  alert:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>),
  check:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  send:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>),
  more:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>),
  print:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/></svg>),
  download:(p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>),
  edit:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>),
  trash:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  bell:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>),
  thermo:  (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/></svg>),
  activity:(p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>),
  drop:    (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5s7 7 7 12.5a7 7 0 1 1-14 0c0-5.5 7-12.5 7-12.5Z"/></svg>),
  weight:  (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.4 4h11.2L20 20H4Z"/><circle cx="12" cy="9" r="2"/></svg>),
  ruler:   (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 8.7 8.7 21.3 2.7 15.3 15.3 2.7Z"/><path d="m7 17 2-2M11 13l2-2M15 9l2-2"/></svg>),
  stetho:  (p) => (<svg viewBox="0 0 24 24" width={p?.size||16} height={p?.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2v4M5 2v4M8 2v5a5 5 0 0 0 10 0V2"/><circle cx="18" cy="14" r="2"/><path d="M3 15a8 8 0 0 0 8 8h0a8 8 0 0 0 8-8"/></svg>),
};

Object.assign(window, {
  Button, IconButton: Button, Badge, StatusPill, Card,
  Avatar, BabyAvatar, Input, Textarea, Select, Tabs, Switch,
  Dialog, Sheet, Icon, cx,
});
