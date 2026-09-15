// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — booking data (bookable doctors, slots, appts)
// Builds on window.PORTAL (clinics, doctors, visits) so booking is
// coherent with the patient's existing record.
// ═══════════════════════════════════════════════════════════════
(function () {
  const P = window.PORTAL;

  // "Today" for the app demo
  const TODAY = new Date(2026, 1, 26); // Feb 26, 2026

  // ── Specialties offered for booking ──
  const SPECIALTIES = [
    { key: "gp",        label: "General medicine", icon: "stetho",  bg: "#D0ECFF", fg: "#0369A1" },
    { key: "endo",      label: "Endocrinology",    icon: "pulse",   bg: "#E0E7FF", fg: "#4338CA" },
    { key: "gyn",       label: "Gynecology",        icon: "heart",   bg: "#FCE7F3", fg: "#BE185D" },
    { key: "dental",    label: "Dental",            icon: "tooth",   bg: "#CFF7FE", fg: "#0891B2" },
    { key: "derma",     label: "Dermatology",       icon: "drop",    bg: "#FEF3C7", fg: "#B45309" },
    { key: "lab",       label: "Lab & tests",       icon: "lab",     bg: "#EDE9FE", fg: "#7C3AED" },
  ];

  // ── Bookable doctors (reuse PORTAL clinics; add a couple new) ──
  // mode: in = in-person, video = telehealth, both
  const DOCTORS = [
    { id: "d_solis",    name: "Dra. Renata Solís",   spec: "gp",     clinic: "merida", rating: 4.9, reviews: 312, fee: 600, mode: "both",  swatch: "#CFFAFE", fgc: "#0E7490", next: { day: 0, time: "3:30 PM" }, bio: "General practitioner focused on preventive care and chronic disease management. Your primary doctor at Clínica Mérida." },
    { id: "d_iglesias", name: "Dr. Tomás Iglesias",  spec: "endo",   clinic: "faro",   rating: 4.8, reviews: 204, fee: 950, mode: "in",    swatch: "#E0E7FF", fgc: "#4338CA", next: { day: 1, time: "10:00 AM" }, bio: "Endocrinologist specializing in thyroid and metabolic conditions. Manages your hypothyroidism." },
    { id: "d_fuentes",  name: "Dra. Lucía Fuentes",  spec: "gyn",    clinic: "aurora", rating: 4.9, reviews: 276, fee: 800, mode: "both",  swatch: "#FCE7F3", fgc: "#BE185D", next: { day: 0, time: "4:00 PM" }, bio: "Gynecologist providing women's health, routine screening and family planning." },
    { id: "d_mendoza",  name: "Dr. Karina Mendoza",  spec: "dental", clinic: "sonrie", rating: 4.8, reviews: 263, fee: 500, mode: "in",    swatch: "#CFF7FE", fgc: "#0891B2", next: { day: 2, time: "1:00 PM" }, bio: "Dentist offering cleanings, fillings and preventive dental care." },
    { id: "d_vega",     name: "Dra. Camila Vega",    spec: "derma",  clinic: "merida", rating: 5.0, reviews: 178, fee: 750, mode: "video", swatch: "#FEF3C7", fgc: "#B45309", next: { day: 0, time: "5:15 PM" }, bio: "Dermatologist available for video consultations — skin, hair and allergy concerns." },
    { id: "d_lab",      name: "Laboratorio Azteca",  spec: "lab",    clinic: "azteca", rating: 4.7, reviews: 421, fee: 350, mode: "in",    swatch: "#EDE9FE", fgc: "#7C3AED", next: { day: 1, time: "8:00 AM" }, bio: "Walk-in and scheduled blood work, imaging and diagnostic tests. Results sync to your record." },
  ];

  // ── Seeded appointments ──
  // status: upcoming | past | cancelled ; reportId links to a PORTAL visit
  const APPOINTMENTS = [
    { id: "ap1", doctor: "d_solis",    spec: "gp",   date: "2026-03-04", time: "9:30 AM",  mode: "in",    reason: "Thyroid follow-up & asthma review", status: "upcoming" },
    { id: "ap2", doctor: "d_vega",     spec: "derma", date: "2026-03-09", time: "5:15 PM", mode: "video", reason: "Recurring skin rash on forearm",     status: "upcoming" },
    { id: "ap3", doctor: "d_solis",    spec: "gp",    date: "2026-02-18", time: "9:30 AM", mode: "in",    reason: "Annual physical",                  status: "past", reportId: "ENC-MS-260218" },
    { id: "ap4", doctor: "d_lab",      spec: "lab",   date: "2026-01-15", time: "8:10 AM", mode: "in",    reason: "Blood panel (thyroid, lipids)",    status: "past", reportId: "LAB-AZ-260115" },
    { id: "ap5", doctor: "d_iglesias", spec: "endo",  date: "2025-11-04", time: "12:00 PM",mode: "in",    reason: "Fatigue & cold intolerance",       status: "past", reportId: "ENC-FM-251104" },
  ];

  // time-slot pools per part of day
  const SLOTS = {
    morning:   ["8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"],
    afternoon: ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "3:00 PM", "3:30 PM", "4:00 PM"],
    evening:   ["4:30 PM", "5:00 PM", "5:15 PM", "5:30 PM", "6:00 PM", "6:30 PM"],
  };

  // Build next 14 selectable days from TODAY
  function nextDays(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(TODAY); d.setDate(d.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        dow: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()],
        day: d.getDate(),
        mon: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()],
        isToday: i === 0, isTomorrow: i === 1,
        isSunday: d.getDay() === 0,
      });
    }
    return out;
  }

  // pseudo-random available slots for a doctor on a given day index (stable)
  function slotsFor(docId, dayIso) {
    const seed = [...(docId + dayIso)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const pick = (arr, keepFrac) => arr.filter((_, i) => ((seed + i * 7) % 10) / 10 < keepFrac);
    return {
      morning:   pick(SLOTS.morning, 0.6),
      afternoon: pick(SLOTS.afternoon, 0.55),
      evening:   pick(SLOTS.evening, 0.5),
    };
  }

  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];
    return `${mon} ${d}, ${y}`;
  }
  function fmtDateLong(iso) {
    const dt = new Date(iso + "T00:00:00");
    const dow = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dt.getDay()];
    return `${dow}, ${fmtDate(iso)}`;
  }

  window.APPDATA = { TODAY, SPECIALTIES, DOCTORS, APPOINTMENTS, SLOTS, nextDays, slotsFor, fmtDate, fmtDateLong,
    doc: (id) => DOCTORS.find(d => d.id === id),
    spec: (k) => SPECIALTIES.find(s => s.key === k),
  };
})();
