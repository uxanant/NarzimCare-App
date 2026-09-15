// Patient encounter — clinic-letterhead, single-focus, AI scribe.
// The page is rendered like a real clinic letterhead document. The
// doctor's focus stays entirely on the note. The AI Voice Scribe lives
// as a compact, dockable capsule that can be expanded when needed.

function EncounterScreen({ patient, onClose, onComplete, onAskRemedy }) {
  const { PRACTITIONERS, LOCATIONS } = window.CHAVITOS;
  const pr = PRACTITIONERS.find(x => x.id === patient.pract);
  const loc = LOCATIONS[patient.loc];

  const [elapsed, setElapsed] = React.useState(0);
  const [recording, setRecording] = React.useState(false);
  const [scribeEnded, setScribeEnded] = React.useState(false);
  const [transcript, setTranscript] = React.useState([]);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiToast, setAiToast] = React.useState(null);
  const [aiFlags, setAiFlags] = React.useState({});
  const [scribeOpen, setScribeOpen] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [phoneLinked, setPhoneLinked] = React.useState(false);
  const [signState, setSignState] = React.useState("idle"); // idle | preparing | report
  const [shareToast, setShareToast] = React.useState(null);

  // Empty starting state — fields fill only after the doctor presses Auto-fill.
  // Vital signs pre-populate from what the nurse captured at intake (if any).
  const intakeVitals = patient.vitalsIntake || null;
  const seededVitals = intakeVitals ? {
    weight: intakeVitals.weight ?? "14.3",
    height: intakeVitals.height ?? "99",
    temp:   intakeVitals.temp ?? "",
    hr:     intakeVitals.hr ?? "",
    spo2:   intakeVitals.spo2 ?? "",
    bp:     (intakeVitals.sys && intakeVitals.dia) ? `${intakeVitals.sys}/${intakeVitals.dia}` : "",
    rr:     intakeVitals.rr ?? "",
  } : { weight: "14.3", height: "99", temp: "", hr: "", spo2: "", bp: "", rr: "" };

  const [enc, setEnc] = React.useState({
    chiefComplaint: "",
    hpi: "",
    ros: {
      general:   { pos: false, note: "" },
      eyes:      { pos: false, note: "" },
      ent:       { pos: false, note: "" },
      cardio:    { pos: false, note: "" },
      resp:      { pos: false, note: "" },
      gi:        { pos: false, note: "" },
      gu:        { pos: false, note: "" },
      msk:       { pos: false, note: "" },
      neuro:     { pos: false, note: "" },
      skin:      { pos: false, note: "" },
      psych:     { pos: false, note: "" },
      endocrine: { pos: false, note: "" },
      heme:      { pos: false, note: "" },
      immune:    { pos: false, note: "" },
    },
    vitals: { ...seededVitals },
    exam: {
      general: "", vitals: "", heent: "", neck: "", cardio: "", chest: "",
      abdomen: "", msk: "", neuro: "", skin: "", psych: "", gu: "", gi: "",
      rectal: "", extremities: "", lymphatic: "", endocrine: "", breast: "",
    },
    diagnoses: [],
    plan: "",
    orders: {
      rx: [],
      labs: [],
      vaccines: [],
      screening: [],
      followUp: { in: "3 days", with: patient.pract, type: "Follow-up", note: "" },
    },
    education: "",
    signed: false,
  });

  // Wraps setEnc so any user edit to an AI-filled field flips its flag to
  // "edited" — the chip shows "you edited this" instead of "AI suggested".
  const update = (path, value) => {
    setAiFlags(f => (f[path] === "ai" ? { ...f, [path]: "edited" } : f));
    setEnc(prev => writePath(prev, path, value));
  };

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Demo transcript that streams while "recording" is on.
  React.useEffect(() => {
    if (!recording) return;
    const lines = [
      { who: "Parent", text: "She's had a dry cough for about three days, worse at night." },
      { who: "Dr",     text: "Any fever or trouble breathing?" },
      { who: "Parent", text: "Yes, fever up to 38 degrees. No vomiting, eating well." },
      { who: "Dr",     text: "Let me listen to her chest." },
      { who: "Dr",     text: "Mild wheeze on the right side. Throat is a bit red, no exudate." },
      { who: "Dr",     text: "Temperature 37.8, heart rate 112, oxygen 97 percent." },
      { who: "Dr",     text: "I'm going to start salbutamol PRN and acetaminophen for fever. Follow up in three days." },
    ];
    let i = 0;
    const tick = setInterval(() => {
      setTranscript(t => [...t, { ...lines[i % lines.length], at: Date.now() }]);
      i += 1;
      if (i >= lines.length) clearInterval(tick);
    }, 3200);
    return () => clearInterval(tick);
  }, [recording]);

  const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const autoFill = async () => {
    setAiBusy(true);
    setAiToast("Narzim is filling the note from the transcript…");
    await new Promise(r => setTimeout(r, 1300));
    setEnc(e => ({
      ...e,
      chiefComplaint: "Cough and low-grade fever for 3 days",
      hpi: "Pt. began coughing 3 days ago, dry, worse at night. Low-grade fever (max 38.0°C). No vomiting, eating well. No known sick contacts.",
      ros: {
        ...e.ros,
        general: { pos: true, note: "Low-grade fever (max 38.0°C). Eating well, no lethargy." },
        resp:    { pos: true, note: "Dry cough × 3 days, worse at night. Mild expiratory wheeze on exam." },
      },
      vitals: { ...e.vitals, temp: "37.8", hr: "112", spo2: "97", bp: "94/60", rr: "26" },
      exam: {
        general: "Alert, hydrated, in no acute distress.",
        vitals:  "Tachycardic and febrile; otherwise stable.",
        heent:   "TM clear bilaterally. Oropharynx mildly erythematous, no exudate.",
        neck:    "Supple, no lymphadenopathy.",
        cardio:  "RRR, no murmurs.",
        chest:   "Mild expiratory wheeze on auscultation. Good air entry bilaterally.",
        abdomen: "Soft, non-tender, no organomegaly.",
        msk:     "Full ROM, no joint swelling.",
        neuro:   "Alert, age-appropriate behaviour, no focal deficits.",
        skin:    "No rash.",
        psych:   "Calm, engaging with parent.",
        gu: "", gi: "", rectal: "", extremities: "Warm, well-perfused, cap refill <2s.",
        lymphatic: "No palpable lymphadenopathy.", endocrine: "", breast: "",
      },
      diagnoses: [
        { code: "J20.9", desc: "Acute bronchitis, unspecified", primary: true },
        { code: "R50.9", desc: "Fever, unspecified",            primary: false },
      ],
      plan: "Supportive care with hydration and rest. Salbutamol PRN. Acetaminophen 15mg/kg q6h PRN fever. Follow up in 3 days if not improved or sooner if respiratory distress.",
      orders: {
        ...e.orders,
        rx: [
          { name: "Salbutamol inhaler 100mcg", instr: "2 puffs q4-6h PRN wheeze", days: 7 },
          { name: "Acetaminophen 160mg/5ml",   instr: "5 ml q6h PRN fever",       days: 5 },
        ],
        followUp: { ...e.orders.followUp, in: "3 days", type: "Follow-up", note: "Reassess respiratory exam, taper salbutamol if wheeze has resolved." },
      },
      education: "Discussed cough hygiene, hydration, when to return immediately (respiratory distress, persistent fever, lethargy).",
    }));
    setAiFlags({
      "chiefComplaint": "ai", "hpi": "ai",
      "ros.general": "ai", "ros.resp": "ai",
      "vitals.temp": "ai", "vitals.hr": "ai", "vitals.spo2": "ai", "vitals.bp": "ai", "vitals.rr": "ai",
      "exam.general": "ai", "exam.vitals": "ai", "exam.heent": "ai", "exam.neck": "ai",
      "exam.cardio": "ai", "exam.chest": "ai", "exam.abdomen": "ai", "exam.msk": "ai",
      "exam.neuro": "ai", "exam.skin": "ai", "exam.psych": "ai",
      "exam.extremities": "ai", "exam.lymphatic": "ai",
      "diagnoses": "ai", "plan": "ai", "orders.rx": "ai", "orders.followUp.note": "ai", "education": "ai",
    });
    setAiBusy(false);
    setAiToast("Narzim filled the note. Review and edit before signing.");
    setTimeout(() => setAiToast(null), 3500);
  };

  const sign = () => {
    setSignState("preparing");
    if (phoneLinked) {
      setPhoneLinked(false);
    }
    setTimeout(() => {
      setEnc(e => ({ ...e, signed: true }));
      setSignState("report");
    }, 2800);
  };

  const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{
      background: "radial-gradient(1200px 600px at 20% 0%, #F5EFE3 0%, #EFE7D5 30%, #EFE6D2 60%, #E9DEC4 100%)",
    }}>
      {/* Minimal top bar — just Close, draft, sign */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-amber-900/10 bg-white/60 backdrop-blur-sm shrink-0">
        <button onClick={onClose} className="size-8 rounded-lg hover:bg-amber-100/60 flex items-center justify-center text-slate-700">
          <Icon.chevLeft size={18} />
        </button>
        <div className="text-[13px] font-semibold text-slate-800">Encounter note</div>
        <div className="text-[12px] text-slate-500">· {patient.name}</div>
        <div className="flex-1" />
        <div className="text-[11.5px] text-slate-500 mr-2 flex items-center gap-1.5">
          <Icon.activity size={11}/>
          <span className="font-mono font-semibold text-slate-700">{fmtTime(elapsed)}</span>
        </div>
        {!enc.signed ? (
          <Button variant="success" size="sm" icon={<Icon.check size={13}/>} onClick={sign}>Sign & close</Button>
        ) : (
          <Button variant="success" size="sm" icon={<Icon.check size={13}/>} onClick={() => setSignState("report")}>View signed report</Button>
        )}
      </div>

      {/* Document area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto my-8 max-w-[920px] bg-white shadow-[0_24px_60px_rgba(120,70,15,0.18)] rounded-sm relative overflow-hidden" style={{ border: "1px solid rgba(120,70,15,0.10)" }}>
          {/* Decorative top stripe */}
          <div className="h-1.5" style={{ background: "linear-gradient(90deg,#A5C944 0%,#5FB8C9 50%,#0098E4 100%)" }} />

          {/* Letterhead masthead */}
          <header className="px-12 pt-10 pb-6 flex items-start gap-6 border-b border-slate-200">
            <img src={(window.__resources&&window.__resources.chavitosLogo)||"assets/chavitos-logo.png"} alt="Chavitos Clinic" className="h-16 w-auto" draggable="false" />
            <div className="flex-1 min-w-0 text-right">
              <div className="text-[10.5px] tracking-[0.18em] uppercase text-slate-500 font-semibold">Chavitos Clinic · Alta Especialidad en Pediatría</div>
              <div className="text-[12px] text-slate-700 mt-1.5 leading-snug">
                Av. Colón con Av. Liszzaro · Mérida, Yuc., Mexico
                <br/>
                +52 999 268 1364 · hola@chavitosclinic.mx · RFC CHA-260101-A1B
              </div>
            </div>
          </header>

          {/* Document title strip */}
          <div className="px-12 py-4 flex items-end justify-between border-b border-dashed border-slate-300">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Clinical Encounter Note</div>
              <div className="text-[22px] font-bold text-slate-900 leading-tight mt-0.5" style={{ fontFamily: "'Inter', serif" }}>SOAP / Progress note</div>
            </div>
            <div className="text-right text-[11.5px] text-slate-600">
              <div className="font-semibold text-slate-800">{todayLong}</div>
              <div>Encounter ID · ENC-2026-{String(patient.mrn || "").slice(-4)}{String(Date.now()).slice(-3)}</div>
            </div>
          </div>

          {/* Patient identification block */}
          <div className="px-12 py-5 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-[12.5px]">
            <DocRow label="Patient">
              <span className="text-[15px] font-semibold text-slate-900">{patient.name}</span>
              <span className="text-slate-500 ml-2">· {patient.sex === "M" ? "Male" : "Female"} · {patient.age}</span>
            </DocRow>
            <DocRow label="MRN">
              <span className="font-mono">{patient.mrn}</span>
              <span className="text-slate-500 ml-3">DOB {patient.dob}</span>
            </DocRow>
            <DocRow label="Guardian">{patient.guardian || "—"} · <span className="font-mono text-slate-500">{patient.phone || ""}</span></DocRow>
            <DocRow label="Practitioner">{pr.name} · <span className="text-slate-500">{pr.role}</span></DocRow>
            <DocRow label="Location">{loc.name}, {loc.city}</DocRow>
            <DocRow label="Allergies">
              <ChipList values={patient.allergies.length ? patient.allergies : ["No known allergies"]} tone="rose" />
            </DocRow>
            <DocRow label="Chronic">
              <ChipList values={patient.chronicCare.length ? patient.chronicCare : ["None on file"]} tone="amber" />
            </DocRow>
          </div>

          {/* Subjective */}
          <DocSection label="S · Subjective">
            <SubjectiveBody enc={enc} update={update} aiFlags={aiFlags} />
          </DocSection>

          {/* Objective */}
          <DocSection label="O · Objective">
            <ObjectiveBody enc={enc} update={update} aiFlags={aiFlags} intake={intakeVitals} />
          </DocSection>

          {/* Assessment & plan */}
          <DocSection label="A · Assessment">
            <AssessmentBody enc={enc} update={update} setEnc={setEnc} aiFlags={aiFlags} />
          </DocSection>

          {/* Plan */}
          <DocSection label="P · Plan & orders">
            <PlanOrdersBody enc={enc} update={update} setEnc={setEnc} aiFlags={aiFlags} />
          </DocSection>

          {/* Education & follow-up */}
          <DocSection label="Education & follow-up">
            <EducationBody enc={enc} update={update} aiFlags={aiFlags} />
          </DocSection>

          {/* Signature */}
          <div className="px-12 pt-8 pb-10 border-t border-slate-200 mt-4">
            <div className="grid grid-cols-[1fr_auto] gap-8 items-end">
              <div className="border-t border-slate-400 pt-2 max-w-md">
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Signature</div>
                <div className="text-[14px] font-semibold text-slate-900 mt-1">{pr.name}</div>
                <div className="text-[11.5px] text-slate-500">{pr.role} · Céd. Prof. MEX-CED-394018</div>
              </div>
              <div className="text-right text-[11.5px] text-slate-600">
                <div>Date · {new Date().toLocaleDateString("en-US")}</div>
                <div>Time · {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              {enc.signed ? (
                <Button variant="success" size="md" icon={<Icon.check size={16}/>}>Signed & saved</Button>
              ) : (
                <Button variant="success" size="md" icon={<Icon.check size={16}/>} onClick={sign}>Sign & close encounter</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Scribe capsule */}
      <ScribeCapsule
        open={scribeOpen}
        onToggle={() => setScribeOpen(o => !o)}
        recording={recording}
        ended={scribeEnded}
        onToggleRecord={() => { setRecording(r => !r); setScribeEnded(false); }}
        onEndAndFill={async () => { setRecording(false); setScribeEnded(true); await autoFill(); }}
        transcript={transcript}
        elapsed={elapsed}
        aiBusy={aiBusy}
        phoneLinked={phoneLinked}
        onOpenQR={() => setQrOpen(true)}
        onUnlinkPhone={() => { setPhoneLinked(false); setAiToast("Phone link disposed."); setTimeout(() => setAiToast(null), 2200); }}
      />

      {qrOpen && (
        <PhonePairModal
          phoneLinked={phoneLinked}
          patientName={patient.name}
          onClose={() => setQrOpen(false)}
          onLink={() => { setPhoneLinked(true); setRecording(true); }}
          onUnlink={() => { setPhoneLinked(false); }}
        />
      )}

      {/* AI toast */}
      {aiToast && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12.5px] shadow-2xl flex items-center gap-2 z-50">
          <Icon.sparkles size={14}/>
          {aiToast}
        </div>
      )}

      {/* Preparing report (skeleton) */}
      {signState === "preparing" && (
        <PreparingReportOverlay patientName={patient.name} />
      )}

      {/* Signed report (letterhead + share actions) */}
      {signState === "report" && (
        <SignedReportOverlay
          enc={enc}
          patient={patient}
          practitioner={pr}
          location={loc}
          todayLong={todayLong}
          onClose={() => setSignState("idle")}
          onAcknowledge={() => onComplete && onComplete(patient.id)}
          onAction={(label) => { setShareToast(label); setTimeout(() => setShareToast(null), 2400); }}
        />
      )}

      {shareToast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-10 z-[60] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12.5px] shadow-2xl flex items-center gap-2">
          <Icon.check size={14}/>
          {shareToast}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Document primitives — letterhead-style row, section, chip list
// ─────────────────────────────────────────────────────────────
function DocRow({ label, children }) {
  return (
    <React.Fragment>
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-500 font-semibold pt-0.5">{label}</div>
      <div className="text-slate-800 text-[12.5px]">{children}</div>
    </React.Fragment>
  );
}

function DocSection({ label, children }) {
  return (
    <section className="px-12 pt-6 pb-1 border-t border-slate-100">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3 flex items-center gap-2">
        <span className="size-1 rounded-full bg-slate-400"/>{label}
      </div>
      {children}
    </section>
  );
}

function ChipList({ values, tone = "rose" }) {
  const T = {
    rose:    "bg-rose-50 text-rose-700 border-rose-100",
    amber:   "bg-amber-50 text-amber-800 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <span className="inline-flex flex-wrap gap-1">
      {values.map((v, i) => (
        <span key={i} className={cx("text-[11.5px] font-medium px-2 py-0.5 rounded-full border", T[tone])}>{v}</span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Utility — dotted-path write
// ─────────────────────────────────────────────────────────────
function writePath(obj, path, value) {
  const keys = path.split(".");
  const head = keys[0];
  if (keys.length === 1) return { ...obj, [head]: value };
  return { ...obj, [head]: writePath(obj[head], keys.slice(1).join("."), value) };
}

// ─────────────────────────────────────────────────────────────
// Field helpers
// ─────────────────────────────────────────────────────────────
function FieldLabel({ children, flag }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{children}</div>
      <AIChip state={flag} />
    </div>
  );
}

function AIChip({ state }) {
  if (state === "ai") return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700">
      <Icon.sparkles size={9}/> AI suggested
    </span>
  );
  if (state === "edited") return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
      <Icon.check size={9}/> Edited
    </span>
  );
  return null;
}

// Paper-style input — minimal border, no rounded card chrome.
function PaperInput(props) {
  return (
    <input
      {...props}
      className={cx(
        "h-9 w-full bg-transparent text-[13.5px] text-slate-900 px-2 border-b border-slate-300 focus:outline-none focus:border-sky-500 transition placeholder:text-slate-400",
        props.className
      )}
    />
  );
}

function PaperTextarea({ rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={cx(
        "w-full bg-transparent text-[13.5px] text-slate-900 px-2 py-1.5 border-b border-slate-300 focus:outline-none focus:border-sky-500 transition placeholder:text-slate-400 resize-none",
        props.className
      )}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Body sections — written with paper-style inputs
// ─────────────────────────────────────────────────────────────

function SubjectiveBody({ enc, update, aiFlags }) {
  const ROS_ITEMS = [
    { k: "general",   label: "General symptoms" },
    { k: "eyes",      label: "Eyes / Vision" },
    { k: "ent",       label: "ENT" },
    { k: "cardio",    label: "Cardiovascular" },
    { k: "resp",      label: "Respiratory" },
    { k: "gi",        label: "GI" },
    { k: "gu",        label: "GU" },
    { k: "msk",       label: "Musculoskeletal" },
    { k: "neuro",     label: "Neurological" },
    { k: "skin",      label: "Skin" },
    { k: "psych",     label: "Psychiatric" },
    { k: "endocrine", label: "Endocrine" },
    { k: "heme",      label: "Hematologic" },
    { k: "immune",    label: "Immunologic" },
  ];
  const togglePos = (k) => update(`ros.${k}`, { ...(enc.ros[k] || {}), pos: !(enc.ros[k]?.pos) });
  const setNote   = (k, v) => update(`ros.${k}`, { ...(enc.ros[k] || {}), note: v });
  const positives = ROS_ITEMS.filter(i => enc.ros[i.k]?.pos);
  return (
    <div className="space-y-5 pb-5">
      <div>
        <FieldLabel flag={aiFlags["chiefComplaint"]}>Chief complaint</FieldLabel>
        <PaperInput value={enc.chiefComplaint} onChange={(e) => update("chiefComplaint", e.target.value)} placeholder="e.g. Cough and fever × 3 days" />
      </div>
      <div>
        <FieldLabel flag={aiFlags["hpi"]}>History of present illness</FieldLabel>
        <PaperTextarea rows={4} value={enc.hpi} onChange={(e) => update("hpi", e.target.value)} placeholder="Onset, duration, severity, related symptoms…" />
      </div>
      <div>
        <FieldLabel>Review of systems · tap a system to mark positive</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {ROS_ITEMS.map(s => {
            const on = !!enc.ros[s.k]?.pos;
            const flag = aiFlags[`ros.${s.k}`];
            return (
              <button key={s.k}
                onClick={() => togglePos(s.k)}
                className={cx(
                  "h-7 px-2.5 rounded-full text-[12px] font-medium border transition inline-flex items-center gap-1.5",
                  on ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}>
                <span>{s.label}</span>
                <span className="text-[10px]">{on ? "POS" : "neg"}</span>
                {flag === "ai" && <span className="size-1.5 rounded-full bg-violet-500" title="AI suggested" />}
              </button>
            );
          })}
        </div>

        {positives.length > 0 && (
          <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50/40 p-3 space-y-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-rose-700">
              Notes on positive findings
            </div>
            {positives.map(s => (
              <div key={s.k} className="grid grid-cols-[140px_1fr] gap-3 items-start">
                <div className="pt-1.5 text-[12px] font-medium text-slate-800 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  {s.label}
                </div>
                <PaperTextarea
                  rows={2}
                  value={enc.ros[s.k]?.note || ""}
                  onChange={(e) => setNote(s.k, e.target.value)}
                  placeholder={`Brief note on ${s.label.toLowerCase()} findings…`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectiveBody({ enc, update, aiFlags, intake }) {
  const VITALS = [
    ["Weight",  "kg",    "weight"],
    ["Height",  "cm",    "height"],
    ["Temp",    "°C",    "temp"],
    ["HR",      "bpm",   "hr"],
    ["SpO₂",    "%",     "spo2"],
    ["BP",      "mmHg",  "bp"],
    ["Resp",    "/min",  "rr"],
  ];
  return (
    <div className="space-y-5 pb-5">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">Vital signs</div>
          {intake && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
              <Icon.check size={9}/> Captured at intake{intake.by ? ` by ${intake.by}` : ""}{intake.at ? ` · ${intake.at}` : ""}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-x-6 gap-y-3">
          {VITALS.map(([label, unit, key]) => (
            <PaperVital
              key={key} label={label} unit={unit}
              value={enc.vitals[key]} onChange={(v) => update(`vitals.${key}`, v)}
              flag={aiFlags[`vitals.${key}`]}
              warn={
                (key === "temp" && parseFloat(enc.vitals.temp) > 37.5) ||
                (key === "hr"   && parseInt(enc.vitals.hr)   > 110) ||
                (key === "spo2" && parseInt(enc.vitals.spo2) < 95)
              }
            />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Physical exam</FieldLabel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            ["general",     "General"],
            ["vitals",      "Vitals"],
            ["heent",       "HEENT"],
            ["neck",        "Neck"],
            ["cardio",      "Cardiovascular"],
            ["chest",       "Respiratory / Chest & Lungs"],
            ["abdomen",     "Abdomen"],
            ["msk",         "Musculoskeletal"],
            ["neuro",       "Neurological"],
            ["skin",        "Skin"],
            ["psych",       "Psychiatric"],
            ["gu",          "Genitourinary (GU)"],
            ["gi",          "Gastrointestinal (GI)"],
            ["rectal",      "Rectal"],
            ["extremities", "Extremities"],
            ["lymphatic",   "Lymphatic"],
            ["endocrine",   "Endocrine"],
            ["breast",      "Breast exam"],
          ].map(([k, label]) => (
            <PaperExamArea
              key={k} label={label}
              value={enc.exam[k]} onChange={(v) => update(`exam.${k}`, v)}
              flag={aiFlags[`exam.${k}`]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AssessmentBody({ enc, update, setEnc, aiFlags }) {
  const [dxInput, setDxInput] = React.useState("");
  const SUGGESTIONS = [
    { code: "J45.901", desc: "Unspecified asthma with (acute) exacerbation" },
    { code: "J06.9",   desc: "Acute upper respiratory infection, unspecified" },
    { code: "J21.9",   desc: "Acute bronchiolitis, unspecified" },
  ];
  const addDx = (dx) => {
    if (enc.diagnoses.find(d => d.code === dx.code)) return;
    setEnc(e => ({ ...e, diagnoses: [...e.diagnoses, { ...dx, primary: e.diagnoses.length === 0 }] }));
    setDxInput("");
  };
  return (
    <div className="space-y-3 pb-5">
      <FieldLabel flag={aiFlags["diagnoses"]}>Working diagnoses · ICD-10</FieldLabel>
      {enc.diagnoses.length === 0 && (
        <div className="text-[12px] text-slate-400 italic py-1">No diagnoses yet — record the visit and press Auto-fill, or search below.</div>
      )}
      <div className="space-y-1.5">
        {enc.diagnoses.map((d, i) => (
          <div key={d.code} className="flex items-center gap-3 py-1.5 border-b border-slate-100">
            <span className={cx("font-mono text-[11px] px-1.5 py-0.5 rounded",
              d.primary ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"
            )}>
              {d.code}
            </span>
            <div className="flex-1 text-[13px] text-slate-800">{d.desc}</div>
            {d.primary && <Badge color={{ bg:"#DBEAFE", text:"#1E40AF" }}>Primary</Badge>}
            {!d.primary && (
              <button onClick={() => setEnc(e => ({
                ...e,
                diagnoses: e.diagnoses.map((x, j) => ({ ...x, primary: j === i })),
              }))} className="text-[11.5px] text-sky-600 hover:underline">Make primary</button>
            )}
            <button onClick={() => setEnc(e => ({ ...e, diagnoses: e.diagnoses.filter((_, j) => j !== i) }))}
              className="size-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500">
              <Icon.close size={12}/>
            </button>
          </div>
        ))}
      </div>
      <div className="pt-1">
        <PaperInput value={dxInput} onChange={(e) => setDxInput(e.target.value)} placeholder="Search ICD-10 (e.g. 'cough', 'J20.9')…" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter(s => !enc.diagnoses.find(d => d.code === s.code)).map(s => (
            <button key={s.code} onClick={() => addDx(s)}
              className="text-[11.5px] px-2 py-1 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-100">
              + {s.code} · {s.desc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanOrdersBody({ enc, update, setEnc, aiFlags }) {
  const updateOrders = (key, value) => setEnc(e => ({ ...e, orders: { ...e.orders, [key]: value } }));
  const LAB_OPTS = ["CBC", "CRP", "Urinalysis", "Strep rapid", "Influenza PCR", "Chest X-ray"];
  const VAX_OPTS = ["DTaP booster", "Influenza 2026", "MMR catch-up"];
  const SCREEN_OPTS = ["Vision screen", "Hearing screen", "BMI / Growth", "Developmental milestones", "Anemia (Hgb)", "Lead screen"];
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 pb-5">
      <div>
        <FieldLabel flag={aiFlags["plan"]}>Plan narrative</FieldLabel>
        <PaperTextarea rows={3} value={enc.plan} onChange={(e) => update("plan", e.target.value)} placeholder="Treatment plan, supportive care, return precautions…" />
      </div>

      <div>
        <FieldLabel flag={aiFlags["orders.rx"]}>Prescriptions</FieldLabel>
        {enc.orders.rx.length === 0 && (
          <div className="text-[12px] text-slate-400 italic py-1">No prescriptions yet.</div>
        )}
        <div className="space-y-2">
          {enc.orders.rx.map((r, i) => (
            <div key={i} className="grid grid-cols-[auto_2fr_3fr_0.8fr_auto] gap-2 items-end py-1.5 border-b border-slate-100">
              <div className="text-slate-400"><Icon.pill size={14}/></div>
              <PaperInput value={r.name}  onChange={(e) => updateOrders("rx", enc.orders.rx.map((x,j) => j===i?{...x,name:e.target.value}:x))} placeholder="Drug + strength" />
              <PaperInput value={r.instr} onChange={(e) => updateOrders("rx", enc.orders.rx.map((x,j) => j===i?{...x,instr:e.target.value}:x))} placeholder="Sig (dose, route, frequency)" />
              <div className="text-[12px] text-slate-500 pb-2"><span className="font-medium text-slate-700">{r.days}</span> days</div>
              <button onClick={() => updateOrders("rx", enc.orders.rx.filter((_, j) => j!==i))}
                className="size-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 mb-2"><Icon.close size={12}/></button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => updateOrders("rx", [...enc.orders.rx, { name: "", instr: "", days: 7 }])}
          className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-dashed border-sky-300 hover:border-sky-400 transition"
        >
          <Icon.plus size={13}/> Add medication
        </button>
      </div>

      <OrderDetailSection
        label="Labs & imaging"
        accent="sky"
        items={enc.orders.labs}
        onChange={(arr) => updateOrders("labs", arr)}
        presets={LAB_OPTS}
        suggestions={["Lipid panel", "TSH", "HbA1c", "Stool culture", "Glucose", "Iron studies", "Ferritin", "Allergy panel", "Vitamin D", "Ultrasound — abdomen", "Audiometry", "Spirometry", "ECG"]}
        placeholder="Add lab or imaging…"
        detailFields={[
          { key: "when",     label: "Collect",  type: "date", default: todayISO },
          { key: "priority", label: "Priority", type: "select", options: ["Routine", "Stat", "Fasting"], default: "Routine" },
          { key: "note",     label: "Note",     type: "text", placeholder: "e.g. send to LabSur", default: "" },
        ]}
      />

      <OrderDetailSection
        label="Vaccinations"
        accent="emerald"
        items={enc.orders.vaccines}
        onChange={(arr) => updateOrders("vaccines", arr)}
        presets={VAX_OPTS}
        suggestions={["Hep A", "Hep B", "Hib", "Polio (IPV)", "Pneumococcal (PCV13)", "Rotavirus", "Varicella", "HPV", "Meningococcal", "COVID-19 booster", "BCG", "Tdap"]}
        placeholder="Add vaccine…"
        detailFields={[
          { key: "when", label: "Administer", type: "date", default: todayISO },
          { key: "site", label: "Site",       type: "select", options: ["Left deltoid", "Right deltoid", "Left thigh", "Right thigh", "Oral"], default: "Left deltoid" },
          { key: "lot",  label: "Lot #",      type: "text",   placeholder: "e.g. AX-29841", default: "" },
        ]}
      />

      <OrderDetailSection
        label="Recommended screening"
        accent="violet"
        items={enc.orders.screening}
        onChange={(arr) => updateOrders("screening", arr)}
        presets={SCREEN_OPTS}
        suggestions={["M-CHAT (autism)", "PHQ-A (depression)", "GAD-7 (anxiety)", "Cholesterol panel", "Iron deficiency", "Tuberculosis (PPD)", "Dental referral", "Speech/language"]}
        placeholder="Add screening…"
        detailFields={[
          { key: "when",   label: "Due",    type: "select", options: ["Today", "This visit", "Next visit", "6 months", "12 months"], default: "This visit" },
          { key: "result", label: "Result", type: "select", options: ["Pending", "Pass", "Refer", "N/A"], default: "Pending" },
          { key: "note",   label: "Note",   type: "text",   placeholder: "e.g. parent declined", default: "" },
        ]}
      />
    </div>
  );
}

function EducationBody({ enc, update, aiFlags }) {
  return (
    <div className="space-y-5 pb-5">
      <div>
        <FieldLabel flag={aiFlags["education"]}>Patient education & return precautions</FieldLabel>
        <PaperTextarea rows={3} value={enc.education} onChange={(e) => update("education", e.target.value)} placeholder="What was discussed with the family. When to come back urgently." />
      </div>
      <div>
        <FieldLabel>Follow-up</FieldLabel>
        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          <div>
            <div className="text-[10.5px] text-slate-500 mb-1">In</div>
            <Select value={enc.orders.followUp.in} onChange={(v) => update("orders.followUp", { ...enc.orders.followUp, in: v })}
              options={["3 days","1 week","2 weeks","1 month","3 months","6 months"]} />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-500 mb-1">With</div>
            <Select value={enc.orders.followUp.with}
              onChange={(v) => update("orders.followUp", { ...enc.orders.followUp, with: v })}
              options={window.CHAVITOS.PRACTITIONERS.map(p => ({ value: p.id, label: p.name }))} />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-500 mb-1">Type</div>
            <Select value={enc.orders.followUp.type} onChange={(v) => update("orders.followUp", { ...enc.orders.followUp, type: v })}
              options={["Follow-up","Sick visit","Wellness exam","Telehealth"]} />
          </div>
        </div>
        {enc.orders.followUp.type && (
          <div className="mt-3">
            <div className="text-[10.5px] text-slate-500 mb-1 flex items-center justify-between">
              <span>
                Note for next appointment
                <span className="ml-1 text-slate-400 normal-case">· what to check, prep, or watch for</span>
              </span>
              <AIChip state={aiFlags["orders.followUp.note"]} />
            </div>
            <PaperTextarea
              rows={2}
              value={enc.orders.followUp.note || ""}
              onChange={(e) => update("orders.followUp", { ...enc.orders.followUp, note: e.target.value })}
              placeholder={`e.g. ${
                enc.orders.followUp.type === "Follow-up"     ? "Reassess wheeze, taper salbutamol if improved." :
                enc.orders.followUp.type === "Sick visit"    ? "Watch for worsening cough or fever > 39°C." :
                enc.orders.followUp.type === "Wellness exam" ? "Update growth chart, DTaP booster due." :
                                                               "Video consult — family will share weight and temp before call."
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PaperVital({ label, unit, value, onChange, warn, flag }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className={cx("text-[10.5px] uppercase tracking-[0.12em] font-semibold", warn ? "text-rose-600" : "text-slate-500")}>{label}</div>
        <AIChip state={flag} />
      </div>
      <div className={cx("flex items-baseline gap-1 mt-0.5 border-b", warn ? "border-rose-300" : "border-slate-300", "focus-within:border-sky-500 transition")}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="text-[18px] font-semibold text-slate-900 bg-transparent outline-none w-full font-mono"
          style={{ fontVariantNumeric: "tabular-nums" }}
        />
        <span className="text-[11px] text-slate-500 pb-0.5">{unit}</span>
      </div>
      {warn && <div className="text-[10px] text-rose-600 mt-0.5">Abnormal</div>}
    </div>
  );
}

function PaperExamArea({ label, value, onChange, flag }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-slate-500">{label}</div>
        <AIChip state={flag} />
      </div>
      <PaperTextarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating AI Scribe capsule — dockable, focused control
// ─────────────────────────────────────────────────────────────
function ScribeCapsule({ open, onToggle, recording, ended, onToggleRecord, onEndAndFill, transcript, elapsed, aiBusy, phoneLinked, onOpenQR, onUnlinkPhone }) {
  const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const transcriptRef = React.useRef(null);
  React.useEffect(() => {
    if (open && transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript.length, open]);

  const idle = !recording && !ended && transcript.length === 0;
  const status = phoneLinked ? "Recording on iPhone"
    : aiBusy ? "Filling the note…"
    : ended ? "Ended"
    : recording ? "Listening…"
    : transcript.length > 0 ? "Paused"
    : "Ready · press start when you begin";

  return (
    <div className="absolute bottom-5 right-5 z-40" style={{ filter: "drop-shadow(0 14px 30px rgba(15,23,42,0.25))" }}>
      <div className={cx(
        "bg-white rounded-2xl border overflow-hidden transition-all",
        open ? "w-[420px]" : "w-[320px]",
        phoneLinked ? "border-violet-300"
          : recording ? "border-sky-300"
          : ended ? "border-emerald-300"
          : "border-slate-300"
      )}>
        {/* Header bar */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className={cx(
            "size-9 rounded-full flex items-center justify-center text-white shrink-0 transition relative",
            phoneLinked ? "bg-violet-500"
              : recording ? "bg-rose-500 ring-2 ring-rose-200"
              : ended ? "bg-emerald-500"
              : "bg-gradient-to-br from-sky-500 to-emerald-500"
          )}>
            {phoneLinked ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/></svg>
            )}
            {phoneLinked && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-900 flex items-center gap-1.5">
              Voice Scribe
              {phoneLinked && <span className="text-[9.5px] uppercase tracking-wide font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">📱 Linked</span>}
              {recording && !phoneLinked && <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />}
            </div>
            <div className="text-[10.5px] text-slate-500">
              {status} · <span className="font-mono">{fmtTime(elapsed)}</span> · {transcript.length} lines
            </div>
          </div>
          <button onClick={onToggle} className="size-7 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center" title={open ? "Collapse" : "Expand"}>
            <span style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 200ms" }}>
              <Icon.chevDown size={14}/>
            </span>
          </button>
        </div>

        {/* Manual controls — ALWAYS visible */}
        <div className="px-3 pb-3">
          {phoneLinked ? (
            <div className="rounded-xl bg-violet-50 border border-violet-200 p-2.5 flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-violet-500 text-white flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-violet-900">Recording from your iPhone</div>
                <div className="text-[10.5px] text-violet-700/80">Transcript syncs here every 2 seconds.</div>
              </div>
              <button
                onClick={onUnlinkPhone}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 px-2 py-1 rounded-md hover:bg-violet-100"
              >
                Unlink
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-stretch gap-2">
                <button
                  onClick={onToggleRecord}
                  disabled={aiBusy}
                  className={cx(
                    "flex-1 h-10 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition border",
                    recording
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : "bg-sky-500 text-white border-sky-500 hover:bg-sky-600",
                    aiBusy && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {recording ? (
                    <>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      {idle ? "Start" : "Resume"}
                    </>
                  )}
                </button>
                <button
                  onClick={onEndAndFill}
                  disabled={aiBusy || transcript.length === 0}
                  className={cx(
                    "flex-1 h-10 rounded-xl text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition border",
                    (aiBusy || transcript.length === 0)
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                  )}
                  title={transcript.length === 0 ? "Start recording first" : "End and fill the form"}
                >
                  {aiBusy ? (
                    <>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Filling…
                    </>
                  ) : (
                    <>
                      <Icon.sparkles size={12}/>
                      End &amp; fill form
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={onOpenQR}
                className="mt-2 w-full h-9 rounded-xl text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                  <path d="M14 14h3v3M21 14v3M14 21h3M21 21v-3"/>
                </svg>
                Continue on your phone &nbsp;<span className="text-slate-400">→ Going to exam room</span>
              </button>
            </>
          )}
        </div>

        {open && (
          <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 max-h-[160px] overflow-y-auto space-y-1.5" ref={transcriptRef}>
              {transcript.length === 0 ? (
                <div className="text-[11.5px] text-slate-400 italic">Press <b>Start</b> to begin recording. Transcript appears here as the doctor speaks…</div>
              ) : transcript.map((line, i) => (
                <div key={i} className="text-[12px] leading-snug">
                  <span className={cx("font-semibold mr-1", line.who === "Dr" ? "text-sky-700" : "text-violet-700")}>{line.who}:</span>
                  <span className="text-slate-700">{line.text}</span>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] text-slate-500 leading-snug">
              Transcript stays on this device. Nothing leaves the clinic.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Order detail section — chip picker + per-item detail editor
// ─────────────────────────────────────────────────────────────
function OrderDetailSection({ label, accent = "sky", items, onChange, presets, suggestions, placeholder, detailFields }) {
  const accents = {
    sky:     { chip: "bg-sky-500 text-white border-sky-500",         pill: "bg-sky-50 border-sky-200 text-sky-700",         dot: "bg-sky-500"     },
    emerald: { chip: "bg-emerald-500 text-white border-emerald-500", pill: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
    violet:  { chip: "bg-violet-500 text-white border-violet-500",   pill: "bg-violet-50 border-violet-200 text-violet-700",   dot: "bg-violet-500"  },
  }[accent];

  const names = items.map(i => i.name);
  const handleNamesChange = (nextNames) => {
    // build a new object array, preserving details for already-selected items
    const next = nextNames.map(n => {
      const existing = items.find(i => i.name === n);
      if (existing) return existing;
      const fresh = { name: n };
      detailFields.forEach(f => { fresh[f.key] = f.default; });
      return fresh;
    });
    onChange(next);
  };

  const updateItemField = (idx, key, value) => {
    onChange(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  };
  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <OrderChipPicker
        presets={presets}
        selected={names}
        onChange={handleNamesChange}
        activeClass={accents.chip}
        placeholder={placeholder}
        suggestions={suggestions}
      />

      {items.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {items.map((it, idx) => (
            <div key={idx} className={cx("rounded-lg border px-3 py-2 flex items-center gap-3", accents.pill)}>
              <div className="flex items-center gap-2 min-w-[160px] shrink-0">
                <span className={cx("size-1.5 rounded-full", accents.dot)} />
                <span className="text-[12.5px] font-semibold">{it.name}</span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2">
                {detailFields.map((f) => (
                  <div key={f.key} className="flex flex-col">
                    <label className="text-[9.5px] uppercase tracking-[0.1em] font-semibold text-slate-500/80 mb-0.5">{f.label}</label>
                    {f.type === "select" ? (
                      <select
                        value={it[f.key] ?? ""}
                        onChange={(e) => updateItemField(idx, f.key, e.target.value)}
                        className="bg-white/80 border border-slate-200 rounded-md h-7 px-1.5 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                      >
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type === "date" ? "date" : "text"}
                        value={it[f.key] ?? ""}
                        onChange={(e) => updateItemField(idx, f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="bg-white/80 border border-slate-200 rounded-md h-7 px-2 text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="size-6 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center shrink-0"
                title="Remove"
              >
                <Icon.close size={11}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Phone pair modal — QR + instructions + audio tips + safety
// ─────────────────────────────────────────────────────────────
function PhonePairModal({ phoneLinked, patientName, onClose, onLink, onUnlink }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[760px] max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-3">
          <div className="size-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-slate-900">Continue Voice Scribe on your phone</div>
            <div className="text-[12px] text-slate-500 mt-0.5">Use your iPhone in the exam room with {patientName}. Your laptop stays open with the chart.</div>
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <Icon.close size={14}/>
          </button>
        </div>

        {!phoneLinked ? (
          <>
            {/* QR + steps */}
            <div className="px-6 py-5 grid grid-cols-[260px_1fr] gap-6">
              {/* QR */}
              <div className="text-center">
                <div className="inline-block p-3 rounded-2xl border-2 border-violet-200 bg-white">
                  <FakeQR size={220} />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">Link expires when you sign the note.</div>
                <div className="text-[10.5px] text-slate-400 mt-1 font-mono">PIN: <span className="text-slate-700 font-semibold">7 4 2 9</span></div>
              </div>
              {/* Steps */}
              <div className="space-y-3">
                <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-slate-500">How it works</div>
                <Step n="1" title="Scan with your iPhone camera">
                  Point your camera at the QR. A secure link opens in Safari — no login, no app install.
                </Step>
                <Step n="2" title="Take the phone to the patient">
                  Walk to the exam room. Your laptop keeps the chart open and ready.
                </Step>
                <Step n="3" title="Place the phone close to the patient">
                  Lay it flat on the exam table or clip it to your pocket. The mic picks up both voices best within an arm's length.
                </Step>
                <Step n="4" title="Sign the note back at your laptop">
                  When you return, press <b>End &amp; fill form</b> or <b>Sign</b>. The link disposes, audio is wiped from the phone.
                </Step>
              </div>
            </div>

            {/* Tips: audio + safety */}
            <div className="px-6 pb-5 grid grid-cols-2 gap-3">
              <TipCard
                tone="amber"
                icon={
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10v4M6 7v10M10 4v16M14 7v10M18 10v4M22 12h0"/></svg>
                }
                title="Get clean audio in the exam room"
                bullets={[
                  "Tap the speaker tag (Dr / Parent / Child) before each statement — helps Narzim attribute the transcript correctly.",
                  "Phone flat on the table beats phone in hand. If you must hold it, point the mic toward whoever's speaking.",
                  "For noisy rooms, connect a clip-on lapel mic via Lightning/USB-C — the phone will use it automatically.",
                  "AirPods Pro also work as a wireless mic — wear one, hand the other to the parent if needed.",
                ]}
              />
              <TipCard
                tone="emerald"
                icon={
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                }
                title="Your data never gets lost"
                bullets={[
                  "Transcript syncs to your laptop every 2 seconds. If phone disconnects mid-visit, everything up to that point is already saved.",
                  "Audio stays on Chavitos Clinic's local network — it never leaves the building.",
                  "No login on the phone, but the link is unique to this encounter and one-time-use.",
                  "When you sign the note, the link disposes itself and the phone's transcript wipes automatically.",
                ]}
              />
            </div>

            {/* Bottom actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div className="text-[11.5px] text-slate-600 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Encrypted on the local network · No cloud upload · HIPAA-aligned
              </div>
              <button
                onClick={() => { onLink(); onClose(); }}
                className="px-4 h-9 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Simulate scan &amp; link iPhone
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Linked state — show what's on the phone */}
            <div className="px-6 py-5 grid grid-cols-[260px_1fr] gap-6">
              <div className="flex justify-center">
                <PhonePreview patientName={patientName} />
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"/> Live · Linked to iPhone
                </div>
                <div className="text-[14px] font-semibold text-slate-900">Your iPhone is now the microphone.</div>
                <div className="text-[12.5px] text-slate-600 leading-relaxed">
                  Take the phone to the exam room. The transcript and detected vitals appear here on your laptop in real time.
                </div>
                <ul className="space-y-2 text-[12px] text-slate-700">
                  <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span> Tap a speaker tag on the phone before each statement</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span> Phone flat on the exam table picks up both voices clearly</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span> Your laptop stays here, ready for the SOAP note</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">✓</span> If the phone dies, transcript-so-far is safe on the laptop</li>
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div className="text-[11.5px] text-slate-500">When you press Sign on the laptop, this link disposes and the phone wipes.</div>
              <div className="flex items-center gap-2">
                <button onClick={() => { onUnlink(); onClose(); }} className="px-3 h-9 rounded-lg border border-slate-200 hover:bg-slate-100 text-[12.5px] font-medium text-slate-700">
                  Unlink phone
                </button>
                <button onClick={onClose} className="px-4 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[12.5px] font-semibold">
                  Got it
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="size-6 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center shrink-0">{n}</div>
      <div>
        <div className="text-[12.5px] font-semibold text-slate-900">{title}</div>
        <div className="text-[11.5px] text-slate-600 leading-snug">{children}</div>
      </div>
    </div>
  );
}

function TipCard({ tone, title, bullets, icon }) {
  const tones = {
    amber:   { bg: "bg-amber-50",   border: "border-amber-200",   ic: "bg-amber-500 text-white",   title: "text-amber-900",   body: "text-amber-900/80" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", ic: "bg-emerald-500 text-white", title: "text-emerald-900", body: "text-emerald-900/80" },
  }[tone];
  return (
    <div className={cx("rounded-xl border p-3", tones.bg, tones.border)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cx("size-6 rounded-md flex items-center justify-center shrink-0", tones.ic)}>{icon}</div>
        <div className={cx("text-[12px] font-bold", tones.title)}>{title}</div>
      </div>
      <ul className="space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className={cx("text-[11.5px] leading-snug pl-3 relative", tones.body)}>
            <span className="absolute left-0 top-2 size-1 rounded-full bg-current opacity-50" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Procedural QR-like pattern (decorative — not a real QR)
function FakeQR({ size = 220 }) {
  const grid = 21; // common QR module count for V1
  const cell = size / grid;
  // Build deterministic but irregular fill pattern; place 3 finder squares
  const cells = [];
  const seed = 0x9e3779b1;
  const rand = (x, y) => {
    const h = ((x * 374761393) ^ (y * 668265263) ^ seed) >>> 0;
    return ((h * 1274126177) >>> 0) % 100;
  };
  const isFinder = (x, y) => (
    (x < 7 && y < 7) ||
    (x >= grid - 7 && y < 7) ||
    (x < 7 && y >= grid - 7)
  );
  const finderFill = (x, y) => {
    // finders relative
    const fx = x < 7 ? x : x >= grid - 7 ? x - (grid - 7) : -1;
    const fy = y < 7 ? y : y >= grid - 7 ? y - (grid - 7) : -1;
    if (fx < 0 || fy < 0) return false;
    const onBorder = fx === 0 || fy === 0 || fx === 6 || fy === 6;
    const center = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
    return onBorder || center;
  };
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const fill = isFinder(x, y) ? finderFill(x, y) : rand(x, y) < 48;
      if (fill) cells.push(<rect key={`${x}-${y}`} x={x*cell} y={y*cell} width={cell} height={cell} fill="#0F172A" />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code (decorative)">
      <rect width={size} height={size} fill="white"/>
      {cells}
      {/* Center logo */}
      <rect x={size/2 - 22} y={size/2 - 22} width="44" height="44" rx="8" fill="white"/>
      <rect x={size/2 - 18} y={size/2 - 18} width="36" height="36" rx="6" fill="#8B5CF6"/>
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="white" fontFamily="system-ui">Rx</text>
    </svg>
  );
}

// iPhone mock preview for the linked state
function PhonePreview({ patientName }) {
  return (
    <div className="rounded-[36px] bg-slate-900 p-2 shadow-xl" style={{ width: 220 }}>
      <div className="rounded-[28px] bg-white overflow-hidden relative" style={{ aspectRatio: "9 / 19" }}>
        {/* Notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full z-10" />
        {/* Status bar */}
        <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[9px] font-semibold text-slate-900">
          <span>9:41</span>
          <span className="flex items-center gap-0.5"><span className="size-1 rounded-full bg-slate-900"/><span className="size-1 rounded-full bg-slate-900"/><span className="size-1 rounded-full bg-slate-900"/></span>
        </div>
        {/* Content */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[8.5px] uppercase tracking-wide font-semibold text-violet-600">Chavitos · Voice Scribe</div>
          <div className="text-[11px] font-bold text-slate-900 mt-0.5 truncate">{patientName}</div>
        </div>
        {/* Mic */}
        <div className="flex flex-col items-center mt-2">
          <div className="size-16 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center ring-4 ring-rose-200 animate-pulse">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/></svg>
          </div>
          <div className="text-[8.5px] text-slate-500 mt-1.5">Listening · 01:24</div>
        </div>
        {/* Speaker tags */}
        <div className="px-3 mt-3">
          <div className="text-[7.5px] uppercase tracking-wide font-semibold text-slate-400 mb-1">Tag speaker</div>
          <div className="flex gap-1">
            <div className="flex-1 h-6 rounded-md bg-sky-100 text-sky-700 text-[9px] font-semibold flex items-center justify-center">Dr</div>
            <div className="flex-1 h-6 rounded-md bg-violet-100 text-violet-700 text-[9px] font-semibold flex items-center justify-center">Parent</div>
            <div className="flex-1 h-6 rounded-md bg-amber-100 text-amber-700 text-[9px] font-semibold flex items-center justify-center">Child</div>
          </div>
        </div>
        {/* Transcript snippet */}
        <div className="mx-3 mt-2 p-1.5 rounded bg-slate-50 border border-slate-200 text-[8.5px] leading-snug">
          <span className="font-semibold text-violet-700">Parent:</span> <span className="text-slate-600">She's had a dry cough for 3 days…</span>
        </div>
        {/* Bottom hint */}
        <div className="absolute bottom-3 left-0 right-0 text-center text-[8px] text-slate-400 px-3">
          Place flat near patient for best audio
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Order chip picker (carried over from the original implementation)
// ─────────────────────────────────────────────────────────────
function OrderChipPicker({ presets, selected, onChange, activeClass, placeholder, suggestions = [] }) {
  const [adding, setAdding] = React.useState(false);
  const [text, setText] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (adding) setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    if (!adding) setText("");
  }, [adding]);

  const isPreset = (item) => presets.includes(item);
  const customs = selected.filter(s => !isPreset(s));
  const allChips = [...presets, ...customs];

  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]);
  };

  const q = text.trim().toLowerCase();
  const seen = new Set(allChips.map(s => s.toLowerCase()));
  const recs = suggestions.filter(s => !seen.has(s.toLowerCase()) && (!q || s.toLowerCase().includes(q))).slice(0, 6);
  const isNewCustom = q && !seen.has(q);

  const commit = (raw) => {
    const v = (raw || "").trim();
    if (!v) return;
    if (selected.includes(v)) { setText(""); return; }
    onChange([...selected, v]);
    setText("");
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {allChips.map(o => {
        const on = selected.includes(o);
        const custom = !isPreset(o);
        return (
          <span key={o} className="inline-flex items-center group">
            <button
              type="button"
              onClick={() => toggle(o)}
              className={cx("text-[12px] px-2.5 py-1 rounded-md border transition flex items-center gap-1",
                on ? activeClass : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              {on && "✓ "}{o}
              {custom && (
                <span className={cx("ml-1 text-[9.5px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded",
                  on ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                )}>custom</span>
              )}
            </button>
            {custom && (
              <button
                type="button"
                onClick={() => onChange(selected.filter(x => x !== o))}
                className="ml-0.5 size-6 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                title="Remove custom"
              >
                <Icon.close size={11}/>
              </button>
            )}
          </span>
        );
      })}

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[12px] px-2.5 py-1 rounded-md border border-dashed border-slate-300 text-slate-600 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50 transition inline-flex items-center gap-1"
        >
          <Icon.plus size={11}/> Add custom
        </button>
      ) : (
        <div className="relative w-full mt-1">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-9 flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-2.5 focus-within:ring-2 focus-within:ring-sky-400/30 transition">
              <Icon.search size={13} />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commit(text); }
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-slate-400"
              />
            </div>
            <Button variant="primary" size="sm" onClick={() => commit(text)} disabled={!text.trim()}>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
          {(recs.length > 0 || isNewCustom) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recs.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => commit(s)}
                  className="text-[11.5px] px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition inline-flex items-center gap-1"
                >
                  <Icon.plus size={10}/> {s}
                </button>
              ))}
              {isNewCustom && (
                <span className="text-[11px] text-slate-500 self-center italic">
                  Press Enter or Add to save <span className="font-semibold text-slate-700">"{text.trim()}"</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { EncounterScreen });

// ─────────────────────────────────────────────────────────────
// Preparing report — skeleton loading while we "arrange documents"
// ─────────────────────────────────────────────────────────────
function PreparingReportOverlay({ patientName }) {
  const steps = [
    "Collating subjective & history",
    "Compiling vitals and exam findings",
    "Formatting diagnoses & ICD-10 codes",
    "Arranging orders, prescriptions & follow-up",
    "Generating PDF · notifying reception",
  ];
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setActive(a => Math.min(a + 1, steps.length - 1));
    }, 520);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/55 backdrop-blur-md flex items-center justify-center px-8">
      <div className="bg-white rounded-2xl shadow-2xl w-[720px] max-w-full overflow-hidden">
        {/* Header strip */}
        <div className="h-1.5" style={{ background: "linear-gradient(90deg,#A5C944 0%,#5FB8C9 50%,#0098E4 100%)" }} />

        <div className="px-8 pt-7 pb-5 grid grid-cols-[260px_1fr] gap-8">
          {/* Animated paper stack */}
          <div className="relative h-[200px] flex items-center justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="absolute bg-white border border-slate-200 rounded-lg shadow-md"
                style={{
                  width: 150,
                  height: 190,
                  transform: `translate(${(i - 1) * 14}px, ${(i - 1) * -6}px) rotate(${(i - 1) * 4}deg)`,
                  zIndex: i,
                  animation: `paperFloat 2.6s ease-in-out ${i * 0.2}s infinite`,
                }}
              >
                <div className="h-1 bg-slate-200 rounded-full mx-3 mt-3" />
                <div className="h-1 bg-slate-200 rounded-full mx-3 mt-2 w-1/2" />
                <div className="h-px bg-slate-100 mx-3 mt-3" />
                <div className="h-1 bg-slate-100 rounded-full mx-3 mt-3" />
                <div className="h-1 bg-slate-100 rounded-full mx-3 mt-1.5 w-4/5" />
                <div className="h-1 bg-slate-100 rounded-full mx-3 mt-1.5 w-3/5" />
                <div className="h-1 bg-slate-100 rounded-full mx-3 mt-1.5" />
                <div className="h-1 bg-slate-100 rounded-full mx-3 mt-1.5 w-2/3" />
              </div>
            ))}
            <style>{`@keyframes paperFloat { 0%,100% { transform: translate(var(--tx,0), var(--ty,0)) rotate(var(--r,0deg)); } 50% { transform: translate(0,-6px) rotate(0deg); } }`}</style>
          </div>

          {/* Steps */}
          <div className="flex flex-col justify-center">
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Signing encounter</div>
            <div className="text-[20px] font-bold text-slate-900 mt-1">Arranging {patientName}'s report…</div>
            <div className="text-[12.5px] text-slate-600 mt-1">Please don't close the window. We'll show the final report when it's ready.</div>

            <ul className="mt-5 space-y-2.5">
              {steps.map((s, i) => {
                const done = i < active;
                const live = i === active;
                return (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className={cx(
                      "size-5 rounded-full flex items-center justify-center shrink-0 transition",
                      done ? "bg-emerald-500 text-white"
                        : live ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-400"
                    )}>
                      {done ? (
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      ) : live ? (
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      ) : (
                        <span className="size-1.5 rounded-full bg-current"/>
                      )}
                    </span>
                    <span className={cx(
                      "text-[12.5px] leading-snug transition",
                      done ? "text-slate-500 line-through decoration-slate-300"
                        : live ? "text-slate-900 font-semibold"
                        : "text-slate-400"
                    )}>
                      {s}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[11.5px] text-slate-500">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Encrypted on the local network · Backup saved every step · You won't lose anything.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Signed report — final letterhead document with share actions
// ─────────────────────────────────────────────────────────────
function SignedReportOverlay({ enc, patient, practitioner, location, todayLong, onClose, onAcknowledge, onAction }) {
  const encId = `ENC-2026-${String(patient.mrn || "").slice(-4)}${String(Date.now()).slice(-3)}`;

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col">
      {/* Top action bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="size-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Icon.check size={18}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-slate-900">Encounter signed &amp; saved to chart</div>
          <div className="text-[11.5px] text-slate-500">Final report ready · forwarded to reception for billing &amp; check-out</div>
        </div>

        <div className="flex items-center gap-1.5">
          <ReportAction icon={
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          } label="Download PDF" onClick={() => onAction("Downloaded encounter PDF")} />
          <ReportAction icon={
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          } label="Email to parent" onClick={() => onAction(`Email sent to ${patient.guardian || "parent"}`)} />
          <ReportAction icon={
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          } label="WhatsApp" onClick={() => onAction(`Sent to ${patient.guardian || "parent"} via WhatsApp`)} />
          <ReportAction icon={<Icon.print size={14}/>} label="Print" onClick={() => onAction("Sent to printer · Reception desk")} />
          <div className="w-px h-6 bg-slate-200 mx-1"/>
          <button
            onClick={onClose}
            className="px-3 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 text-[12.5px] font-medium text-slate-700"
            title="Return to editable note"
          >
            Back
          </button>
          <button
            onClick={onAcknowledge}
            className="px-4 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5"
          >
            <Icon.check size={13}/>
            Acknowledge &amp; finish
          </button>
        </div>
      </div>

      {/* Reception forwarded banner */}
      <div className="bg-violet-50 border-b border-violet-200 px-6 py-2.5 flex items-center gap-2 text-[12px] text-violet-900 shrink-0">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span><b>Forwarded to reception.</b> Maribel has been notified — invoice draft, vaccine schedule and follow-up booking are queued at her desk.</span>
      </div>

      {/* Document */}
      <div className="flex-1 overflow-y-auto px-8 py-6 flex justify-center">
        <ReportDocument
          enc={enc}
          patient={patient}
          practitioner={practitioner}
          location={location}
          todayLong={todayLong}
          encId={encId}
        />
      </div>
    </div>
  );
}

function ReportAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-2.5 rounded-lg hover:bg-slate-100 text-slate-700 text-[12px] font-medium inline-flex items-center gap-1.5"
    >
      {icon}
      {label}
    </button>
  );
}

// The read-only signed document. Mirrors the live letterhead but no inputs.
function ReportDocument({ enc, patient, practitioner, location, todayLong, encId }) {
  const v = enc.vitals;
  const ros = Object.entries(enc.ros || {}).filter(([, x]) => x && (x.pos || x.note));
  const exam = Object.entries(enc.exam || {}).filter(([, txt]) => txt && String(txt).trim());

  return (
    <div className="bg-white shadow-2xl rounded-md overflow-hidden w-full max-w-[860px] relative">
      {/* Signed watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
        <div className="text-emerald-500/10 text-[200px] font-black tracking-wider rotate-[-22deg]" style={{ fontFamily: "Inter, system-ui" }}>SIGNED</div>
      </div>

      {/* Top stripe */}
      <div className="h-1.5" style={{ background: "linear-gradient(90deg,#A5C944 0%,#5FB8C9 50%,#0098E4 100%)" }} />

      {/* Masthead */}
      <header className="px-12 pt-10 pb-6 flex items-start gap-6 border-b border-slate-200 relative" style={{ zIndex: 2 }}>
        <img src={(window.__resources&&window.__resources.chavitosLogo)||"assets/chavitos-logo.png"} alt="Chavitos Clinic" className="h-16 w-auto" draggable="false" />
        <div className="flex-1 min-w-0 text-right">
          <div className="text-[10.5px] tracking-[0.18em] uppercase text-slate-500 font-semibold">Chavitos Clinic · Alta Especialidad en Pediatría</div>
          <div className="text-[12px] text-slate-700 mt-1.5 leading-snug">
            Av. Colón con Av. Liszzaro · Mérida, Yuc., Mexico
            <br/>
            +52 999 268 1364 · hola@chavitosclinic.mx · RFC CHA-260101-A1B
          </div>
        </div>
      </header>

      {/* Title strip */}
      <div className="px-12 py-4 flex items-end justify-between border-b border-dashed border-slate-300 relative" style={{ zIndex: 2 }}>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Clinical Encounter Note · Signed copy</div>
          <div className="text-[22px] font-bold text-slate-900 leading-tight mt-0.5" style={{ fontFamily: "'Inter', serif" }}>SOAP / Progress note</div>
        </div>
        <div className="text-right text-[11.5px] text-slate-600">
          <div className="font-semibold text-slate-800">{todayLong}</div>
          <div>Encounter ID · {encId}</div>
        </div>
      </div>

      {/* Patient block */}
      <div className="px-12 py-5 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-[12.5px] relative" style={{ zIndex: 2 }}>
        <DocRow label="Patient">
          <span className="text-[15px] font-semibold text-slate-900">{patient.name}</span>
          <span className="text-slate-500 ml-2">· {patient.sex === "M" ? "Male" : "Female"} · {patient.age}</span>
        </DocRow>
        <DocRow label="MRN">
          <span className="font-mono">{patient.mrn}</span>
          <span className="text-slate-500 ml-3">DOB {patient.dob}</span>
        </DocRow>
        <DocRow label="Guardian">{patient.guardian || "—"} · <span className="font-mono text-slate-500">{patient.phone || ""}</span></DocRow>
        <DocRow label="Practitioner">{practitioner.name} · <span className="text-slate-500">{practitioner.role}</span></DocRow>
        <DocRow label="Location">{location.name}, {location.city}</DocRow>
        <DocRow label="Allergies">
          <ChipList values={patient.allergies && patient.allergies.length ? patient.allergies : ["No known allergies"]} tone="rose" />
        </DocRow>
        <DocRow label="Chronic">
          <ChipList values={patient.chronicCare && patient.chronicCare.length ? patient.chronicCare : ["None on file"]} tone="amber" />
        </DocRow>
      </div>

      {/* S */}
      <ReportSection label="S · Subjective" zIndex={2}>
        <ReportField label="Chief complaint" text={enc.chiefComplaint} />
        <ReportField label="History of present illness" text={enc.hpi} />
        {ros.length > 0 && (
          <div className="mt-2">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1.5">Review of systems</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {ros.map(([k, x]) => (
                <div key={k} className="text-[12.5px]">
                  <span className="font-semibold text-slate-800 capitalize">{k}:</span>{" "}
                  <span className="text-slate-700">{x.note || (x.pos ? "Positive" : "—")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ReportSection>

      {/* O */}
      <ReportSection label="O · Objective" zIndex={2}>
        <div className="grid grid-cols-4 gap-x-6 gap-y-2 mb-3">
          <Vital label="Weight" value={v.weight} unit="kg" />
          <Vital label="Height" value={v.height} unit="cm" />
          <Vital label="Temp" value={v.temp} unit="°C" />
          <Vital label="HR" value={v.hr} unit="bpm" />
          <Vital label="SpO₂" value={v.spo2} unit="%" />
          <Vital label="BP" value={v.bp} unit="mmHg" />
          <Vital label="RR" value={v.rr} unit="/min" />
        </div>
        {exam.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {exam.map(([k, txt]) => (
              <div key={k} className="text-[12.5px]">
                <span className="font-semibold text-slate-800 capitalize">{k}:</span>{" "}
                <span className="text-slate-700">{txt}</span>
              </div>
            ))}
          </div>
        )}
      </ReportSection>

      {/* A */}
      <ReportSection label="A · Assessment" zIndex={2}>
        {enc.diagnoses && enc.diagnoses.length > 0 ? (
          <ul className="space-y-1.5">
            {enc.diagnoses.map((d, i) => (
              <li key={i} className="text-[12.5px] flex items-start gap-2">
                <span className="font-mono text-slate-500 shrink-0">{d.code}</span>
                <span className="text-slate-800">{d.desc}</span>
                {d.primary && <span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">primary</span>}
              </li>
            ))}
          </ul>
        ) : <Empty />}
      </ReportSection>

      {/* P */}
      <ReportSection label="P · Plan & orders" zIndex={2}>
        <ReportField label="Plan" text={enc.plan} />

        {enc.orders.rx.length > 0 && (
          <OrderBlock title="Prescriptions" items={enc.orders.rx.map(r => (
            <span><b>{r.name || "—"}</b> {r.instr ? `· ${r.instr}` : ""} {r.days ? `· ${r.days} days` : ""}</span>
          ))} />
        )}
        {enc.orders.labs.length > 0 && (
          <OrderBlock title="Labs & imaging" items={enc.orders.labs.map(o => (
            <span><b>{o.name}</b>{o.when ? ` · collect ${o.when}` : ""}{o.priority ? ` · ${o.priority}` : ""}{o.note ? ` · ${o.note}` : ""}</span>
          ))} />
        )}
        {enc.orders.vaccines.length > 0 && (
          <OrderBlock title="Vaccinations" items={enc.orders.vaccines.map(o => (
            <span><b>{o.name}</b>{o.when ? ` · admin ${o.when}` : ""}{o.site ? ` · ${o.site}` : ""}{o.lot ? ` · lot ${o.lot}` : ""}</span>
          ))} />
        )}
        {enc.orders.screening && enc.orders.screening.length > 0 && (
          <OrderBlock title="Recommended screening" items={enc.orders.screening.map(o => (
            <span><b>{o.name}</b>{o.when ? ` · ${o.when}` : ""}{o.result ? ` · ${o.result}` : ""}{o.note ? ` · ${o.note}` : ""}</span>
          ))} />
        )}

        <div className="mt-3 text-[12.5px]">
          <span className="font-semibold text-slate-800">Follow-up:</span>{" "}
          <span className="text-slate-700">
            {enc.orders.followUp.type} in {enc.orders.followUp.in} with {enc.orders.followUp.with}
            {enc.orders.followUp.note ? ` · ${enc.orders.followUp.note}` : ""}
          </span>
        </div>
      </ReportSection>

      {/* Education */}
      <ReportSection label="Education & follow-up" zIndex={2}>
        <ReportField text={enc.education} />
      </ReportSection>

      {/* Signature footer */}
      <div className="px-12 pt-6 pb-10 border-t border-slate-200 relative" style={{ zIndex: 2 }}>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-slate-400 pb-1 mb-1.5" style={{ fontFamily: "'Caveat', 'Brush Script MT', cursive", fontSize: 28, color: "#0F172A", lineHeight: 1 }}>
              {practitioner.name}
            </div>
            <div className="text-[11.5px] text-slate-600">
              <div className="font-semibold text-slate-800">{practitioner.name}</div>
              <div>{practitioner.role} · Céd. Prof. {practitioner.license || "12345678"}</div>
              <div className="text-slate-500 mt-0.5">Signed electronically · {todayLong}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-1">Document hash</div>
            <div className="font-mono text-[11px] text-slate-600 break-all">SHA-256 · {(encId + (patient.mrn || "")).split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) >>> 0, 5381).toString(16).padStart(8, "0")}…a91d3f</div>
            <div className="text-[10.5px] text-slate-400 mt-2">This is an authenticated electronic medical record. Modifications create a new versioned copy.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ label, zIndex, children }) {
  return (
    <section className="px-12 pt-6 pb-3 border-t border-slate-100 relative" style={{ zIndex }}>
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3 flex items-center gap-2">
        <span className="size-1 rounded-full bg-slate-400"/>{label}
      </div>
      {children}
    </section>
  );
}

function ReportField({ label, text }) {
  if (!text || !String(text).trim()) return label ? (
    <div className="mb-2">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-0.5">{label}</div>
      <Empty />
    </div>
  ) : <Empty />;
  return (
    <div className="mb-2">
      {label && <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-0.5">{label}</div>}
      <div className="text-[12.5px] text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function Vital({ label, value, unit }) {
  return (
    <div className="text-[12px]">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{label}</div>
      <div className="text-slate-800">
        {value ? <><span className="font-semibold">{value}</span> <span className="text-slate-500">{unit}</span></> : <span className="text-slate-400 italic">not recorded</span>}
      </div>
    </div>
  );
}

function OrderBlock({ title, items }) {
  return (
    <div className="mt-3">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[12.5px] text-slate-800 flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return <span className="text-[12.5px] text-slate-400 italic">Not documented.</span>;
}
