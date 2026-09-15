/* ════════════════════════════════════════════════════════════
   Narzim Marketplace — countries, specialties, doctors & i18n
   Mexico → Spanish · USA → English · India → English
   ════════════════════════════════════════════════════════════ */

const COUNTRIES = {
  MX: { code:'MX', flag:'🇲🇽', lang:'es',
        name:{ en:'Mexico', es:'México' },
        cur:{ symbol:'$', code:'MXN' } },
  US: { code:'US', flag:'🇺🇸', lang:'en',
        name:{ en:'United States', es:'Estados Unidos' },
        cur:{ symbol:'$', code:'USD' } },
  IN: { code:'IN', flag:'🇮🇳', lang:'en',
        name:{ en:'India', es:'India' },
        cur:{ symbol:'₹', code:'INR' } },
};

/* specialty icon paths (lucide-style, 24×24, stroke) */
const SPEC_ICON = {
  gp:        "<path d='M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7z'/>",
  cardiology:"<path d='M3 12h4l2 6 4-14 2 8h6'/>",
  dentistry: "<path d='M12 5.5c-1.5-1.2-4-2-6-1C3 5.6 3 9 4 13c.7 3 1 7 3 7s1.7-4 3-4 1 4 3 4 2.3-4 3-7c1-4 1-7.4-2-8.5-2-1-4.5-.2-6 1z'/>",
  dermatology:"<circle cx='12' cy='12' r='9'/><path d='M9 9h.01M15 9h.01M9 15c1 1 5 1 6 0' stroke-linecap='round'/>",
  pediatrics:"<circle cx='12' cy='7' r='4'/><path d='M5 21c0-4 3-7 7-7s7 3 7 7'/>",
  gynecology:"<circle cx='12' cy='8' r='5'/><path d='M12 13v8M9 18h6'/>",
  orthopedics:"<path d='M7 4c1.5 0 2.5 1 2.5 2.5S8.5 9 7 9l4 4c1.5 0 2.5 1 2.5 2.5S12.5 18 11 18'/><path d='M17 20c-1.5 0-2.5-1-2.5-2.5S15.5 15 17 15l-4-4c-1.5 0-2.5-1-2.5-2.5S13.5 6 15 6'/>",
  psychiatry:"<path d='M9.5 2A4.5 4.5 0 0 0 5 6.5c0 .9-.5 1.6-1 2.3C3 10 3 11 3.5 12c.5.8 1.5 1 1.5 2v1a3 3 0 0 0 3 3h1v3'/><path d='M14 2a7 7 0 0 1 7 7c0 3-2 5-2 7v2a2 2 0 0 1-2 2h-2'/>",
  ent:       "<path d='M6 18.5A3.5 3.5 0 0 0 9.5 22c1.9 0 3.5-1.6 3.5-3.5 0-2-2-3-2-5a4 4 0 1 0-8 0'/><path d='M11 6a3 3 0 0 1 3 3'/>",
  ophthalmology:"<path d='M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z'/><circle cx='12' cy='12' r='3'/>",
  neurology: "<path d='M12 3a3 3 0 0 0-3 3 3 3 0 0 0-3 3c0 1 .5 2 1 2.5M12 3a3 3 0 0 1 3 3 3 3 0 0 1 3 3c0 3-3 4-3 7a3 3 0 0 1-6 0c0-1-1-2-1-3'/>",
  more:      "<circle cx='5' cy='12' r='1.6'/><circle cx='12' cy='12' r='1.6'/><circle cx='19' cy='12' r='1.6'/>",
};

/* specialties shown in the grid (key + accent color) */
const SPECIALTIES = [
  { key:'gp',         color:'#0098E4', bg:'#D0ECFF' },
  { key:'pediatrics', color:'#DB2777', bg:'#FBCFE8' },
  { key:'cardiology', color:'#E11D48', bg:'#FFE4E6' },
  { key:'dermatology',color:'#D97706', bg:'#FDE68A' },
  { key:'dentistry',  color:'#0284C7', bg:'#BAE6FD' },
  { key:'gynecology', color:'#7C3AED', bg:'#DDD6FE' },
  { key:'orthopedics',color:'#059669', bg:'#A7F3D0' },
  { key:'psychiatry', color:'#0891B2', bg:'#CFFAFE' },
  { key:'ent',        color:'#9333EA', bg:'#F3E8FF' },
  { key:'ophthalmology',color:'#2563EB', bg:'#DBEAFE' },
  { key:'neurology',  color:'#C026D3', bg:'#FAE8FF' },
  { key:'more',       color:'#475569', bg:'#E2E8F0' },
];

const AV = ['#BAE6FD','#A7F3D0','#DDD6FE','#FBCFE8','#FDE68A','#FECDD3','#BFDBFE','#C7F9CC'];

