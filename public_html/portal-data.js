// ═══════════════════════════════════════════════════════════════
// Narzim Patient Portal — data model (v2, individual cross-clinic)
//
// One person, one Narzim identity (CURP + NSS + platform-wide MRN),
// visiting many clinics. Every clinical fact is ATTRIBUTED to the
// clinic + practitioner that recorded it, with a date — so you can
// always see who added a given allergy, condition, med, etc.
// Items the patient adds are marked self-reported.
// ═══════════════════════════════════════════════════════════════

const NARZIM = {
  name: "Narzim",
  tagline: "Your health, across every clinic",
  legal: "Narzim Health Network · operated under NOM-024-SSA3 · Mérida, México",
  support: "soporte@narzim.mx · +52 800 627 9460",
};

// ── The account holder / patient ──
const PATIENT = {
  name: "Mariana Reyes Castillo",
  first: "Mariana",
  initials: "MR",
  sex: "F", sexLabel: "Female",
  dob: "14/02/1991", age: "35 yrs",
  bloodType: "O+",
  curp: "RECM910214MYNRSR08",
  nss: "5602 9114 023",        // IMSS social security
  mrn: "NRZ-MX-118903-42",     // platform-wide, valid at every Narzim clinic
  phone: "+52 999 118 9042",
  email: "mariana.reyes@gmail.com",
  address: "Calle 47 #320, Col. Centro, Mérida, Yuc.",
  emergency: "Carlos Reyes (brother) · +52 999 220 1183",
  language: "Español",
  swatch: "#BAE6FD",
  latest: { weight: "63", height: "165", bp: "118/74", hr: "72", date: "Feb 18, 2026" },
};

// ── Clinics the patient has interacted with on Narzim ──
const CLINICS = {
  merida: { id: "merida", name: "Clínica Mérida Salud", type: "General Medicine", city: "Mérida, Yuc.", initials: "MS", fg: "#0E7490", bg: "#CFFAFE" },
  faro:   { id: "faro",   name: "Hospital Faro del Mayab", type: "Endocrinology", city: "Mérida, Yuc.", initials: "FM", fg: "#4338CA", bg: "#E0E7FF" },
  azteca: { id: "azteca", name: "Laboratorio Azteca",     type: "Clinical Lab",   city: "Mérida, Yuc.", initials: "LA", fg: "#7C3AED", bg: "#EDE9FE" },
  aurora: { id: "aurora", name: "Clínica de la Mujer Aurora", type: "Gynecology", city: "Mérida, Yuc.", initials: "MA", fg: "#BE185D", bg: "#FCE7F3" },
  sonrie: { id: "sonrie", name: "Centro Dental Sonríe",   type: "Dental",         city: "Mérida, Yuc.", initials: "DS", fg: "#0891B2", bg: "#CFF7FE" },
};

const DOCTORS = {
  solis:    { name: "Dra. Renata Solís",     role: "General Practitioner", clinic: "merida", license: "MEX-CED-441902" },
  iglesias: { name: "Dr. Tomás Iglesias",    role: "Endocrinologist",      clinic: "faro",   license: "MEX-CED-318774" },
  azteca:   { name: "QFB. Laura Domínguez",  role: "Lab Chemist",          clinic: "azteca", license: "MEX-CED-672013" },
  fuentes:  { name: "Dra. Lucía Fuentes",    role: "Gynecologist",         clinic: "aurora", license: "MEX-CED-205518" },
  mendoza:  { name: "Dr. Karina Mendoza",    role: "Dentist",              clinic: "sonrie", license: "MEX-CED-559421" },
};

// Source helpers: clinic-recorded vs self-reported
const src = (clinicId, doctorKey, date) => ({ kind: "clinic", clinic: clinicId, doctor: doctorKey, date });
const selfSrc = (date) => ({ kind: "self", date });

