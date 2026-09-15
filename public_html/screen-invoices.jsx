// Invoices — simple table with relevant filters. Row click opens an
// orange-accented letterhead-style invoice modal (consistent with the
// visit-report letterhead used elsewhere).

function InvoicesScreen({ onClose, focusInvoiceId }) {
  const { INVOICES: SEED_INVOICES, PATIENTS, PRACTITIONERS, LOCATIONS, INVOICE_LINE_ITEMS } = window.CHAVITOS;

  // Mutable copy of the invoice list so we can flip statuses to Paid.
  const [invoices, setInvoices] = React.useState(SEED_INVOICES);

  // Filters
  const [status, setStatus] = React.useState("all");
  const [method, setMethod] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [range, setRange] = React.useState(null);
  const [openId, setOpenId] = React.useState(focusInvoiceId || null);
  const [payFor, setPayFor] = React.useState(null); // invoice object to collect

  // Date helpers
  const toIso = (s) => {
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
  };

  // Build filtered list
  const data = React.useMemo(() => {
    let rows = invoices;
    if (status !== "all") rows = rows.filter(i => i.status.toLowerCase() === status);
    if (method !== "all") rows = rows.filter(i => (i.method || "").toLowerCase() === method);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(i => {
        const p = PATIENTS.find(x => x.id === i.patient);
        return (
          i.id.toLowerCase().includes(q) ||
          (p?.name || "").toLowerCase().includes(q) ||
          (p?.mrn || "").toLowerCase().includes(q) ||
          (p?.phone || "").toLowerCase().includes(q)
        );
      });
    }
    if (range) {
      rows = rows.filter(i => {
        const iso = toIso(i.date);
        if (range.mode === "single") return iso === range.date;
        return iso >= range.from && iso <= range.to;
      });
    }
    return rows;
  }, [invoices, status, method, query, range]);

  // KPIs reflect the current filter
  const totals = data.reduce((a, i) => {
    a.total += i.amount;
    if (i.status === "Paid")    a.paid    += i.amount;
    if (i.status === "Pending") a.pending += i.amount;
    if (i.status === "Overdue") a.overdue += i.amount;
    return a;
  }, { total: 0, paid: 0, pending: 0, overdue: 0 });

  const statusBadge = (s) =>
    s === "Paid"    ? { bg:"#D1FAE5", text:"#065F46" } :
    s === "Pending" ? { bg:"#FEF3C7", text:"#92400E" } :
    s === "Overdue" ? { bg:"#FEE2E2", text:"#991B1B" } :
                      { bg:"#F1F5F9", text:"#475569" };

  // Active filter chips
  const chips = [];
  if (status !== "all") chips.push({ k: "status",  label: `Status: ${status[0].toUpperCase() + status.slice(1)}`, clear: () => setStatus("all") });
  if (method !== "all") chips.push({ k: "method",  label: `Method: ${method[0].toUpperCase() + method.slice(1)}`, clear: () => setMethod("all") });
  if (range) {
    const fmt = (iso) => { const [y,m,d] = iso.split("-"); return `${m}/${d}/${y}`; };
    chips.push({
      k: "range",
      label: range.mode === "single" ? `Date: ${fmt(range.date)}` : `Date: ${fmt(range.from)} – ${fmt(range.to)}`,
      clear: () => setRange(null),
    });
  }
  if (query.trim()) chips.push({ k: "q", label: `Search: "${query.trim()}"`, clear: () => setQuery("") });

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm shrink-0">
        <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700">
          <Icon.chevLeft size={18} />
        </button>
        <div className="text-[13px] text-slate-500">Front desk</div>
        <Icon.chevRight size={12} />
        <div className="text-[13px] font-semibold text-slate-900">Invoices</div>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" icon={<Icon.download size={14} />}>Export</Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-32 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <KpiTile label="Total" value={`$${totals.total.toLocaleString()}`}    sub={`${data.length} invoice${data.length === 1 ? "" : "s"}`} tone="slate" />
          <KpiTile label="Paid"  value={`$${totals.paid.toLocaleString()}`}    sub="received"  tone="emerald" />
          <KpiTile label="Pending" value={`$${totals.pending.toLocaleString()}`} sub="due"      tone="amber" />
          <KpiTile label="Overdue" value={`$${totals.overdue.toLocaleString()}`} sub="past due" tone="rose" />
        </div>

        {/* Filter toolbar */}
        <Card className="overflow-visible">
          <div className="px-4 py-3 flex items-center gap-2 flex-wrap border-b border-slate-100">
            <div className="h-9 flex-1 max-w-[320px] flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-sky-400/30 focus-within:border-sky-400 transition">
              <Icon.search size={13} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice #, patient, MRN, phone…"
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-slate-400"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-700">
                  <Icon.close size={12} />
                </button>
              )}
            </div>

            <SimpleSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all",     label: "All statuses" },
                { value: "paid",    label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "overdue", label: "Overdue" },
                { value: "draft",   label: "Draft" },
              ]}
            />
            <SimpleSelect
              label="Method"
              value={method}
              onChange={setMethod}
              options={[
                { value: "all",   label: "All methods" },
                { value: "cash",  label: "Cash" },
                { value: "card",  label: "Card" },
                { value: "bank transfer", label: "Bank transfer" },
                { value: "—",     label: "Awaiting" },
              ]}
            />
            <InvoiceDateFilter current={range} onChange={setRange} />
            <div className="flex-1" />
            <div className="text-[11.5px] text-slate-500">
              Showing <span className="font-semibold text-slate-700">{data.length}</span> of {invoices.length}
            </div>
          </div>

          {chips.length > 0 && (
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2 flex-wrap">
              {chips.map(c => (
                <span key={c.k} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-sky-100 text-sky-800 text-[11px] font-medium">
                  {c.label}
                  <button onClick={c.clear} className="hover:bg-sky-200 rounded-full p-0.5"><Icon.close size={9}/></button>
                </span>
              ))}
              <button
                onClick={() => { setStatus("all"); setMethod("all"); setRange(null); setQuery(""); }}
                className="text-[11px] text-slate-600 hover:text-rose-600 hover:underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Table */}
          <div className="grid items-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100"
            style={{ gridTemplateColumns: "1.3fr 1.7fr 1fr 1fr 0.95fr 0.95fr 1fr" }}
          >
            <div>Invoice #</div>
            <div>Patient</div>
            <div>Date</div>
            <div>Amount</div>
            <div>Method</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px] text-slate-500 italic">
                No invoices match the current filters.
              </div>
            ) : data.map(inv => {
              const p = PATIENTS.find(x => x.id === inv.patient);
              return (
                <div
                  key={inv.id}
                  onClick={() => setOpenId(inv.id)}
                  className="grid items-center px-4 py-3 text-[13px] hover:bg-sky-50/40 cursor-pointer transition"
                  style={{ gridTemplateColumns: "1.3fr 1.7fr 1fr 1fr 0.95fr 0.95fr 1fr" }}
                >
                  <div className="font-mono text-[12.5px] font-medium text-slate-900 truncate">{inv.id}</div>
                  <div className="flex items-center gap-2 min-w-0">
                    {p && <BabyAvatar size={28} swatch={p.swatch} name={p.name} />}
                    <div className="text-[13px] text-slate-800 truncate">{p?.name || "—"}</div>
                  </div>
                  <div className="text-[12.5px] text-slate-600 truncate">{inv.date}</div>
                  <div className="text-[13px] text-slate-900 font-mono">${inv.amount.toLocaleString()}</div>
                  <div className="text-[12.5px] text-slate-700">{inv.method && inv.method !== "—" ? inv.method : <span className="text-slate-400 italic">awaiting</span>}</div>
                  <div><Badge color={statusBadge(inv.status)}>{inv.status}</Badge></div>
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {(inv.status === "Pending" || inv.status === "Overdue" || inv.status === "Draft") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPayFor(inv); }}
                        className="h-7 px-2.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Icon.check size={11}/> Mark paid
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setOpenId(inv.id); }}
                      className="size-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100" title="View">
                      <Icon.chevRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {payFor && (
        <CollectInvoicePaymentDialog
          invoice={payFor}
          patient={PATIENTS.find(p => p.id === payFor.patient)}
          onClose={() => setPayFor(null)}
          onConfirm={(payment) => {
            setInvoices(prev => prev.map(inv => inv.id === payFor.id ? {
              ...inv,
              status: payment.partial && payment.amount < inv.amount ? "Pending" : "Paid",
              method: payment.method,
              paidAt: payment.paidAt,
              paymentNote: payment.note,
              partialAmount: payment.partial ? payment.amount : null,
            } : inv));
            setPayFor(null);
          }}
        />
      )}

      {openId && (() => {
        const inv = invoices.find(i => i.id === openId);
        if (!inv) return null;
        return (
          <InvoiceLetterheadDialog
            invoice={inv}
            patient={PATIENTS.find(p => p.id === inv.patient)}
            lineItems={INVOICE_LINE_ITEMS.slice(0, inv.items || 2)}
            practitioners={PRACTITIONERS}
            locations={LOCATIONS}
            onClose={() => setOpenId(null)}
          />
        );
      })()}
    </div>
  );
}