/* doctors per country — fee is a plain number in local currency */
const DOCTORS = {
  MX: [
    { name:'Dra. Valeria Ríos',     spec:'gp',          rating:4.9, reviews:312, city:'CDMX',        dist:1.2, day:'today',    time:'3:30 PM', fee:600,  langs:['es','en'], mode:'both' },
    { name:'Dr. Mateo Herrera',     spec:'cardiology',  rating:4.8, reviews:204, city:'Guadalajara', dist:2.6, day:'tomorrow', time:'10:00 AM',fee:950,  langs:['es'],      mode:'in' },
    { name:'Dra. Camila Vega',      spec:'dermatology', rating:5.0, reviews:178, city:'Monterrey',   dist:3.1, day:'today',    time:'5:15 PM', fee:750,  langs:['es','en'], mode:'video' },
    { name:'Dr. Andrés Solís',      spec:'pediatrics',  rating:4.9, reviews:421, city:'Mérida',      dist:0.9, day:'today',    time:'4:00 PM', fee:680,  langs:['es','en'], mode:'both' },
    { name:'Dra. Lucía Ortega',     spec:'gynecology',  rating:4.7, reviews:156, city:'Puebla',      dist:4.0, day:'wed',      time:'9:30 AM', fee:820,  langs:['es'],      mode:'in' },
    { name:'Dr. Emilio Navarro',    spec:'dentistry',   rating:4.8, reviews:263, city:'CDMX',        dist:1.8, day:'tomorrow', time:'1:00 PM', fee:500,  langs:['es','en'], mode:'in' },
  ],
  US: [
    { name:'Dr. Sarah Chen',        spec:'gp',          rating:4.9, reviews:512, city:'Austin, TX',     dist:1.1, day:'today',    time:'3:30 PM', fee:120, langs:['en','es'], mode:'both' },
    { name:'Dr. Marcus Bell',       spec:'cardiology',  rating:4.8, reviews:289, city:'Chicago, IL',    dist:2.4, day:'tomorrow', time:'10:00 AM',fee:220, langs:['en'],      mode:'in' },
    { name:'Dr. Priya Nair',        spec:'dermatology', rating:5.0, reviews:341, city:'New York, NY',   dist:0.8, day:'today',    time:'5:15 PM', fee:180, langs:['en','hi'], mode:'video' },
    { name:'Dr. James Whitfield',   spec:'orthopedics', rating:4.7, reviews:198, city:'Denver, CO',     dist:3.6, day:'wed',      time:'9:30 AM', fee:200, langs:['en'],      mode:'in' },
    { name:'Dr. Elena Vargas',      spec:'gynecology',  rating:4.9, reviews:276, city:'Miami, FL',      dist:2.0, day:'today',    time:'4:00 PM', fee:160, langs:['en','es'], mode:'both' },
    { name:'Dr. David Okafor',      spec:'psychiatry',  rating:4.8, reviews:223, city:'Seattle, WA',    dist:1.5, day:'tomorrow', time:'1:00 PM', fee:190, langs:['en'],      mode:'video' },
  ],
  IN: [
    { name:'Dr. Ananya Rao',        spec:'gp',          rating:4.9, reviews:734, city:'Bengaluru',  dist:1.3, day:'today',    time:'3:30 PM', fee:800,  langs:['en','hi'], mode:'both' },
    { name:'Dr. Rohan Mehta',       spec:'cardiology',  rating:4.8, reviews:402, city:'Mumbai',     dist:2.7, day:'tomorrow', time:'10:00 AM',fee:1200, langs:['en','hi'], mode:'in' },
    { name:'Dr. Kavya Iyer',        spec:'dermatology', rating:5.0, reviews:389, city:'Delhi',      dist:0.9, day:'today',    time:'5:15 PM', fee:900,  langs:['en','hi'], mode:'video' },
    { name:'Dr. Arjun Singh',       spec:'orthopedics', rating:4.7, reviews:256, city:'Hyderabad',  dist:3.4, day:'wed',      time:'9:30 AM', fee:1000, langs:['en','hi'], mode:'in' },
    { name:'Dr. Meera Krishnan',    spec:'pediatrics',  rating:4.9, reviews:611, city:'Chennai',    dist:1.0, day:'today',    time:'4:00 PM', fee:750,  langs:['en','hi'], mode:'both' },
    { name:'Dr. Sameer Khan',       spec:'ent',         rating:4.8, reviews:298, city:'Pune',       dist:2.2, day:'tomorrow', time:'1:00 PM', fee:850,  langs:['en','hi'], mode:'in' },
  ],
};