// ── Compiled medical record (the 360°) ──
const MEDICAL = {
  allergies: [
    { id: "al1", name: "Penicillin", severity: "Severe", reaction: "Hives, facial swelling", source: src("merida", "solis", "Mar 2023") },
    { id: "al2", name: "Ibuprofen / NSAIDs", severity: "Moderate", reaction: "Stomach pain, rash", source: src("faro", "iglesias", "Nov 2025") },
    { id: "al3", name: "Pollen (seasonal)", severity: "Mild", reaction: "Sneezing, itchy eyes in spring", source: selfSrc("Feb 2026") },
    { id: "al4", name: "Latex", severity: "Mild", reaction: "Skin redness on contact", source: selfSrc("Jan 2026") },
  ],
  conditions: [
    { id: "co1", name: "Mild persistent asthma", status: "Active · controlled", since: "2019", source: src("merida", "solis", "Feb 2024") },
    { id: "co2", name: "Hypothyroidism", status: "Active · on treatment", since: "2025", source: src("faro", "iglesias", "Nov 2025") },
  ],
  medications: [
    { id: "me1", name: "Levothyroxine 50 mcg", instr: "1 tablet every morning, fasting", since: "Nov 2025", active: true, source: src("faro", "iglesias", "Nov 2025") },
    { id: "me2", name: "Salbutamol inhaler 100 mcg", instr: "2 puffs as needed for wheeze", since: "Feb 2024", active: true, source: src("merida", "solis", "Feb 2026") },
  ],
  immunizations: [
    { id: "im1", name: "Influenza (2025–26)", date: "Oct 2025", source: src("merida", "solis", "Oct 2025") },
    { id: "im2", name: "COVID-19 bivalent booster", date: "Oct 2025", source: src("merida", "solis", "Oct 2025") },
    { id: "im3", name: "Tdap (tetanus, diphtheria, pertussis)", date: "Aug 2022", source: src("merida", "solis", "Aug 2022") },
    { id: "im4", name: "Hepatitis B (3-dose series)", date: "2018", source: selfSrc("Jan 2026") },
  ],
};

