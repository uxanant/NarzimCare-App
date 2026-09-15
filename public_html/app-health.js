// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — health data
//   Body zones (mapped to the avatar), vitals, self-tracked
//   lifestyle metrics, overall score, and the simulated camera-roll
//   samples + AI classification used by the scan flow.
// ═══════════════════════════════════════════════════════════════
(function () {
  // Body zones — pin coordinates are in the avatar's 0 0 240 560 viewBox
  const ZONES = [
    { id: "thyroid", name: "Thyroid", sub: "Endocrine system", x: 100, y: 96, status: "managed", icon: "pulse",
      headline: "On treatment · stable",
      metrics: [
        { label: "TSH", value: "2.1", unit: "mIU/L", range: "0.4 – 4.0", flag: "normal" },
        { label: "Free T4", value: "1.2", unit: "ng/dL", range: "0.8 – 1.8", flag: "normal" },
      ],
      condition: "Hypothyroidism · since 2025",
      note: "Levothyroxine 50 mcg each morning keeps your levels normal. Keep your current dose.",
      source: { clinic: "faro", date: "Jan 15, 2026" } },

    { id: "heart", name: "Heart", sub: "Cardiovascular", x: 88, y: 132, status: "good", icon: "heart",
      headline: "Healthy rhythm",
      metrics: [
        { label: "Blood pressure", value: "118/74", unit: "mmHg", range: "< 120/80", flag: "normal" },
        { label: "Resting heart rate", value: "72", unit: "bpm", range: "60 – 100", flag: "normal" },
      ],
      note: "Blood pressure and resting heart rate are both in a healthy range.",
      source: { clinic: "merida", date: "Feb 18, 2026" } },

    { id: "lungs", name: "Lungs", sub: "Respiratory", x: 112, y: 132, status: "managed", icon: "stetho",
      headline: "Asthma · controlled",
      metrics: [
        { label: "Oxygen (SpO₂)", value: "98", unit: "%", range: "95 – 100", flag: "normal" },
        { label: "Respiratory rate", value: "15", unit: "/min", range: "12 – 20", flag: "normal" },
      ],
      condition: "Mild persistent asthma · controlled",
      note: "No wheeze at your last visit. Keep your rescue inhaler handy.",
      source: { clinic: "merida", date: "Feb 18, 2026" } },

    { id: "metabolic", name: "Blood & metabolic", sub: "Lab chemistry", x: 100, y: 178, status: "watch", icon: "drop",
      headline: "Glucose slightly high",
      metrics: [
        { label: "Glucose (fasting)", value: "104", unit: "mg/dL", range: "70 – 99", flag: "high" },
        { label: "Total cholesterol", value: "182", unit: "mg/dL", range: "< 200", flag: "normal" },
        { label: "HDL", value: "58", unit: "mg/dL", range: "> 50", flag: "normal" },
        { label: "Hemoglobin", value: "13.6", unit: "g/dL", range: "12 – 15.5", flag: "normal" },
      ],
      note: "Fasting glucose is just above range — recheck in 3 months and ease off refined sugar.",
      source: { clinic: "azteca", date: "Jan 15, 2026" } },

    { id: "body", name: "Body composition", sub: "Measurements", x: 100, y: 206, status: "good", icon: "self",
      headline: "Healthy weight",
      metrics: [
        { label: "Weight", value: "63", unit: "kg", range: "—" },
        { label: "Height", value: "165", unit: "cm", range: "—" },
        { label: "BMI", value: "23.1", unit: "", range: "18.5 – 24.9", flag: "normal" },
      ],
      note: "Your BMI sits comfortably in the healthy range.",
      source: { clinic: "merida", date: "Feb 18, 2026" } },
  ];

  const VITALS = [
    { label: "Blood pressure", value: "118/74", unit: "mmHg", icon: "heart", flag: "normal" },
    { label: "Heart rate", value: "72", unit: "bpm", icon: "pulse", flag: "normal" },
    { label: "Temperature", value: "36.6", unit: "°C", icon: "pulse", flag: "normal" },
    { label: "Oxygen", value: "98", unit: "%", icon: "drop", flag: "normal" },
    { label: "Weight", value: "63", unit: "kg", icon: "self", flag: "normal" },
    { label: "BMI", value: "23.1", unit: "", icon: "self", flag: "normal" },
  ];

  const LIFESTYLE = [
    { id: "sleep",     label: "Sleep",     icon: "moon",  value: 7.2,  goal: 8,     unit: "h",    step: 0.5,  color: "#8b5cf6", bg: "#EDE9FE" },
    { id: "hydration", label: "Hydration", icon: "drop",  value: 1.6,  goal: 2.5,   unit: "L",    step: 0.25, color: "#0098e4", bg: "#D0ECFF" },
    { id: "steps",     label: "Steps",     icon: "walk",  value: 8420, goal: 10000, unit: "",     step: 500,  color: "#10b981", bg: "#DCFCE7" },
    { id: "activity",  label: "Activity",  icon: "flame", value: 4,    goal: 7,     unit: "days", step: 1,    color: "#f59e0b", bg: "#FEF3C7" },
  ];

  const SCORE = { value: 86, label: "Good", sub: "Compiled from your records" };

  const lfmt = (id, v) => id === "sleep" ? v.toFixed(1) : id === "hydration" ? v.toFixed(2) : id === "steps" ? Math.round(v).toLocaleString("en-US") : String(Math.round(v));

  // ── Simulated camera roll for the AI scan flow ──
  // bucket: clear | blurry | irrelevant | duplicate
  const SCAN_SAMPLES = [
    { id: "s1", img: "assets/scan/scan-lab.png", bucket: "clear", type: "Lab report", detail: "Thyroid panel · Laboratorio Azteca",
      extract: { title: "Thyroid & metabolic panel", date: "Jun 2, 2026", clinic: "azteca", category: "lab",
        labs: [
          { test: "TSH", value: "2.3", unit: "mIU/L", range: "0.4 – 4.0", flag: "normal" },
          { test: "Free T4", value: "1.1", unit: "ng/dL", range: "0.8 – 1.8", flag: "normal" },
          { test: "Glucose (fasting)", value: "98", unit: "mg/dL", range: "70 – 99", flag: "normal" },
        ],
        applies: [
          { zone: "thyroid", metric: "TSH", value: "2.3" },
          { zone: "metabolic", metric: "Glucose (fasting)", value: "98", flag: "normal" },
        ] } },
    { id: "s2", img: "assets/scan/scan-rx.png", bucket: "clear", type: "Prescription", detail: "Dra. Renata Solís · 3 medications",
      extract: { title: "Prescription", date: "Jun 2, 2026", clinic: "merida", category: "report",
        meds: [
          { name: "Levotiroxina 75 mcg", instr: "1 each morning, fasting" },
          { name: "Salbutamol inhaler", instr: "2 puffs as needed" },
          { name: "Vitamin D 1000 IU", instr: "1 daily with food" },
        ] } },
    { id: "s3", img: "assets/scan/scan-imaging.png", bucket: "clear", type: "Imaging report", detail: "Chest X-ray · Normal",
      extract: { title: "Chest X-ray", date: "Jun 2, 2026", clinic: "merida", category: "report",
        summary: "Normal chest radiograph. Lungs clear, heart size normal, no effusion." } },
    { id: "s4", img: "assets/scan/scan-blurry.png", bucket: "blurry", type: "Lipid panel",
      reason: "Too blurry to read the values",
      guide: "Lay the page flat, fill the frame, and tap to focus before capturing. Avoid shadows and glare." },
    { id: "s5", img: "assets/scan/scan-receipt.png", bucket: "irrelevant", type: "Café receipt",
      reason: "This isn't a medical document" },
    { id: "s6", img: "assets/scan/scan-duplicate.png", bucket: "duplicate", type: "Blood panel",
      reason: "Already in your records", match: "Matches your Jan 15, 2026 blood panel" },
  ];

  const BUCKETS = {
    clear:      { label: "Clear & readable",     color: "#10b981", bg: "#DCFCE7", icon: "check",  desc: "Ready to add to your record" },
    blurry:     { label: "Blurry / unreadable",  color: "#f59e0b", bg: "#FEF3C7", icon: "retake", desc: "Retake these for best results" },
    irrelevant: { label: "Irrelevant / not yours", color: "#94a3b8", bg: "#F1F5F9", icon: "revoke", desc: "These won't be added" },
    duplicate:  { label: "Duplicate detected",   color: "#0098e4", bg: "#D0ECFF", icon: "copy",   desc: "Already in your records" },
  };

  window.HEALTH = { ZONES, VITALS, LIFESTYLE, SCORE, SCAN_SAMPLES, BUCKETS, lfmt };
})();