/* ── i18n dictionary ── */
const I18N = {
  en: {
    nav_specialties:'Specialties', nav_doctors:'Top doctors', nav_how:'How it works', nav_telehealth:'Telehealth',
    for_practitioners:'For practitioners', login:'Log in', get_started:'Get started',
    hero_badge:'Verified doctors · book in seconds',
    hero_title_1:'Find the right doctor and', hero_title_hl:'book in seconds', hero_title_2:'',
    hero_sub:'Search trusted, verified doctors near you. Compare ratings and fees, then book in-person or video visits — all in one place.',
    search_spec:'Condition, specialty or doctor', search_loc:'City or area', search_btn:'Search',
    stat_doctors:'verified doctors', stat_specialties:'specialties', stat_rating:'avg. rating', stat_booked:'visits booked',
    spec_kicker:'browse by need', spec_title:'Popular specialties', spec_sub:'Pick a specialty and see top-rated doctors available near you.',
    view_all:'View all specialties',
    feat_kicker:'top rated near you', feat_title:'Featured doctors', feat_sub:'Highly rated, verified and available this week.',
    reviews:'reviews', next_avail:'Next available', book_now:'Book now', speaks:'Speaks',
    mode_in:'In-person', mode_video:'Video', mode_both:'In-person & video',
    per_visit:'per visit',
    how_kicker:'simple & quick', how_title:'How Narzim works', how_sub:'Three steps from "I need a doctor" to a confirmed appointment.',
    step1_t:'Search', step1_d:'Tell us the specialty or symptom and where you are. We surface verified doctors near you.',
    step2_t:'Compare & choose', step2_d:'Compare ratings, fees, languages and the next available slot — then pick your doctor.',
    step3_t:'Book & manage', step3_d:'Book in-person or video in seconds. Manage appointments and records in your patient portal.',
    tele_kicker:'care from home', tele_title:'See a doctor by video, today', tele_sub:'Skip the waiting room. Connect with verified doctors over secure video and get prescriptions, advice and follow-ups from anywhere.',
    tele_cta:'Start a video visit',
    trust_title:'Every doctor is verified', trust_sub:'Licenses and credentials are checked before any doctor joins Narzim. Your data is private and encrypted end-to-end.',
    trust_1:'Verified licenses', trust_2:'Encrypted & private', trust_3:'Real patient reviews',
    cta_title:'Your next appointment is a tap away', cta_sub:'Create a free account to book visits, message doctors and keep all your records in one place.',
    cta_btn:'Get started free', cta_secondary:'Browse doctors',
    foot_tagline:'The easiest way to find a doctor and book care near you.', foot_patients:'For patients', foot_company:'Company',
    foot_find:'Find a doctor', foot_specialties:'Specialties', foot_tele:'Telehealth', foot_portal:'Patient portal',
    foot_about:'About', foot_practitioners:'For practitioners', foot_help:'Help center', foot_privacy:'Privacy',
    foot_rights:'© 2026 Narzim Health. All rights reserved.', foot_verified:'Verified doctors · Encrypted',
    switch_country:'Country / language', change:'Change',
    login_title:'Patient sign in', login_sub:'Manage your appointments, records and messages.',
    login_id:'Email or phone', login_id_ph:'you@email.com', login_pw:'Password', login_forgot:'Forgot?',
    login_submit:'Sign in', login_new:'New to Narzim?', login_create:'Create account', login_demo:'Demo — any details work',
    gate_title:'Welcome to Narzim', gate_sub:'Choose your country to see doctors and care near you.', gate_continue:'Continue',
    in_city:'in', away:'away',
  },
  es: {
    nav_specialties:'Especialidades', nav_doctors:'Mejores médicos', nav_how:'Cómo funciona', nav_telehealth:'Telemedicina',
    for_practitioners:'Para profesionales', login:'Iniciar sesión', get_started:'Comenzar',
    hero_badge:'Médicos verificados · reserva en segundos',
    hero_title_1:'Encuentra al médico ideal y', hero_title_hl:'reserva en segundos', hero_title_2:'',
    hero_sub:'Busca médicos verificados y de confianza cerca de ti. Compara calificaciones y precios, y reserva citas presenciales o por video — todo en un solo lugar.',
    search_spec:'Padecimiento, especialidad o médico', search_loc:'Ciudad o zona', search_btn:'Buscar',
    stat_doctors:'médicos verificados', stat_specialties:'especialidades', stat_rating:'calificación prom.', stat_booked:'citas reservadas',
    spec_kicker:'explora por necesidad', spec_title:'Especialidades populares', spec_sub:'Elige una especialidad y ve a los médicos mejor calificados cerca de ti.',
    view_all:'Ver todas las especialidades',
    feat_kicker:'mejor calificados cerca de ti', feat_title:'Médicos destacados', feat_sub:'Altamente calificados, verificados y disponibles esta semana.',
    reviews:'reseñas', next_avail:'Próxima disponibilidad', book_now:'Reservar', speaks:'Habla',
    mode_in:'Presencial', mode_video:'Video', mode_both:'Presencial y video',
    per_visit:'por consulta',
    how_kicker:'simple y rápido', how_title:'Cómo funciona Narzim', how_sub:'Tres pasos desde "necesito un médico" hasta una cita confirmada.',
    step1_t:'Busca', step1_d:'Dinos la especialidad o el síntoma y dónde estás. Te mostramos médicos verificados cerca de ti.',
    step2_t:'Compara y elige', step2_d:'Compara calificaciones, precios, idiomas y la próxima disponibilidad — y elige a tu médico.',
    step3_t:'Reserva y gestiona', step3_d:'Reserva presencial o por video en segundos. Gestiona citas y expedientes en tu portal del paciente.',
    tele_kicker:'atención desde casa', tele_title:'Consulta por video, hoy mismo', tele_sub:'Olvídate de la sala de espera. Conéctate con médicos verificados por video seguro y recibe recetas, consejos y seguimiento desde donde estés.',
    tele_cta:'Iniciar consulta por video',
    trust_title:'Cada médico está verificado', trust_sub:'Verificamos cédulas y credenciales antes de que cualquier médico se una a Narzim. Tus datos son privados y están cifrados de extremo a extremo.',
    trust_1:'Cédulas verificadas', trust_2:'Cifrado y privado', trust_3:'Reseñas reales de pacientes',
    cta_title:'Tu próxima cita está a un toque', cta_sub:'Crea una cuenta gratis para reservar citas, enviar mensajes a médicos y tener todos tus expedientes en un solo lugar.',
    cta_btn:'Comenzar gratis', cta_secondary:'Ver médicos',
    foot_tagline:'La forma más fácil de encontrar un médico y reservar atención cerca de ti.', foot_patients:'Para pacientes', foot_company:'Empresa',
    foot_find:'Encontrar un médico', foot_specialties:'Especialidades', foot_tele:'Telemedicina', foot_portal:'Portal del paciente',
    foot_about:'Acerca de', foot_practitioners:'Para profesionales', foot_help:'Centro de ayuda', foot_privacy:'Privacidad',
    foot_rights:'© 2026 Narzim Health. Todos los derechos reservados.', foot_verified:'Médicos verificados · Cifrado',
    switch_country:'País / idioma', change:'Cambiar',
    login_title:'Acceso de pacientes', login_sub:'Gestiona tus citas, expedientes y mensajes.',
    login_id:'Correo o teléfono', login_id_ph:'tu@correo.com', login_pw:'Contraseña', login_forgot:'¿Olvidaste?',
    login_submit:'Iniciar sesión', login_new:'¿Nuevo en Narzim?', login_create:'Crear cuenta', login_demo:'Demo — cualquier dato funciona',
    gate_title:'Bienvenido a Narzim', gate_sub:'Elige tu país para ver médicos y atención cerca de ti.', gate_continue:'Continuar',
    in_city:'en', away:'de distancia',
  },
};