function KpiTile({ label, value, sub, tone }) {
  const T = {
    slate:   "bg-slate-50 border-slate-100",
    emerald: "bg-emerald-50 border-emerald-100",
    amber:   "bg-amber-50 border-amber-100",
    rose:    "bg-rose-50 border-rose-100",
  };
  return (
    <div className={cx("rounded-xl border px-4 py-3", T[tone])}>
      <div className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-[18px] font-bold text-slate-900 mt-1 font-mono">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SimpleSelect({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[11.5px] text-slate-500 font-medium">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white text-[12.5px] text-slate-900 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// Date filter (simple — pick single or range via two date inputs)
function InvoiceDateFilter({ current, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState(current?.mode || "single");
  const [date, setDate] = React.useState(current?.date || "");
  const [from, setFrom] = React.useState(current?.from || "");
  const [to, setTo]   = React.useState(current?.to   || "");

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!e.target.closest("[data-inv-date]")) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = !!current;
  const summary = !active ? "Any date" :
    current.mode === "single"
      ? new Date(current.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : `${new Date(current.from).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(current.to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="relative" data-inv-date>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cx(
          "h-9 px-2.5 rounded-lg border text-[12.5px] flex items-center gap-1.5 transition",
          active ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        )}
      >
        <Icon.calendar size={12}/> {summary}
      </button>
      {open && (
        <div className="absolute z-30 top-11 right-0 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-2" data-inv-date>
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 w-full">
            {[{ v: "single", label: "Specific date" }, { v: "range", label: "Range" }].map(o => (
              <button key={o.v} type="button" onClick={() => setMode(o.v)}
                className={cx("flex-1 h-7 rounded-md text-[11.5px] font-medium transition",
                  mode === o.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                )}>{o.label}</button>
            ))}
          </div>
          {mode === "single" ? (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400"/>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">From</div>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400"/>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">To</div>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400"/>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            {active && <Button variant="ghost" size="sm" onClick={() => { onChange(null); setOpen(false); }}>Clear</Button>}
            <Button variant="primary" size="sm" disabled={mode === "single" ? !date : (!from || !to)}
              onClick={() => {
                onChange(mode === "single" ? { mode: "single", date } : { mode: "range", from, to });
                setOpen(false);
              }}>Apply</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Letterhead invoice — orange double-line border, matches the visit-report style.
function InvoiceLetterheadDialog({ invoice, patient, lineItems, practitioners, locations, onClose }) {
  const pr = practitioners.find(x => x.id === (patient?.pract || "miguel"));
  const loc = locations[patient?.loc || "chavitos"];
  const subtotal = invoice.amount;
  const tax = Math.round(subtotal * 0.16);
  const total = subtotal + tax;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 w-[760px] max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center"><Icon.invoice size={14}/></div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900 leading-tight">Invoice</div>
              <div className="text-[11.5px] text-slate-500">{invoice.id} · {patient?.name}</div>
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
            {/* Header */}
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
                <div className="text-[16px] font-bold font-mono text-slate-900">{invoice.id}</div>
                <div className="text-[11px] text-slate-500">Issued {invoice.date}</div>
              </div>
            </div>

            {/* Bill to / Visit */}
            <div className="px-10 py-5 grid grid-cols-2 gap-6 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Bill to</div>
                <div className="text-slate-900 font-semibold">{patient?.guardian || patient?.name}</div>
                {patient?.phone && <div className="text-slate-600">{patient.phone}</div>}
                {patient?.email && <div className="text-slate-600">{patient.email}</div>}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Visit</div>
                <div className="text-slate-900 font-semibold">{invoice.type || "Consultation"}</div>
                <div className="text-slate-600">{invoice.date}</div>
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
                    <td className="px-10 py-2.5 text-slate-800">{it.name}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{it.qty}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700 font-mono">${it.price.toLocaleString()}</td>
                    <td className="px-10 py-2.5 text-right text-slate-900 font-mono">${(it.qty * it.price).toLocaleString()}</td>
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
              <span>Payable within 30 days · {invoice.method && invoice.method !== "—" ? `Paid via ${invoice.method}` : "Awaiting payment"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CollectInvoicePaymentDialog({ invoice, patient, onClose, onConfirm }) {
  const [method, setMethod] = React.useState("Cash");
  const [note, setNote] = React.useState("");
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = React.useState(invoice.amount);
  const [partial, setPartial] = React.useState(false);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[500px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Icon.invoice size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">Mark invoice as paid</div>
              <div className="text-[11.5px] text-slate-500 truncate">{invoice.id} · {patient?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Total due</div>
              <div className="text-[12px] text-slate-600 mt-0.5">{invoice.date}</div>
            </div>
            <div className="text-[22px] font-bold text-slate-900 font-mono">${invoice.amount.toLocaleString()} MXN</div>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <input type="checkbox" checked={partial} onChange={(e) => { setPartial(e.target.checked); if (!e.target.checked) setAmount(invoice.amount); }} className="size-4 accent-sky-500"/>
            <span className="text-[12.5px] text-slate-700">Partial payment</span>
            {partial && (
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="ml-auto h-8 w-32 rounded-md border border-slate-200 bg-white text-[13px] text-right px-2 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400"
              />
            )}
          </label>

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Payment method</div>
            <div className="grid grid-cols-3 gap-2">
              {["Cash", "Card", "Bank transfer"].map(m => (
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Date received</div>
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"/>
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reference</div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Receipt #, last 4, txn ref…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"/>
            </label>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Manual record only. No card or cash is processed by the system — confirm after receiving payment.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.check size={12}/>}
            onClick={() => onConfirm({ method, note: note.trim(), paidAt, amount, partial })}
          >
            {partial ? `Record $${amount.toLocaleString()} payment` : "Mark as paid"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

Object.assign(window, { InvoicesScreen });
