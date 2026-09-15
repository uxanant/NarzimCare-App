// Sticky Notes + Tasks board

function NotesScreen({ onClose }) {
  const { STICKY_NOTES, TASKS } = window.CHAVITOS;
  const [notes, setNotes] = React.useState(STICKY_NOTES);
  const [tasks, setTasks] = React.useState(TASKS);
  const [tab, setTab] = React.useState("notes");
  const [composer, setComposer] = React.useState("");
  const [composerColor, setComposerColor] = React.useState("#FEF3C7");

  // Task filter + composer state
  const [taskFilter, setTaskFilter] = React.useState({ priority: "all", status: "all" });
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [newTaskOpen, setNewTaskOpen] = React.useState(false);
  const [openMoreFor, setOpenMoreFor] = React.useState(null);

  const COLORS = ["#FEF3C7","#DBEAFE","#FCE7F3","#D1FAE5","#FED7AA","#E0E7FF"];

  const addNote = () => {
    if (!composer.trim()) return;
    setNotes(n => [{ id: "n" + Date.now(), color: composerColor, text: composer, tag: "Personal" }, ...n]);
    setComposer("");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm">
        <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700">
          <Icon.chevLeft size={18} />
        </button>
        <div className="text-[13px] text-slate-500">Front desk</div>
        <Icon.chevRight size={12} />
        <div className="text-[13px] font-semibold text-slate-900">Sticky notes & tasks</div>
        <div className="flex-1" />
        <Tabs value={tab} onChange={setTab} items={[
          { value: "notes", label: `Notes (${notes.length})` },
          { value: "tasks", label: `Tasks (${tasks.filter(t=>!t.done).length})` },
        ]}/>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "notes" && (
          <div>
            {/* Composer */}
            <Card className="p-4 mb-5">
              <div className="text-[12px] font-medium text-slate-700 mb-2">New sticky note</div>
              <div className="flex gap-3">
                <textarea
                  rows={2}
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Type a quick note… ('Llamar al laboratorio', 'Pedir refill', etc)"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-sky-300/40 focus:border-sky-400"
                  style={{ background: composerColor }}
                />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1.5">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setComposerColor(c)}
                        className={cx("size-6 rounded-full transition", composerColor === c && "ring-2 ring-slate-700 ring-offset-1")}
                        style={{ background: c }} />
                    ))}
                  </div>
                  <Button variant="primary" size="sm" icon={<Icon.plus size={14} />} onClick={addNote}>Add</Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {notes.map((n, i) => (
                <StickyNote key={n.id} note={n} rotate={(i % 5) - 2} onDelete={() => setNotes(notes.filter(x => x.id !== n.id))} />
              ))}
            </div>
          </div>
        )}

        {tab === "tasks" && (() => {
          const filtered = tasks.filter(t => {
            if (taskFilter.priority !== "all" && t.priority !== taskFilter.priority) return false;
            if (taskFilter.status === "open" && t.done) return false;
            if (taskFilter.status === "done" && !t.done) return false;
            return true;
          });
          const activeChips = [];
          if (taskFilter.priority !== "all") activeChips.push({ k: "priority", label: `Priority: ${taskFilter.priority}` });
          if (taskFilter.status !== "all")   activeChips.push({ k: "status",   label: `Status: ${taskFilter.status === "open" ? "Open" : "Completed"}` });

          return (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/70 bg-slate-50/40">
                <div className="text-[13px] font-medium text-slate-900">Today's tasks</div>
                <div className="flex items-center gap-2 relative">
                  <Button variant="ghost" size="sm" icon={<Icon.filter size={12} />} onClick={() => setFilterOpen(o => !o)}>
                    Filter{activeChips.length ? ` (${activeChips.length})` : ""}
                  </Button>
                  <Button variant="primary" size="sm" icon={<Icon.plus size={14} />} onClick={() => setNewTaskOpen(true)}>New task</Button>

                  {filterOpen && (
                    <React.Fragment>
                      <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                      <div className="absolute z-20 top-10 right-0 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-3">
                        <div>
                          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Priority</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {["all","high","medium","low"].map(p => (
                              <button key={p}
                                onClick={() => setTaskFilter(f => ({ ...f, priority: p }))}
                                className={cx("h-8 px-2 rounded-md text-[11.5px] font-medium border transition",
                                  taskFilter.priority === p ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                              >{p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Status</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { v: "all",  label: "All" },
                              { v: "open", label: "Open" },
                              { v: "done", label: "Done" },
                            ].map(s => (
                              <button key={s.v}
                                onClick={() => setTaskFilter(f => ({ ...f, status: s.v }))}
                                className={cx("h-8 px-2 rounded-md text-[11.5px] font-medium border transition",
                                  taskFilter.status === s.v ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                              >{s.label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button onClick={() => setTaskFilter({ priority: "all", status: "all" })}
                            className="text-[11px] text-slate-600 hover:text-rose-600 hover:underline">Clear all</button>
                        </div>
                      </div>
                    </React.Fragment>
                  )}
                </div>
              </div>

              {activeChips.length > 0 && (
                <div className="px-5 py-2 border-b border-slate-100 bg-white flex items-center gap-2 flex-wrap">
                  {activeChips.map(c => (
                    <span key={c.k} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-sky-100 text-sky-800 text-[11px] font-medium">
                      {c.label}
                      <button onClick={() => setTaskFilter(f => ({ ...f, [c.k]: "all" }))} className="hover:bg-sky-200 rounded-full p-0.5">
                        <Icon.close size={9} />
                      </button>
                    </span>
                  ))}
                  <span className="ml-auto text-[11px] text-slate-500">{filtered.length} of {tasks.length}</span>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <div className="px-5 py-10 text-center text-slate-500 text-[12.5px] italic">
                    No tasks match the current filters.
                  </div>
                )}
                {filtered.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-sky-50/30">
                    <button
                      onClick={() => setTasks(tasks.map(x => x.id === t.id ? {...x, done: !x.done} : x))}
                      className={cx("size-5 rounded-md border flex items-center justify-center transition", t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white")}
                    >
                      {t.done && <Icon.check size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cx("text-[13.5px] text-slate-900", t.done && "line-through text-slate-400")}>{t.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Icon.calendar size={11} /> {t.due}
                        <span>•</span>
                        <span>Assigned to {t.assignee}</span>
                      </div>
                    </div>
                    <Badge color={
                      t.priority === "high"   ? { bg:"#FEE2E2", text:"#991B1B" } :
                      t.priority === "medium" ? { bg:"#FEF3C7", text:"#92400E" } :
                                                { bg:"#F1F5F9", text:"#475569" }
                    }>{t.priority}</Badge>
                    <div className="relative">
                      <Button variant="ghost" size="icon" icon={<Icon.more size={14} />} onClick={() => setOpenMoreFor(openMoreFor === t.id ? null : t.id)} />
                      {openMoreFor === t.id && (
                        <React.Fragment>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMoreFor(null)} />
                          <div className="absolute z-20 top-9 right-0 w-44 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5">
                            <button onClick={() => { setTasks(tasks.map(x => x.id === t.id ? {...x, done: !x.done} : x)); setOpenMoreFor(null); }}
                              className="w-full px-3 py-2 text-left text-[12.5px] hover:bg-slate-50 flex items-center gap-2">
                              <Icon.check size={12}/>{t.done ? "Mark as open" : "Mark as done"}
                            </button>
                            <div className="my-1 mx-2 h-px bg-slate-100" />
                            <button onClick={() => { setTasks(tasks.filter(x => x.id !== t.id)); setOpenMoreFor(null); }}
                              className="w-full px-3 py-2 text-left text-[12.5px] hover:bg-rose-50 text-rose-600 flex items-center gap-2">
                              <Icon.close size={12}/>Delete task
                            </button>
                          </div>
                        </React.Fragment>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {newTaskOpen && (
          <NewTaskDialog
            onClose={() => setNewTaskOpen(false)}
            onCreate={(t) => { setTasks(prev => [{ id: "t" + Date.now(), done: false, ...t }, ...prev]); setNewTaskOpen(false); }}
          />
        )}
      </div>
    </div>
  );
}

function StickyNote({ note, rotate = 0, onDelete }) {
  return (
    <div
      className="rounded-xl p-4 relative group transition-transform hover:scale-[1.02] hover:-rotate-0"
      style={{
        background: note.color,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 8px 24px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)",
        minHeight: 160,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-700/70">{note.tag}</span>
        <button onClick={onDelete} className="size-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-black/5 flex items-center justify-center text-slate-700">
          <Icon.close size={12} />
        </button>
      </div>
      <div className="text-[14.5px] text-slate-900 leading-relaxed font-medium">{note.text}</div>
      <div className="absolute bottom-3 right-3 text-[10px] text-slate-700/50">Today</div>
    </div>
  );
}

Object.assign(window, { NotesScreen });

function NewTaskDialog({ onClose, onCreate }) {
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("Today");
  const [priority, setPriority] = React.useState("medium");
  const [assignee, setAssignee] = React.useState("Aminata");
  const canSubmit = !!title.trim();
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sky-500 text-white flex items-center justify-center"><Icon.plus size={14}/></div>
            <div>
              <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">New task</div>
              <div className="text-[11.5px] text-slate-500">Add a quick to-do for the front desk</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Icon.close size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Task *</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Mariana Cruz re: Diego's lab results"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition"/>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Due</div>
              <select value={due} onChange={(e) => setDue(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition">
                {["Today","Today, 11:00","Today, 14:00","Today, 16:00","Tomorrow","This week","Next week"].map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Assignee</div>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition">
                {["Aminata","Dr. Miguel","Dr. Ariel","Reception","Pharmacy","Lab"].map(a => <option key={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Priority</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: "high",   label: "High",   bg:"#FEE2E2", text:"#991B1B" },
                { v: "medium", label: "Medium", bg:"#FEF3C7", text:"#92400E" },
                { v: "low",    label: "Low",    bg:"#F1F5F9", text:"#475569" },
              ].map(p => (
                <button key={p.v} onClick={() => setPriority(p.v)}
                  className={cx("h-9 px-2 rounded-md text-[12px] font-semibold border transition",
                    priority === p.v ? "border-slate-900" : "border-slate-200 hover:border-slate-300"
                  )}
                  style={priority === p.v ? { background: p.bg, color: p.text } : {}}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/60">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Icon.plus size={12}/>} disabled={!canSubmit}
            onClick={() => onCreate({ title: title.trim(), due, priority, assignee })}>
            Add task
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