/* specialty display names per language */
const SPEC_NAME = {
  gp:           { en:'General physician', es:'Médico general' },
  pediatrics:   { en:'Pediatrics',        es:'Pediatría' },
  cardiology:   { en:'Cardiology',        es:'Cardiología' },
  dermatology:  { en:'Dermatology',       es:'Dermatología' },
  dentistry:    { en:'Dentistry',         es:'Odontología' },
  gynecology:   { en:'Gynecology',        es:'Ginecología' },
  orthopedics:  { en:'Orthopedics',       es:'Ortopedia' },
  psychiatry:   { en:'Psychiatry',        es:'Psiquiatría' },
  ent:          { en:'ENT',               es:'Otorrino' },
  ophthalmology:{ en:'Ophthalmology',     es:'Oftalmología' },
  neurology:    { en:'Neurology',         es:'Neurología' },
  more:         { en:'More', es:'Más' },
};

const DAY_NAME = {
  today:    { en:'Today',    es:'Hoy' },
  tomorrow: { en:'Tomorrow', es:'Mañana' },
  wed:      { en:'Wed',      es:'Mié' },
};

const LANG_NAME = {
  en:{ en:'English', es:'Inglés' },
  es:{ en:'Spanish', es:'Español' },
  hi:{ en:'Hindi',   es:'Hindi' },
};

window.NARZIM_MKT = { COUNTRIES, SPECIALTIES, SPEC_ICON, SPEC_NAME, DOCTORS, AV, I18N, DAY_NAME, LANG_NAME };
