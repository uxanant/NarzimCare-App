// Main App — orchestrates screens inside a macOS window

const USERS_BY_ROLE = {
  frontdesk:    { name: "Aminata", avatar: ((window.__resources&&window.__resources.userAminata)||"assets/user-aminata.png") },
  nurse:        { name: "Lourdes", avatar: null, initials: "LM", swatch: "#A78BFA" },
  practitioner: { name: "Miguel",  avatar: ((window.__resources&&window.__resources.drMiguel)||"assets/dr-miguel.png") },
};

function App() {
  const [role, setRole] = React.useState("frontdesk");
  const ROLE = window.CHAVITOS_ROLES?.[role] || window.CHAVITOS_ROLES?.frontdesk || {};
  const USER = USERS_BY_ROLE[role] || USERS_BY_ROLE.frontdesk;
  const [dataMode, setDataMode] = React.useState("test"); // "test" | "empty"
  const [tour, setTour] = React.useState(null); // null | "newappt" | "encounter"
  const [route, setRoute] = React.useState({ name: "dashboard" });
  const [overlay, setOverlay] = React.useState(null); // null | "remedy" | "search" | "newappt" | "invoices" | "messages" | "notes"
  const [patientReturnTo, setPatientReturnTo] = React.useState(null); // 'dashboard' | 'patientBook'
  const [remedySeed, setRemedySeed] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [date, setDate] = React.useState("Thu, Apr 9, 2026");
  const [patients, setPatients] = React.useState(window.CHAVITOS.PATIENTS);

  // Switch dataset between full demo data and a blank slate (onboarding).
  React.useEffect(() => {
    if (dataMode === "test") {
      setPatients(window.CHAVITOS.PATIENTS);
      setTour(null);
    } else {
      setPatients([]);
      setTour("newappt");
    }
  }, [dataMode]);
  const [toast, setToast] = React.useState(null);
  const [dockTip, setDockTip] = React.useState(null);

  // When the role changes, drop any in-flight overlay/route the new role
  // can't access — a nurse can't see Invoices, a non-practitioner can't be
  // inside an encounter, etc.
  React.useEffect(() => {
    const caps = ROLE.capabilities || {};
    const dockIds = ROLE.dockItems || [];
    setOverlay(o => {
      if (!o) return o;
      if (o === "newappt" && !caps.newAppt) return null;
      if (o === "invoices" && !caps.invoices) return null;
      const dockOverlayMap = { search: "search", messages: "messages", invoices: "invoices", notes: "notes", patientBook: "patient360" };
      const requiredDock = dockOverlayMap[o];
      if (requiredDock && !dockIds.includes(requiredDock)) return null;
      return o;
    });
    setRoute(r => {
      if (r.name === "encounter" && !caps.startEncounter) {
        return { name: "patient", id: r.id };
      }
      return r;
    });
  }, [role]);

  React.useEffect(() => {
    // Show "Ask Narzim" tooltip on first load (like the Figma reference)
    setDockTip("Ask Narzim");
    const t = setTimeout(() => setDockTip(null), 3000);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay(overlay === "remedy" ? null : "remedy");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOverlay(overlay === "search" ? null : "search");
      } else if (e.key === "Escape") {
        setOverlay(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  const openDock = (id) => {
    // Toggle: clicking the current overlay closes it
    const overlayMap = { search: "search", messages: "messages", remedy: "remedy", invoices: "invoices", notes: "notes", patientBook: "patientBook" };
    if (overlay === overlayMap[id]) { setOverlay(null); return; }
    if (id === "search")    setOverlay("search");
    if (id === "messages")  setOverlay("messages");
    if (id === "remedy")  { setRemedySeed(null); setOverlay("remedy"); }
    if (id === "invoices")  setOverlay("invoices");
    if (id === "notes")     setOverlay("notes");
    if (id === "patient360") {
      // Now handled via sub-menu in the dock; keep as fallback
      setOverlay(null);
      const target = currentPatient?.id || patients[0]?.id;
      if (target) setRoute({ name: "patient", id: target });
      else showToast("No patient available");
    }
    if (id === "patientBook") {
      setOverlay("patientBook");
    }
    if (id === "appointmentBook") {
      setOverlay(null);
      setRoute({ name: "dashboard" });
      showToast("Appointment book");
    }
  };

  const askRemedyAbout = (prompt) => { setRemedySeed(prompt); setOverlay("remedy"); };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const stepDate = (delta) => {
    const days = ["Wed, Apr 8, 2026","Thu, Apr 9, 2026","Fri, Apr 10, 2026","Sat, Apr 11, 2026"];
    const i = Math.max(0, Math.min(days.length-1, days.indexOf(date) + delta));
    setDate(days[i]);
  };

  // Pending-undo windows for transitions that can be reverted within 5s.
  // Stores deadlines per patient id. After the window expires, the move is locked.
  const [pendingUndo, setPendingUndo] = React.useState({}); // { pid: { deadline, prev, current } }

  const changeStatus = (pid, status, opts = {}) => {
    const target = patients.find(p => p.id === pid);
    if (!target) return;

    // Lock guard — once the undo window has closed, the row can't move backward.
    const locked = !pendingUndo[pid];
    if (locked) {
      if (target.status === "Checked-in" && status === "Confirmed") {
        showToast("Check-in is locked. Status can't be reverted.");
        return;
      }
      if (target.status === "Ready for Provider" && status === "Checked-in") {
        showToast("This patient is already with the provider. Can't undo.");
        return;
      }
      // No Show → Confirmed is allowed at any time during the day; no lock.
    }

    setPatients(ps => ps.map(p => p.id === pid ? { ...p, status, statusMeta: opts.meta || p.statusMeta } : p));

    // Configure undo for transitions that need a 5s revert window.
    // No Show intentionally omitted — it stays reversible all day, so no
    // countdown pill appears.
    const undoFor = {
      "Checked-in": status === "Checked-in",
      "Ready for Provider": status === "Ready for Provider",
    };
    if (undoFor[status]) {
      const prevStatus = target.status;
      const deadline = Date.now() + 5000;
      setPendingUndo(prev => ({ ...prev, [pid]: { deadline, prev: prevStatus, current: status } }));
      setTimeout(() => {
        setPendingUndo(prev => {
          if (!prev[pid] || prev[pid].deadline > Date.now()) return prev; // already cleared or replaced
          const next = { ...prev }; delete next[pid]; return next;
        });
      }, 5050);
    } else {
      // Clear any stale undo window when transitioning to a non-undoable state.
      setPendingUndo(prev => {
        if (!prev[pid]) return prev;
        const next = { ...prev }; delete next[pid]; return next;
      });
    }

    if (!opts.silent) showToast(`Status updated to ${status}`);
  };

  // Nurse vitals capture — stamps the intake readings onto the patient record
  // so they flow through to the provider's encounter and the chart.
  const saveVitals = (pid, vitals) => {
    const at = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setPatients(ps => ps.map(p => p.id === pid ? {
      ...p,
      vitalsIntake: { ...vitals, by: USER.name, at },
    } : p));
    const who = patients.find(p => p.id === pid);
    showToast(`Vitals captured${who ? ` for ${who.name.split(" ")[0]}` : ""} · saved to chart`);
  };

  const currentPatient = (route.name === "patient" || route.name === "encounter") ? patients.find(p => p.id === route.id) : null;

  // Visits tab in PatientScreen dispatches this event to ask App to launch
  // the encounter flow for the current patient.
  React.useEffect(() => {
    const startHandler = (e) => {
      const pid = e.detail?.patientId;
      if (pid) setRoute({ name: "encounter", id: pid });
    };
    // Dashboard / appointment dialog dispatches this when the frontdesk
    // confirms a manual cash/card/transfer payment.
    const payHandler = (e) => {
      const { patientId, payment } = e.detail || {};
      if (!patientId || !payment) return;
      setPatients(ps => ps.map(p => p.id === patientId ? {
        ...p,
        billing: {
          ...(p.billing || {}),
          status: "Paid",
          method: payment.method,
          note: payment.note,
          paidAt: payment.at || "After visit",
          reminderActive: false,
        },
      } : p));
      showToast(`Payment received · $${(payment.total || 0).toLocaleString()} via ${payment.method}`);
    };
    window.addEventListener("chavitos:start-encounter", startHandler);
    window.addEventListener("chavitos:collect-payment", payHandler);
    const newApptHandler = () => setOverlay("newappt");
    window.addEventListener("chavitos:new-appt", newApptHandler);
    return () => {
      window.removeEventListener("chavitos:start-encounter", startHandler);
      window.removeEventListener("chavitos:collect-payment", payHandler);
      window.removeEventListener("chavitos:new-appt", newApptHandler);
    };
  }, []);

  return (
    <div className="w-full h-full bg-transparent text-slate-900" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif" }}>
      <MacChrome>
        <ChavitosTopBar
          filter={filter} onFilterChange={setFilter}
          date={date} onDateChange={stepDate}
          dataMode={dataMode}
          onChangeDataMode={setDataMode}
          role={role}
          onChangeRole={(r) => { setRole(r); showToast(`Switched to ${window.CHAVITOS_ROLES[r].label} view`); }}
          showNewAppt={
            // Show only when the user is on a "Patient 360" view
            // (Patient Book overlay, the Appointment Book = dashboard,
            // or a patient chart). Hide on Messages / Invoices / Notes /
            // Search overlays, encounter flow, etc.
            overlay === "patientBook" ||
            (!overlay && (route.name === "dashboard" || route.name === "patient"))
          }
          onNewAppt={() => setOverlay("newappt")}
          onOpenFilters={() => showToast("Filter panel opened")}
          onOpenPatient={(id) => setRoute({ name: "patient", id })}
          user={USER}
        />

        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: "linear-gradient(180deg,#FAFCFE 0%,#F4F8FC 100%)" }}>
          {route.name === "dashboard" && (
            <DashboardScreen
              patients={patients}
              filter={filter}
              role={role}
              onOpenPatient={(id, tab) => setRoute({ name: "patient", id, tab })}
              onChangeStatus={changeStatus}
              onSaveVitals={saveVitals}
              pendingUndo={pendingUndo}
              onAskRemedyAbout={askRemedyAbout}
            />
          )}
          {route.name === "patient" && currentPatient && (
            <PatientScreen
              key={`${currentPatient.id}-${route.tab || "visits"}`}
              patient={currentPatient}
              role={role}
              initialTab={route.tab || "visits"}
              onBack={() => {
                if (patientReturnTo === "patientBook") {
                  setOverlay("patientBook");
                  setRoute({ name: "dashboard" });
                } else {
                  setRoute({ name: "dashboard" });
                }
                setPatientReturnTo(null);
              }}
              breadcrumbLabel={patientReturnTo === "patientBook" ? "Patient Book" : "Patients"}
              onAskRemedy={askRemedyAbout}
              onCreateInvoice={() => { setOverlay("invoices"); showToast("Invoice draft created"); }}
              onStartEncounter={() => setRoute({ name: "encounter", id: currentPatient.id })}
            />
          )}
          {route.name === "encounter" && currentPatient && (
            <EncounterScreen
              patient={currentPatient}
              onClose={() => setRoute({ name: "patient", id: currentPatient.id })}
              onComplete={(pid) => {
                setPatients(ps => ps.map(p => {
                  if (p.id !== pid) return p;
                  // If payment is still pending, flip the reminder flag on so
                  // the dashboard row surfaces a "Collect payment" affordance.
                  const billing = p.billing
                    ? { ...p.billing, reminderActive: p.billing.status === "Pending" }
                    : { fee: 750, discount: 0, total: 750, status: "Pending", method: null, note: "", reminderActive: true };
                  return { ...p, status: "Completed", billing };
                }));
                setRoute({ name: "patient", id: pid });
                setOverlay(null);
                showToast("Encounter signed · status set to Completed");
              }}
              onAskRemedy={askRemedyAbout}
            />
          )}

          {/* Overlays */}
          {overlay === "invoices" && (
            <div className="absolute inset-0 z-30 bg-white">
              <InvoicesScreen onClose={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "messages" && (
            <div className="absolute inset-0 z-30 bg-white">
              <MessagesScreen onClose={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "notes" && (
            <div className="absolute inset-0 z-30 bg-white">
              <NotesScreen onClose={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "patientBook" && (
            <PatientBookScreen
              onClose={() => setOverlay(null)}
              onOpenPatient={(id) => { setOverlay(null); setPatientReturnTo("patientBook"); setRoute({ name: "patient", id }); }}
            />
          )}
          {overlay === "search" && (
            <SearchScreen
              onClose={() => setOverlay(null)}
              onOpenPatient={(id) => setRoute({ name: "patient", id })}
            />
          )}
          {overlay === "remedy" && (
            <RemedyScreen
              onClose={() => { setOverlay(null); setRemedySeed(null); }}
              contextPatient={currentPatient}
              seedPrompt={remedySeed}
            />
          )}
          <NewAppointmentDialog
            open={overlay === "newappt"}
            presetPatientId={route.name === "patient" ? route.id : null}
            onClose={() => setOverlay(null)}
            onCreate={(data) => {
              // Stamp payment metadata on the patient record so the dashboard
              // row can surface a "Collect payment" reminder after the encounter.
              setPatients(ps => ps.map(p => p.id === data.patient ? {
                ...p,
                billing: {
                  fee: data.fee,
                  discount: data.discountValue || 0,
                  discountType: data.discountType,
                  discountInput: data.discount,
                  total: data.total,
                  status: data.paymentStatus === "Paid now" ? "Paid" : "Pending",
                  method: data.paymentStatus === "Paid now" ? data.paymentMethod : null,
                  note: data.payerNote || "",
                  paidAt: data.paymentStatus === "Paid now" ? "At booking" : null,
                  reminderActive: false,
                },
              } : p));
              showToast(
                data.paymentStatus === "Paid now"
                  ? `Appointment scheduled · Paid $${(data.total || 0).toLocaleString()} (${data.paymentMethod})`
                  : `Appointment scheduled · $${(data.total || 0).toLocaleString()} pending`
              );
            }}
          />

          {/* Floating dock */}
          <FloatingDock
            role={role}
            active={
              overlay === "messages" ? "messages" :
              overlay === "remedy"   ? "remedy"   :
              overlay === "invoices" ? "invoices" :
              overlay === "notes"    ? "notes"    :
              overlay === "search"   ? "search"   :
              overlay === "patientBook" ? "patient360" :
              (!overlay && (route.name === "patient" || route.name === "encounter")) ? "patient360" :
              null
            }
            onChange={openDock}
            dockItem={dockTip}
          />

          {/* Toast */}
          {toast && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] shadow-2xl flex items-center gap-2 animate-fade-in">
              <Icon.check size={14}/>
              {toast}
            </div>
          )}
        </div>
      </MacChrome>
    </div>
  );
}

// ── macOS window chrome ──────────────────────────────────────
function MacChrome({ children }) {
  return (
    <div className="w-full h-full p-2" style={{ background: "transparent" }}>
      <div className="w-full h-full rounded-[14px] overflow-hidden flex flex-col bg-white"
        style={{ boxShadow: "0 0 0 1px rgba(15,23,42,0.08), 0 12px 36px rgba(15,23,42,0.18)" }}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