// ── Visit reports across clinics ──
const VISITS = [
  {
    id: "ENC-MS-260218", clinic: "merida", doctor: "solis",
    date: "Feb 18, 2026", dateLong: "Wednesday, February 18, 2026", time: "9:30 AM",
    type: "Annual physical", category: "report", shared: true,
    plain: "Your yearly check-up. Overall you're in good health. Blood pressure and weight are normal. We reviewed your asthma — it's well controlled, keep the rescue inhaler handy. Thyroid is stable on your current dose. Continue as you are and return in a year.",
    chiefComplaint: "Routine annual examination",
    vitals: { weight: "63", height: "165", bp: "118/74", hr: "72", temp: "36.6", spo2: "98" },
    exam: [["General", "Well-appearing, no acute distress."], ["Chest", "Clear to auscultation, no wheeze today."], ["Cardiovascular", "Regular rate and rhythm."]],
    diagnoses: [{ code: "Z00.00", desc: "General adult medical examination", primary: true }, { code: "J45.30", desc: "Mild persistent asthma, controlled", primary: false }],
    plan: "Continue levothyroxine and salbutamol PRN. Maintain activity and balanced diet. Repeat thyroid panel in 6 months. Annual physical in 12 months.",
    rx: [{ name: "Salbutamol inhaler 100 mcg", instr: "2 puffs as needed", days: 90 }],
    education: "Reviewed asthma action plan and inhaler technique. Reassured about stable thyroid labs.",
  },
  {
    id: "LAB-AZ-260115", clinic: "azteca", doctor: "azteca",
    date: "Jan 15, 2026", dateLong: "Thursday, January 15, 2026", time: "8:10 AM",
    type: "Blood panel", category: "lab", shared: true,
    plain: "Routine blood work ordered by your endocrinologist. Thyroid (TSH) is back in the normal range — your dose is working. Cholesterol and blood counts all look normal.",
    labs: [
      { test: "TSH", value: "2.1", unit: "mIU/L", range: "0.4 – 4.0", flag: "normal" },
      { test: "Free T4", value: "1.2", unit: "ng/dL", range: "0.8 – 1.8", flag: "normal" },
      { test: "Total cholesterol", value: "182", unit: "mg/dL", range: "< 200", flag: "normal" },
      { test: "HDL", value: "58", unit: "mg/dL", range: "> 50", flag: "normal" },
      { test: "Hemoglobin", value: "13.6", unit: "g/dL", range: "12.0 – 15.5", flag: "normal" },
      { test: "Glucose (fasting)", value: "104", unit: "mg/dL", range: "70 – 99", flag: "high" },
    ],
    orderedBy: "Dr. Tomás Iglesias · Hospital Faro del Mayab",
    education: "Fasting glucose slightly elevated — recheck in 3 months and reduce refined sugar.",
  },
  {
    id: "ENC-FM-251104", clinic: "faro", doctor: "iglesias",
    date: "Nov 04, 2025", dateLong: "Tuesday, November 4, 2025", time: "12:00 PM",
    type: "Endocrinology consult", category: "report", shared: true,
    plain: "You came in feeling tired and cold. Blood tests showed an underactive thyroid (hypothyroidism). Dr. Iglesias started you on a daily thyroid tablet (levothyroxine) and noted an NSAID allergy. Recheck levels in 8 weeks.",
    chiefComplaint: "Fatigue, cold intolerance, weight gain",
    vitals: { weight: "65", height: "165", bp: "122/78", hr: "64", temp: "36.4", spo2: "99" },
    exam: [["Neck", "Thyroid mildly enlarged, non-tender."], ["General", "Dry skin, slowed reflexes."]],
    diagnoses: [{ code: "E03.9", desc: "Hypothyroidism, unspecified", primary: true }],
    plan: "Start levothyroxine 50 mcg every morning. Repeat TSH/Free T4 in 8 weeks. Documented ibuprofen/NSAID allergy.",
    rx: [{ name: "Levothyroxine 50 mcg", instr: "1 tablet each morning, fasting", days: 90 }],
    education: "Explained hypothyroidism, importance of taking levothyroxine on an empty stomach, and symptoms to report.",
  },
  {
    id: "ENC-DS-250912", clinic: "sonrie", doctor: "mendoza",
    date: "Sep 12, 2025", dateLong: "Friday, September 12, 2025", time: "4:00 PM",
    type: "Dental cleaning + filling", category: "report", shared: false,
    plain: "Routine cleaning and a small filling on a lower molar. Gums are healthy. No further work needed for now — see you in 6 months.",
    chiefComplaint: "Routine cleaning; sensitivity lower-right molar",
    vitals: {},
    exam: [["Oral exam", "Mild cavity #30, healthy gingiva, no other decay."]],
    diagnoses: [{ code: "K02.9", desc: "Dental caries, unspecified", primary: true }],
    plan: "Composite filling #30 placed. Prophylaxis cleaning. Recall in 6 months.",
    rx: [],
    education: "Reviewed brushing and flossing technique. Avoid hard foods on the new filling for 24h.",
  },
  {
    id: "ENC-MA-250620", clinic: "aurora", doctor: "fuentes",
    date: "Jun 20, 2025", dateLong: "Friday, June 20, 2025", time: "10:45 AM",
    type: "Annual gynecology exam", category: "report", shared: false,
    plain: "Your yearly women's-health check. Everything was normal. Routine screening was done and results came back clear. Next visit in a year.",
    chiefComplaint: "Routine annual gynecological examination",
    vitals: { weight: "64", bp: "116/72" },
    exam: [["General", "Unremarkable exam, no abnormal findings."]],
    diagnoses: [{ code: "Z01.419", desc: "Routine gynecological examination, normal", primary: true }],
    plan: "Routine screening performed — normal. Continue annual visits.",
    rx: [],
    education: "Reviewed routine screening schedule and self-care guidance.",
  },
];

// ── Activity timeline (most recent first) ──
// kind: report | lab | med | allergy | vaccine | access-request | access-grant | access-revoke | self
const TIMELINE = [
  { id: "t1", date: "Feb 24, 2026", ago: "2 days ago", kind: "access-request", clinic: "sonrie", title: "Centro Dental Sonríe requested access", desc: "Wants to view your profile for an upcoming appointment.", action: "pending" },
  { id: "t2", date: "Feb 20, 2026", ago: "Feb 20", kind: "allergy", actor: "self", title: "You added an allergy", desc: "Pollen (seasonal) — self-reported." },
  { id: "t3", date: "Feb 18, 2026", ago: "Feb 18", kind: "report", clinic: "merida", doctor: "solis", title: "Annual physical report signed", desc: "Dr. Renata Solís finalized your visit report.", refId: "ENC-MS-260218" },
  { id: "t4", date: "Feb 18, 2026", ago: "Feb 18", kind: "med", clinic: "merida", doctor: "solis", title: "Medication refilled", desc: "Salbutamol inhaler — 90-day refill." },
  { id: "t5", date: "Jan 15, 2026", ago: "Jan 15", kind: "lab", clinic: "azteca", doctor: "azteca", title: "Lab results uploaded", desc: "Blood panel (thyroid, lipids, CBC) available.", refId: "LAB-AZ-260115" },
  { id: "t6", date: "Jan 10, 2026", ago: "Jan 10", kind: "access-grant", clinic: "faro", title: "You granted Hospital Faro del Mayab access", desc: "Allowed allergies, conditions, medications, reports & labs." },
  { id: "t7", date: "Nov 04, 2025", ago: "Nov 2025", kind: "report", clinic: "faro", doctor: "iglesias", title: "Endocrinology consult signed", desc: "Dr. Tomás Iglesias finalized your report & prescription.", refId: "ENC-FM-251104" },
  { id: "t8", date: "Sep 12, 2025", ago: "Sep 2025", kind: "report", clinic: "sonrie", doctor: "mendoza", title: "Dental visit report signed", desc: "Dr. Karina Mendoza recorded your dental visit.", refId: "ENC-DS-250912" },
  { id: "t9", date: "Jun 20, 2025", ago: "Jun 2025", kind: "report", clinic: "aurora", doctor: "fuentes", title: "Gynecology exam report signed", desc: "Dra. Lucía Fuentes recorded your annual exam.", refId: "ENC-MA-250620" },
];

// ── Consent sections (what a clinic can be allowed to see) ──
const SECTIONS = [
  { key: "demographics", label: "Demographics", desc: "Name, age, sex, contact" },
  { key: "allergies",    label: "Allergies",    desc: "All recorded allergies" },
  { key: "conditions",   label: "Conditions",   desc: "Diagnoses & chronic conditions" },
  { key: "medications",  label: "Medications",  desc: "Active & past prescriptions" },
  { key: "immunizations",label: "Immunizations",desc: "Vaccination history" },
  { key: "reports",      label: "Visit reports",desc: "Clinical notes from visits" },
  { key: "labs",         label: "Lab results",  desc: "Laboratory results" },
];

// ── Clinics that currently have (or are requesting) access ──
const ACCESS = [
  { clinic: "merida", status: "active",  grantedAt: "Feb 2024", lastViewed: "Feb 18, 2026", sections: ["demographics","allergies","conditions","medications","immunizations","reports","labs"] },
  { clinic: "faro",   status: "active",  grantedAt: "Jan 10, 2026", lastViewed: "Jan 15, 2026", sections: ["demographics","allergies","conditions","medications","reports","labs"] },
  { clinic: "azteca", status: "active",  grantedAt: "Jan 12, 2026", lastViewed: "Jan 15, 2026", sections: ["demographics","reports","labs"] },
  { clinic: "aurora", status: "active",  grantedAt: "Jun 2025", lastViewed: "Jun 20, 2025", sections: ["demographics","allergies","conditions","reports"] },
  { clinic: "sonrie", status: "pending", requestedAt: "Feb 24, 2026", sections: ["demographics","allergies","conditions","medications"] },
];

window.PORTAL = { NARZIM, PATIENT, CLINICS, DOCTORS, MEDICAL, VISITS, TIMELINE, SECTIONS, ACCESS };
