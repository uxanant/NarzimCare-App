/* Narzim Family Health — interactive prototype logic */
(function () {
  'use strict';

  var NAV = ['home', 'appointments', 'medications', 'profile'];
  var NAV_ICONS = { home: 'i-home', appointments: 'i-cal', medications: 'i-pill', profile: 'i-user' };
  var NAV_LABELS = { home: 'Home', appointments: 'Appointments', medications: 'Health', profile: 'Profile' };
  var MEMBER_NAMES = { all: 'All', anant: 'Mateo Alejandro Vega Castillo', priya: 'Sofía Guadalupe Herrera Ríos', aryan: 'Diego Emiliano Vega Herrera' };
  var MEMBER_COLORS = { anant: 'var(--m-anant)', priya: 'var(--m-priya)', aryan: 'var(--m-aryan)' };
  function firstName(n) { return (n || '').trim().split(/\s+/)[0] || ''; }

  /* ---------- booking flow data (cascading: clinic → doctor → date → time → reason) ---------- */
  var BOOK_CLINICS = [
    { id: 'esp',  name: 'Hospital Español',         sub: 'Polanco · 2.4 km away', city: 'Mexico City' },
    { id: 'ang',  name: 'Hospital Ángeles, Polanco', sub: 'Polanco · 3.1 km away', city: 'Mexico City' },
    { id: 'roma', name: 'Clínica Roma',              sub: 'Roma Norte · 5.0 km away', city: 'Mexico City' }
  ];
  var BOOK_DOCTORS = [
    { id: 'reyes',    name: 'Dr. Valentina Reyes', spec: 'General Physician', clinics: ['esp'],          rating: '4.9', reviews: 128, initials: 'VR', color: '#5B9BE0', profile: 'reyes', photo: 'assets/doc-reyes.png' },
    { id: 'soto',     name: 'Dr. Miguel Soto',     spec: 'Cardiologist',      clinics: ['esp', 'roma'],  rating: '4.6', reviews: 94,  initials: 'MS', color: '#2E6BD6', photo: 'assets/doc-soto.png', profile: 'soto' },
    { id: 'morales',  name: 'Dr. Ricardo Morales', spec: 'Cardiologist',      clinics: ['ang'],          rating: '4.8', reviews: 211, initials: 'RM', color: '#0E4F94', profile: 'morales', photo: 'assets/doc-morales.png' },
    { id: 'ariel',    name: 'Dr. Ariel Castillo',  spec: 'Pediatrician',      clinics: ['ang', 'roma'],  rating: '4.9', reviews: 176, initials: 'AC', color: '#4A82CC', profile: 'castillo', photo: 'assets/doc-ariel.png' },
    { id: 'gomez',    name: 'Dr. Andrés Gómez',    spec: 'General Physician', clinics: ['roma'],         rating: '4.7', reviews: 63,  initials: 'AG', color: '#1C5FAD', photo: 'assets/doc-gomez.png', profile: 'gomez' },
    { id: 'iglesias', name: 'Dr. Carmen Iglesias', spec: 'Dermatologist',     clinics: ['roma'],         rating: '4.8', reviews: 89,  initials: 'CI', color: '#3A78C2', photo: 'assets/doc-iglesias.png', profile: 'iglesias' }
  ];
  var BOOK_PURPOSES = [
    { id: 'general', label: 'General consultation', sub: 'Common symptoms, check-ups', icon: 'i-cal' },
    { id: 'specialist', label: 'Specialist consultation', sub: 'Cardiology, dermatology and more', icon: 'i-users' },
    { id: 'followup', label: 'Follow-up visit', sub: 'Continuing an earlier treatment', icon: 'i-clock' },
    { id: 'diagnostic', label: 'Diagnostic test', sub: 'Labs, imaging, screening', icon: 'i-scan' },
    { id: 'vaccination', label: 'Vaccination', sub: 'Routine or travel immunizations', icon: 'i-pill' },
    { id: 'other', label: 'Other', sub: 'Anything else you need help with', icon: 'i-dots' }
  ];
  var BOOK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var BOOK_DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var BOOK_DOW = { 14: 'Sat', 15: 'Sun', 16: 'Mon', 17: 'Tue', 18: 'Wed', 19: 'Thu', 20: 'Fri', 21: 'Sat', 22: 'Sun', 23: 'Mon', 24: 'Tue', 25: 'Wed', 26: 'Thu', 27: 'Fri' };
  var BOOK_SLOTS = {
    reyes:    { 14: ['9:00 AM', '10:30 AM', '11:00 AM', '4:00 PM'], 16: ['9:30 AM', '11:00 AM', '2:30 PM'], 17: ['10:00 AM', '12:00 PM', '3:30 PM'], 19: ['9:00 AM', '1:00 PM'] },
    soto:     { 16: ['8:30 AM', '9:30 AM', '11:00 AM'], 18: ['10:00 AM', '12:30 PM', '4:30 PM'], 23: ['9:00 AM', '11:30 AM'] },
    morales:  { 16: ['10:30 AM', '11:30 AM', '2:00 PM'], 20: ['9:00 AM', '10:00 AM', '3:00 PM', '4:00 PM'], 24: ['11:00 AM', '1:30 PM'] },
    ariel:    { 14: ['9:00 AM', '10:00 AM', '11:00 AM'], 17: ['9:30 AM', '12:00 PM', '3:00 PM'], 21: ['10:30 AM', '1:00 PM', '4:30 PM'] },
    gomez:    { 15: ['10:00 AM', '11:30 AM'], 18: ['9:00 AM', '2:00 PM', '4:00 PM'], 22: ['9:30 AM', '11:00 AM', '3:30 PM'] },
    iglesias: { 19: ['10:00 AM', '12:30 PM'], 23: ['9:00 AM', '11:00 AM', '2:30 PM'], 26: ['10:30 AM', '3:00 PM'] }
  };
  var BOOK_REASONS = ['Sick visit', 'Follow-up visit', 'Routine check-up', 'Vaccination', 'Lab results review', 'Prescription refill', 'Other reason'];
  var bookState = { step: 1, patient: null, purpose: null, dept: 'all', doctor: null, date: null, time: null };

  var panes = {};
  var stack = ['home'];
  var member = 'anant';    // active family member — single global selection across the whole app
  var apptFilters = { doctor: null, clinic: null, range: null };
  var onbStep = 1;         // onboarding step
  var onboarded = false, savedName = 'Mateo';
  var homeMember = 'anant';// dashboard health view (self by default)

  // per-member health data for the dashboard
  var HEALTH = {
    anant: { color: '#4E73D6', score: 82, grade: 'GOOD', status: 'On track', statusColor: 'var(--success)', note: '6-day reminder streak \u00b7 1 dose left today', delta: '+6 this month', trend: [70, 72, 74, 73, 78, 80, 82], factors: [
      { label: 'Blood pressure', value: '120/80', unit: 'mmHg', status: 'Normal', chip: 'chip-completed' },
      { label: 'Blood sugar', value: '98', unit: 'mg/dL', status: 'Normal', chip: 'chip-completed' },
      { label: 'Resting heart rate', value: '68', unit: 'bpm', status: 'Normal', chip: 'chip-completed' },
      { label: 'Weight', value: '72', unit: 'kg', status: 'Stable', chip: 'chip-active' } ],
      next: { doc: 'Dr. Ricardo Morales', spec: 'Cardiologist', clinic: 'Hospital \u00c1ngeles, Polanco', when: 'Saturday, 14 June \u00b7 10:30 AM' } },
    priya: { color: '#D95F5F', score: 76, grade: 'GOOD', status: 'Mostly on track', statusColor: 'var(--success)', note: 'Keep an eye on fasting glucose', delta: '+3 this month', trend: [66, 70, 69, 72, 73, 75, 76], factors: [
      { label: 'Blood pressure', value: '118/78', unit: 'mmHg', status: 'Normal', chip: 'chip-completed' },
      { label: 'Blood sugar', value: '112', unit: 'mg/dL', status: 'Elevated', chip: 'chip-paused' },
      { label: 'Resting heart rate', value: '72', unit: 'bpm', status: 'Normal', chip: 'chip-completed' },
      { label: 'Weight', value: '61', unit: 'kg', status: 'Stable', chip: 'chip-active' } ],
      next: { doc: 'Dr. Valentina Reyes', spec: 'General Physician', clinic: 'Hospital Espa\u00f1ol', when: 'Friday, 20 June \u00b7 4:00 PM' } },
    aryan: { color: '#4DA66B', score: 90, grade: 'GREAT', status: 'Excellent', statusColor: 'var(--success)', note: 'All checkups up to date', delta: '+2 this month', trend: [85, 86, 88, 87, 89, 90, 90], factors: [
      { label: 'Blood pressure', value: '105/70', unit: 'mmHg', status: 'Normal', chip: 'chip-completed' },
      { label: 'Blood sugar', value: '92', unit: 'mg/dL', status: 'Normal', chip: 'chip-completed' },
      { label: 'Resting heart rate', value: '84', unit: 'bpm', status: 'Normal', chip: 'chip-completed' },
      { label: 'Height', value: '1.34', unit: 'm', status: 'Growing', chip: 'chip-active' } ],
      next: { doc: 'Dr. Ariel Castillo', spec: 'Pediatrician', clinic: 'Hospital Ángeles, Polanco', when: 'Sunday, 28 June · 9:00 AM' } }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- bottom nav ---------- */
  function buildNav() {
    $all('.nav').forEach(function (nav) {
      var current = nav.closest('.pane').dataset.screen;
      var items = NAV.map(function (name) {
        var on = (name === current) ? ' on' : '';
        return '<button class="nav-item' + on + '" data-nav="' + name + '">' +
          '<svg class="nicon"><use href="#' + NAV_ICONS[name] + '"/></svg>' +
          NAV_LABELS[name] + '<span class="ndot"></span></button>';
      });
      var fab = '<button class="nav-fab" data-act="open-cc" aria-label="Care Connect">' +
        '<span class="nfb"><img src="assets/cc-fab-icon.webp" alt=""></span></button>';
      var mid = Math.ceil(items.length / 2);
      nav.innerHTML = items.slice(0, mid).join('') + fab + items.slice(mid).join('');
    });
  }

  /* ---------- routing ---------- */
  function show(name, opts) {
    opts = opts || {};
    var pane = panes[name];
    if (!pane) return;
    Object.keys(panes).forEach(function (k) { panes[k].classList.remove('active'); });
    pane.classList.add('active');
    var fab = document.querySelector('.chatfab');
    if (fab) fab.style.display = $('.sticky-bar', pane) ? 'none' : 'grid';
    var body = $('.body', pane);
    if (body) body.scrollTop = 0;
    if (!opts.noStack) {
      if (NAV.indexOf(name) >= 0 || name === 'camera') {
        stack = [name];                 // top-level tab (or camera root) resets the stack
      } else if (stack[stack.length - 1] !== name) {
        stack.push(name);
      }
    }
    // dark status bar over the camera
    var sb = document.querySelector('.statusbar');
    if (sb) sb.classList.toggle('cam-sb', name === 'camera');
    if (name === 'camera' && !opts.keepCam) resetCamera();
    applyFilter(pane);
    paintPills(pane);
    try {
      if (name === 'scan') refreshScanConfirm();
      if (name === 'book') initBook();
      if (name === 'intro') renderIntro();
      if (name === 'pf-reports') pfRenderReportsIdle();
      if (name === 'pricing') pfSyncPricing();
      if (name === 'setup') runSetup();
      if (name === 'cc-connect') { ccSyncHeaders(); ccRunConnect(); }
      if (name === 'cc-voice') { ccBuildWave(); ccSyncHeaders(); ccResetVoice(); }
      if (name === 'cc-history') renderCcRequests();
      if (name === 'careconnect') ccSyncHeaders();
      if (name === 'home') renderHome();
      if (name === 'medications') {
        var hp0 = panes[name];
        var onTab = $('[data-healthtabs] [data-healthtab].on', hp0);
        var want = onTab ? onTab.dataset.healthtab : 'medications';
        $all('[data-healthpane]', hp0).forEach(function (hp) {
          hp.style.display = (hp.dataset.healthpane === want) ? (hp.tagName === 'BUTTON' ? 'inline-flex' : 'block') : 'none';
        });
      }
      if (name === 'medications') {
        var mtBtn = $('[data-medtabs] [data-medtab="active"]', pane);
        if (mtBtn && !$('[data-medtabs] .tab.on', pane)) mtBtn.click();
      }
      if (name === 'appointments') {
        var seg = $('.seg-full .sf.on', pane);
        filterAppts(pane, seg ? seg.dataset.status : 'upcoming');
        updateFilterBadge();
      }
    } catch (e) { console.error('show(' + name + ') render failed', e); }
  }

  function go(name) { show(name); }
  function back() {
    if (stack.length > 1) { stack.pop(); show(stack[stack.length - 1], { noStack: true }); }
    else { show('home'); }
  }

  /* ---------- member filter pills ---------- */
  function paintPills(pane) {
    $all('.pills[data-pillfilter]', pane).forEach(function (cont) {
      $all('.pill[data-member]', cont).forEach(function (p) {
        var c = p.dataset.mcolor, on = (p.dataset.member === member);
        var dot = p.querySelector('.pdot');
        if (on) {
          p.style.background = c; p.style.color = '#fff'; p.style.borderColor = 'transparent';
          if (dot) dot.style.background = (p.dataset.member === 'all') ? 'transparent' : '#fff';
        } else {
          p.style.background = 'transparent'; p.style.color = c; p.style.borderColor = c;
          if (dot) dot.style.background = c;
        }
      });
    });
  }
  function applyFilter(pane) {
    $all('[data-member]', pane).forEach(function (el) {
      if (el.classList.contains('pill')) return; // pills are controls, not content
      var match = (member === 'all' || el.dataset.member === member);
      el.classList.toggle('f-hide', !match);
    });
  }

  /* ---------- generic single-select pickers ---------- */
  function pickWithin(container, target, sel, cls) {
    $all(sel, container).forEach(function (el) { el.classList.remove(cls); });
    target.classList.add(cls);
  }

  /* ---------- scan confirm count ---------- */
  function refreshScanConfirm() {
    var pane = panes.scan; if (!pane) return;
    var items = $all('.scan-item', pane);
    var checked = items.filter(function (it) { return $('[data-doccheck]', it).classList.contains('on'); });
    var label = $('[data-confirm-label]', pane);
    var btn = $('[data-act="confirm-scan"]', pane);
    var total = checked.length;
    label.textContent = total ? ('Save ' + total + ' item' + (total === 1 ? '' : 's')) : 'Select at least one item';
    btn.disabled = total === 0;
    var sa = $('[data-scan-selall]', pane);
    if (sa) sa.textContent = items.every(function (it) { return $('[data-doccheck]', it).classList.contains('on'); }) ? 'Deselect all' : 'Select all';
  }

  /* ---------- overlay / sheets ---------- */
  var overlay = $('#overlay');
  function closeOverlay() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
  function openSheet(html, cls) {
    overlay.innerHTML = '<div class="scrim" data-close></div><div class="sheet' + (cls ? ' ' + cls : '') + '">' +
      '<div class="grab"></div>' + html + '</div>';
    overlay.classList.add('show');
  }
  var lbRow = null;
  function openFile(row) {
    lbRow = row;
    var name = row.dataset.fileName || '', type = row.dataset.fileType || 'pdf', src = row.dataset.fileSrc || '', meta = row.dataset.fileMeta || '';
    var preview = (type === 'img' && src)
      ? '<img class="lb-img" src="' + src + '" alt="">'
      : '<div class="lb-pdf"><span class="lb-pdf-badge">PDF</span><div class="lb-pdf-name">' + name + '</div>' +
        '<div class="lb-pdf-lines"><i style="width:92%"></i><i style="width:74%"></i><i style="width:84%"></i><i style="width:58%"></i><i style="width:80%"></i><i style="width:46%"></i></div></div>';
    overlay.innerHTML =
      '<div class="lightbox">' +
        '<div class="lb-top">' +
          '<button class="lb-x" data-close aria-label="Close"><svg><use href="#i-x"/></svg></button>' +
          '<div class="lb-title"><div class="lb-name">' + name + '</div><div class="lb-meta">' + meta + '</div></div>' +
        '</div>' +
        '<div class="lb-body">' + preview + '</div>' +
        '<div class="lb-actions">' +
          '<button class="lb-act" data-file-share><svg><use href="#i-share"/></svg>Share</button>' +
          '<button class="lb-act danger" data-file-delete><svg><use href="#i-trash"/></svg>Delete</button>' +
        '</div>' +
      '</div>';
    overlay.classList.add('show');
  }
  function addSheet() {
    openSheet(
      '<div class="sheet-row" data-sheetgo="camera"><span class="ico"><svg class="ic24"><use href="#i-scan"/></svg></span>Scan prescription</div>' +
      '<div class="sheet-row" data-sheetgo="addmed"><span class="ico"><svg class="ic24"><use href="#i-pill"/></svg></span>Add manually</div>'
    );
  }
  function srow(key, icon, title, sub) {
    return '<div class="sheet-row" data-create="' + key + '"><span class="ico"><svg class="ic24"><use href="#' + icon + '"/></svg></span>' +
      '<div style="flex:1;min-width:0;"><div>' + title + '</div>' +
      '<div style="font-size:12.5px;font-weight:500;color:var(--muted);margin-top:1px;">' + sub + '</div></div>' +
      '<svg class="set-chev"><use href="#i-chevron"/></svg></div>';
  }
  var REQ_ICONS = { doc: 'i-doc', card: 'i-card', pencil: 'i-pencil', pill: 'i-pill', upload: 'i-upload', clock: 'i-clock' };
  var REQS = {
    r1: { doc: 'Dr. Ricardo Morales', when: 'Sat, 14 June · 10:30 AM', items: [
      { icon: 'doc', label: 'Complete health questionnaire', tag: 'Form' },
      { icon: 'card', label: 'Confirm insurance details', tag: 'Instruction' },
      { icon: 'pencil', label: 'Review & sign consent form', tag: 'Form' },
      { icon: 'pill', label: 'Update current medications', tag: 'Instruction' },
    ] },
    r2: { doc: 'Dr. Valentina Reyes', when: 'Fri, 20 June · 4:00 PM', items: [
      { icon: 'doc', label: 'Complete health questionnaire', tag: 'Form' },
      { icon: 'card', label: 'Confirm insurance details', tag: 'Instruction' },
      { icon: 'pencil', label: 'Review & sign consent form', tag: 'Form' },
      { icon: 'pill', label: 'Update current medications', tag: 'Instruction' },
    ] },
    r3: { doc: 'Dr. Ariel Castillo', when: 'Sun, 28 June · 9:00 AM', items: [
      { icon: 'card', label: 'Confirm insurance details', tag: 'Instruction' },
      { icon: 'upload', label: 'Bring vaccination record', tag: 'Document' },
      { icon: 'pencil', label: 'Review & sign guardian consent', tag: 'Form' },
    ] },
    r4: { doc: 'Dr. Andrés Gómez', when: 'Fri, 3 July · 11:00 AM', items: [
      { icon: 'doc', label: 'Complete respiratory questionnaire', tag: 'Form' },
      { icon: 'card', label: 'Confirm insurance details', tag: 'Instruction' },
      { icon: 'pencil', label: 'Review & sign consent form', tag: 'Form' },
      { icon: 'clock', label: 'Log peak-flow readings (7 days)', tag: 'Instruction' },
    ] },
    r5: { doc: 'Dr. Miguel Soto', when: 'Wed, 8 July · 3:30 PM', items: [
      { icon: 'doc', label: 'Complete cardiovascular questionnaire', tag: 'Form' },
      { icon: 'upload', label: 'Upload recent blood sugar readings', tag: 'Document' },
      { icon: 'pencil', label: 'Review & sign consent form', tag: 'Form' },
      { icon: 'pill', label: 'Update current medications', tag: 'Instruction' },
    ] },
    r6: { doc: 'Dr. Carmen Iglesias', when: 'Sun, 12 July · 10:00 AM', items: [
      { icon: 'doc', label: 'Complete skin symptom questionnaire', tag: 'Form' },
      { icon: 'upload', label: 'Upload current rash photos', tag: 'Document' },
      { icon: 'pencil', label: 'Review & sign guardian consent', tag: 'Form' },
      { icon: 'doc', label: 'List all skincare products used', tag: 'Instruction' },
    ] },
    r7: { doc: 'Dr. Ricardo Morales', when: 'Sat, 18 July · 9:30 AM', items: [
      { icon: 'upload', label: 'Submit 8-week BP diary', tag: 'Document' },
      { icon: 'card', label: 'Confirm insurance details', tag: 'Instruction' },
      { icon: 'pencil', label: 'Review & sign consent form', tag: 'Form' },
      { icon: 'pill', label: 'Update current medications', tag: 'Instruction' },
    ] },
  };
  function createSheet() {
    openSheet(
      '<img src="assets/narzim-mascot-peek.webp" alt="" class="sheet-mascot" />' +
      '<div style="font-size:17px;font-weight:700;padding:2px 4px 12px;">Add to your records</div>' +
      srow('appointment', 'i-cal', 'Book an appointment', 'Find a clinic and pick a time') +
      srow('report', 'i-doc', 'Add a report / prescription', 'Upload a lab result, scan or prescription')
    );
  }
  function reportSheet() {
    openSheet(
      '<div style="font-size:17px;font-weight:700;padding:2px 4px 4px;">Add a report / prescription</div>' +
      '<p style="font-size:13px;color:var(--muted);margin:0 4px 12px;line-height:1.4;">How would you like to add it?</p>' +
      srow('report-upload', 'i-upload', 'Upload files', 'Choose a PDF or photo from your device') +
      srow('report-camera', 'i-scan', 'Open camera', 'Take a photo — we read it for you')
    );
  }
  function openCenterModal(html) {
    overlay.innerHTML = '<div class="scrim" data-close></div><div class="center-modal">' + html + '</div>';
    overlay.classList.add('show');
  }
  function pickReportFile(mode) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*,application/pdf'; inp.multiple = true; inp.style.display = 'none';
    if (mode === 'camera') { inp.accept = 'image/*'; inp.capture = 'environment'; }
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var n = inp.files ? inp.files.length : 0;
      if (inp.parentNode) inp.parentNode.removeChild(inp);
      if (n > 0) toast(n + ' file' + (n === 1 ? '' : 's') + ' uploaded · processing', true);
    });
    inp.click();
  }
  function preConfirmSheet() {
    var pane = panes.scan;
    var who = scanFor();
    var checked = $all('.scan-item', pane).filter(function (it) { return $('[data-doccheck]', it).classList.contains('on'); });
    var apptOn = !!(($('[data-scan-appt-label]', pane) || {}).dataset || {}).appt;
    var total = checked.length;
    var line = total + ' item' + (total === 1 ? '' : 's') + ' will be added for ' + MEMBER_NAMES[who] + '.' +
      (apptOn ? ' They\u2019ll be linked to the selected appointment.' : ' They\u2019ll be saved to Personal files (unassigned).');
    openSheet(
      '<div style="padding:4px 4px 0;">' +
      '<div style="font-size:18px;font-weight:700;">Save to ' + MEMBER_NAMES[who] + '\u2019s records?</div>' +
      '<p style="font-size:14px;color:var(--muted);margin:8px 0 0;line-height:1.45;">' + line + '</p>' +
      '<button class="btn btn-primary" data-act="confirm-final" style="margin-top:18px;height:42px;font-size:14.5px;font-weight:550;border-radius:12px;">Confirm</button>' +
      '<button class="btn btn-ghost" data-close style="margin-top:10px;height:42px;font-size:14.5px;font-weight:550;border-radius:12px;">Go back</button>' +
      '</div>'
    );
  }
  function scanFor() {
    var el = $('[data-scan-patient-label]', panes.scan);
    return el ? el.dataset.member : 'priya';
  }

  /* ---------- home dashboard ---------- */
  function renderHealthChart(data, color) {
    var w = 322, h = 116, pad = 8, top = 12, bot = h - 10;
    var n = data.length;
    var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
    var lo = Math.max(0, min - 8), hi = Math.min(100, max + 8); if (hi <= lo) hi = lo + 1;
    var X = function (i) { return pad + i * (w - 2 * pad) / (n - 1); };
    var Y = function (v) { return top + (1 - (v - lo) / (hi - lo)) * (bot - top); };
    var pts = data.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); });
    var area = 'M' + X(0).toFixed(1) + ',' + bot + ' L' + pts.join(' L') + ' L' + X(n - 1).toFixed(1) + ',' + bot + ' Z';
    var dots = data.map(function (v, i) {
      var last = i === n - 1;
      return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (last ? 4 : 2.6) + '" fill="' + (last ? color : '#fff') + '" stroke="' + color + '" stroke-width="2"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" style="display:block;">' +
      '<line x1="0" y1="' + Y((lo + hi) / 2).toFixed(1) + '" x2="' + w + '" y2="' + Y((lo + hi) / 2).toFixed(1) + '" stroke="#E5E7EB" stroke-dasharray="3 5"/>' +
      '<path d="' + area + '" fill="' + color + '" fill-opacity="0.12"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + '</svg>';
  }
  function renderHome() {
    var pane = panes.home; if (!pane) return;
    var m = HEALTH[homeMember]; if (!m) return;
    var nm = MEMBER_NAMES[homeMember];
    var fn = firstName(nm);
    var hfName = $('[data-hf-name]', pane); if (hfName) hfName.textContent = fn;
    var hfDot = $('[data-hf-dot]', pane); if (hfDot) hfDot.style.background = m.color;
    var ring = $('[data-ring]', pane), C = 263.9;
    if (ring) { ring.style.stroke = m.color; ring.setAttribute('stroke-dashoffset', (C * (1 - m.score / 100)).toFixed(1)); }
    var ringScore = $('[data-ring-score]', pane); if (ringScore) ringScore.textContent = m.score;
    var ringGrade = $('[data-ring-grade]', pane); if (ringGrade) ringGrade.textContent = m.grade;
    var todaySub = $('[data-today-sub]', pane); if (todaySub) todaySub.textContent = (homeMember === 'anant' ? 'Your health today' : fn + '\u2019s health today');
    var st = $('[data-today-status]', pane); if (st) { st.textContent = m.status; st.style.color = m.statusColor; }
    var todayNote = $('[data-today-note]', pane); if (todayNote) todayNote.textContent = m.note;
    var progDelta = $('[data-prog-delta]', pane); if (progDelta) progDelta.textContent = m.delta;
    var chartEl = $('[data-chart]', pane); if (chartEl) chartEl.innerHTML = renderHealthChart(m.trend, m.color);
    var fg = $('[data-factors]', pane);
    if (fg) fg.innerHTML = m.factors.map(function (f) {
      return '<div class="factor tap" data-toast="' + f.label + ' history"><div class="fl">' + f.label + '</div>' +
        '<div class="fv">' + f.value + (f.unit ? '<small>' + f.unit + '</small>' : '') + '</div>' +
        '<span class="chip ' + f.chip + '" style="margin-top:8px;">' + f.status + '</span></div>';
    }).join('');
    var na = $('[data-next-appt]', pane);
    if (na && m.next) {
      var initials = m.next.doc.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
      na.innerHTML = '<div class="appt-hero tap" data-go="appointment" style="margin-top:0;">' +
        '<div style="display:flex;align-items:flex-start;gap:13px;">' +
          '<div class="avatar" style="width:48px;height:48px;background:' + m.color + ';font-size:16px;">' + initials + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:16px;font-weight:600;color:var(--text);letter-spacing:-.01em;">' + m.next.doc + '</div>' +
            '<div class="meta" style="margin-top:1px;">' + m.next.spec + '</div>' +
          '</div>' +
          '<span class="chip chip-upcoming">Upcoming</span>' +
        '</div>' +
        '<div class="appt-hr"></div>' +
        '<div class="appt-line"><svg><use href="#i-cal"/></svg><div><strong style="font-weight:700;">' + m.next.when + '</strong><br><span class="sub">Arrive 15 minutes early for check-in</span></div></div>' +
        '<div class="appt-line"><svg><use href="#i-pin"/></svg><div>' + m.next.clinic + '</div></div>' +
        '<div class="memline" style="margin-top:14px;color:' + m.color + ';"><span class="memdot" style="background:' + m.color + '"></span>' + fn + '</div>' +
      '</div>';
    } else if (na) {
      na.innerHTML = '<div class="card" style="text-align:center;padding:26px 16px;"><div style="width:50px;height:50px;border-radius:50%;background:var(--tint);display:grid;place-items:center;color:var(--brand);margin:0 auto 12px;"><svg class="ic24"><use href="#i-cal"/></svg></div><div style="font-size:15px;font-weight:700;">No upcoming appointments</div><div class="meta" style="margin-top:4px;">Book a visit for ' + fn + '.</div><button class="ghost-sm" data-go="book" style="margin:14px auto 0;"><svg class="ic16"><use href="#i-plus"/></svg>Book an appointment</button></div>';
    }
  }
  function paintMemberChips() {
    var c = (HEALTH[homeMember] && HEALTH[homeMember].color) || 'var(--brand)';
    var nm = MEMBER_NAMES[homeMember];
    $all('[data-homefilter]').forEach(function (b) {
      var dot = $('[data-hf-dot]', b); if (dot) dot.style.background = c;
      var nameEl = $('[data-hf-name]', b); if (nameEl) nameEl.textContent = firstName(nm);
    });
  }
  function setGlobalMember(k) {
    homeMember = k; member = k;
    renderHome();
    paintMemberChips();
    if (panes.appointments) {
      var seg = $('.seg-full .sf.on', panes.appointments);
      filterAppts(panes.appointments, seg ? seg.dataset.status : 'upcoming');
    }
    if (panes.medications) applyFilter(panes.medications);
  }
  function homeFilterSheet() {
    var REL = { anant: 'You', priya: 'Spouse', aryan: 'Son' };
    var rows = ['anant', 'priya', 'aryan'].map(function (k) {
      var c = HEALTH[k].color, on = (homeMember === k), nm = MEMBER_NAMES[k];
      var initial = (nm.charAt(0) || '').toUpperCase();
      return '<button class="mem-row' + (on ? ' on' : '') + '" data-homemem="' + k + '">' +
        '<span class="mem-av" style="--mc:' + c + ';">' + initial + '</span>' +
        '<span class="mem-meta"><span class="mem-name">' + nm + '</span>' +
        '<span class="mem-rel">' + (REL[k] || '') + '</span></span>' +
        '<span class="mem-tick' + (on ? ' on' : '') + '"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
        '</button>';
    }).join('');
    openSheet(
      '<div class="mem-sheet">' +
      '<div class="mem-head"><div class="mem-title">View health for</div>' +
      '<div class="mem-sub">Switch whose dashboard you\u2019re viewing</div></div>' +
      '<div class="mem-card">' + rows + '</div>' +
      '</div>'
    );
  }

  /* ---------- book appointment ---------- */
  /* ---------- booking flow (4-step wizard) ---------- */
  function clinicById(id) { for (var i = 0; i < BOOK_CLINICS.length; i++) if (BOOK_CLINICS[i].id === id) return BOOK_CLINICS[i]; return null; }
  function doctorById(id) { for (var i = 0; i < BOOK_DOCTORS.length; i++) if (BOOK_DOCTORS[i].id === id) return BOOK_DOCTORS[i]; return null; }
  function purposeById(id) { for (var i = 0; i < BOOK_PURPOSES.length; i++) if (BOOK_PURPOSES[i].id === id) return BOOK_PURPOSES[i]; return null; }
  function bookFull(d) { return BOOK_DOW[d] + ', ' + d + ' ' + BOOK_MONTHS[bookState.month] + ' ' + bookState.year; }
  function ddPanel(name) { return $('.dropdown[data-dd="' + name + '"] [data-dd-panel]', panes.book); }
  function ddEl(name) { return $('.dropdown[data-dd="' + name + '"]', panes.book); }
  function ddCheck() { return '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'; }
  function closeAllDD() { $all('.dropdown', panes.book).forEach(function (d) { d.classList.remove('open'); }); }
  var BOOK_DEPTS = ['General Physician', 'Cardiologist', 'Pediatrician', 'Dermatologist'];

  function renderPatientDD() {
    var PCOLOR = { anant: '#2E6BD6', priya: '#5B9BE0', aryan: '#0E4F94' };
    ddPanel('patient').innerHTML = ['anant', 'priya', 'aryan'].map(function (m) {
      var nm = MEMBER_NAMES[m], ini = firstName(nm).charAt(0).toUpperCase(), age = (FAMILY[m] || {}).age, photo = (FAMILY[m] || {}).photo;
      return '<button class="dd-opt' + (bookState.patient === m ? ' sel' : '') + '" data-dd-opt data-dd="patient" data-val="' + m + '">' +
        (photo ? '<img class="dd-av" src="' + photo + '" alt="' + nm + '" style="width:36px;height:36px;object-fit:cover;" />' : '<span class="dd-av" style="background:' + PCOLOR[m] + ';width:36px;height:36px;font-size:13px;">' + ini + '</span>') +
        '<span class="dd-opt-main"><span class="dd-opt-title" style="font-weight:500;">' + nm + '</span>' +
        (age != null ? '<span class="dd-sub">' + age + ' yrs</span>' : '') + '</span>' +
        '<span class="dd-check">' + ddCheck() + '</span></button>';
    }).join('');
    var el = ddEl('patient'), lbl = $('[data-dd-label]', el), lead = $('[data-dd-lead]', el), trail = $('[data-dd-trail]', el);
    if (bookState.patient) {
      var pnm = MEMBER_NAMES[bookState.patient], pini = firstName(pnm).charAt(0).toUpperCase(), page = (FAMILY[bookState.patient] || {}).age, pphoto = (FAMILY[bookState.patient] || {}).photo;
      lbl.textContent = pnm; lbl.classList.remove('placeholder'); lbl.style.fontWeight = '500';
      lead.innerHTML = pphoto ? '<img class="dd-av" src="' + pphoto + '" alt="' + pnm + '" style="width:34px;height:34px;object-fit:cover;" />' : '<span class="dd-av" style="background:' + PCOLOR[bookState.patient] + ';width:34px;height:34px;font-size:12.5px;">' + pini + '</span>';
      var sub = $('[data-dd-sub]', el);
      if (sub) sub.textContent = page != null ? page + ' yrs' : '';
      if (trail) trail.innerHTML = '<span class="dd-trail-change">Change</span>';
    } else {
      lbl.textContent = 'Select a family member'; lbl.classList.add('placeholder'); lead.innerHTML = '';
      var sub2 = $('[data-dd-sub]', el);
      if (sub2) sub2.textContent = '';
      if (trail) trail.innerHTML = '<svg class="dd-chev"><use href="#i-chevron"/></svg>';
    }
  }
  function renderPurposeList() {
    var show = !!bookState.patient;
    var label = $('[data-book-purpose-label]', panes.book), list = $('[data-book-purposes]', panes.book);
    if (label) label.classList.toggle('f-hide', !show);
    if (list) list.classList.toggle('f-hide', !show);
    if (!show) return;
    $('[data-book-purposes]', panes.book).innerHTML = BOOK_PURPOSES.map(function (p) {
      var on = bookState.purpose === p.id;
      return '<button class="med-status-opt' + (on ? ' on' : '') + '" data-book-purpose="' + p.id + '" style="' + (on ? 'border-color:rgba(0,106,185,.3);background:var(--tint);' : '') + '">' +
        '<span class="med-status-ic" style="background:' + (on ? 'var(--brand)' : 'var(--tint)') + ';color:' + (on ? '#fff' : 'var(--brand)') + ';"><svg class="ic18"><use href="#' + p.icon + '"/></svg></span>' +
        '<div><div class="rem-t">' + p.label + '</div><div class="rem-s">' + p.sub + '</div></div>' +
        (on ? '<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#006AB9;stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round;margin-left:auto;flex-shrink:0;"><path d="M20 6 9 17l-5-5"/></svg>' : '') +
        '</button>';
    }).join('');
  }
  function renderDeptChips() {
    var depts = ['all'].concat(BOOK_DEPTS);
    $('[data-book-depts]', panes.book).innerHTML = depts.map(function (d) {
      return '<button class="filt' + (bookState.dept === d ? ' on' : '') + '" data-book-dept="' + d + '">' + (d === 'all' ? 'All' : d) + '</button>';
    }).join('');
  }
  function renderDoctorList() {
    var docs = BOOK_DOCTORS.filter(function (d) { return bookState.dept === 'all' || d.spec === bookState.dept; });
    $('[data-book-doctors]', panes.book).innerHTML = docs.map(function (d) {
      var c = clinicById(d.clinics[0]);
      var on = bookState.doctor === d.id;
      return '<div class="hm-row doc-card-row" data-book-pick-doc="' + d.id + '" style="cursor:pointer;' + (on ? 'background:var(--tint);' : '') + '">' +
        '<img class="doc-photo" src="' + d.photo + '" alt="' + d.name + '" />' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="hm-row-t">' + d.name + '</div>' +
          '<div class="hm-row-s">' + d.spec + '</div>' +
          '<div class="hm-row-s">' + (c ? c.name + ', ' + c.city : '') + '</div>' +
          '<div class="doc-card-rating"><span style="color:#F5A623;">★</span> ' + d.rating + ' <span style="color:var(--muted);">(' + d.reviews + ' reviews)</span></div>' +
        '</div>' +
        (d.profile ? '<button class="doc-view-btn doc-view-corner" data-go-doctor="' + d.profile + '">View profile</button>' : '') +
        (on ? '<svg class="ic18" style="stroke:var(--brand);margin-left:4px;flex-shrink:0;"><use href="#i-check"/></svg>' : '') +
        '</div>';
    }).join('');
  }
  function renderDates() {
    var datesEl = $('[data-book-dates]', panes.book);
    var doc = doctorById(bookState.doctor);
    var moLbl = $('[data-book-mo-label]', panes.book);
    if (moLbl) moLbl.textContent = BOOK_MONTHS[bookState.month] + ' ' + bookState.year;
    var prevBtn = $('[data-book-mo-prev]', panes.book);
    if (prevBtn) prevBtn.disabled = (bookState.month === 5 && bookState.year === 2026);
    if (!doc) { datesEl.innerHTML = ''; return; }
    if (bookState.month !== 5 || bookState.year !== 2026) {
      datesEl.innerHTML = '<div class="med-s2" style="padding:10px 2px;">No available slots this month. Try June 2026.</div>';
      return;
    }
    var slots = BOOK_SLOTS[doc.id] || {};
    datesEl.innerHTML = Object.keys(slots).map(function (d) {
      return '<div class="datechip' + (String(bookState.date) === String(d) ? ' on' : '') + '" data-book-date data-d="' + d + '"><span class="dn">' + BOOK_DOW[d] + '</span><span class="dd">' + d + '</span><span class="dmo">Jun</span></div>';
    }).join('');
  }
  function renderTimes() {
    var tw = $('[data-book-timewrap]', panes.book), timesEl = $('[data-book-times]', panes.book);
    var doc = doctorById(bookState.doctor);
    if (!doc || !bookState.date) { tw.style.display = 'none'; return; }
    var slots = (BOOK_SLOTS[doc.id] || {})[bookState.date] || [];
    timesEl.innerHTML = slots.map(function (t) {
      return '<span class="timechip' + (bookState.time === t ? ' on' : '') + '" data-book-time>' + t + '</span>';
    }).join('');
    tw.style.display = '';
    renderBookRecap();
  }
  function renderBookRecap() {
    var recap = $('[data-book-recap]', panes.book); if (!recap) return;
    if (bookState.date && bookState.time) {
      recap.classList.remove('f-hide');
      recap.innerHTML = '<svg class="ic18" style="stroke:var(--brand)"><use href="#i-cal"/></svg>' +
        '<span class="book-recap-text">You\u2019re booking ' + bookFull(bookState.date) + ' at ' + bookState.time + '</span>';
    } else {
      recap.classList.add('f-hide');
    }
  }
  function renderDocSummary() {
    var doc = doctorById(bookState.doctor); if (!doc) return;
    var c = clinicById(doc.clinics[0]);
    $('[data-book-doc-summary]', panes.book).innerHTML =
      '<div class="hm-row" style="cursor:default;"><img class="doc-photo" src="' + doc.photo + '" alt="' + doc.name + '" style="width:38px;height:38px;" />' +
      '<div style="flex:1;min-width:0;"><div class="hm-row-t">' + doc.name + '</div><div class="hm-row-s">' + doc.spec + ' · ' + (c ? c.name : '') + '</div></div></div>';
  }
  function renderBookSummary() {
    var doc = doctorById(bookState.doctor), c = doc ? clinicById(doc.clinics[0]) : null, p = purposeById(bookState.purpose);
    var fam = bookState.patient ? FAMILY[bookState.patient] : null;
    var patientPhoto = fam && fam.photo ? '<img class="doc-photo" src="' + fam.photo + '" alt="' + fam.name + '" style="width:44px;height:44px;" />' : '<span class="doc-av" style="width:44px;height:44px;font-size:15px;background:' + (fam ? fam.color : 'var(--brand)') + ';">' + (fam ? fam.initial : '') + '</span>';
    $('[data-book-summary-people]', panes.book).innerHTML =
      '<div class="hm-row" style="cursor:default;">' + patientPhoto +
      '<div style="flex:1;min-width:0;"><div class="hm-row-t">' + (fam ? fam.name : '') + '</div><div class="hm-row-s">Patient' + (p ? ' · ' + p.label : '') + '</div></div></div>' +
      (doc ? '<div class="hm-row" style="cursor:default;border-top:0.5px solid var(--hair-2);"><img class="doc-photo" src="' + doc.photo + '" alt="' + doc.name + '" style="width:44px;height:44px;" />' +
      '<div style="flex:1;min-width:0;"><div class="hm-row-t">' + doc.name + '</div><div class="hm-row-s">' + doc.spec + ' · ' + (c ? c.name : '') + '</div></div></div>' : '');
    $('[data-book-summary]', panes.book).innerHTML =
      '<div class="book-sum-row"><span class="book-sum-k">Purpose</span><span class="book-sum-v">' + (p ? p.label : '') + '</span></div>' +
      '<div class="book-sum-row"><span class="book-sum-k">Clinic</span><span class="book-sum-v">' + (c ? c.name : '') + '</span></div>' +
      '<div class="book-sum-row"><span class="book-sum-k">When</span><span class="book-sum-v">' + (bookState.date ? bookFull(bookState.date) : '') + ' · ' + (bookState.time || '') + '</span></div>';
  }
  function bookCanContinue() {
    if (bookState.step === 1) return !!(bookState.patient && bookState.purpose);
    if (bookState.step === 2) return !!bookState.doctor;
    if (bookState.step === 3) return !!(bookState.date && bookState.time);
    return true;
  }
  function goBookStep(n) {
    bookState.step = n;
    $all('[data-book-step]', panes.book).forEach(function (el) { el.style.display = (+el.dataset.bookStep === n) ? '' : 'none'; });
    $('[data-book-progress-fill]', panes.book).style.width = (n / 4 * 100) + '%';
    $('[data-book-steplabel]', panes.book).textContent = 'Step ' + n + ' of 4';
    if (n === 2) { renderDeptChips(); renderDoctorList(); }
    if (n === 3) { renderDocSummary(); renderDates(); renderTimes(); }
    if (n === 4) renderBookSummary();
    var btn = $('[data-act="book-continue"]', panes.book), lbl = $('[data-book-continue-label]', panes.book);
    lbl.textContent = n === 4 ? 'Confirm booking' : 'Continue';
    btn.disabled = !bookCanContinue();
  }
  function refreshBookContinue() {
    var btn = $('[data-act="book-continue"]', panes.book);
    if (btn) btn.disabled = !bookCanContinue();
  }
  function initBook() {
    if (!panes.book) return;
    bookState = { step: 1, patient: null, purpose: null, dept: 'all', doctor: null, date: null, time: null, month: 5, year: 2026 };
    renderPatientDD(); renderPurposeList(); closeAllDD();
    goBookStep(1);
  }
  function bookSelections() {
    var doc = doctorById(bookState.doctor), c = doc ? clinicById(doc.clinics[0]) : null, p = purposeById(bookState.purpose), d = bookState.date;
    return {
      who: bookState.patient || 'anant',
      doc: doc ? doc.name : '', spec: doc ? doc.spec : '', clinic: c ? c.name : '',
      d: d || '', m: 'Jun', full: d ? bookFull(d) : '', time: bookState.time || '',
      reason: p ? p.label : ''
    };
  }
  function insertBookedCard() {
    var s = bookSelections();
    var color = MEMBER_COLORS[s.who] || 'var(--brand)';
    var nm = MEMBER_NAMES[s.who];
    var DOTS = '<span class="appt-cl-dots"><span class="appt-cl-dot"></span><span class="appt-cl-dot"></span><span class="appt-cl-dot"></span><span class="appt-cl-dot"></span></span>';
    var CHEV = '<svg class="appt-cl-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
    var CHECKLIST_HTML = '<div class="appt-checklist">' +
      '<button class="appt-cl-summary" data-cl-toggle>' + DOTS + '<span class="appt-cl-label">4 pre-visit tasks to complete</span>' + CHEV + '</button>' +
      '<div class="appt-cl-body">' +
      '<div class="appt-checklist-hd"><span class="acl-title">Pre-visit checklist</span><span class="acl-count appt-checklist-count">0/4 done</span></div>' +
      '<button class="appt-check-row" data-check-toggle><span class="appt-check-circle"><svg width="10" height="10"><use href="#i-check"/></svg></span><span class="appt-check-label">Complete health questionnaire</span><span class="appt-check-open">Fill in</span></button>' +
      '<button class="appt-check-row" data-check-toggle><span class="appt-check-circle"><svg width="10" height="10"><use href="#i-check"/></svg></span><span class="appt-check-label">Confirm insurance details</span><span class="appt-check-open">Review</span></button>' +
      '<button class="appt-check-row" data-check-toggle><span class="appt-check-circle"><svg width="10" height="10"><use href="#i-check"/></svg></span><span class="appt-check-label">Review &amp; sign consent form</span><span class="appt-check-open">Sign</span></button>' +
      '<button class="appt-check-row" data-check-toggle><span class="appt-check-circle"><svg width="10" height="10"><use href="#i-check"/></svg></span><span class="appt-check-label">Update current medications</span><span class="appt-check-open">Update</span></button>' +
      '</div></div>';
    var html = '<div class="tl-item" data-member="' + s.who + '" data-doc="' + s.doc + '" data-clinic="' + s.clinic + '" data-date="2026-06-' + (String(s.d).length < 2 ? '0' + s.d : s.d) + '">' +
      '<div class="appt-row tap" data-go="appointment" style="--mc:' + color + ';">' +
        '<div class="appt-date"><span class="d">' + s.d + '</span><span class="m">' + s.m + '</span><span class="t">' + s.time.replace(/\s?[AP]M/i, '') + '</span></div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="appt-nm">' + s.doc + '</div>' +
          '<div class="appt-mt"><span class="memdot" style="background:' + color + '"></span>' + s.spec + ' · ' + s.clinic + '</div>' +
        '</div>' +
        '<span class="chip chip-upcoming">Upcoming</span>' +
      '</div>' + CHECKLIST_HTML + '</div>';
    var list = $('[data-upcoming-list]', panes.appointments);
    if (list) list.insertAdjacentHTML('afterbegin', html);
    applyApptFilters();
  }

  /* ---------- camera simulator ---------- */
  // deterministic capture sequence so the AI grading is demonstrable
  var CAM_POOL = [
    { q: 'good', label: 'Prescription — front', reason: 'Clear & readable' },
    { q: 'poor', label: 'Prescription — front', reason: 'Too blurry — hold steady and retake' },
    { q: 'good', label: 'Prescription — page 2', reason: 'Clear & readable' },
    { q: 'good', label: 'Prescription — page 2', reason: 'Clear & readable' }
  ];
  var captured = [];
  var capSeq = 0;

  function resetCamera() { captured = []; capSeq = 0; renderCamStrip(); }

  function thumbLines(n) {
    var s = ''; for (var i = 0; i < n; i++) s += '<div class="tln" style="width:' + (55 + (i * 13) % 40) + '%"></div>';
    return s;
  }
  function renderCamStrip() {
    var pane = panes.camera; if (!pane) return;
    var strip = $('[data-cam-strip]', pane);
    if (!captured.length) { strip.innerHTML = '<span class="empty">No photos yet</span>'; }
    else {
      strip.innerHTML = captured.map(function (c) {
        var bad = c.q === 'poor';
        var badge = bad
          ? '<span class="tbadge" style="background:var(--danger)"><svg style="width:11px;height:11px;stroke:#fff;stroke-width:3;fill:none"><use href="#i-x"/></svg></span>'
          : '<span class="tbadge" style="background:var(--success)"><svg style="width:11px;height:11px;stroke:#fff;stroke-width:3;fill:none"><use href="#i-check"/></svg></span>';
        return '<div class="cam-thumb' + (bad ? ' bad' : '') + '">' + thumbLines(5) + badge + '</div>';
      }).join('');
    }
    var n = captured.length;
    $('[data-cam-count]', pane).textContent = n;
    $('.cam-review', pane).classList.toggle('show', n > 0);
    var hint = $('[data-cam-hint]', pane);
    if (hint) hint.textContent = n === 0
      ? 'Position the prescription inside the frame, then tap the shutter'
      : (n >= 3 ? 'Looks good — tap Review when you\u2019re done' : 'Add another page, or tap Review to continue');
  }
  function shoot() {
    var pane = panes.camera; if (!pane) return;
    if (captured.length >= 4) { toast('That\u2019s enough photos — tap Review'); return; }
    var tmpl = CAM_POOL[Math.min(capSeq, CAM_POOL.length - 1)];
    capSeq++;
    captured.push({ q: tmpl.q, label: tmpl.label, reason: tmpl.reason });
    var flash = $('[data-cam-flash]', pane);
    if (flash) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
    renderCamStrip();
  }
  function analyzeThenResults() {
    var good = captured.filter(function (c) { return c.q === 'good'; }).length;
    var poor = captured.length - good;
    overlay.innerHTML = '<div class="scrim"></div><div class="analyzing"><div class="an-box">' +
      '<div class="spin"></div>' +
      '<div style="font-size:16px;font-weight:700;">Checking your photos\u2026</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;line-height:1.4;">Reading text and scoring clarity</div>' +
      '</div></div>';
    overlay.classList.add('show');
    setTimeout(function () {
      closeOverlay();
      renderResults();
      show('photocheck');
      var msg = poor ? (good + ' clear, ' + poor + ' to retake') : 'All photos look clear';
      toast(msg, !poor);
    }, 1500);
  }
  function renderResults() {
    var pane = panes.photocheck; if (!pane) return;
    var box = $('[data-results]', pane);
    box.innerHTML = '<div class="hm-card">' + captured.map(function (c, i) {
      var bad = c.q === 'poor';
      var icBg = bad ? '#FEF2F2' : 'var(--tint)', icColor = bad ? '#DC2626' : 'var(--brand)';
      var trailing = bad
        ? '<button class="pc-retake" data-act="retake" data-idx="' + i + '">Retake</button>'
        : '<span class="pc-ok"><svg class="ic18"><use href="#i-check"/></svg></span>';
      var verdict = '<div style="font-size:12.5px;font-weight:400;color:' + (bad ? 'var(--danger)' : 'var(--success)') + ';margin-top:2px;">' + c.reason + '</div>';
      return '<div class="hm-row" style="cursor:default;">' +
        '<span class="pc-ic" style="background:' + icBg + ';color:' + icColor + ';"><svg class="ic18"><use href="#i-doc"/></svg></span>' +
        '<div style="flex:1;min-width:0;"><div class="hm-row-t">' + c.label + '</div>' + verdict + '</div>' +
        trailing + '</div>';
    }).join('') + '</div>';
    var good = captured.filter(function (c) { return c.q === 'good'; }).length;
    var btn = $('[data-act="to-extract"]', pane);
    var lbl = $('[data-extract-label]', pane);
    lbl.textContent = good ? ('Extract from ' + good + ' photo' + (good === 1 ? '' : 's')) : 'Retake a clear photo to continue';
    btn.disabled = good === 0;
  }

  /* ---------- toast ---------- */
  var toastRoot = $('#toast'); var toastTimer;
  function toast(msg, ok) {
    toastRoot.innerHTML = '<div class="toast">' + (ok ? '<span class="tk"><svg class="ic18" style="stroke:var(--success)"><use href="#i-check"/></svg></span>' : '') + '<span>' + msg + '</span></div>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastRoot.innerHTML = ''; }, 2200);
  }

  /* ---------- family member detail ---------- */
  var FAMILY = {
    anant: { name: 'Mateo Alejandro Vega Castillo', initial: 'M', color: 'var(--m-anant)', photo: 'assets/member-anant.png', rel: 'Self', age: 38, dob: '12 Mar 1990', sex: 'Male', mobile: '+52 999 123 4567', email: 'mateo.vega@email.com', curp: 'VECM900312HYNGST04', mrn: 'MRN-2026-04-000312', blood: 'B+', height: '1.78 m', weight: '72 kg', chronic: ['Hypertension', 'Asthma'], allergies: ['Penicillin', 'Peanuts'], meds: 2, upcoming: 3, guardian: null },
    priya: { name: 'Sofía Guadalupe Herrera Ríos', initial: 'S', color: 'var(--m-priya)', photo: 'assets/member-priya.png', rel: 'Spouse', age: 35, dob: '24 Jul 1990', sex: 'Female', mobile: '+52 999 765 4321', email: 'sofia.herrera@email.com', curp: 'HERS900724MYNRRF08', mrn: 'MRN-2026-04-000318', blood: 'O+', height: '1.64 m', weight: '61 kg', chronic: ['Prediabetes'], allergies: ['Sulfa drugs'], meds: 3, upcoming: 2, guardian: null },
    aryan: { name: 'Diego Emiliano Vega Herrera', initial: 'D', color: 'var(--m-aryan)', photo: 'assets/member-aryan.png', rel: 'Child', age: 9, dob: '03 Feb 2017', sex: 'Male', mobile: '\u2014', email: '\u2014', curp: 'VEHD170203HYNGRG02', mrn: 'MRN-2026-04-000326', blood: 'B+', height: '1.34 m', weight: '29 kg', chronic: ['Asthma'], allergies: ['Dust mites'], meds: 2, upcoming: 2, guardian: 'Mateo & Sofía' }
  };
  function esc(s) { return String(s).replace(/</g, '&lt;'); }
  function mvRow(k, v, mono) {
    return '<div class="info-row"><span class="k">' + k + '</span><span class="v' + (mono ? ' mono' : '') + '">' + esc(v) + '</span></div>';
  }
  function mvPills(k, arr, tone) {
    var style = (tone === 'amber') ? 'background:rgba(212,137,74,.14);color:#B5651D;' : 'background:rgba(155,111,212,.14);color:#7A4FB5;';
    var pills = arr.length
      ? arr.map(function (x) { return '<span class="info-pill" style="' + style + '">' + esc(x) + '</span>'; }).join('')
      : '<span class="v" style="color:var(--muted);font-weight:500;">None on file</span>';
    return '<div class="info-row multi"><span class="k">' + k + '</span><span class="v"><span class="pill-cluster">' + pills + '</span></span></div>';
  }
  function renderMember(key) {
    var m = FAMILY[key]; if (!m) return;
    var tt = $('#mv-title'); if (tt) tt.textContent = firstName(m.name) + "'s profile";
    var upChip = m.upcoming
      ? '<span class="chip chip-active" style="gap:5px;"><svg class="ic16" style="stroke:var(--brand)"><use href="#i-cal"/></svg>' + m.upcoming + ' upcoming</span>'
      : '<span class="chip chip-cancelled" style="gap:5px;"><svg class="ic16" style="stroke:var(--muted)"><use href="#i-cal"/></svg>None upcoming</span>';
    $('#mv-hero').innerHTML =
      (m.photo ? '<img class="pav" src="' + m.photo + '" alt="' + esc(m.name) + '" style="object-fit:cover;" />' : '<div class="pav" style="background:' + m.color + ';">' + m.initial + '</div>') +
      '<div class="pname">' + esc(m.name) + '</div>' +
      '<div class="pmeta">' + m.rel + ' \u00b7 ' + m.age + ' yrs \u00b7 ' + m.mrn + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:13px;flex-wrap:wrap;justify-content:center;">' +
        '<span class="chip chip-active" style="gap:5px;"><svg class="ic16" style="stroke:var(--brand)"><use href="#i-pill"/></svg>' + m.meds + ' medications</span>' + upChip +
      '</div>';
    $('#mv-personal').innerHTML =
      mvRow('Full name', m.name) +
      mvRow('Date of birth', m.dob + ' \u00b7 ' + m.age + ' yrs') +
      mvRow('Sex', m.sex) +
      mvRow('Mobile', m.mobile, true) +
      mvRow('Email', m.email) +
      mvRow('CURP', m.curp, true);
    $('#mv-health').innerHTML =
      '<div class="info-row"><span class="k">Blood type</span><span class="v"><span class="info-pill" style="background:rgba(217,95,95,.12);color:#C0392B;">' + m.blood + '</span></span></div>' +
      mvRow('Height', m.height, true) +
      mvRow('Weight', m.weight, true) +
      mvPills('Chronic care', m.chronic, 'violet') +
      mvPills('Allergies', m.allergies, 'amber');
    var care = $('#mv-care');
    if (care) {
      var guardianRow = m.guardian
        ? '<div class="set-row" data-toast="Guardians &amp; contacts"><div class="set-ico" style="background:var(--m-mother)"><svg><use href="#i-users"/></svg></div><span class="set-label">Guardians</span><span class="set-val">' + esc(m.guardian) + '</span><svg class="set-chev"><use href="#i-chevron"/></svg></div>'
        : '';
      care.innerHTML =
        '<div class="set-row" data-go="medications"><div class="set-ico" style="background:var(--brand)"><svg><use href="#i-pill"/></svg></div><span class="set-label">Medications</span><span class="set-val">' + m.meds + '</span><svg class="set-chev"><use href="#i-chevron"/></svg></div>' +
        '<div class="set-row" data-go="appointments"><div class="set-ico" style="background:var(--accent)"><svg><use href="#i-cal"/></svg></div><span class="set-label">Appointments</span><span class="set-val">' + (m.upcoming || 'None') + ' upcoming</span><svg class="set-chev"><use href="#i-chevron"/></svg></div>' +
        guardianRow;
    }
  }

  /* ---------- past-visit letterhead report ---------- */
  var currentVisit = null;
  var VISITS = {
    derm: {
      member: 'aryan', clinic: 'Cl\u00ednica Roma', mono: 'CR', clinicColor: '#C4698F',
      addr: 'Av. \u00c1lvaro Obreg\u00f3n 64, Roma Norte, CDMX', phone: '+52 55 5264 1180', contact: 'contacto@clinicaroma.mx',
      doctor: 'Dr. Carmen Iglesias', spec: 'Dermatology', license: 'C\u00e9d. Prof. 7841120',
      type: 'Dermatology consult', date: '02 Jun 2026', time: '11:15 AM',
      chief: 'Itchy, scaly patches on both elbows and along the scalp margin for about three weeks.',
      exam: 'Well-appearing child, no distress. Erythematous plaques with silvery scale over the extensor elbows and scalp margin. No nail pitting, no joint swelling, no lymphadenopathy.',
      vitals: 'Wt 29 kg \u00b7 Ht 1.34 m \u00b7 Temp 36.6\u00b0C',
      dx: 'Plaque psoriasis, mild and localized.',
      rx: [
        { n: 'Calcipotriol 0.005% ointment', d: 'Apply a thin layer to affected plaques twice daily' },
        { n: 'Hydrocortisone 1% cream', d: 'Apply to scalp margin once daily for 2 weeks' }
      ],
      plan: 'Topical therapy for 4 weeks. Fragrance-free emollient daily after bathing. Avoid harsh soaps and very hot water.',
      followup: 'Review in 4 weeks \u2014 sooner if the rash spreads, weeps, or shows signs of infection.',
      invoice: { no: 'INV-2026-0602-CR', method: 'Cash', status: 'Paid', taxRate: 0.16, items: [ { d: 'Dermatology consultation', a: 900 }, { d: 'Dermoscopy examination', a: 450 } ] }
    },
    cardio: {
      member: 'anant', clinic: 'Hospital \u00c1ngeles, Polanco', mono: 'HA', clinicColor: '#2A6FDB',
      addr: 'Av. Masaryk 101, Polanco, CDMX', phone: '+52 55 5263 1900', contact: 'citas@hospitalangeles.mx',
      doctor: 'Dr. Ricardo Morales', spec: 'Cardiology', license: 'C\u00e9d. Prof. 5519028',
      type: 'Cardiology follow-up', date: '18 May 2026', time: '9:45 AM',
      chief: 'Routine follow-up for hypertension. Reports occasional morning headaches.',
      exam: 'BP 138/88 mmHg seated, repeated 134/86. HR 72 and regular. Normal heart sounds, no murmurs. Lungs clear. No peripheral edema.',
      vitals: 'BP 134/86 mmHg \u00b7 HR 72 bpm \u00b7 Wt 72 kg \u00b7 SpO\u2082 98%',
      dx: 'Essential hypertension \u2014 partially controlled.',
      rx: [
        { n: 'Amlodipine 5 mg', d: 'One tablet once daily in the morning' },
        { n: 'Aspirin 81 mg', d: 'One tablet once daily with food' }
      ],
      plan: 'Continue current therapy. Reduce dietary sodium, 30 min brisk walking 5\u00d7/week, keep a home blood-pressure log.',
      followup: 'ECG and lipid panel completed today. Review in 8 weeks with the BP diary.',
      invoice: { no: 'INV-2026-0518-HA', method: 'Visa •••• 4821', status: 'Paid', taxRate: 0.16, items: [ { d: 'Cardiology follow-up consultation', a: 1100 }, { d: 'Resting ECG (12-lead)', a: 650 }, { d: 'Lipid panel', a: 480 } ] }
    },
    'gp-priya': {
      member: 'priya', clinic: 'Hospital Español', mono: 'HE', clinicColor: '#D95F5F',
      addr: 'Av. Ejército Nacional 613, Polanco, CDMX', phone: '+52 55 5255 9600', contact: 'citas@hospitalespanol.mx',
      doctor: 'Dr. Valentina Reyes', spec: 'Internal Medicine', license: 'Céd. Prof. 6328441',
      type: 'Diabetes follow-up', date: '10 May 2026', time: '10:00 AM',
      chief: 'Three-month diabetes follow-up. Reports occasional afternoon fatigue and mild thirst.',
      exam: 'Alert, orientated, no distress. BP 122/80 mmHg, HR 74 bpm. Abdomen soft. No oedema. Feet sensation intact bilaterally.',
      vitals: 'BP 122/80 mmHg · HR 74 bpm · Wt 61 kg · HbA1c 6.9%',
      dx: 'Type 2 diabetes mellitus — partially controlled. Glycaemia improving with current regimen.',
      rx: [
        { n: 'Metformin 500 mg', d: 'One tablet twice daily with meals — morning and evening' },
        { n: 'Glimepiride 1 mg', d: 'One tablet once daily with breakfast' }
      ],
      plan: 'Continue oral hypoglycaemics. Low-carbohydrate diet plan provided. 30-min daily walk. Fasting glucose log to be reviewed at next visit.',
      followup: 'HbA1c and fasting lipids repeat in 3 months. Nephrology referral if eGFR declines further.',
      invoice: { no: 'INV-2026-0510-HE', method: 'Visa •••• 4821', status: 'Paid', taxRate: 0.16, items: [ { d: 'Internal medicine consultation', a: 950 }, { d: 'HbA1c (glycated haemoglobin)', a: 320 }, { d: 'Fasting lipid panel', a: 380 } ] }
    },
    asthma: {
      member: 'anant', clinic: 'Clínica Roma', mono: 'CR', clinicColor: '#4DA66B',
      addr: 'Av. Álvaro Obregón 64, Roma Norte, CDMX', phone: '+52 55 5264 1180', contact: 'contacto@clinicaroma.mx',
      doctor: 'Dr. Andrés Gómez', spec: 'General Practice', license: 'Céd. Prof. 4892015',
      type: 'Asthma & spirometry review', date: '22 Apr 2026', time: '11:30 AM',
      chief: 'Seasonal asthma flare with nocturnal cough and mild exertional wheeze for two weeks.',
      exam: 'Mild end-expiratory wheeze bilaterally. No cyanosis. SpO₂ 96%. Spirometry: FEV₁/FVC 71%, FEV₁ 78% predicted — mild obstruction.',
      vitals: 'SpO₂ 96% · RR 17/min · HR 76 bpm · Temp 36.8°C',
      dx: 'Mild persistent asthma, seasonal exacerbation.',
      rx: [
        { n: 'Salbutamol 100 mcg inhaler', d: 'Two puffs every 4–6 hours as needed for wheeze or breathlessness' },
        { n: 'Fluticasone 100 mcg inhaler', d: 'One puff twice daily — rinse mouth after each use' }
      ],
      plan: 'Avoid known triggers (dust, pollen). Use peak-flow diary. Rescue inhaler technique reviewed in clinic.',
      followup: 'Return in 6 weeks for spirometry repeat. Escalate to combined LABA/ICS if FEV₁ remains below 80%.',
      invoice: { no: 'INV-2026-0422-CR', method: 'Cash', status: 'Paid', taxRate: 0.16, items: [ { d: 'General practice consultation', a: 750 }, { d: 'Spirometry with reversibility test', a: 620 } ] }
    },
    pedi: {
      member: 'aryan', clinic: 'Hospital Ángeles, Polanco', mono: 'HA', clinicColor: '#2A6FDB',
      addr: 'Av. Masaryk 101, Polanco, CDMX', phone: '+52 55 5263 1900', contact: 'citas@hospitalangeles.mx',
      doctor: 'Dr. Ariel Castillo', spec: 'Pediatrics', license: 'Céd. Prof. 8923410',
      type: 'Annual pediatric check-up', date: '05 Apr 2026', time: '9:00 AM',
      chief: 'Annual well-child visit. Parents report no acute concerns. Continues asthma preventer inhaler.',
      exam: 'Healthy, active 9-year-old. Growth on 50th percentile. Heart and lungs clear. Abdomen soft. Vision and hearing screening passed.',
      vitals: 'Wt 29 kg · Ht 1.34 m · BP 105/70 mmHg · HR 84 bpm',
      dx: 'Well-child visit — healthy development. Mild persistent asthma, well controlled.',
      rx: [
        { n: 'Fluticasone 50 mcg inhaler', d: 'One puff twice daily — preventer; continue year-round' },
        { n: 'Salbutamol 100 mcg inhaler', d: 'Two puffs as needed — rescue only' }
      ],
      plan: 'Continue preventer therapy. Reinforced inhaler technique. Physical activity encouraged. Screen time counselling given to parents.',
      followup: 'Next annual check-up April 2027. Vaccination record updated — HPV series due 2028.',
      invoice: { no: 'INV-2026-0405-HA', method: 'GNP Seguros', status: 'Covered', taxRate: 0.16, items: [ { d: 'Pediatric well-child consultation', a: 1100 }, { d: 'Vision & hearing screening', a: 350 }, { d: 'Growth & nutrition assessment', a: 280 } ] }
    },
    'derm-priya': {
      member: 'priya', clinic: 'Clínica Roma', mono: 'CR', clinicColor: '#C4698F',
      addr: 'Av. Álvaro Obregón 64, Roma Norte, CDMX', phone: '+52 55 5264 1180', contact: 'contacto@clinicaroma.mx',
      doctor: 'Dr. Carmen Iglesias', spec: 'Dermatology', license: 'Céd. Prof. 7841120',
      type: 'Allergic dermatitis evaluation', date: '18 Mar 2026', time: '2:00 PM',
      chief: 'Widespread itchy rash on arms and neck for 10 days, worsening after using a new moisturiser.',
      exam: 'Erythematous, urticarial plaques on forearms and lateral neck. Dermoscopy: non-specific pattern. No vesicles. No lymphadenopathy.',
      vitals: 'Wt 61 kg · BP 116/76 mmHg · Temp 36.5°C',
      dx: 'Allergic contact dermatitis — likely triggered by fragrance in topical product.',
      rx: [
        { n: 'Cetirizine 10 mg', d: 'One tablet once daily at bedtime for 2 weeks' },
        { n: 'Betamethasone 0.1% cream', d: 'Apply thin layer to affected area twice daily for 7 days only' }
      ],
      plan: 'Discontinue new moisturiser immediately. Switch to fragrance-free, hypoallergenic emollient. Patch testing recommended.',
      followup: 'Patch testing booked for 4 weeks. Return sooner if rash spreads or blistering develops.',
      invoice: { no: 'INV-2026-0318-CR', method: 'Cash', status: 'Paid', taxRate: 0.16, items: [ { d: 'Dermatology consultation', a: 900 }, { d: 'Patch-test panel (10 allergens)', a: 580 } ] }
    }
  };
  function vrCell(k, v) { return '<div><div class=\"lh-k\">' + k + '</div><div class=\"lh-v\">' + esc(v) + '</div></div>'; }
  function vrSec(title, inner) { return '<div class=\"lh-sec\"><h4>' + title + '</h4>' + inner + '</div>'; }
  function vrPills(arr, tone) {
    var style = (tone === 'amber') ? 'background:rgba(212,137,74,.14);color:#B5651D;' : 'background:rgba(155,111,212,.14);color:#7A4FB5;';
    if (!arr || !arr.length) return '<span class=\"lh-v\" style=\"color:var(--muted);font-weight:500;\">None on file</span>';
    return arr.map(function (x) { return '<span class=\"info-pill\" style=\"' + style + '\">' + esc(x) + '</span>'; }).join('');
  }
  function vrSign(doctor) {
    var parts = doctor.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    if (parts.length < 2) return doctor;
    return parts[0].charAt(0) + '. ' + parts.slice(1).join(' ');
  }
  function renderVisit(key) {
    var v = VISITS[key]; if (!v) return;
    currentVisit = key;
    var f = FAMILY[v.member] || {};
    var sheet = $('#vr-sheet'); if (!sheet) return;
    var rx = v.rx.map(function (r) {
      return '<div class=\"lh-med\"><span class=\"dot\"></span><div><div class=\"mn\">' + esc(r.n) + '</div><div class=\"md\">' + esc(r.d) + '</div></div></div>';
    }).join('');
    sheet.innerHTML =
      '<div class=\"lh-top\">' +
        '<div class=\"lh-logo\" style=\"background:' + v.clinicColor + ';\">' + v.mono + '</div>' +
        '<div style=\"flex:1;min-width:0;\"><div class=\"lh-clinic\">' + esc(v.clinic) + '</div>' +
        '<div class=\"lh-addr\">' + esc(v.addr) + '<br>' + v.phone + ' \u00b7 ' + v.contact + '</div></div>' +
      '</div>' +
      '<div class=\"lh-rule\"></div>' +
      '<div class=\"lh-body\">' +
        '<div class=\"lh-doctype\">Clinical Visit Summary</div>' +
        '<div class=\"lh-title\">' + esc(v.type) + '</div>' +
        '<div class=\"lh-grid\">' +
          vrCell('Patient', f.name || '\u2014') + vrCell('MRN', f.mrn || '\u2014') +
          vrCell('Date of birth', (f.dob || '\u2014') + (f.age ? ' \u00b7 ' + f.age + ' yrs' : '')) + vrCell('Sex', f.sex || '\u2014') +
          vrCell('Visit date', v.date + ' \u00b7 ' + v.time) + vrCell('Attending', v.doctor) +
        '</div>' +
        vrSec('Chief complaint', '<p>' + esc(v.chief) + '</p>') +
        vrSec('Examination findings', '<p>' + esc(v.exam) + '</p>') +
        vrSec('Vitals recorded', '<p>' + v.vitals + '</p>') +
        vrSec('Diagnosis', '<p>' + esc(v.dx) + '</p>') +
        vrSec('Allergies on file', '<div class=\"lh-pillrow\">' + vrPills(f.allergies, 'amber') + '</div>') +
        vrSec('Chronic care', '<div class=\"lh-pillrow\">' + vrPills(f.chronic, 'violet') + '</div>') +
        vrSec('Medications prescribed', rx) +
        vrSec('Plan', '<p>' + esc(v.plan) + '</p>') +
        vrSec('Follow-up', '<p>' + esc(v.followup) + '</p>') +
        '<div class=\"lh-foot\">' +
          '<div><div class=\"lh-sign\">' + vrSign(v.doctor) + '</div>' +
          '<div class=\"lh-addr\">' + v.doctor + ' \u00b7 ' + v.spec + '<br>' + v.license + '</div></div>' +
          '<div style=\"text-align:right;\"><div class=\"lh-addr\">Issued by ' + esc(v.clinic.split(',')[0]) + '<br>' + v.date + '</div></div>' +
        '</div>' +
      '</div>';
  }

  function vrMoney(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MXN'; }
  function renderInvoice(key) {
    var v = VISITS[key]; if (!v || !v.invoice) return;
    var f = FAMILY[v.member] || {};
    var inv = v.invoice;
    var sheet = $('#inv-sheet'); if (!sheet) return;
    var sub = inv.items.reduce(function (s, it) { return s + it.a; }, 0);
    var tax = Math.round(sub * inv.taxRate * 100) / 100;
    var total = sub + tax;
    var rows = inv.items.map(function (it) {
      return '<div class="inv-row"><span class="desc">' + esc(it.d) + '</span><span class="amt">' + vrMoney(it.a) + '</span></div>';
    }).join('');
    var rfc = (v.mono === 'HA') ? 'HAN-980101-A1B' : 'CRO-050314-9X2';
    sheet.innerHTML =
      '<div class="lh-top">' +
        '<div class="lh-logo" style="background:' + v.clinicColor + ';">' + v.mono + '</div>' +
        '<div style="flex:1;min-width:0;"><div class="lh-clinic">' + esc(v.clinic) + '</div>' +
        '<div class="lh-addr">' + esc(v.addr) + '<br>' + v.phone + ' · ' + v.contact + '</div></div>' +
      '</div>' +
      '<div class="lh-rule"></div>' +
      '<div class="lh-body">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">' +
          '<div><div class="lh-doctype">Invoice</div><div class="lh-title">' + inv.no + '</div></div>' +
          '<span class="inv-paid"><svg class="ic16" style="stroke:#1F8A5E;width:13px;height:13px;"><use href="#i-check"/></svg>' + inv.status + '</span>' +
        '</div>' +
        '<div class="lh-grid">' +
          vrCell('Billed to', f.name || '—') + vrCell('MRN', f.mrn || '—') +
          vrCell('Invoice date', v.date) + vrCell('Service', v.type) +
          vrCell('Attending', v.doctor) + vrCell('Payment', inv.method) +
        '</div>' +
        vrSec('Charges', rows) +
        '<div style="margin-top:14px;">' +
          '<div class="inv-tot"><span>Subtotal</span><span class="amt">' + vrMoney(sub) + '</span></div>' +
          '<div class="inv-tot"><span>IVA (16%)</span><span class="amt">' + vrMoney(tax) + '</span></div>' +
          '<div class="inv-tot grand"><span>Total</span><span class="amt">' + vrMoney(total) + '</span></div>' +
        '</div>' +
        '<div class="lh-foot">' +
          '<div><div class="lh-addr">RFC: ' + rfc + '<br>Thank you for your visit.</div></div>' +
          '<div style="text-align:right;"><div class="lh-addr">Issued by ' + esc(v.clinic.split(',')[0]) + '<br>' + v.date + '</div></div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- add-family live updates ---------- */
  function syncFamilyName() {
    var name = ($('#af-name') && $('#af-name').value.trim()) || 'this member';
    var first = name.split(' ')[0];
    var av = $('#af-avatar'); if (av) av.textContent = (first[0] || 'R').toUpperCase();
    var ch = $('#af-colorhint'); if (ch) ch.textContent = "Used across the app to identify " + first + "'s data";
    var sh = $('#af-soundhint'); if (sh) sh.textContent = "Used for all of " + first + "'s medication reminders";
  }

  function openReqDetail(kind) {
    if (kind === 'instructions') {
      var items = [
        ['Come on an empty stomach', 'No food or drink for 8 hours before your 10:30 AM blood draw.'],
        ['Water is fine', 'Plain water is allowed and encouraged — stay hydrated.'],
        ['Avoid sugar and alcohol', 'Skip sweets, soft drinks and alcohol for 24 hours before the visit.'],
        ['Take your usual medication', 'Continue Levotiroxina as normal unless Dr. Morales told you otherwise.'],
        ['No strenuous exercise', 'Avoid heavy workouts the evening before — it can affect your readings.'],
        ['Arrive 15 minutes early', 'Bring a photo ID and wear a short-sleeved top for the blood draw.']
      ];
      openSheet(
        '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Before your appointment</div>' +
        '<div class="meta" style="margin-top:3px;">Dr. Ricardo Morales · Sat, 14 June, 10:30 AM</div></div>' +
        items.map(function (it, i) {
          return '<div class="rq-row"><span class="rq-n">' + (i + 1) + '</span><div style="flex:1;min-width:0;">' +
            '<div class="rq-t">' + it[0] + '</div><div class="rq-s">' + it[1] + '</div></div></div>';
        }).join('') +
        '<button class="btn btn-primary" style="height:42px;font-size:14.5px;font-weight:550;border-radius:12px;margin-top:16px;" data-close>Got it</button>'
      );
      return;
    }
    var qs = [
      ['Any new symptoms since your last visit?', ['None', 'Some', 'Many']],
      ['How would you rate your energy this week?', ['Good', 'Fair', 'Low']],
      ['Have you missed any medication doses?', ['No', 'A few', 'Often']],
      ['Any chest discomfort or shortness of breath?', ['No', 'Sometimes', 'Yes']],
      ['How has your sleep been?', ['Good', 'Fair', 'Poor']],
      ['Any changes in weight or appetite?', ['No', 'Slight', 'Notable']]
    ];
    openSheet(
      '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Health questionnaire</div>' +
      '<div class="meta" style="margin-top:3px;">Six questions · shared with Dr. Morales before your visit</div></div>' +
      '<div style="max-height:46vh;overflow-y:auto;">' +
      qs.map(function (q, i) {
        return '<div class="rq-row"><span class="rq-n">' + (i + 1) + '</span><div style="flex:1;min-width:0;">' +
          '<div class="rq-t">' + q[0] + '</div><div class="rq-opts" data-rq-group>' +
          q[1].map(function (o, j) { return '<button class="rq-opt" data-rq-opt>' + o + '</button>'; }).join('') +
          '</div></div></div>';
      }).join('') +
      '</div>' +
      '<button class="btn btn-primary" style="height:42px;font-size:14.5px;font-weight:550;border-radius:12px;margin-top:14px;" data-act="submit-questionnaire">Submit answers</button>'
    );
  }

  var reminderBell = null;
  var REM_SOUNDS = ['Chime', 'Ripple', 'Soft bell', 'Vibrate only'];
  var DOCTOR_PROFILES = {
    morales: { photo:'assets/doc-morales.png', n:'Dr. Ricardo Morales', spec:'Cardiology', clinic:'Hospital Ángeles, Polanco', since:'Your doctor since 2023 · 4 visits', rating:'4.8', reviews:211,
      bio:'Consultant cardiologist with 18 years of practice, focused on hypertension and preventive cardiac care. Trained at UNAM and completed a fellowship in interventional cardiology in Houston. Speaks Spanish and English.',
      visits:[['18 May 2026','Follow-up · Blood pressure review'],['12 Feb 2026','Annual cardiac check-up'],['04 Nov 2025','Consultation · Chest tightness'],['21 Jun 2025','Follow-up · Medication review']] },
    castillo: { photo:'assets/doc-ariel.png', n:'Dr. Ariel Castillo', spec:'Pediatrics', clinic:'Clínica Roma', since:'Your doctor since 2024 · 3 visits', rating:'4.9', reviews:176,
      bio:'Pediatrician treating children from newborn through adolescence, with a special interest in respiratory conditions and childhood allergies. Board certified, 11 years in practice.',
      visits:[['05 Apr 2026','Sick visit · Fever and cough'],['14 Jan 2026','Vaccination · Annual booster'],['02 Sep 2025','Well-child visit']] },
    reyes: { photo:'assets/doc-reyes.png', n:'Dr. Valentina Reyes', spec:'Internal Medicine', clinic:'Hospital Español', since:'Your doctor since 2022 · 3 visits', rating:'4.9', reviews:128,
      bio:'Internist managing diabetes, thyroid conditions and long-term metabolic care. Emphasises lifestyle-led treatment alongside medication. 14 years in practice.',
      visits:[['22 Mar 2026','Consultation · Thyroid panel review'],['08 Dec 2025','Follow-up · Dosage adjustment'],['19 Aug 2025','Annual physical']] },
    soto: { photo:'assets/doc-soto.png', n:'Dr. Miguel Soto', spec:'Cardiology', clinic:'Hospital Español', since:'New to your care team', rating:'4.6', reviews:94,
      bio:'Cardiologist specialising in arrhythmia management and preventive heart care, seeing patients across Hospital Español and Clínica Roma. 9 years in practice.',
      visits:[] },
    gomez: { photo:'assets/doc-gomez.png', n:'Dr. Andrés Gómez', spec:'General Physician', clinic:'Clínica Roma', since:'New to your care team', rating:'4.7', reviews:63,
      bio:'General physician for everyday health concerns, routine screenings and referrals to specialists when needed. 7 years in practice.',
      visits:[] },
    iglesias: { photo:'assets/doc-iglesias.png', n:'Dr. Carmen Iglesias', spec:'Dermatology', clinic:'Clínica Roma', since:'New to your care team', rating:'4.8', reviews:89,
      bio:'Dermatologist treating skin, hair and nail conditions, from routine screenings to acne and eczema care. 12 years in practice.',
      visits:[] }
  };
  var REVIEW_NAMES = ['Laura F.', 'José R.', 'Ana M.', 'Marta G.', 'Diego H.', 'Sofía H.', 'Camila T.', 'Rubén P.', 'Elena V.', 'Iván C.', 'Paula S.', 'Fernando L.', 'Gabriela N.', 'Andrés O.', 'Valeria Q.', 'Tomás B.', 'Isabel D.', 'Carlos E.', 'Renata K.', 'Mauricio J.'];
  var REVIEW_TEXTS = [
    'Very thorough and explained everything clearly.', 'Helped manage my condition well over the past year.', 'Good doctor, appointments sometimes run late.',
    'Patient and clear with instructions.', 'Really listens and takes time with advice.', 'Quick and helpful for a routine visit.',
    'Knowledgeable, a bit hard to get an appointment.', 'Made my child feel comfortable right away.', 'Straightforward and easy to talk to.',
    'Took the time to answer all my questions.', 'Friendly staff and a caring doctor.', 'Diagnosed the issue quickly and correctly.',
    'Wait time was long but the visit itself was great.', 'Clear follow-up plan after the appointment.', 'Would recommend to friends and family.'
  ];
  var REVIEW_MONTHS = ['Jun 2026', 'May 2026', 'Apr 2026', 'Mar 2026', 'Feb 2026', 'Jan 2026', 'Dec 2025', 'Nov 2025', 'Oct 2025', 'Sep 2025', 'Aug 2025', 'Jul 2025'];
  function genReviews(seed, count, baseRating) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var r = ((seed * 31 + i * 17) % 5);
      var rating = r < 1 ? 4 : (baseRating >= 4.8 ? 5 : (r < 3 ? 5 : 4));
      out.push({
        name: REVIEW_NAMES[(seed + i * 3) % REVIEW_NAMES.length],
        rating: rating,
        text: REVIEW_TEXTS[(seed + i * 5) % REVIEW_TEXTS.length],
        date: REVIEW_MONTHS[i % REVIEW_MONTHS.length]
      });
    }
    return out;
  }
  var DOCTOR_REVIEWS = {
    morales: genReviews(1, 22, 4.8),
    castillo: genReviews(2, 18, 4.9),
    reyes: genReviews(3, 20, 4.9),
    soto: genReviews(4, 14, 4.6),
    gomez: genReviews(5, 10, 4.7),
    iglesias: genReviews(6, 12, 4.8)
  };
  function docRatingsLoad() { try { return JSON.parse(localStorage.getItem('nfh-doc-ratings') || '{}'); } catch (e) { return {}; } }
  function docRatingsSave(o) { try { localStorage.setItem('nfh-doc-ratings', JSON.stringify(o)); } catch (e) {} }
  var reviewsDocId = null, rateVisitCtx = null;
  function openReviewsSheet(id) {
    var d = DOCTOR_PROFILES[id]; if (!d) return;
    reviewsDocId = id;
    var revs = DOCTOR_REVIEWS[id] || [];
    var rowsHtml = revs.map(function (r) {
      return '<div class="req-sheet-row"><div style="flex:1;min-width:0;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;"><span class="req-sheet-label">' + r.name + '</span><span class="meta">' + r.date + '</span></div>' +
        '<div style="color:#F5A623;font-size:13px;margin-top:2px;">' + '★'.repeat(r.rating) + '<span style="color:var(--hair);">' + '★'.repeat(5 - r.rating) + '</span></div>' +
        '<div style="font-size:13.5px;color:var(--text);margin-top:4px;line-height:1.4;">' + r.text + '</div></div></div>';
    }).join('') + (revs.length === 0 ? '<div class="meta" style="padding:10px 2px;">No written reviews yet.</div>' : '');
    overlay.innerHTML = '<div class="scrim" data-close></div><div class="sheet review-sheet" data-review-sheet>' +
      '<div class="grab"></div>' +
      '<div class="review-sheet-compact"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Reviews</div>' +
      '<div class="meta" style="margin-top:3px;"><span style="color:#F5A623;">★</span> ' + d.rating + ' · ' + d.reviews + ' reviews for ' + d.n + '</div></div>' +
      '<div class="review-sheet-pinned"><img src="' + d.photo + '" alt="' + d.n + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" />' +
      '<div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:600;">' + d.n + '</div>' +
      '<div class="meta" style="margin-top:1px;"><span style="color:#F5A623;">★</span> ' + d.rating + ' · ' + d.reviews + ' reviews</div></div></div>' +
      '<div class="review-sheet-list" data-review-list>' + rowsHtml + '</div>' +
      '</div>';
    overlay.classList.add('show');
    var listEl = $('[data-review-list]', overlay), sheetEl = $('[data-review-sheet]', overlay);
    listEl.addEventListener('scroll', function () {
      sheetEl.classList.toggle('expanded', listEl.scrollTop > 8);
    });
  }
  function openRateSheet(docId, visitIdx, visitLabel) {
    rateVisitCtx = { docId: docId, visitIdx: visitIdx };
    openSheet(
      '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Rate this visit</div>' +
      '<div class="meta" style="margin-top:3px;">' + visitLabel + '</div></div>' +
      '<div style="display:flex;gap:8px;justify-content:center;padding:16px 4px 4px;" data-rate-stars>' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button class="rate-star" data-rate-star="' + n + '"><svg viewBox="0 0 24 24" style="width:30px;height:30px;fill:none;stroke:#F5A623;stroke-width:1.6;"><path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6-4.4-4.2 6-.8Z"/></svg></button>'; }).join('') +
      '</div>' +
      '<textarea class="field" id="rate-note" rows="2" placeholder="Add a comment (optional)" style="margin-top:14px;"></textarea>' +
      '<button class="btn btn-primary" style="height:42px;font-size:14.5px;font-weight:550;border-radius:12px;margin-top:16px;" data-act="submit-rating">Submit rating</button>'
    );
  }
  function renderDoctorProfile(id) {
    var d = DOCTOR_PROFILES[id], pane = panes.doctor;
    if (!d || !pane) return;
    var av = $('[data-doc-av]', pane);
    av.innerHTML = '<img src="' + d.photo + '" alt="' + d.n + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />';
    $('[data-doc-name]', pane).textContent = d.n;
    $('[data-doc-spec]', pane).textContent = d.spec;
    $('[data-doc-clinic]', pane).textContent = d.clinic;
    var rEl = $('[data-doc-rating]', pane);
    if (rEl) rEl.innerHTML = '<span style="color:#F5A623;">★</span> ' + d.rating + ' <span style="color:var(--muted);text-decoration:underline;">(' + d.reviews + ' reviews)</span>';
    $('[data-doc-bio]', pane).textContent = d.bio;
    $('[data-doc-since]', pane).textContent = d.since;
    $('[data-doc-visits]', pane).innerHTML = d.visits.length ? d.visits.map(function (v, i) {
      var ratings = docRatingsLoad();
      var key = id + ':' + i;
      var rated = ratings[key];
      var trailing = rated
        ? '<span style="color:#F5A623;font-size:12.5px;font-weight:500;flex-shrink:0;">' + '★'.repeat(rated.rating) + '</span>'
        : '<button class="doc-view-btn" data-rate-visit="' + i + '" data-rate-label="' + v[1].replace(/"/g, '&quot;') + ' · ' + v[0] + '" style="flex-shrink:0;">Rate visit</button>';
      return '<div class="med-row"><div style="flex:1;min-width:0;">' +
        '<div class="med-n">' + v[1] + '</div><div class="med-s">' + v[0] + '</div></div>' +
        trailing + '</div>';
    }).join('') : '<div class="med-row"><div class="med-s2">No past appointments yet.</div></div>';
    pane.dataset.docId = id;
  }

  var medDetailRow = null;
  function medLogLoad() { try { return JSON.parse(localStorage.getItem('nfh-med-log') || '[]'); } catch (e) { return []; } }
  function medLogSave(arr) { try { localStorage.setItem('nfh-med-log', JSON.stringify(arr)); } catch (e) {} }
  function medLogAdd(entry) {
    var log = medLogLoad();
    entry.at = new Date().toISOString();
    log.unshift(entry);
    medLogSave(log);
    renderMedTimeline();
  }
  var MED_LOG_META = {
    stopped: { label: 'Stopped taking', ic: 'i-x', bg: '#FEF2F2', color: '#DC2626' },
    continuing: { label: 'Confirmed still taking', ic: 'i-check', bg: 'var(--tint)', color: 'var(--brand)' },
    'side-effect': { label: 'Reported side effect', ic: 'i-warn', bg: '#FFF7ED', color: '#C2410C' },
    refill: { label: 'Requested refill', ic: 'i-pill', bg: '#EFF6FF', color: '#1D4ED8' }
  };
  function medTimelineDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function renderMedTimeline() {
    var pane = panes.medications; if (!pane) return;
    var list = $('[data-med-timeline-list]', pane), empty = $('[data-med-timeline-empty]', pane);
    var log = medLogLoad();
    if (!log.length) { list.innerHTML = ''; if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    list.innerHTML = log.map(function (e) {
      var meta = MED_LOG_META[e.kind] || MED_LOG_META.continuing;
      return '<div class="med-row"><span class="med-status-ic" style="background:' + meta.bg + ';color:' + meta.color + ';width:34px;height:34px;"><svg class="ic16"><use href="#' + meta.ic + '"/></svg></span>' +
        '<div style="flex:1;min-width:0;"><div class="med-n">' + meta.label + ' · ' + e.name + '</div>' +
        '<div class="med-s">' + (e.detail || '') + '</div>' +
        '<div class="med-s2">' + medTimelineDate(e.at) + '</div></div></div>';
    }).join('');
  }
  function openMedFollowup(kind) {
    var row = medDetailRow, name = row ? row.dataset.medName : 'this medication', doc = row ? row.dataset.medDoc : 'your doctor';
    var body = '';
    if (kind === 'stopped') {
      body =
        '<label class="flabel">Why did you stop?</label>' +
        '<select class="field" id="mf-reason"><option value="">Select a reason</option>' +
        '<option>Doctor advised stopping</option><option>Side effects</option><option>Feeling better</option><option>Forgot / missed doses</option><option>Cost</option><option value="Other">Other</option></select>' +
        '<textarea class="field" id="mf-note" rows="2" placeholder="Anything else to add? (optional)" style="margin-top:10px;"></textarea>';
    } else if (kind === 'side-effect') {
      body =
        '<label class="flabel">What are you experiencing?</label>' +
        '<select class="field" id="mf-symptom"><option value="">Select a symptom</option>' +
        '<option>Nausea</option><option>Dizziness</option><option>Rash</option><option>Fatigue</option><option>Headache</option><option value="Other">Other</option></select>' +
        '<label class="flabel" style="margin-top:12px;">How severe is it?</label>' +
        '<div class="ochips" id="mf-severity"><button class="ochip" data-mf-sev="Mild">Mild</button><button class="ochip" data-mf-sev="Moderate">Moderate</button><button class="ochip" data-mf-sev="Severe">Severe</button></div>' +
        '<textarea class="field" id="mf-note" rows="2" placeholder="Describe what you\u2019re noticing" style="margin-top:12px;"></textarea>';
    } else if (kind === 'refill') {
      body =
        '<label class="flabel">How many doses do you have left?</label>' +
        '<select class="field" id="mf-supply"><option value="">Select</option><option>None left</option><option>1\u20132 days</option><option>3\u20135 days</option><option>About a week</option></select>' +
        '<label class="flabel" style="margin-top:12px;">Preferred pickup</label>' +
        '<div class="ochips" id="mf-pickup"><button class="ochip" data-mf-pickup="Pharmacy pickup">Pharmacy pickup</button><button class="ochip" data-mf-pickup="Home delivery">Home delivery</button></div>';
    }
    openSheet(
      '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">' +
      (kind === 'stopped' ? 'Stop ' + name : kind === 'side-effect' ? 'Side effect · ' + name : 'Refill · ' + name) + '</div>' +
      '<div class="meta" style="margin-top:3px;">' + (kind === 'side-effect' ? 'This will be sent to ' + doc : 'This will be sent to the clinic') + '</div></div>' +
      '<div style="padding:14px 4px 4px;">' + body + '</div>' +
      '<button class="btn btn-primary" style="height:42px;font-size:14.5px;font-weight:550;border-radius:12px;margin-top:18px;" data-act="save-med-followup" data-mf-kind="' + kind + '">Submit</button>'
    );
  }

  function saveManualEdit(kind) {
    var row = medDetailRow; if (!row) return;
    var a = ($('#man-a') && $('#man-a').value.trim()) || '';
    var b = ($('#man-b') && $('#man-b').value.trim()) || '';
    var c = ($('#man-c') && $('#man-c').value.trim()) || '';
    if (!a) { toast('Add a name first'); return; }
    var fallbackB = kind === 'med' ? 'Schedule not set' : 'Date not set';
    row.setAttribute('data-med-name', a);
    row.setAttribute('data-med-dose', b || fallbackB);
    row.setAttribute('data-med-doc', c || 'Self-reported');
    var tag = '<span style="display:inline-flex;align-items:center;gap:4px;margin-left:7px;padding:2px 7px;border-radius:9px;background:#FEF3E2;color:#B45309;font-size:9.5px;font-weight:700;letter-spacing:.02em;vertical-align:1px;">UNVERIFIED</span>';
    var n = row.querySelector('.med-n'), s1 = row.querySelector('.med-s'), s2 = row.querySelector('.med-s2');
    if (n) n.innerHTML = a + tag;
    if (s1) s1.textContent = b || fallbackB;
    if (s2) s2.textContent = 'Mateo' + (c ? ' · ' + c : ' · Self-reported');
    closeOverlay();
    medDetailRow = null;
    toast('Updated', true);
  }

  function openManualDetailSheet(row, name, dose, who) {
    var isMed = row.dataset.manual === 'med';
    medDetailRow = row;
    openSheet(
      '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">' + name +
      '<span style="display:inline-flex;align-items:center;margin-left:8px;padding:2px 7px;border-radius:9px;background:#FEF3E2;color:#B45309;font-size:9.5px;font-weight:700;letter-spacing:.02em;vertical-align:2px;">UNVERIFIED</span></div>' +
      '<div class="meta" style="margin-top:3px;">' + dose + '</div>' +
      '<div class="meta" style="margin-top:1px;">' + who + '</div></div>' +
      '<div class="au-hint" style="margin-top:6px;text-align:left;">You added this ' + (isMed ? 'medication' : 'record') +
      ' yourself. A clinic can confirm it at your next visit.</div>' +
      '<div class="med-status-opts" style="margin-top:14px;">' +
      '<button class="med-status-opt" data-act="manual-edit"><span class="med-status-ic" style="background:var(--tint);color:var(--brand);"><svg class="ic18"><use href="#i-pencil"/></svg></span>' +
      '<div><div class="rem-t">Edit details</div><div class="rem-s">Update the name, ' + (isMed ? 'schedule or prescriber' : 'date or hospital') + '</div></div></button>' +
      '<button class="med-status-opt" data-act="manual-remove"><span class="med-status-ic" style="background:#FEF2F2;color:#DC2626;"><svg class="ic18"><use href="#i-x"/></svg></span>' +
      '<div><div class="rem-t">Remove</div><div class="rem-s">Deletes it from your record</div></div></button>' +
      '</div>'
    );
  }
  function openMedDetailSheet(row) {
    medDetailRow = row;
    var name = row.dataset.medName, dose = row.dataset.medDose, doc = row.dataset.medDoc;
    var who = (row.querySelector('.med-s2') || {}).textContent || '';
    if (row.dataset.manual) { openManualDetailSheet(row, name, dose, who); return; }
    openSheet(
      '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">' + name + '</div>' +
      '<div class="meta" style="margin-top:3px;">' + dose + '</div>' +
      '<div class="meta" style="margin-top:1px;">' + who + '</div></div>' +

      '<div class="rem-label">How are you doing with this?</div>' +
      '<div class="med-status-opts">' +
      '<button class="med-status-opt" data-med-status="continuing"><span class="med-status-ic" style="background:var(--tint);color:var(--brand);"><svg class="ic18"><use href="#i-check"/></svg></span>' +
      '<div><div class="rem-t">Still taking it</div><div class="rem-s">Keep reminders as they are</div></div></button>' +
      '<button class="med-status-opt" data-med-status="stopped"><span class="med-status-ic" style="background:#FEF2F2;color:#DC2626;"><svg class="ic18"><use href="#i-x"/></svg></span>' +
      '<div><div class="rem-t">I\u2019ve stopped taking it</div><div class="rem-s">Moves this to History</div></div></button>' +
      '<button class="med-status-opt" data-med-status="side-effect"><span class="med-status-ic" style="background:#FFF7ED;color:#C2410C;"><svg class="ic18"><use href="#i-warn"/></svg></span>' +
      '<div><div class="rem-t">Having side effects</div><div class="rem-s">Message ' + doc + ' about it</div></div></button>' +
      '<button class="med-status-opt" data-med-status="refill"><span class="med-status-ic" style="background:#EFF6FF;color:#1D4ED8;"><svg class="ic18"><use href="#i-pill"/></svg></span>' +
      '<div><div class="rem-t">Need a refill</div><div class="rem-s">Request more from the clinic</div></div></button>' +
      '</div>' +

      '<div class="rem-row" style="margin-top:4px;"><div style="flex:1;"><div class="rem-t">Reminders</div><div class="rem-s">Get notified at dose time</div></div>' +
      '<button class="rem-switch on" data-rem-toggle-med><span></span></button></div>'
    );
  }

  function openReminderSheet(bell) {
    reminderBell = bell;
    var row = bell.closest('.med-row');
    var name = row ? (row.querySelector('.med-n') || {}).textContent || 'this medication' : 'this medication';
    var sched = row ? ((row.querySelector('.med-s') || {}).textContent || '') : '';
    var on = bell.classList.contains('on');
    var times = (sched.match(/\d{1,2}:\d{2}\s?[AP]M/g) || ['9:00 AM']);
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('nfh-reminders') || '{}')[name] || {}; } catch (e) {}
    var curSound = saved.sound || 'Chime';

    openSheet(
      '<div style="padding:2px 2px 6px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Reminders</div>' +
      '<div class="meta" style="margin-top:3px;">' + name + '</div></div>' +

      '<div class="rem-row"><div style="flex:1;"><div class="rem-t">Remind me</div><div class="rem-s">Get a notification at each dose time</div></div>' +
      '<button class="rem-switch' + (on ? ' on' : '') + '" data-rem-toggle><span></span></button></div>' +

      '<div data-rem-body style="' + (on ? '' : 'opacity:.4;pointer-events:none;') + '">' +
      '<div class="rem-label">Time</div>' +
      '<div class="rem-times">' +
      times.map(function (t, i) {
        var v = to24(t), h = +v.split(':')[0], mm = v.split(':')[1];
        var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
        return '<div class="rem-time" data-rem-time>' +
          '<input class="rem-input rem-hm" value="' + h + ':' + mm + '" inputmode="numeric" />' +
          '<div class="rem-ap">' +
          '<button class="rem-ap-b' + (ap === 'AM' ? ' on' : '') + '" data-rem-ap="AM">AM</button>' +
          '<button class="rem-ap-b' + (ap === 'PM' ? ' on' : '') + '" data-rem-ap="PM">PM</button>' +
          '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="rem-label" style="margin-top:16px;">Sound</div>' +
      '<div class="rem-sounds">' +
      REM_SOUNDS.map(function (s) {
        return '<button class="rem-sound' + (s === curSound ? ' on' : '') + '" data-rem-sound="' + s + '">' + s + '</button>';
      }).join('') +
      '</div></div>' +

      '<button class="btn btn-primary" style="height:42px;font-size:14.5px;font-weight:550;border-radius:12px;margin-top:18px;" data-act="save-reminder">Save</button>'
    );
  }
  function to24(t) {
    var m = t.match(/(\d{1,2}):(\d{2})\s?([AP])M/i); if (!m) return '09:00';
    var h = +m[1] % 12; if (m[3].toUpperCase() === 'P') h += 12;
    return String(h).padStart(2, '0') + ':' + m[2];
  }
  function to12(v) {
    var p = v.split(':'), h = +p[0], ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + p[1] + ' ' + ap;
  }

  function openCancelSheet() {
    openSheet(
      '<div style="padding:2px 4px 4px;"><div style="font-size:17px;font-weight:700;">Cancel appointment</div>' +
      '<div class="meta" style="margin-top:2px;">Let the clinic know why — this helps them offer your slot to someone else.</div></div>' +
      '<div style="padding:14px 4px 4px;">' +
      '<label class="flabel">Reason</label>' +
      '<select class="field" id="cancel-reason" style="appearance:none;">' +
      '<option value="">Select a reason</option>' +
      '<option>Schedule conflict</option>' +
      '<option>Feeling better, no longer needed</option>' +
      '<option>Found another provider</option>' +
      '<option>Cost / insurance issue</option>' +
      '<option value="Other">Other</option>' +
      '</select>' +
      '<textarea class="field" id="cancel-reason-other" rows="2" placeholder="Tell us more" style="margin-top:10px;display:none;"></textarea>' +
      '</div>' +
      '<div class="sheet-cta" style="padding:16px 4px 4px;display:flex;flex-direction:column;gap:8px;">' +
      '<button class="btn btn-danger-ghost" style="height:42px;font-size:14.5px;font-weight:550;border-radius:12px;" data-act="confirm-cancel" id="confirm-cancel-btn" disabled>Confirm cancellation</button>' +
      '<button class="btn btn-ghost" style="height:38px;font-size:14px;font-weight:500;border-radius:12px;" data-close>Keep appointment</button>' +
      '</div>'
    );
  }
  document.addEventListener('change', function (e) {
    if (e.target.id === 'cancel-reason') {
      var other = $('#cancel-reason-other');
      var btn = $('#confirm-cancel-btn');
      var isOther = e.target.value === 'Other';
      if (other) other.style.display = isOther ? 'block' : 'none';
      if (btn) btn.disabled = isOther ? !(other && other.value.trim()) : !e.target.value;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'cancel-reason-other') {
      var btn = $('#confirm-cancel-btn');
      var sel = $('#cancel-reason');
      if (btn && sel) btn.disabled = sel.value === 'Other' && !e.target.value.trim();
    }
  });

  var FRONTDESK_THREADS = {
    f1: { clinic: 'Hospital Ángeles', color: 'var(--m-anant)', initials: 'HA', staffName: 'Front Desk',
      msgs: [
        { from: 'in', who: 'staff', name: 'Lucía Ramos', text: 'Hello! This is the front desk at Hospital Ángeles. How can we help today?', date: '2026-06-09', time: '10:00 AM' },
        { from: 'out', text: 'Hi, I need to reschedule Anant\u2019s appointment on 14 June.', date: '2026-06-09', time: '10:05 AM' },
        { from: 'in', who: 'staff', name: 'Lucía Ramos', text: 'Sure — we have an opening on 16 June at 11:00 AM with Dr. Morales. Would that work?', date: '2026-06-09', time: '10:08 AM' },
        { from: 'out', text: 'Yes, that works, thank you!', date: '2026-06-09', time: '10:10 AM' },
        { from: 'in', who: 'staff', name: 'Lucía Ramos', text: 'Done — you\u2019re confirmed for 16 June at 11:00 AM.', date: '2026-06-09', time: '10:11 AM' }
      ] },
    f2: { clinic: 'Hospital Español', color: 'var(--m-priya)', initials: 'HE', staffName: 'Front Desk',
      msgs: [
        { from: 'in', who: 'staff', name: 'Diego Nava', text: 'Hi, this is Hospital Español reception. We noticed Priya\u2019s insurance card on file expires this month.', date: '2026-06-01', time: '3:20 PM' },
        { from: 'out', text: 'Thanks for the heads up, I\u2019ll upload the new one.', date: '2026-06-01', time: '4:00 PM' },
        { from: 'in', who: 'staff', name: 'Diego Nava', text: 'Perfect, no rush — just needed before her next visit.', date: '2026-06-01', time: '4:02 PM' }
      ] },
    f3: { clinic: 'Clínica Roma', color: 'var(--m-aryan)', initials: 'CR', staffName: 'Front Desk',
      msgs: [
        { from: 'in', who: 'staff', name: 'Renata Ibarra', text: 'Hi, this is Clínica Roma. Can you confirm Aryan\u2019s appointment on 12 July at 10:00 AM?', date: '2026-07-08', time: '1:10 PM' },
        { from: 'out', text: 'Confirmed, we\u2019ll be there.', date: '2026-07-08', time: '1:30 PM' },
        { from: 'in', who: 'staff', name: 'Renata Ibarra', text: 'Great, see you then. Please arrive 10 minutes early for check-in.', date: '2026-07-08', time: '1:31 PM' }
      ] }
  };
  var chatCat = 'frontdesk';
  /* ---------- chat widget ---------- */
  var STAFF = {
    c1: { doctor: { name: 'Dr. Ricardo Morales', role: 'doctor', initials: 'RM' }, nurse: { name: 'Sofía Delgado', role: 'nurse', initials: 'SD' } },
    c2: { doctor: { name: 'Dr. Ariel Castillo', role: 'doctor', initials: 'AC' }, nurse: { name: 'Paola Jiménez', role: 'nurse', initials: 'PJ' } },
    c3: { doctor: { name: 'Dr. Ariel Castillo', role: 'doctor', initials: 'AC' }, nurse: { name: 'Marco Fuentes', role: 'nurse', initials: 'MF' } }
  };
  var CHAT_THREADS = {
    c1: { doc: 'Dr. Ricardo Morales', clinic: 'Hospital Ángeles', color: 'var(--m-anant)', initials: 'RM',
      msgs: [
        { from: 'in', who: 'doctor', text: 'Good morning — your lab results from last week look great. TSH is back in range.', date: '2026-05-18', time: '9:12 AM' },
        { from: 'out', text: 'That\u2019s a relief to hear, thank you!', date: '2026-05-18', time: '9:40 AM' },
        { from: 'in', who: 'doctor', text: 'Keep taking the Levotiroxina as prescribed. See you at the follow-up.', date: '2026-05-18', time: '9:41 AM' },
        { from: 'in', who: 'nurse', text: 'Hi Anant, just confirming your appointment on 14 June at 10:30 AM with Dr. Morales.', date: '2026-06-10', time: '11:20 AM' },
        { from: 'out', text: 'Yes, confirmed. See you then.', date: '2026-06-10', time: '11:32 AM' },
        { from: 'in', who: 'nurse', text: 'Great. Please fast for 8 hours before your blood draw that morning.', date: '2026-06-12', time: '4:05 PM' },
        { from: 'out', text: 'Got it, thank you!', date: '2026-06-12', time: '4:10 PM' }
      ] },
    c2: { doc: 'Dr. Ariel Castillo', clinic: 'Hospital Ángeles', color: 'var(--m-aryan)', initials: 'AC',
      msgs: [
        { from: 'in', who: 'doctor', text: 'Hi! Just checking in after the visit — how has Aryan\u2019s appetite been?', date: '2026-04-05', time: '4:02 PM' },
        { from: 'out', text: 'Much better, back to normal since Tuesday.', date: '2026-04-05', time: '6:15 PM' },
        { from: 'in', who: 'doctor', text: 'Great to hear. No need to come back unless symptoms return.', date: '2026-04-05', time: '6:20 PM' },
        { from: 'in', who: 'nurse', text: 'Reminder: please bring the vaccination record to the next visit.', date: '2026-06-25', time: '10:05 AM' },
        { from: 'out', text: 'Will do, thank you for the reminder!', date: '2026-06-26', time: '8:45 AM' },
        { from: 'in', who: 'nurse', text: 'Also, if Aryan has any fever before the appointment, please call us to reschedule.', date: '2026-06-27', time: '2:15 PM' }
      ] },
    c3: { doc: 'Dr. Ariel Castillo', clinic: 'Hospital Español', color: 'var(--m-priya)', initials: 'AC',
      msgs: [
        { from: 'in', who: 'doctor', text: 'Hello Priya, how are you feeling since starting the new dosage?', date: '2026-05-10', time: '2:30 PM' },
        { from: 'out', text: 'A lot better, fewer headaches this week.', date: '2026-05-10', time: '3:00 PM' },
        { from: 'in', who: 'doctor', text: 'Good. Let\u2019s reassess at your next appointment.', date: '2026-05-10', time: '3:04 PM' },
        { from: 'in', who: 'nurse', text: 'Hi Priya, your appointment with Dr. Castillo on 20 June is confirmed for 4:00 PM.', date: '2026-06-05', time: '9:15 AM' },
        { from: 'out', text: 'Perfect, thank you.', date: '2026-06-05', time: '9:20 AM' }
      ] }
  };
  var chatActive = null, chatReplyTo = null, chatSearchIdx = -1, chatSearchMatches = [];
  function chatLast(t) { return t.msgs[t.msgs.length - 1]; }
  function chatDayLabel(d) {
    var dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function chatWho(threadId, msg) {
    if (msg.from === 'out') return null;
    if (msg.who === 'staff') return { name: msg.name, role: 'staff' };
    return STAFF[threadId][msg.who] || STAFF[threadId].doctor;
  }
  function renderChatList() {
    var list = $('#chat-thread-list');
    if (!list) return;
    if (chatCat === 'frontdesk') {
      list.innerHTML = '<div class="chat-cat-hint">One chat per clinic\u2019s front desk — appointments, rescheduling, and paperwork.</div>' +
        Object.keys(FRONTDESK_THREADS).map(function (id) {
          var t = FRONTDESK_THREADS[id], last = t.msgs[t.msgs.length - 1];
          return '<button class="chat-thread tap" data-chat-thread="fd:' + id + '">' +
            '<div class="chat-avatar" style="background:' + t.color + '">' + t.initials + '</div>' +
            '<div class="chat-thread-body">' +
              '<div class="chat-thread-top"><span class="chat-thread-name">' + t.clinic + '</span><span class="chat-thread-time">' + last.date.slice(5) + '</span></div>' +
              '<div class="chat-thread-clinic">Front desk</div>' +
              '<div class="chat-thread-bottom"><span class="chat-thread-preview">' + (last.attachment ? '📎 ' + last.attachment.name : last.text) + '</span></div>' +
            '</div></button>';
        }).join('');
    } else {
      list.innerHTML = '<div class="chat-cat-hint">Message the doctors and nurses treating you about your care.</div>' +
        Object.keys(CHAT_THREADS).map(function (id) {
          var t = CHAT_THREADS[id], last = chatLast(t);
          return '<button class="chat-thread tap" data-chat-thread="ct:' + id + '">' +
            '<div class="chat-avatar" style="background:' + t.color + '">' + t.initials + '</div>' +
            '<div class="chat-thread-body">' +
              '<div class="chat-thread-top"><span class="chat-thread-name">' + t.doc + '</span><span class="chat-thread-time">' + last.date.slice(5) + '</span></div>' +
              '<div class="chat-thread-clinic">' + t.clinic + '</div>' +
              '<div class="chat-thread-bottom"><span class="chat-thread-preview">' + (last.attachment ? '📎 ' + last.attachment.name : last.text) + '</span></div>' +
            '</div></button>';
        }).join('');
    }
  }
  function chatBubbleHtml(t, threadId, m, idx) {
    var who = chatWho(threadId, m);
    var senderHtml = who ? '<div class="chat-sender role-' + who.role + '" style="color:' + t.color + '">' + who.name + ' · ' + (who.role === 'doctor' ? 'Doctor' : 'Nurse') + '</div>' : '';
    var quoteHtml = '';
    if (m.replyTo) quoteHtml = '<div class="chat-bubble-quote"><span class="chat-bubble-quote-who">' + m.replyTo.who + '</span><br>' + m.replyTo.text + '</div>';
    var bodyHtml;
    if (m.attachment) {
      bodyHtml = '<div class="chat-attach-file"><span class="chat-attach-file-ic"><svg class="ic16"><use href="#' + (m.attachment.type === 'photo' ? 'i-cam' : 'i-doc') + '"/></svg></span><span>' + m.attachment.name + '</span></div>';
    } else {
      bodyHtml = '<span class="chat-msg-text">' + m.text + '</span>';
    }
    var replyBtn = '<button class="chat-bubble-reply-btn" data-chat-reply-msg="' + idx + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10 4 15l5 5"/><path d="M4 15h11a5 5 0 0 0 5-5V5"/></svg></button>';
    var foot = '<div class="chat-bubble-foot">' + replyBtn + '<span class="chat-bubble-time">' + m.time + '</span></div>';
    return senderHtml + '<div class="chat-bubble ' + m.from + '">' + quoteHtml + bodyHtml + foot + '</div>';
  }
  function chatResolve(activeId) {
    if (!activeId) return null;
    var i = activeId.indexOf(':'), kind = activeId.slice(0, i), key = activeId.slice(i + 1);
    var store = kind === 'fd' ? FRONTDESK_THREADS : CHAT_THREADS;
    return { kind: kind, key: key, store: store, t: store[key] };
  }
  function renderChatConvo(fullId) {
    var r = chatResolve(fullId); if (!r || !r.t) return;
    var t = r.t;
    chatActive = fullId; chatReplyTo = null;
    $('#chat-reply-preview').hidden = true;
    $('#chat-search-bar').hidden = true;
    $('#chat-attach-menu').hidden = true;
    $('#chat-convo-avatar').style.background = t.color;
    $('#chat-convo-avatar').textContent = t.initials;
    if (r.kind === 'fd') {
      $('#chat-convo-name').textContent = t.clinic;
      $('#chat-convo-clinic').textContent = 'Front desk';
    } else {
      $('#chat-convo-name').textContent = t.doc + ' & team';
      $('#chat-convo-clinic').textContent = t.clinic;
    }
    var box = $('#chat-convo-msgs');
    var html = '', lastDay = null;
    t.msgs.forEach(function (m, idx) {
      if (m.date !== lastDay) { html += '<div class="chat-day">' + chatDayLabel(m.date) + '</div>'; lastDay = m.date; }
      html += chatBubbleHtml(t, r.key, m, idx);
    });
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }
  function openChatWidget() {
    renderChatList();
    $('#chat-view-convo').hidden = true;
    $('#chat-view-list').hidden = false;
    $('#chat-overlay').classList.add('show');
  }
  function closeChatWidget() { $('#chat-overlay').classList.remove('show'); chatActive = null; }
  function chatSend() {
    var inp = $('#chat-input'); if (!inp || !chatActive) return;
    var r = chatResolve(chatActive); if (!r || !r.t) return;
    var val = inp.value.trim(); if (!val) return;
    var msg = { from: 'out', text: val, date: r.t.msgs[r.t.msgs.length - 1].date, time: 'Just now' };
    if (chatReplyTo) msg.replyTo = chatReplyTo;
    r.t.msgs.push(msg);
    inp.value = ''; chatReplyTo = null; $('#chat-reply-preview').hidden = true;
    renderChatConvo(chatActive);
  }
  function chatStartReply(idx) {
    var r = chatResolve(chatActive); if (!r || !r.t) return;
    var m = r.t.msgs[idx]; if (!m) return;
    var who = chatWho(r.key, m);
    chatReplyTo = { who: who ? who.name : 'You', text: m.attachment ? '📎 ' + m.attachment.name : m.text };
    $('#chat-reply-who').textContent = chatReplyTo.who;
    $('#chat-reply-text').textContent = chatReplyTo.text;
    $('#chat-reply-preview').hidden = false;
    $('#chat-input').focus();
  }
  function chatAttach(kind) {
    var r = chatResolve(chatActive); if (!r || !r.t) return;
    var name = kind === 'photo' ? 'IMG_' + Math.floor(1000 + Math.random() * 9000) + '.jpg' : 'Document_' + Math.floor(100 + Math.random() * 900) + '.pdf';
    r.t.msgs.push({ from: 'out', attachment: { type: kind, name: name }, date: r.t.msgs[r.t.msgs.length - 1].date, time: 'Just now' });
    $('#chat-attach-menu').hidden = true;
    renderChatConvo(chatActive);
  }
  function chatSearchRun(q) {
    var box = $('#chat-convo-msgs');
    $all('.chat-msg-text', box).forEach(function (el) { el.innerHTML = el.textContent; });
    chatSearchMatches = []; chatSearchIdx = -1;
    if (!q) { $('#chat-search-count').textContent = ''; return; }
    var re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    $all('.chat-msg-text', box).forEach(function (el) {
      if (re.test(el.textContent)) {
        el.innerHTML = el.textContent.replace(re, function (m) { return '<mark class="chat-hl">' + m + '</mark>'; });
        chatSearchMatches.push(el);
      }
    });
    $('#chat-search-count').textContent = chatSearchMatches.length ? ('1/' + chatSearchMatches.length) : 'No results';
    if (chatSearchMatches.length) chatSearchGo(0);
  }
  function chatSearchGo(dir) {
    if (!chatSearchMatches.length) return;
    var marks = $all('mark.chat-hl', $('#chat-convo-msgs'));
    marks.forEach(function (m) { m.classList.remove('active'); });
    if (typeof dir === 'number' && dir !== 1 && dir !== -1) chatSearchIdx = dir;
    else chatSearchIdx = (chatSearchIdx + dir + chatSearchMatches.length) % chatSearchMatches.length;
    var el = chatSearchMatches[chatSearchIdx];
    var mark = el.querySelector('mark.chat-hl') || el.querySelectorAll('mark.chat-hl')[0];
    var allMarksInEl = el.querySelectorAll('mark.chat-hl');
    if (allMarksInEl[0]) allMarksInEl[0].classList.add('active');
    el.scrollIntoView({ block: 'center' });
    $('#chat-search-count').textContent = (chatSearchIdx + 1) + '/' + chatSearchMatches.length;
  }

  /* ---------- Care Connect ---------- */
  var ccClinic = 'Hospital Español', ccPhoto = 'assets/clinic-espanol.png';
  function ccInitials(n) { return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function ccSyncHeaders() {
    $all('[data-cc-name]').forEach(function (e) { e.textContent = ccClinic; });
    $all('[data-cc-av]').forEach(function (e) { e.innerHTML = '<img src="' + ccPhoto + '" alt="">'; });
  }
  function ccBuildWave() {
    var w = $('[data-cc-wave]'); if (!w || w.children.length) return;
    var h = '';
    for (var i = 0; i < 17; i++) h += '<i style="animation-delay:' + (i * 0.07).toFixed(2) + 's"></i>';
    w.innerHTML = h;
  }
  var CC_KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function ccBuildKeys() {
    var k = $('[data-cc-keys]'); if (!k || k.children.length) return;
    var h = '';
    h += '<div class="cc-kb-row">' + CC_KEYS[0].split('').map(function (c) { return '<div class="cc-kb-k" data-cc-key="' + c + '">' + c + '</div>'; }).join('') + '</div>';
    h += '<div class="cc-kb-row" style="padding:0 14px;">' + CC_KEYS[1].split('').map(function (c) { return '<div class="cc-kb-k" data-cc-key="' + c + '">' + c + '</div>'; }).join('') + '</div>';
    h += '<div class="cc-kb-row"><div class="cc-kb-k wide">⇧</div>' +
      CC_KEYS[2].split('').map(function (c) { return '<div class="cc-kb-k" data-cc-key="' + c + '">' + c + '</div>'; }).join('') +
      '<div class="cc-kb-k wide" data-cc-key="&#9003;">⌫</div></div>';
    h += '<div class="cc-kb-row"><div class="cc-kb-k wide" style="max-width:40px;font-size:12.5px;font-weight:600;">123</div>' +
      '<div class="cc-kb-k space" data-cc-key=" "></div><div class="cc-kb-k ret" data-cc-key="&#9166;">return</div></div>';
    k.innerHTML = h;
  }

  /* --- timers --- */
  var ccTimers = [];
  function ccT(id) { ccTimers.push(id); return id; }
  function ccClearTimers() { ccTimers.forEach(clearTimeout); ccTimers = []; }

  /* --- connecting transition --- */
  var CC_STEPS = ['Secure line established', 'Verifying your records', 'Narzim is ready'];
  function ccRunConnect() {
    ccClearTimers();
    var box = $('[data-cc-conn]'); if (!box) return;
    box.innerHTML =
      '<div class="cc-conn-orb"><span class="ring"></span><span class="ring"></span><span class="ring"></span>' +
      '<span class="cc-conn-ph"><img src="' + ccPhoto + '" alt=""></span></div>' +
      '<div class="cc-conn-t">Connecting to<br>' + ccClinic + '</div>' +
      '<div class="cc-conn-s">Narzim is opening a secure line to<br>the front desk team.</div>' +
      '<div class="cc-conn-steps">' + CC_STEPS.map(function (s) {
        return '<div class="cc-conn-step"><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5"/></svg></span>' + s + '</div>';
      }).join('') + '</div>';
    var steps = $all('.cc-conn-step', box);
    steps.forEach(function (el, i) { ccT(setTimeout(function () { el.classList.add('on'); }, 420 + i * 440)); });
    ccT(setTimeout(ccShowPermission, 420 + steps.length * 440 + 340));
  }
  function ccShowPermission() {
    var box = $('[data-cc-conn]'); if (!box) return;
    if (ccMicGranted) { show('cc-voice'); return; }
    box.innerHTML =
      '<div class="cc-perm">' +
      '<div class="cc-perm-ic"><svg class="ic24"><use href="#i-mic"/></svg></div>' +
      '<div class="cc-perm-t">Let Narzim listen?</div>' +
      '<div class="cc-perm-s">Speak naturally and Narzim will handle the request with ' + ccClinic + '. Audio is never stored.</div>' +
      '<div class="cc-perm-btns">' +
      '<button class="cc-perm-btn pri" data-act="cc-mic-allow">Allow Microphone</button>' +
      '<button class="cc-perm-btn sec" data-act="cc-mic-deny">I\u2019ll type instead</button>' +
      '</div></div>';
  }

  /* --- voice: live transcription --- */
  var ccMicGranted = false, ccListening = false;
  var CC_PHRASE = 'I want to reschedule my appointment with Dr. Reyes for next week.';
  function ccStartListening() {
    var wrap = $('[data-cc-voice]'); if (!wrap || ccListening) return;
    ccClearTimers(); ccListening = true;
    ccBuildWave();
    wrap.classList.add('listening');
    var mic = $('.cc-mic', wrap); if (mic) mic.classList.add('rec');
    var label = $('[data-cc-listen-label]'); if (label) label.textContent = 'Listening…';
    var live = $('[data-cc-live]'); live.innerHTML = '';
    var words = CC_PHRASE.split(' '), n = 0;
    (function tick() {
      if (!ccListening) return;
      if (n >= words.length) { ccFinishListening(); return; }
      live.innerHTML = words.slice(0, n + 1).map(function (w, i) {
        return '<span class="w" style="animation-delay:' + (i === n ? 0 : 0) + 's">' + w + '</span>';
      }).join(' ') + '<span class="caret"></span>';
      n++;
      ccT(setTimeout(tick, 165));
    })();
  }
  function ccFinishListening() {
    if (!ccListening) return;
    ccListening = false;
    var wrap = $('[data-cc-voice]');
    var mic = $('.cc-mic', wrap); if (mic) mic.classList.remove('rec');
    var label = $('[data-cc-listen-label]'); if (label) label.textContent = 'Transcribed';
    var live = $('[data-cc-live]');
    live.innerHTML = '<span class="w">' + CC_PHRASE + '</span>' +
      '<div><span class="cc-got"><svg class="ic16" style="stroke:currentColor"><use href="#i-check"/></svg>Got that</span></div>';
    ccT(setTimeout(function () { ccStartChat(CC_PHRASE); }, 900));
  }
  function ccResetVoice() {
    ccListening = false;
    var wrap = $('[data-cc-voice]'); if (!wrap) return;
    wrap.classList.remove('listening');
    var mic = $('.cc-mic', wrap); if (mic) mic.classList.remove('rec');
    var live = $('[data-cc-live]'); if (live) live.innerHTML = '';
    ccCloseKb();
  }

  /* --- voice: in-place keyboard --- */
  function ccOpenKb() {
    ccBuildKeys();
    var kb = $('[data-cc-kb]'); if (!kb) return;
    var ph = $('[data-cc-kb-input]'); if (ph) ph.setAttribute('data-ph', 'Message ' + ccClinic + '…');
    kb.classList.add('up');
  }
  function ccCloseKb() { var kb = $('[data-cc-kb]'); if (kb) kb.classList.remove('up'); }
  function ccKbText() { var el = $('[data-cc-kb-input]'); return el ? el.textContent.trim() : ''; }
  function ccKbSync() {
    var btn = $('[data-act="cc-kb-send"]');
    if (btn) btn.disabled = !ccKbText();
  }

  /* --- chat engine --- */
  var ccConvo = [];
  function ccItemHtml(s) {
    if (s.t === 'me') return '<div class="cc-row me"><div class="cc-bub me">' + s.text + '</div></div>';
    if (s.t === 'typing') return '<div class="cc-row"><span class="cc-bot-av"><img src="assets/narzim-mascot-peek.webp" alt=""></span><div class="cc-typing"><i></i><i></i><i></i></div></div>';
    if (s.t === 'bot') return '<div class="cc-row"><span class="cc-bot-av"><img src="assets/narzim-mascot-peek.webp" alt=""></span><div class="cc-bub bot">' + s.text + '</div></div>';
    if (s.t === 'card') return '<div class="cc-row"><span class="cc-bot-av" style="visibility:hidden"></span><div class="cc-card">' +
      '<div class="cc-card-hd"><span class="cc-card-ic"><svg class="ic18"><use href="#i-cal"/></svg></span>' +
      '<div><div class="cc-card-t">Dr. Valentina Reyes</div><div class="cc-card-s">General Physician</div></div></div>' +
      '<div class="cc-card-meta"><svg class="ic16" style="stroke:var(--muted)"><use href="#i-cal"/></svg>Thu, Sep 18, 2026 · 10:30 AM</div>' +
      '<div class="cc-card-meta"><svg class="ic16" style="stroke:var(--muted)"><use href="#i-pin"/></svg>' + ccClinic + '</div>' +
      '<div class="cc-card-q">Would you like to reschedule this appointment?</div>' +
      '<button class="cc-act pri" data-act="cc-yes">Yes, reschedule</button>' +
      '<button class="cc-act sec" data-act="cc-no">No, keep it</button></div></div>';
    if (s.t === 'slots') return '<div class="cc-row"><span class="cc-bot-av" style="visibility:hidden"></span><div class="cc-slots">' +
      '<button class="cc-slot" data-cc-slot="Mon, Sep 22 · 9:00 AM"><div class="cc-slot-d">Mon</div><div class="cc-slot-n">Sep 22</div><div class="cc-slot-t">9:00 AM</div></button>' +
      '<button class="cc-slot" data-cc-slot="Tue, Sep 23 · 11:00 AM"><div class="cc-slot-d">Tue</div><div class="cc-slot-n">Sep 23</div><div class="cc-slot-t">11:00 AM</div></button>' +
      '<button class="cc-slot" data-cc-slot="Wed, Sep 24 · 10:30 AM"><div class="cc-slot-d">Wed</div><div class="cc-slot-n">Sep 24</div><div class="cc-slot-t">10:30 AM</div></button>' +
      '</div></div>';
    if (s.t === 'done') return '<div class="cc-row"><span class="cc-bot-av" style="visibility:hidden"></span><div class="cc-done">' +
      '<div class="cc-done-ic"><svg class="ic22" style="stroke:currentColor"><use href="#i-check"/></svg></div>' +
      '<div class="cc-done-t">' + s.title + '</div><div class="cc-done-s">' + s.sub + '</div>' +
      '<div class="cc-done-ref">' + s.ref + '</div>' +
      '<button class="cc-act sec" data-go="cc-history" style="margin-top:12px;">View my requests</button></div></div>';
    return '';
  }
  function ccRenderConvo() {
    var box = $('[data-cc-msgs]'); if (!box) return;
    box.innerHTML = ccConvo.map(ccItemHtml).join('');
    box.scrollTop = box.scrollHeight;
  }
  function ccPlay(steps, i) {
    i = i || 0;
    if (i >= steps.length) return;
    var s = steps[i];
    if (s.typing) {
      ccConvo.push({ t: 'typing' }); ccRenderConvo();
      ccT(setTimeout(function () { ccConvo.pop(); ccPlay(steps, i + 1); }, s.typing));
      return;
    }
    ccConvo.push(s.item); ccRenderConvo();
    ccT(setTimeout(function () { ccPlay(steps, i + 1); }, s.after || 380));
  }
  var CC_INTENTS = {
    reschedule: [
      { typing: 950 },
      { item: { t: 'bot', text: 'Sure! I found your upcoming appointment with <b>Dr. Valentina Reyes</b> on <b>Thu, Sep 18 at 10:30 AM</b>.' } },
      { typing: 750 },
      { item: { t: 'card' } }
    ],
    refill: [
      { typing: 950 },
      { item: { t: 'bot', text: 'Let me check that for you — <b>Levotiroxina 75 mcg</b>, one tablet each morning.' } },
      { typing: 900 },
      { item: { t: 'bot', text: 'Your last refill was on <b>Aug 14</b> and Dr. Reyes left <b>2 refills</b> on the prescription, so no new approval is needed.' } },
      { typing: 700 },
      { item: { t: 'done', title: 'Refill sent to pharmacy', sub: 'Farmacia San Pablo · ready for pickup after 4:00 PM today. You\u2019ll get a notification when it\u2019s bagged.', ref: 'REFILL', ic: 'i-pill' } }
    ],
    labs: [
      { typing: 900 },
      { item: { t: 'bot', text: 'Yes — your <b>blood chemistry panel</b> from Sep 10 came back and Dr. Reyes has already reviewed it.' } },
      { typing: 850 },
      { item: { t: 'bot', text: 'Everything is within range. <b>TSH 2.3 mIU/L</b>, <b>glucose 98 mg/dL</b>, <b>hemoglobin 13.8 g/dL</b>. No action needed before your next visit.' } },
      { typing: 650 },
      { item: { t: 'done', title: 'Report added to your files', sub: 'Blood Chemistry · Laboratorio Azteca, Sep 10 2026. Find it under Health \u203a Reports.', ref: 'LABS', ic: 'i-doc' } }
    ],
    prep: [
      { typing: 900 },
      { item: { t: 'bot', text: 'For <b>Thu, Sep 18 at 10:30 AM</b> with Dr. Reyes, here\u2019s what the clinic asks you to bring and do.' } },
      { typing: 900 },
      { item: { t: 'bot', text: '\u2022 Fast for <b>8 hours</b> before the blood draw — water is fine.<br>\u2022 Bring your <b>insurance card</b> and photo ID.<br>\u2022 Bring the <b>medication list</b> you\u2019re currently taking.<br>\u2022 Arrive <b>10 minutes early</b> for check-in.' } },
      { typing: 650 },
      { item: { t: 'done', title: 'Instructions saved', sub: 'Added to your appointment so you can review them any time before the visit.', ref: 'PREP', ic: 'i-doc' } }
    ],
    fallback: [
      { typing: 950 },
      { item: { t: 'bot', text: 'Got it — I\u2019ve passed this to the front desk at <b>' + '' + '</b>.' } }
    ]
  };
  var CC_LOGS = {
    refill: ['Refill request \u00b7 Levotiroxina 75 mcg', 'i-pill'],
    labs: ['Copy of blood chemistry report', 'i-doc'],
    prep: ['Pre-visit instructions for Sep 18 visit', 'i-doc'],
    fallback: ['Message to front desk', 'i-chat']
  };
  function ccDetectIntent(text) {
    var s = (text || '').toLowerCase();
    if (/refill|medicat|levotirox|prescription|pharmac/.test(s)) return 'refill';
    if (/lab|result|report|blood|panel|test/.test(s)) return 'labs';
    if (/bring|prepare|before my|before the|instruction|fast|empty stomach/.test(s)) return 'prep';
    if (/reschedul|resched|move my|change my|appointment|cancel/.test(s)) return 'reschedule';
    return 'fallback';
  }
  function ccStartChat(text) {
    ccClearTimers();
    ccConvo = [{ t: 'me', text: text }];
    ccRenderConvo();
    ccResetVoice();
    show('cc-chat');
    var intent = ccDetectIntent(text);
    var steps = CC_INTENTS[intent].map(function (s) {
      if (!s.item || s.item.t !== 'done') return s;
      var cfg = CC_LOGS[intent] || CC_LOGS.fallback;
      return { item: { t: 'done', title: s.item.title, sub: s.item.sub, ref: 'Request ' + ccLogRequest(cfg[0], cfg[1]) } };
    });
    if (intent === 'fallback') {
      steps = [
        { typing: 950 },
        { item: { t: 'bot', text: 'Got it — I\u2019ve passed this to the front desk at <b>' + ccClinic + '</b>. Someone will reply here shortly, usually within a couple of hours.' } },
        { typing: 700 },
        { item: { t: 'done', title: 'Message sent', sub: 'The front desk team has your request and will respond in this conversation.', ref: 'Request ' + ccLogRequest(CC_LOGS.fallback[0], CC_LOGS.fallback[1]) } }
      ];
    }
    ccT(setTimeout(function () { ccPlay(steps); }, 480));
  }

  /* --- requests store --- */
  var CC_REQUESTS = [
    { title: 'Reschedule visit with Dr. Morales', clinic: 'Hospital Ángeles', when: 'Sep 12, 2026 · 4:20 PM', status: 'done', statusLabel: 'Resolved', ref: 'CC-2184', ic: 'i-cal' },
    { title: 'Refill request · Levotiroxina 75 mcg', clinic: 'Hospital Español', when: 'Sep 8, 2026 · 9:05 AM', status: 'prog', statusLabel: 'With pharmacy', ref: 'CC-2170', ic: 'i-pill' },
    { title: 'Asked for copy of lab report', clinic: 'Clínica Roma', when: 'Aug 30, 2026 · 1:45 PM', status: 'done', statusLabel: 'Resolved', ref: 'CC-2101', ic: 'i-doc' }
  ];
  var CC_ST_BG = { done: '#E8F7EE', prog: '#FEF3E2', wait: 'var(--surface)' };
  var CC_ST_FG = { done: '#15803D', prog: '#B45309', wait: 'var(--muted)' };
  function renderCcRequests() {
    var box = $('[data-cc-reqs]'); if (!box) return;
    box.innerHTML = CC_REQUESTS.map(function (r) {
      return '<button class="cc-req tap">' +
        '<span class="cc-req-ic" style="background:' + CC_ST_BG[r.status] + ';color:' + CC_ST_FG[r.status] + ';"><svg class="ic18" style="stroke:currentColor"><use href="#' + r.ic + '"/></svg></span>' +
        '<span style="flex:1;min-width:0;">' +
        '<span class="cc-req-t" style="display:block;">' + r.title + '</span>' +
        '<span class="cc-req-m" style="display:block;">' + r.clinic + ' · ' + r.when + '</span>' +
        '<span class="cc-req-st ' + r.status + '">' + r.statusLabel + '</span>' +
        '<span class="cc-req-m" style="display:block;margin-top:6px;letter-spacing:.02em;">' + r.ref + '</span>' +
        '</span></button>';
    }).join('');
  }
  function ccLogRequest(title, ic) {
    var ref = 'CC-' + (2290 + CC_REQUESTS.length);
    CC_REQUESTS.unshift({ title: title, clinic: ccClinic, when: 'Today · Just now', status: 'prog', statusLabel: 'In progress', ref: ref, ic: ic || 'i-chat' });
    renderCcRequests();
    return ref;
  }

  function openCareConnectSheet() {
    var rows = [
      { n: 'Hospital Español', t: 'Better care. Brighter tomorrow.', p: 'assets/clinic-espanol.png' },
      { n: 'Hospital Ángeles', t: 'Care for what matters.', p: 'assets/clinic-angeles.png' },
      { n: 'Clínica Roma', t: 'Salud hoy, bienestar siempre.', p: 'assets/clinic-roma.png' },
      { n: 'Centro Médico Sur', t: 'Tu salud, nuestra prioridad.', p: 'assets/clinic-sur.png' }
    ];
    openSheet(
      '<div class="cc-sheet-pill"><img src="assets/cc-fab-icon.webp" alt="">Care Connect</div>' +
      '<div class="cc-sheet-hd">Which clinic would you<br>like to connect with?</div>' +
      '<div class="cc-sheet-sub">Talk to your clinic. Book, reschedule, ask a question — we\u2019ll take care of it.</div>' +
      '<div class="cc-sheet-list">' +
      rows.map(function (r) {
        return '<button class="cc-clinic tap' + (r.n === ccClinic ? ' on' : '') + '" data-cc-clinic="' + r.n + '" data-cc-photo="' + r.p + '">' +
          '<span class="cc-clinic-tile"><img src="' + r.p + '" alt=""></span>' +
          '<span style="flex:1;min-width:0;"><span class="cc-clinic-name" style="display:block;">' + r.n + '</span><span class="cc-clinic-tag">' + r.t + '</span></span>' +
          '<svg class="ic18" style="stroke:var(--muted)"><use href="#i-chevron"/></svg></button>';
      }).join('') +
      '<div class="cc-peek"><img src="assets/cc-peek-mascot.png" alt="I\u2019m here to help you connect with your clinic!"></div>' +
      '</div>',
      'cc-sheet'
    );
  }

  /* ---------- click delegation ---------- */
  document.addEventListener('input', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-cc-kb-input')) ccKbSync();
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-pf-age')) {
      var v = $('[data-pf-age-v]'); if (v) v.textContent = e.target.value;
    }
    if (e.target && e.target.closest && e.target.closest('[data-au-otp]')) {
      var inputs = $all('[data-au-otp] input'), idx = inputs.indexOf(e.target);
      if (e.target.value.length && idx < inputs.length - 1) inputs[idx + 1].focus();
      auSyncOtp();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && e.target && e.target.closest && e.target.closest('[data-au-otp]') && !e.target.value) {
      var ins = $all('[data-au-otp] input'), i = ins.indexOf(e.target);
      if (i > 0) { ins[i - 1].focus(); ins[i - 1].value = ''; auSyncOtp(); }
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target;

    // Care Connect
    if (t.closest('[data-act="open-cc"]')) { openCareConnectSheet(); return; }
    var ccCl = t.closest('[data-cc-clinic]');
    if (ccCl) {
      ccClinic = ccCl.dataset.ccClinic;
      ccPhoto = ccCl.dataset.ccPhoto || ccPhoto;
      $all('[data-cc-clinic]').forEach(function (b) { b.classList.toggle('on', b === ccCl); });
      ccSyncHeaders();
      closeOverlay();
      show('cc-connect');
      return;
    }
    if (t.closest('[data-act="cc-mic-allow"]')) { ccMicGranted = true; show('cc-voice'); ccT(setTimeout(ccStartListening, 520)); return; }
    if (t.closest('[data-act="cc-mic-deny"]')) { show('cc-voice'); ccT(setTimeout(ccOpenKb, 380)); return; }
    if (t.closest('[data-act="cc-listen"]')) {
      if (ccListening) ccFinishListening(); else ccStartListening();
      return;
    }
    if (t.closest('[data-act="cc-type"]')) { ccResetVoice(); ccOpenKb(); return; }
    if (t.closest('[data-act="cc-chat-kb"]')) { var ci = $('[data-cc-input]'); if (ci) ci.focus(); return; }
    var ccFill = t.closest('[data-cc-fill]');
    if (ccFill) {
      var fi = $('[data-cc-kb-input]');
      if (fi) { fi.textContent = ccFill.dataset.ccFill; ccKbSync(); }
      return;
    }
    var ccKey = t.closest('[data-cc-key]');
    if (ccKey) {
      var ki = $('[data-cc-kb-input]'); if (!ki) return;
      var ch = ccKey.dataset.ccKey;
      if (ch === '\u232B') ki.textContent = ki.textContent.slice(0, -1);
      else if (ch === '\u23CE') { if (ccKbText()) ccStartChat(ccKbText()), ki.textContent = ''; }
      else ki.textContent += ch;
      ccKbSync();
      return;
    }
    if (t.closest('[data-act="cc-kb-send"]')) {
      var st = ccKbText(); if (!st) return;
      $('[data-cc-kb-input]').textContent = '';
      ccKbSync(); ccStartChat(st);
      return;
    }
    if (t.closest('[data-act="cc-yes"]')) {
      ccClearTimers();
      ccPlay([
        { item: { t: 'me', text: 'Yes, reschedule' } },
        { typing: 850 },
        { item: { t: 'bot', text: "Great! I've checked Dr. Reyes's availability. Here are the next openings." } },
        { typing: 550 },
        { item: { t: 'slots' } }
      ]);
      return;
    }
    if (t.closest('[data-act="cc-no"]')) {
      ccClearTimers();
      ccPlay([
        { item: { t: 'me', text: 'No, keep it' } },
        { typing: 700 },
        { item: { t: 'bot', text: 'No problem — your appointment stays as scheduled. I\u2019ve let the front desk know you confirmed.' } }
      ]);
      return;
    }
    var ccSlot = t.closest('[data-cc-slot]');
    if (ccSlot) {
      $all('[data-cc-slot]').forEach(function (b) { b.classList.toggle('on', b === ccSlot); });
      var picked = ccSlot.dataset.ccSlot || '';
      ccClearTimers();
      var ref = ccLogRequest('Reschedule visit with Dr. Reyes', 'i-cal');
      ccPlay([
        { item: { t: 'me', text: picked } },
        { typing: 1000 },
        { item: { t: 'bot', text: 'All set — I\u2019ve moved your appointment and notified the front desk at <b>' + ccClinic + '</b>.' } },
        { typing: 600 },
        { item: { t: 'done', title: 'Appointment rescheduled', sub: 'Dr. Valentina Reyes · ' + picked + '. A confirmation will arrive shortly.', ref: 'Request ' + ref } }
      ]);
      return;
    }

    // close overlay
    if (t.closest('[data-close]')) { closeOverlay(); return; }

    var mood = t.closest('[data-mood]');
    if (mood) {
      $all('[data-moods] .hm-mood').forEach(function (b) { b.classList.toggle('on', b === mood); });
      toast('Check-in saved · ' + mood.dataset.mood);
      return;
    }

    // pre-visit requirement detail sheets
    var reqOpen = t.closest('[data-req-sheet]');
    if (reqOpen) { openReqDetail(reqOpen.dataset.reqSheet); return; }
    var rqOpt = t.closest('[data-rq-opt]');
    if (rqOpt) {
      var grp = rqOpt.closest('[data-rq-group]');
      if (grp) $all('[data-rq-opt]', grp).forEach(function (b) { b.classList.toggle('on', b === rqOpt); });
      return;
    }
    if (t.closest('[data-act="submit-questionnaire"]')) { closeOverlay(); toast('Questionnaire submitted'); return; }

    if (t.closest('[data-rem-toggle-med]')) {
      var sw3 = t.closest('[data-rem-toggle-med]');
      sw3.classList.toggle('on');
      if (medDetailRow) {
        var b3 = $('[data-bell]', medDetailRow);
        if (b3) {
          b3.classList.toggle('on', sw3.classList.contains('on'));
          var s3 = b3.querySelector('svg'); if (s3) s3.style.stroke = sw3.classList.contains('on') ? 'var(--brand)' : 'rgba(60,60,67,.35)';
        }
      }
      return;
    }
    var medStatus = t.closest('[data-med-status]');
    if (medStatus) {
      var kind = medStatus.dataset.medStatus, row = medDetailRow;
      if (kind === 'continuing') {
        closeOverlay();
        medLogAdd({ kind: 'continuing', name: row ? row.dataset.medName : '', detail: 'No changes' });
        toast('Great \u2014 keep going', true);
      } else {
        openMedFollowup(kind);
      }
      return;
    }
    var mfSev = t.closest('[data-mf-sev]');
    if (mfSev) { $all('[data-mf-sev]').forEach(function (b) { b.classList.toggle('on', b === mfSev); }); return; }
    var mfPickup = t.closest('[data-mf-pickup]');
    if (mfPickup) { $all('[data-mf-pickup]').forEach(function (b) { b.classList.toggle('on', b === mfPickup); }); return; }
    var mfSave = t.closest('[data-act="save-med-followup"]');
    if (mfSave) {
      var kind2 = mfSave.dataset.mfKind, row2 = medDetailRow, name2 = row2 ? row2.dataset.medName : '', doc2 = row2 ? row2.dataset.medDoc : '';
      var detail = '';
      if (kind2 === 'stopped') {
        var r = ($('#mf-reason') || {}).value, n = (($('#mf-note') || {}).value || '').trim();
        detail = (r || 'No reason given') + (n ? ' \u2014 ' + n : '');
        if (row2) row2.style.opacity = '.4';
        toast(name2 + ' marked as stopped', true);
      } else if (kind2 === 'side-effect') {
        var sym = ($('#mf-symptom') || {}).value, sev = ($('[data-mf-sev].on') || {}).dataset ? ($('[data-mf-sev].on') || {}).dataset.mfSev : '', n2 = (($('#mf-note') || {}).value || '').trim();
        detail = (sym || 'Symptom') + (sev ? ' \u2014 ' + sev : '') + (n2 ? '. ' + n2 : '');
        toast('Message sent to ' + doc2, true);
      } else if (kind2 === 'refill') {
        var sup = ($('#mf-supply') || {}).value, pk = ($('[data-mf-pickup].on') || {}).dataset ? ($('[data-mf-pickup].on') || {}).dataset.mfPickup : '';
        detail = (sup ? sup + ' left' : 'Refill requested') + (pk ? ' \u2014 ' + pk : '');
        toast('Refill requested from the clinic', true);
      }
      medLogAdd({ kind: kind2, name: name2, detail: detail });
      closeOverlay();
      return;
    }

    // reminder sheet controls
    if (t.closest('[data-rem-toggle]')) {
      var sw = t.closest('[data-rem-toggle]');
      sw.classList.toggle('on');
      var body = $('[data-rem-body]');
      if (body) body.style.cssText = sw.classList.contains('on') ? '' : 'opacity:.4;pointer-events:none;';
      return;
    }
    var remAp = t.closest('[data-rem-ap]');
    if (remAp) {
      var wrap = remAp.closest('.rem-ap');
      if (wrap) $all('[data-rem-ap]', wrap).forEach(function (b) { b.classList.toggle('on', b === remAp); });
      return;
    }
    var remSound = t.closest('[data-rem-sound]');
    if (remSound) {
      $all('[data-rem-sound]').forEach(function (b) { b.classList.toggle('on', b === remSound); });
      return;
    }
    if (t.closest('[data-act="save-reminder"]')) {
      var sw2 = $('[data-rem-toggle]'), on = sw2 && sw2.classList.contains('on');
      var snd = $('[data-rem-sound].on');
      var tms = $all('[data-rem-time]').map(function (w) {
        var hm = (w.querySelector('.rem-hm') || {}).value || '9:00';
        var ap = w.querySelector('.rem-ap-b.on');
        return hm + ' ' + (ap ? ap.dataset.remAp : 'AM');
      });
      if (reminderBell) {
        reminderBell.classList.toggle('on', !!on);
        var bs = reminderBell.querySelector('svg');
        if (bs) bs.style.stroke = on ? 'var(--brand)' : 'rgba(60,60,67,.35)';
        var row = reminderBell.closest('.med-row');
        var sEl = row && row.querySelector('.med-s');
        if (on && sEl && tms.length) {
          sEl.textContent = sEl.textContent.split(' · ')[0] + ' · ' + tms.join(', ');
        }
      }
      closeOverlay();
      toast(on ? 'Reminder set · ' + (snd ? snd.dataset.remSound : 'Chime') : 'Reminders off', true);
      return;
    }

    var goDoc = t.closest('[data-go-doctor]');
    if (goDoc) { renderDoctorProfile(goDoc.dataset.goDoctor); show('doctor', { push: true }); return; }
    var docRatingEl = t.closest('[data-doc-rating]');
    if (docRatingEl && panes.doctor) { openReviewsSheet(panes.doctor.dataset.docId); return; }
    var rateVisit = t.closest('[data-rate-visit]');
    if (rateVisit && panes.doctor) { openRateSheet(panes.doctor.dataset.docId, +rateVisit.dataset.rateVisit, rateVisit.dataset.rateLabel); return; }
    var rateStar = t.closest('[data-rate-star]');
    if (rateStar) {
      var n = +rateStar.dataset.rateStar;
      $all('[data-rate-star]', rateStar.parentElement).forEach(function (b, i) {
        b.querySelector('svg').style.fill = (i < n) ? '#F5A623' : 'none';
      });
      rateStar.parentElement.dataset.picked = n;
      return;
    }
    if (t.closest('[data-act="submit-rating"]')) {
      var starsWrap = $('[data-rate-stars]');
      var picked = +(starsWrap && starsWrap.dataset.picked || 0);
      if (!picked) { toast('Pick a star rating'); return; }
      var note = ($('#rate-note') || {}).value || '';
      var ratings = docRatingsLoad();
      ratings[rateVisitCtx.docId + ':' + rateVisitCtx.visitIdx] = { rating: picked, note: note };
      docRatingsSave(ratings);
      closeOverlay();
      toast('Thanks for your feedback', true);
      renderDoctorProfile(rateVisitCtx.docId);
      return;
    }

    if (t.closest('[data-act="upload-file"]')) { reportSheet(); return; }

    // chat widget
    if (t.closest('[data-chat-open-widget]')) { openChatWidget(); return; }
    if (t.closest('[data-chat-close]')) { closeChatWidget(); return; }
    var catBtn = t.closest('[data-chat-cat-btn]');
    if (catBtn) {
      chatCat = catBtn.dataset.chatCatBtn;
      $all('[data-chat-cat-btn]').forEach(function (b) { b.classList.toggle('on', b === catBtn); });
      renderChatList();
      return;
    }
    if (t.closest('[data-chat-back]')) { $('#chat-view-convo').hidden = true; $('#chat-view-list').hidden = false; return; }
    var cthread = t.closest('[data-chat-thread]');
    if (cthread) { renderChatConvo(cthread.dataset.chatThread); $('#chat-view-list').hidden = true; $('#chat-view-convo').hidden = false; return; }
    if (t.closest('[data-chat-send]')) { chatSend(); return; }
    var replyMsg = t.closest('[data-chat-reply-msg]');
    if (replyMsg) { chatStartReply(+replyMsg.dataset.chatReplyMsg); return; }
    if (t.closest('[data-chat-reply-cancel]')) { chatReplyTo = null; $('#chat-reply-preview').hidden = true; return; }
    if (t.closest('[data-chat-attach-toggle]')) { var am = $('#chat-attach-menu'); am.hidden = !am.hidden; return; }
    var attachBtn = t.closest('[data-chat-attach]');
    if (attachBtn) { chatAttach(attachBtn.dataset.chatAttach); return; }
    if (t.closest('[data-chat-search-toggle]')) {
      var sb = $('#chat-search-bar'); sb.hidden = !sb.hidden;
      if (!sb.hidden) $('#chat-search-input').focus(); else chatSearchRun('');
      return;
    }
    if (t.closest('[data-chat-search-close]')) { $('#chat-search-bar').hidden = true; $('#chat-search-input').value = ''; chatSearchRun(''); return; }
    if (t.closest('[data-chat-search-next]')) { chatSearchGo(1); return; }
    if (t.closest('[data-chat-search-prev]')) { chatSearchGo(-1); return; }

    // file lightbox (open / share / delete)
    var frow = t.closest('[data-fileopen]');
    if (frow) { openFile(frow); return; }
    if (t.closest('[data-file-share]')) { toast('Preparing to share…', true); return; }
    if (t.closest('[data-file-delete]')) {
      var nm = lbRow ? (lbRow.dataset.fileName || 'File') : 'File';
      if (lbRow && lbRow.parentNode) lbRow.parentNode.removeChild(lbRow);
      lbRow = null; closeOverlay(); toast(nm + ' deleted');
      return;
    }

    // replay intro
    if (t.closest('[data-replay]')) {
      try { localStorage.removeItem('nfh_onboarded'); } catch (err) {}
      location.reload(); return;
    }

    // manual record edit / remove
    if (t.closest('[data-act="manual-remove"]')) {
      if (medDetailRow && medDetailRow.parentNode) medDetailRow.parentNode.removeChild(medDetailRow);
      medDetailRow = null;
      closeOverlay();
      toast('Removed', true);
      return;
    }
    if (t.closest('[data-act="manual-edit"]')) {
      var er = medDetailRow; if (!er) return;
      var ekind = er.dataset.manual;
      openManualSheet(ekind);
      var ea = $('#man-a'), eb = $('#man-b'), ec = $('#man-c');
      if (ea) ea.value = er.dataset.medName || '';
      if (eb) eb.value = (er.dataset.medDose || '').replace(/^(Schedule|Date) not set$/, '');
      if (ec) ec.value = (er.dataset.medDoc || '').replace(/^Self-reported$/, '');
      var sv = $('[data-act="add-manual-save"]');
      if (sv) { sv.dataset.editing = '1'; sv.textContent = 'Save changes'; }
      medDetailRow = er;
      return;
    }

    // add medication / surgical history
    if (t.closest('[data-act="add-med"]')) { openAddSheet('med'); return; }
    if (t.closest('[data-act="add-surg"]')) { openAddSheet('surg'); return; }
    var addScan = t.closest('[data-act="add-scan"]');
    if (addScan) { closeOverlay(); pickReportFile(addScan.dataset.mode === 'camera' ? 'camera' : 'library'); return; }
    var addMan = t.closest('[data-act="add-manual"]');
    if (addMan) { openManualSheet(addMan.dataset.kind); return; }
    var addSave = t.closest('[data-act="add-manual-save"]');
    if (addSave) {
      if (addSave.dataset.editing && medDetailRow) { saveManualEdit(addSave.dataset.kind); return; }
      addManualEntry(addSave.dataset.kind);
      return;
    }

    // sign out → back to splash, then intro/auth
    if (t.closest('[data-act="sign-out"]')) {
      try {
        localStorage.removeItem('nfh_onboarded');
        localStorage.removeItem('nfh_name');
        localStorage.removeItem('nfh-intro');
      } catch (err) {}
      var sp = document.getElementById('splash');
      if (sp) sp.classList.remove('hide');
      setTimeout(function () { location.reload(); }, 420);
      return;
    }

    // auth + profile setup flow
    if (t.closest('[data-act="auth-google"]')) {
      toast('Signed in with Google', true);
      setTimeout(function () { show('pf-basics'); }, 620);
      return;
    }
    if (t.closest('[data-act="auth-manual"]')) { show('auth-entry'); return; }
    var auSegBtn = t.closest('[data-au-mode]');
    if (auSegBtn) {
      auMode = auSegBtn.dataset.auMode;
      $all('[data-au-seg] button').forEach(function (b) { b.classList.toggle('on', b === auSegBtn); });
      $('[data-au-email]').hidden = auMode !== 'email';
      $('[data-au-phone]').hidden = auMode !== 'phone';
      return;
    }
    if (t.closest('[data-act="auth-send-otp"]')) {
      auDest = auMode === 'email'
        ? (($('[data-au-input-email]') && $('[data-au-input-email]').value.trim()) || 'you@example.com')
        : '+52 ' + (($('[data-au-input-phone]') && $('[data-au-input-phone]').value.trim()) || '55 1234 5678');
      var dest = $('[data-au-dest]'); if (dest) dest.textContent = auDest;
      $all('[data-au-otp] input').forEach(function (i) { i.value = ''; });
      auSyncOtp();
      show('auth-otp');
      return;
    }
    if (t.closest('[data-act="auth-autofill"]')) {
      var codes = '123456'.split('');
      $all('[data-au-otp] input').forEach(function (i, n) {
        ccT(setTimeout(function () { i.value = codes[n]; auSyncOtp(); }, n * 90));
      });
      return;
    }
    if (t.closest('[data-act="auth-verify"]')) {
      toast('Verified', true);
      setTimeout(function () { show('pf-basics'); }, 560);
      return;
    }
    var pfG = t.closest('[data-pf-g]');
    if (pfG) { $all('[data-pf-gender] .pf-tile').forEach(function (b) { b.classList.toggle('on', b === pfG); }); return; }
    var pfC = t.closest('[data-pf-cond]');
    if (pfC) {
      if (pfC.dataset.pfCond === 'None') {
        var was = pfC.classList.contains('on');
        $all('[data-pf-cond]').forEach(function (b) { b.classList.remove('on'); });
        pfC.classList.toggle('on', !was);
      } else {
        var none = $('[data-pf-cond="None"]'); if (none) none.classList.remove('on');
        pfC.classList.toggle('on');
      }
      return;
    }
    if (t.closest('[data-act="pf-scan"]')) { pfRunExtract(); return; }
    var prCard = t.closest('[data-pr-plan]');
    if (prCard) { pfPlan = prCard.dataset.prPlan; pfSyncPricing(); return; }
    var prC = t.closest('[data-pr-c]');
    if (prC) { pfCycle = prC.dataset.prC; pfSyncPricing(); return; }
    if (t.closest('[data-act="pricing-go"]')) {
      if (pfPlan !== 'free') toast(pfCycle === 'annual' ? 'Narzim Plus · $3/mo billed yearly' : 'Narzim Plus · $5/mo', true);
      setTimeout(function () { show('setup', { noStack: true }); }, 480);
      return;
    }
    if (t.closest('[data-act="pricing-skip"]')) {
      pfPlan = 'free'; pfSyncPricing();
      setTimeout(function () { show('setup', { noStack: true }); }, 240);
      return;
    }

    // intro walkthrough
    if (t.closest('[data-act="intro-next"]')) { if (introStep < 3) { introStep++; renderIntro(); } return; }
    if (t.closest('[data-act="intro-back"]')) { if (introStep > 1) { introStep--; renderIntro(); } return; }
    if (t.closest('[data-act="intro-skip"]')) { finishIntro(); return; }

    // onboarding steps
    var onb = t.closest('[data-onb]');
    if (onb) {
      var a = onb.dataset.onb;
      if (a === 'next') { onbStep = Math.min(3, onbStep + 1); renderOnb(); }
      else if (a === 'prev') { onbStep = Math.max(1, onbStep - 1); renderOnb(); }
      else if (a === 'name') {
        var nmEl = document.getElementById('onb-name');
        if (nmEl) { try { localStorage.setItem('nfh_name', nmEl.value.trim() || 'Mateo'); } catch (err) {} }
        onbStep = 3; renderOnb();
      }
      else if (a === 'enable') { finishOnb(true); }
      else if (a === 'later') { finishOnb(false); }
      return;
    }

    // sheet navigation
    var sg = t.closest('[data-sheetgo]');
    if (sg) { var dest = sg.dataset.sheetgo; closeOverlay(); go(dest); return; }

    // (requirements now shown inline on the appointment detail page)

    var nav = t.closest('[data-nav]');
    if (nav) { var nv = nav.dataset.nav; go(nv === 'scan' ? 'camera' : nv); return; }

    // family member detail view
    var mvEl = t.closest('[data-member-view]');
    if (mvEl) { renderMember(mvEl.dataset.memberView); go('memberview'); return; }

    // past visit letterhead report
    var visEl = t.closest('[data-visit]');
    if (visEl) { renderVisit(visEl.dataset.visit); go('visitreport'); return; }

    // show invoice for the current visit
    if (t.closest('[data-act="show-invoice"]')) { if (currentVisit) { renderInvoice(currentVisit); go('invoice'); } return; }

    // generic navigation
    var goEl = t.closest('[data-go]');
    if (goEl) {
      var d = goEl.dataset.go;
      if (d === 'back') back();
      else { go(d); }
      return;
    }

    // FAB sheet
    var sheet = t.closest('[data-sheet]');
    if (sheet) {
      if (sheet.dataset.sheet === 'add') addSheet();
      else if (sheet.dataset.sheet === 'create') createSheet();
      return;
    }

    // create-sheet options
    var cr = t.closest('[data-create]');
    if (cr) {
      var k = cr.dataset.create;
      if (k === 'report') { reportSheet(); return; }
      closeOverlay();
      if (k === 'appointment') { go('book'); }
      else if (k === 'report-camera') { go('camera'); }
      else if (k === 'report-upload') { pickReportFile(); }
      else if (k === 'rx-camera') { go('camera'); }
      else if (k === 'rx-upload') { pickReportFile(); }
      return;
    }

    // member filter pill
    var fpill = t.closest('.pills[data-pillfilter] .pill[data-member]');
    if (fpill) {
      member = fpill.dataset.member;
      var pane = fpill.closest('.pane');
      paintPills(pane); applyFilter(pane);
      return;
    }

    // scan / med "For" selector pills
    var pickPill = t.closest('.pills[data-pick] .pill[data-member]');
    if (pickPill) {
      var cont = pickPill.closest('.pills[data-pick]');
      $all('.pill[data-member]', cont).forEach(function (p) {
        delete p.dataset.on;
        p.style.background = 'transparent'; p.style.color = p.dataset.mcolor; p.style.borderColor = p.dataset.mcolor;
        var dd = p.querySelector('.pdot'); if (dd) dd.style.background = p.dataset.mcolor;
      });
      pickPill.dataset.on = '';
      pickPill.style.background = pickPill.dataset.mcolor; pickPill.style.color = '#fff'; pickPill.style.borderColor = 'transparent';
      var pd = pickPill.querySelector('.pdot'); if (pd) pd.style.background = '#fff';
      return;
    }

    // appointment status segmented control
    var sf = t.closest('[data-segstatus] .sf');
    if (sf) {
      pickWithin(sf.closest('[data-segstatus]'), sf, '.sf', 'on');
      filterAppts(panes.appointments, sf.dataset.status);
      return;
    }

    // open unified filter sheet
    if (t.closest('[data-openfilters]')) { openFilterSheet(); return; }

    // home family filter
    if (t.closest('[data-homefilter]')) { homeFilterSheet(); return; }
    var hm = t.closest('[data-homemem]');
    if (hm) { setGlobalMember(hm.dataset.homemem); closeOverlay(); return; }

    // a filter option inside the sheet
    var fset = t.closest('[data-fset]');
    if (fset) {
      var fp = fset.dataset.fset.split('|');
      if (fp[0] === 'member') { member = fp[1]; }
      else { apptFilters[fp[0]] = fp[1] || null; }
      applyFilter(panes.appointments);
      applyApptFilters();
      updateFilterBadge();
      openFilterSheet();        // re-render to reflect selection
      return;
    }
    // reset all filters
    if (t.closest('[data-freset]')) {
      apptFilters = { doctor: null, clinic: null, range: null };
      applyFilter(panes.appointments);
      applyApptFilters();
      updateFilterBadge();
      openFilterSheet();
      return;
    }

    // health top-level tabs
    var htab = t.closest('[data-healthtabs] [data-healthtab]');
    if (htab) {
      var htabs = htab.closest('[data-healthtabs]');
      pickWithin(htabs, htab, '.tab', 'on');
      var paneH = htab.closest('.pane');
      $all('[data-healthpane]', paneH).forEach(function (hp) {
        hp.style.display = (hp.dataset.healthpane === htab.dataset.healthtab) ? (hp.tagName === 'BUTTON' ? 'inline-flex' : 'block') : 'none';
      });
      return;
    }

    // report type filter
    var rfilter = t.closest('[data-reportfilter]');
    if (rfilter) {
      pickWithin(rfilter.closest('[data-reportfilters]'), rfilter, '.filt', 'on');
      var rtype = rfilter.dataset.reportfilter;
      $all('[data-report-list] [data-reporttype]').forEach(function (row) {
        row.style.display = (rtype === 'all' || row.dataset.reporttype === rtype) ? 'flex' : 'none';
      });
      return;
    }

    // surgical history member filter
    var sfilter = t.closest('[data-surgicalfilter]');
    if (sfilter) {
      pickWithin(sfilter.closest('[data-surgicalfilters]'), sfilter, '.filt', 'on');
      var sid = sfilter.dataset.surgicalfilter;
      $all('[data-surgical-list] [data-surgtype]').forEach(function (row) {
        row.style.display = (sid === 'all' || row.dataset.surgtype === sid) ? 'flex' : 'none';
      });
      return;
    }

    // medication tabs
    var mtab = t.closest('[data-medtabs] [data-medtab]');    if (mtab) {
      var tabs = mtab.closest('[data-medtabs]');
      pickWithin(tabs, mtab, '.filt', 'on');
      var paneM = mtab.closest('.pane');
      $all('[data-medpane]', paneM).forEach(function (mp) {
        mp.style.display = (mp.dataset.medpane === mtab.dataset.medtab) ? 'flex' : 'none';
      });
      applyFilter(paneM);
      return;
    }

    // generic single-select pickers (segmented / route / frequency / relationship / date / time)
    var pickGroup = t.closest('[data-pick]:not(.pills)');
    if (pickGroup) {
      var item = t.closest('.seg, .ochip, .datechip, .timechip');
      if (item && pickGroup.contains(item)) {
        if (item.classList.contains('off')) return;
        pickWithin(pickGroup, item, '.seg, .ochip, .datechip, .timechip', 'on');
        return;
      }
    }

    // doctor radio group (booking)
    var drow = t.closest('[data-radio] .docrow');
    // booking cascading dropdowns
    if (panes.book && !t.closest('.dropdown')) closeAllDD();
    var ddTog = t.closest('.dropdown[data-dd] [data-dd-toggle]');
    if (ddTog) {
      var dd = ddTog.closest('.dropdown');
      if (dd.classList.contains('disabled')) return;
      var wasOpen = dd.classList.contains('open');
      closeAllDD();
      if (!wasOpen) dd.classList.add('open');
      return;
    }
    var ddOpt = t.closest('[data-dd-opt]');
    if (ddOpt) {
      var which = ddOpt.dataset.dd, val = ddOpt.dataset.val;
      if (which === 'patient') { bookState.patient = val; renderPatientDD(); renderPurposeList(); refreshBookContinue(); }
      closeAllDD();
      return;
    }
    var bpurpose = t.closest('[data-book-purpose]');
    if (bpurpose) { bookState.purpose = bpurpose.dataset.bookPurpose; renderPurposeList(); refreshBookContinue(); return; }
    var bdept = t.closest('[data-book-dept]');
    if (bdept) { bookState.dept = bdept.dataset.bookDept; renderDeptChips(); renderDoctorList(); return; }
    var bpickdoc = t.closest('[data-book-pick-doc]');
    if (bpickdoc && !t.closest('[data-go-doctor]')) {
      if (bookState.doctor !== bpickdoc.dataset.bookPickDoc) { bookState.doctor = bpickdoc.dataset.bookPickDoc; bookState.date = null; bookState.time = null; }
      renderDoctorList(); refreshBookContinue();
      return;
    }
    var bdate = t.closest('[data-book-date]');
    if (bdate) { bookState.date = bdate.dataset.d; bookState.time = null; renderDates(); renderTimes(); refreshBookContinue(); return; }
    if (t.closest('[data-book-mo-prev]')) {
      bookState.month--; if (bookState.month < 0) { bookState.month = 11; bookState.year--; }
      bookState.date = null; bookState.time = null; renderDates(); renderTimes(); refreshBookContinue(); return;
    }
    if (t.closest('[data-book-mo-next]')) {
      bookState.month++; if (bookState.month > 11) { bookState.month = 0; bookState.year++; }
      bookState.date = null; bookState.time = null; renderDates(); renderTimes(); refreshBookContinue(); return;
    }
    var btime = t.closest('[data-book-time]');
    if (btime) { bookState.time = btime.textContent.trim(); renderTimes(); refreshBookContinue(); return; }
    if (t.closest('[data-act="book-back"]')) {
      if (panes.book && bookState.step > 1) goBookStep(bookState.step - 1);
      else back();
      return;
    }
    if (t.closest('[data-act="book-continue"]')) {
      if (!bookCanContinue()) return;
      if (bookState.step < 4) { goBookStep(bookState.step + 1); return; }
      var s = bookSelections();
      insertBookedCard();
      var sub = $('[data-book-success-sub]', panes['book-success']);
      if (sub) sub.textContent = s.doc + ' · ' + s.full + ', ' + s.time + '.';
      show('book-success');
      return;
    }

    // autocomplete suggestion
    var sug = t.closest('.ac-sug');
    if (sug) {
      var input = sug.closest('.card').querySelector('.field');
      if (input) input.value = sug.textContent.trim();
      $all('.ac-sug', sug.parentElement).forEach(function (s) { s.style.display = 'none'; });
      return;
    }

    // toggle switch
    var tog = t.closest('[data-toggle]');
    if (tog) { tog.classList.toggle('on'); return; }

    var medOpen = t.closest('[data-med-open]');
    if (medOpen && !t.closest('[data-bell]')) { openMedDetailSheet(medOpen); return; }

    // bell -> reminder settings sheet
    var bell = t.closest('[data-bell]');
    if (bell) { openReminderSheet(bell); return; }

    // multi-select checkbox on scan review items
    var chk = t.closest('[data-doccheck]');
    if (chk) { chk.classList.toggle('on'); refreshScanConfirm(); return; }
    var selAll = t.closest('[data-scan-selall]');
    if (selAll) {
      var boxes = $all('[data-doccheck]', panes.scan);
      var anyOff = boxes.some(function (b) { return !b.classList.contains('on'); });
      boxes.forEach(function (b) { b.classList.toggle('on', anyOff); });
      refreshScanConfirm();
      return;
    }
    if (t.closest('[data-scan-patient]')) {
      var cur = $('[data-scan-patient-label]', panes.scan);
      openSheet('<div style="padding:2px 4px 10px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Who is this for?</div></div>' +
        ['priya', 'anant', 'aryan'].map(function (m) {
          return '<button class="med-status-opt" data-pick-patient="' + m + '" style="width:100%;">' +
            '<span class="pdot" style="background:var(--m-' + m + ');width:10px;height:10px;margin-left:6px;"></span>' +
            '<div class="rem-t">' + MEMBER_NAMES[m] + '</div>' +
            (cur && cur.dataset.member === m ? '<svg class="ic18" style="stroke:var(--brand);margin-left:auto;"><use href="#i-check"/></svg>' : '') +
            '</button>';
        }).join(''));
      return;
    }
    var pickPatient = t.closest('[data-pick-patient]');
    if (pickPatient) {
      var m2 = pickPatient.dataset.pickPatient, lbl2 = $('[data-scan-patient-label]', panes.scan);
      lbl2.dataset.member = m2; lbl2.textContent = MEMBER_NAMES[m2];
      var dot = $('[data-scan-patient] .pdot', panes.scan);
      if (dot) dot.style.background = 'var(--m-' + m2 + ')';
      closeOverlay();
      return;
    }
    if (t.closest('[data-scan-appt-pick]')) {
      var curA = $('[data-scan-appt-label]', panes.scan);
      var APPTS = [
        { id: '', name: 'Personal files', sub: 'Not linked to a visit' },
        { id: 'a1', name: 'Dr. Ricardo Morales', sub: 'Sat, 14 June · 10:30 AM' },
        { id: 'a2', name: 'Dr. Ariel Castillo', sub: 'Sun, 28 June · 9:00 AM' },
        { id: 'a3', name: 'Dr. Valentina Reyes', sub: 'Fri, 20 June · 4:00 PM' },
        { id: 'a4', name: 'Dr. Ricardo Morales', sub: 'Mon, 18 May · past visit' }
      ];
      openSheet('<div style="padding:2px 4px 10px;"><div style="font-size:17px;font-weight:600;letter-spacing:-.02em;">Link to an appointment</div>' +
        '<div class="meta" style="margin-top:3px;">Items you don\u2019t link stay in Personal files.</div></div>' +
        APPTS.map(function (a) {
          return '<button class="med-status-opt" data-pick-appt="' + a.id + '" data-appt-name="' + a.name + '" style="width:100%;">' +
            '<span class="med-status-ic" style="background:var(--tint);color:var(--brand);"><svg class="ic18"><use href="#' + (a.id ? 'i-cal' : 'i-doc') + '"/></svg></span>' +
            '<div><div class="rem-t">' + a.name + '</div><div class="rem-s">' + a.sub + '</div></div>' +
            (curA && curA.dataset.appt === a.id ? '<svg class="ic18" style="stroke:var(--brand);margin-left:auto;"><use href="#i-check"/></svg>' : '') +
            '</button>';
        }).join(''));
      return;
    }
    var pickAppt = t.closest('[data-pick-appt]');
    if (pickAppt) {
      var lbl3 = $('[data-scan-appt-label]', panes.scan);
      lbl3.dataset.appt = pickAppt.dataset.pickAppt;
      lbl3.textContent = pickAppt.dataset.apptName;
      closeOverlay();
      return;
    }

    // sound rows
    var srow = t.closest('[data-sounds] .soundrow');
    if (srow && !t.closest('[data-toast]')) {
      pickWithin(srow.closest('[data-sounds]'), srow, '.soundrow', 'on');
      return;
    }

    // mark taken
    var taken = t.closest('[data-act="taken"]');
    if (taken) {
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:5px;color:var(--success);font-size:13px;font-weight:600;';
      span.innerHTML = '<svg class="ic18" style="stroke:var(--success)"><use href="#i-check"/></svg>Taken';
      taken.replaceWith(span);
      toast('Marked as taken', true);
      return;
    }

    // cancel appointment
    if (t.closest('[data-act="cancel-appt"]')) { openCancelSheet(); return; }

    // cancel confirm
    if (t.closest('[data-act="confirm-cancel"]')) {
      var reasonEl = $('#cancel-reason');
      var otherEl = $('#cancel-reason-other');
      var reason = reasonEl ? reasonEl.value : '';
      if (reason === 'Other') reason = (otherEl && otherEl.value.trim()) || 'Other';
      closeOverlay();
      toast('Appointment cancelled');
      back();
      return;
    }

    // book appointment -> confirm sheet
    if (t.closest('[data-act="confirm-book"]')) { return; }
    if (t.closest('[data-act="view-appt"]')) { go('appointments'); return; }
    if (t.closest('[data-act="add-to-calendar"]')) { toast('Added to calendar', true); return; }
    // final booking
    if (t.closest('[data-act="book-final"]')) {
      insertBookedCard();
      closeOverlay();
      go('appointments');
      toast('Appointment booked', true);
      return;
    }

    // revoke clinic access
    var rev = t.closest('[data-act="revoke-clinic"]');
    if (rev) {
      var card = rev.closest('.clinic-card');
      var name = card ? (card.querySelector('div[style*="font-weight:700"]') || {}).textContent : '';
      if (card) {
        card.style.transition = 'opacity .2s, transform .2s';
        card.style.opacity = '0'; card.style.transform = 'scale(.97)';
        setTimeout(function () {
          card.remove();
          // update Connected clinics count on Profile
          var remaining = $all('.clinic-card', panes.access).length;
          var valEl = $('[data-go="access"] .set-val', panes.profile);
          if (valEl) valEl.textContent = remaining;
        }, 200);
      }
      toast(name ? ('Access revoked for ' + name) : 'Access revoked');
      return;
    }

    // camera shutter
    if (t.closest('[data-act="shutter"]')) { shoot(); return; }
    // camera review -> analyze
    if (t.closest('[data-act="cam-done"]')) {
      if (!captured.length) { toast('Take at least one photo'); return; }
      analyzeThenResults();
      return;
    }
    // retake a poor photo -> drop it, back to camera
    var rt = t.closest('[data-act="retake"]');
    if (rt) {
      var idx = +rt.dataset.idx;
      captured.splice(idx, 1);
      renderResults();
      renderCamStrip();
      show('camera', { keepCam: true });
      toast('Retake the photo — hold steady');
      return;
    }
    // photo check -> extraction review
    if (t.closest('[data-act="to-extract"]')) {
      var eb = t.closest('[data-act="to-extract"]');
      if (eb.disabled) return;
      go('scan');
      return;
    }

    // confirm scan -> pre-confirm sheet
    if (t.closest('[data-act="confirm-scan"]')) {
      var cbtn = t.closest('[data-act="confirm-scan"]');
      if (cbtn.disabled) return;
      preConfirmSheet();
      return;
    }
    // final confirm
    if (t.closest('[data-act="confirm-final"]')) {
      var who = scanFor();
      closeOverlay();
      go('medications');
      toast('Saved to ' + MEMBER_NAMES[who] + '\u2019s records', true);
      return;
    }

    // save medication
    if (t.closest('[data-act="save-med"]')) { go('medications'); toast('Medication saved', true); return; }

    // save family
    if (t.closest('[data-act="save-family"]')) {
      var nm = ($('#af-name') && $('#af-name').value.trim().split(' ')[0]) || 'Member';
      go('family'); toast(nm + ' saved to your family', true); return;
    }

    // edit profile: remove a chronic-care / allergy tag
    var rmTag = t.closest('[data-act="rm-tag"]');
    if (rmTag) { var tg = rmTag.closest('.tag'); if (tg) tg.remove(); return; }

    // edit profile: add a chronic-care / allergy tag
    var addTag = t.closest('[data-act="add-tag"]');
    if (addTag) {
      var key = addTag.dataset.tags;
      var inp = $('[data-tag-input="' + key + '"]');
      var val = inp && inp.value.trim();
      if (!val) { toast('Type something to add'); if (inp) inp.focus(); return; }
      var cluster = $('.tag-edit[data-tags="' + key + '"]');
      if (cluster) {
        var style = (addTag.dataset.tone === 'amber')
          ? 'background:rgba(212,137,74,.14);color:#B5651D;'
          : 'background:rgba(155,111,212,.14);color:#7A4FB5;';
        var span = document.createElement('span');
        span.className = 'tag';
        span.setAttribute('style', style);
        span.innerHTML = val.replace(/</g, '&lt;') +
          '<button class="tx" data-act="rm-tag"><svg><use href="#i-x"/></svg></button>';
        cluster.appendChild(span);
      }
      inp.value = ''; inp.focus();
      return;
    }

    // save profile
    if (t.closest('[data-act="save-profile"]')) { go('myprofile'); toast('Profile updated', true); return; }
    if (t.closest('[data-act="submit-checkin"]')) { back(); toast('Check-in submitted — your care team has been notified', true); return; }
    if (t.closest('[data-act="voice-checkin"]')) { startVoice(); return; }
    if (t.closest('[data-act="voice-stop"]'))    { stopVoice();  return; }
    if (t.closest('[data-act="ck-next"]'))       { ckAdvance();  return; }

    // health pulse check-in
    var hpOpt = t.closest('.hp-opt[data-hpstep-ans]');
    if (hpOpt) {
      var stepIdx = parseInt(hpOpt.getAttribute('data-hpstep-ans'));
      var ans = hpOpt.dataset.hpans;
      var opts = hpOpt.closest('.hp-opts');
      $all('.hp-opt', opts).forEach(function(o) { o.classList.remove('sel-ok','sel-mid','sel-low'); });
      var cls = ans === 'great' ? 'sel-ok' : ans === 'mid' ? 'sel-mid' : 'sel-low';
      hpOpt.classList.add(cls);
      hpStoreAns(stepIdx, ans);
      setTimeout(function() { hpAdvance(stepIdx); }, 360);
      return;
    }
    if (t.closest('[data-act="hp-edit"]')) { hpReset(); return; }

    // step check-in: selecting an option auto-advances
    var ckOpt = t.closest('.ck-opt');
    if (ckOpt && ckOpt.closest('[data-pick]')) {
      var grp = ckOpt.closest('[data-pick]');
      $all('.ck-opt', grp).forEach(function (o) { o.classList.remove('on'); });
      ckOpt.classList.add('on');
      setTimeout(ckAdvance, 380);
      return;
    }

    // generic toast triggers
    var tt = t.closest('[data-toast]');
    if (tt) { toast(tt.dataset.toast); return; }
  });

  /* swatch picking (with live profile update) */
  document.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-swatches] .swatch');
    if (!sw) return;
    $all('[data-swatches] .swatch', sw.closest('[data-swatches]')).forEach(function (s) { s.classList.remove('sel'); });
    sw.classList.add('sel');
    var av = $('#af-avatar'); if (av) av.style.background = sw.dataset.c;
  });

  /* name input live sync */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'af-name') syncFamilyName();
  });

  function filterAppts(pane, which) {
    var up = $('[data-apptsec="upcoming"]', pane);
    var past = $('[data-apptsec="past"]', pane);
    var empty = $('[data-apptsec="empty"]', pane);
    up.style.display = (which === 'all' || which === 'upcoming') ? '' : 'none';
    past.style.display = (which === 'all' || which === 'past') ? '' : 'none';
    if (empty) empty.style.display = 'none';
    applyFilter(pane);
    applyApptFilters();
  }

  /* ---------- appointment attribute filters ---------- */
  function applyApptFilters() {
    var pane = panes.appointments; if (!pane) return;
    var now = Date.parse('2026-06-13');
    var items = $all('.tl-item', pane);
    items.forEach(function (it) {
      var ok = true;
      if (apptFilters.doctor && it.dataset.doc !== apptFilters.doctor) ok = false;
      if (ok && apptFilters.clinic) {
        var c = it.dataset.clinic || '';
        if (c !== apptFilters.clinic && c.indexOf(apptFilters.clinic) !== 0) ok = false;
      }
      if (ok && apptFilters.range) {
        var ts = Date.parse(it.dataset.date);
        if (apptFilters.range === 'next30') ok = (ts >= now && ts <= now + 30 * 864e5);
        else if (apptFilters.range === 'past3m') ok = (ts < now && ts >= now - 90 * 864e5);
        else if (apptFilters.range === 'thisyear') ok = (new Date(ts).getFullYear() === 2026);
      }
      it.classList.toggle('f-hide2', !ok);
    });
    var anyVisible = items.some(function (it) {
      if (it.classList.contains('f-hide') || it.classList.contains('f-hide2')) return false;
      var sec = it.closest('[data-apptsec]');
      return sec && sec.style.display !== 'none';
    });
    var cancelledActive = $('[data-apptsec="empty"]', pane).style.display !== 'none';
    var note = $('[data-appt-empty]', pane);
    if (note) note.style.display = (!anyVisible && !cancelledActive) ? '' : 'none';
  }
  function apptFilterSheet() { openFilterSheet(); }
  function filterCount() {
    return (apptFilters.doctor ? 1 : 0) + (apptFilters.clinic ? 1 : 0) + (apptFilters.range ? 1 : 0);
  }
  function updateFilterBadge() {
    var btn = $('[data-openfilters]', panes.appointments); if (!btn) return;
    var n = filterCount();
    btn.classList.toggle('has', n > 0);
    var b = $('[data-fbadge]', btn); if (b) b.textContent = n;
  }
  function memberChipsHTML() {
    var mem = [
      { k: 'all', l: 'Everyone', c: 'var(--brand)' },
      { k: 'anant', l: MEMBER_NAMES.anant, c: 'var(--m-anant)' },
      { k: 'priya', l: MEMBER_NAMES.priya, c: 'var(--m-priya)' },
      { k: 'aryan', l: MEMBER_NAMES.aryan, c: 'var(--m-aryan)' }
    ];
    return mem.map(function (m) {
      var on = (member === m.k);
      var style = on ? ('background:' + m.c + ';border-color:transparent;color:#fff;') : ('border-color:' + m.c + ';color:' + m.c + ';');
      var dot = m.k === 'all' ? '' : '<span class="pdot" style="background:' + (on ? '#fff' : m.c) + '"></span>';
      return '<button class="fopt" data-fset="member|' + m.k + '" style="' + style + '">' + dot + m.l + '</button>';
    }).join('');
  }
  function optChipsHTML(type, opts) {
    var cur = apptFilters[type] || '';
    return opts.map(function (o) {
      var on = (cur === o.v);
      return '<button class="fopt' + (on ? ' on' : '') + '" data-fset="' + type + '|' + o.v + '">' + o.l + '</button>';
    }).join('');
  }
  function openFilterSheet() {
    var doctors = [{ v: '', l: 'Any' }, { v: 'Dr. Ricardo Morales', l: 'Dr. Ricardo Morales' }, { v: 'Dr. Valentina Reyes', l: 'Dr. Valentina Reyes' }, { v: 'Dr. Carmen Iglesias', l: 'Dr. Carmen Iglesias' }];
    var clinics = [{ v: '', l: 'Any' }, { v: 'Hospital \u00c1ngeles', l: 'Hospital \u00c1ngeles' }, { v: 'Hospital Espa\u00f1ol', l: 'Hospital Espa\u00f1ol' }, { v: 'Cl\u00ednica Roma', l: 'Cl\u00ednica Roma' }];
    var ranges = [{ v: '', l: 'Any time' }, { v: 'next30', l: 'Next 30 days' }, { v: 'past3m', l: 'Past 3 months' }, { v: 'thisyear', l: 'This year' }];
    openSheet(
      '<div class="fsheet-head"><span class="ft">Filters</span><button class="fsheet-reset" data-freset>Reset</button></div>' +
      '<div class="fsec-label">Doctor</div><div class="fwrap">' + optChipsHTML('doctor', doctors) + '</div>' +
      '<div class="fsec-label">Clinic</div><div class="fwrap">' + optChipsHTML('clinic', clinics) + '</div>' +
      '<div class="fsec-label">Date range</div><div class="fwrap">' + optChipsHTML('range', ranges) + '</div>' +
      '<button class="btn btn-primary" data-close style="margin-top:22px;">Show results</button>'
    );
  }
  function setApptFilter() { applyApptFilters(); }

  function paintPickPills() {
    $all('.pills[data-pick]').forEach(function (cont) {
      $all('.pill[data-member]', cont).forEach(function (p) {
        var c = p.dataset.mcolor, on = p.hasAttribute('data-on');
        var dot = p.querySelector('.pdot');
        if (on) {
          p.style.background = c; p.style.color = '#fff'; p.style.borderColor = 'transparent';
          if (dot) dot.style.background = '#fff';
        } else {
          p.style.background = 'transparent'; p.style.color = c; p.style.borderColor = c;
          if (dot) dot.style.background = c;
        }
      });
    });
  }

  function openAddSheet(kind) {
    var isMed = kind === 'med';
    openSheet(
      '<div style="padding:2px 4px 4px;"><div style="font-size:17px;font-weight:700;">' +
      (isMed ? 'Add a medication' : 'Add surgical history') + '</div>' +
      '<div class="meta" style="margin-top:2px;">Scan a ' + (isMed ? 'prescription' : 'discharge summary') +
      ' and Narzim will read it, or enter the details yourself.</div></div>' +
      '<div style="padding:10px 4px 4px;">' +
      '<div class="center-modal-opt" data-act="add-scan" data-kind="' + kind + '" data-mode="camera"><span class="center-modal-ic"><svg class="ic18"><use href="#i-cam"/></svg></span><span class="center-modal-label">Take Photo</span></div>' +
      '<div class="center-modal-opt" data-act="add-scan" data-kind="' + kind + '" data-mode="library"><span class="center-modal-ic"><svg class="ic18"><use href="#i-doc"/></svg></span><span class="center-modal-label">Upload File</span></div>' +
      '<div class="center-modal-opt" data-act="add-manual" data-kind="' + kind + '"><span class="center-modal-ic"><svg class="ic18"><use href="#i-pencil"/></svg></span><span class="center-modal-label">Enter manually</span></div>' +
      '</div>'
    );
  }
  function openManualSheet(kind) {
    var isMed = kind === 'med';
    openSheet(
      '<div style="padding:2px 4px 4px;"><div style="font-size:17px;font-weight:700;">' +
      (isMed ? 'New medication' : 'New surgical record') + '</div>' +
      '<div class="meta" style="margin-top:2px;">Add the details you have. You can update them any time.</div></div>' +
      '<div style="padding:12px 4px 4px;">' +
      (isMed
        ? '<label class="flabel">Medication &amp; strength</label><input class="field" id="man-a" placeholder="e.g. Metformina 500 mg" />' +
          '<label class="flabel" style="margin-top:14px;">Schedule</label><input class="field" id="man-b" placeholder="e.g. Twice daily · 8:00 AM, 8:00 PM" />' +
          '<label class="flabel" style="margin-top:14px;">Prescribed by (optional)</label><input class="field" id="man-c" placeholder="e.g. Dr. Ricardo Morales" />'
        : '<label class="flabel">Procedure</label><input class="field" id="man-a" placeholder="e.g. Appendectomy" />' +
          '<label class="flabel" style="margin-top:14px;">Date</label><input class="field" id="man-b" placeholder="e.g. March 2019" />' +
          '<label class="flabel" style="margin-top:14px;">Hospital / surgeon (optional)</label><input class="field" id="man-c" placeholder="e.g. Hospital \u00c1ngeles" />') +
      '</div>' +
      '<div style="padding:16px 4px 4px;display:flex;flex-direction:column;gap:9px;">' +
      '<button class="flow-btn" style="height:46px;font-size:14.5px;" data-act="add-manual-save" data-kind="' + kind + '">Save</button>' +
      '<button class="flow-btn ghost" data-close>Cancel</button>' +
      '</div>'
    );
  }
  function addManualEntry(kind) {
    var a = ($('#man-a') && $('#man-a').value.trim()) || '';
    var b = ($('#man-b') && $('#man-b').value.trim()) || '';
    var c = ($('#man-c') && $('#man-c').value.trim()) || '';
    if (!a) { toast('Add a name first'); return; }
    var pane = panes.medications; if (!pane) return;
    var tag = '<span style="display:inline-flex;align-items:center;gap:4px;margin-left:7px;padding:2px 7px;border-radius:9px;background:#FEF3E2;color:#B45309;font-size:9.5px;font-weight:700;letter-spacing:.02em;vertical-align:1px;">UNVERIFIED</span>';
    if (kind === 'med') {
      var list = $('[data-healthpane="medications"] .tl', pane);
      if (!list) { toast('Could not add'); return; }
      var row = document.createElement('div');
      row.className = 'med-row tap';
      row.setAttribute('data-med-open', '');
      row.setAttribute('data-manual', 'med');
      row.setAttribute('data-med-name', a);
      row.setAttribute('data-med-dose', b || 'Schedule not set');
      row.setAttribute('data-med-doc', c || 'Self-reported');
      row.innerHTML = '<span class="med-dot" style="background:var(--m-anant)"></span>' +
        '<div style="flex:1;min-width:0;"><div class="med-n">' + a + tag + '</div>' +
        '<div class="med-s">' + (b || 'Schedule not set') + '</div>' +
        '<div class="med-s2">Mateo' + (c ? ' · ' + c : ' · Self-reported') + '</div></div>' +
        '<button class="iconbtn bell" data-bell><svg class="ic16" style="stroke:var(--muted)"><use href="#i-bell"/></svg></button>';
      list.appendChild(row);
    } else {
      var slist = $('[data-healthpane="surgical"] .tl', pane);
      if (!slist) { toast('Could not add'); return; }
      var srow = document.createElement('div');
      srow.className = 'med-row tap';
      srow.setAttribute('data-med-open', '');
      srow.setAttribute('data-manual', 'surg');
      srow.setAttribute('data-med-name', a);
      srow.setAttribute('data-med-dose', b || 'Date not set');
      srow.setAttribute('data-med-doc', c || 'Self-reported');
      srow.innerHTML = '<span class="med-dot" style="background:var(--m-anant)"></span>' +
        '<div style="flex:1;min-width:0;"><div class="med-n">' + a + tag + '</div>' +
        '<div class="med-s">' + (b || 'Date not set') + '</div>' +
        '<div class="med-s2">Mateo' + (c ? ' · ' + c : ' · Self-reported') + '</div></div>';
      slist.appendChild(srow);
    }
    closeOverlay();
    toast('Added', true);
  }

  /* ---------- auth + profile setup flow ---------- */
  var auMode = 'email', auDest = '', pfPlan = 'plus', pfCycle = 'monthly', pfExtracted = false;
  function auOtpValue() {
    return $all('[data-au-otp] input').map(function (i) { return i.value.trim(); }).join('');
  }
  function auSyncOtp() {
    var inputs = $all('[data-au-otp] input');
    inputs.forEach(function (i) { i.classList.toggle('filled', !!i.value.trim()); });
    var btn = $('[data-act="auth-verify"]');
    if (btn) btn.disabled = auOtpValue().length !== 6;
  }
  var PF_STEPS = ['Reading the document…', 'Identifying test names and values…', 'Matching against reference ranges…', 'Filing into your health record…'];
  function pfRenderReportsIdle() {
    var box = $('[data-pf-reports]'); if (!box) return;
    pfExtracted = false;
    var cta = $('[data-pf-reports-cta]'); if (cta) cta.textContent = 'Continue';
    box.innerHTML =
      '<h1 class="flow-h">Bring your history<br>along</h1>' +
      '<p class="flow-s">Add past lab reports or diagnoses and Narzim will read them for you — no typing.</p>' +
      '<div class="pf-drop">' +
      '<div class="pf-drop-ic"><svg class="ic24"><use href="#i-upload"/></svg></div>' +
      '<div class="pf-drop-t">Add a report</div>' +
      '<div class="pf-drop-s">PDF or photo. Lab results, prescriptions, discharge summaries.</div>' +
      '<div class="pf-drop-btns">' +
      '<button class="pf-drop-btn" data-act="pf-scan"><svg class="ic16" style="stroke:var(--brand)"><use href="#i-cam"/></svg>Camera</button>' +
      '<button class="pf-drop-btn" data-act="pf-scan"><svg class="ic16" style="stroke:var(--brand)"><use href="#i-doc"/></svg>Upload</button>' +
      '</div></div>';
  }
  function pfRunExtract() {
    var box = $('[data-pf-reports]'); if (!box) return;
    ccClearTimers();
    box.innerHTML =
      '<h1 class="flow-h">Reading your<br>report</h1>' +
      '<p class="flow-s">Narzim is pulling out the values so you don\u2019t have to.</p>' +
      '<div class="pf-scan">' +
      '<div class="pf-scan-orb"><svg class="ic24" style="stroke:none;fill:currentColor"><use href="#i-sparkle"/></svg></div>' +
      '<div class="pf-scan-t">Blood_Panel_Sep2026.pdf</div>' +
      '<div class="pf-scan-s">Laboratorio Azteca · 2 pages</div>' +
      '<div class="pf-scan-steps">' + PF_STEPS.map(function (s) {
        return '<div class="cc-conn-step"><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5"/></svg></span>' + s + '</div>';
      }).join('') + '</div></div>';
    var steps = $all('.cc-conn-step', box);
    steps.forEach(function (el, i) { ccT(setTimeout(function () { el.classList.add('on'); }, 350 + i * 620)); });
    ccT(setTimeout(pfRenderExtracted, 350 + steps.length * 620 + 400));
  }
  function pfRenderExtracted() {
    var box = $('[data-pf-reports]'); if (!box) return;
    pfExtracted = true;
    var cta = $('[data-pf-reports-cta]'); if (cta) cta.textContent = 'Looks right, continue';
    box.innerHTML =
      '<h1 class="flow-h">Here\u2019s what<br>Narzim found</h1>' +
      '<p class="flow-s">Review it and we\u2019ll add it to your record. You can edit any value later.</p>' +
      '<div class="pf-ex">' +
      '<div class="pf-ex-hd"><span class="pf-ex-ic"><svg class="ic18"><use href="#i-doc"/></svg></span>' +
      '<div><div class="pf-ex-t">Blood Chemistry Panel</div><div class="pf-ex-s">Laboratorio Azteca · 10 Sep 2026</div></div>' +
      '<span class="pf-ex-tag">EXTRACTED</span></div>' +
      '<div class="pf-ex-rows">' +
      '<span class="pf-ex-k">TSH</span><span class="pf-ex-v">2.3 mIU/L</span>' +
      '<span class="pf-ex-k">Free T4</span><span class="pf-ex-v">1.1 ng/dL</span>' +
      '<span class="pf-ex-k">Total cholesterol</span><span class="pf-ex-v">176 mg/dL</span>' +
      '<span class="pf-ex-k">HDL</span><span class="pf-ex-v">60 mg/dL</span>' +
      '<span class="pf-ex-k">Glucose (fasting)</span><span class="pf-ex-v">98 mg/dL</span>' +
      '<span class="pf-ex-k">Hemoglobin</span><span class="pf-ex-v">13.8 g/dL</span>' +
      '</div></div>' +
      '<div class="pf-ex" style="animation-delay:.1s">' +
      '<div class="pf-ex-hd"><span class="pf-ex-ic"><svg class="ic18"><use href="#i-user"/></svg></span>' +
      '<div><div class="pf-ex-t">Ordered by Dr. Tom\u00e1s Iglesias</div><div class="pf-ex-s">Thyroid panel · follow-up requested</div></div></div>' +
      '<div class="pf-ex-rows"><span class="pf-ex-k">Condition detected</span><span class="pf-ex-v">Hypothyroidism</span>' +
      '<span class="pf-ex-k">All values</span><span class="pf-ex-v">Within range</span></div></div>' +
      '<button class="flow-btn outline" data-act="pf-scan" style="margin-top:14px;height:44px;font-size:14px;">Add another report</button>';
  }
  function pfSyncPricing() {
    $all('[data-pr-plan]').forEach(function (c) { c.classList.toggle('on', c.dataset.prPlan === pfPlan); });
    $all('[data-pr-cycle] button').forEach(function (b) { b.classList.toggle('on', b.dataset.prC === pfCycle); });
    var amt = $('[data-pr-amt]'), per = $('[data-pr-per]');
    if (amt) amt.textContent = pfCycle === 'annual' ? '$3' : '$5';
    if (per) per.textContent = pfCycle === 'annual' ? 'per month, billed yearly' : 'per month';
    var go = $('[data-act="pricing-go"]');
    if (go) go.textContent = pfPlan === 'free' ? 'Continue on Free' : 'Start with Plus';
  }
  var SU_STEPS = [
    'Creating your secure health record…',
    'Linking your clinics and doctors…',
    'Filing your extracted reports…',
    'Setting up medication reminders…',
    'Almost there…'
  ];
  function runSetup() {
    ccClearTimers();
    var ring = $('[data-su-ring]'), pct = $('[data-su-pct]'), step = $('[data-su-step]');
    var i = 0;
    function tick() {
      if (i >= SU_STEPS.length) {
        if (ring) ring.setAttribute('stroke-dashoffset', '0');
        if (pct) pct.textContent = '100%';
        if (step) step.textContent = 'Ready!';
        ccT(setTimeout(finishSetup, 850));
        return;
      }
      var p = Math.round(((i + 1) / SU_STEPS.length) * 92);
      if (ring) ring.setAttribute('stroke-dashoffset', (264 * (1 - p / 100)).toFixed(1));
      if (pct) pct.textContent = p + '%';
      if (step) step.textContent = SU_STEPS[i];
      i++;
      ccT(setTimeout(tick, 900));
    }
    tick();
  }
  function finishSetup() {
    var nm = ($('[data-pf-name]') && $('[data-pf-name]').value.trim()) || 'Mateo';
    try { localStorage.setItem('nfh_onboarded', '1'); localStorage.setItem('nfh_name', nm); } catch (e) {}
    onboarded = true;
    applySelfName(nm);
    show('home', { noStack: true });
    setTimeout(function () { toast('Welcome to Narzim, ' + nm.split(/\s+/)[0] + '!', true); }, 480);
  }

  /* ---------- intro walkthrough ---------- */
  var introStep = 1;
  function renderIntro() {
    var pane = panes.intro; if (!pane) return;
    $all('[data-intro-slide]', pane).forEach(function (s) {
      var n = +s.dataset.introSlide;
      s.classList.toggle('on', n === introStep);
      s.classList.toggle('prev', n < introStep);
    });
    $all('[data-intro-dots] i', pane).forEach(function (d, i) { d.classList.toggle('on', i === introStep - 1); });
    var foot = $('.intro-foot', pane);
    foot.classList.toggle('has-back', introStep > 1);
    foot.classList.toggle('last', introStep === 3);
    var skip = $('.intro-skip', pane);
    if (skip) skip.style.visibility = introStep === 3 ? 'hidden' : 'visible';
  }
  function finishIntro() {
    try { localStorage.setItem('nfh-intro', '1'); } catch (e) {}
    if (onboarded) show('home', { noStack: true });
    else show('auth', { noStack: true });
  }

  /* ---------- onboarding + identity ---------- */
  function renderOnb() {
    var pane = panes.onboarding; if (!pane) return;
    $all('.onb-step', pane).forEach(function (s) { s.classList.toggle('on', (+s.dataset.step) === onbStep); });
    $all('.onb-dots i', pane).forEach(function (d, i) { d.classList.toggle('on', i < onbStep); });
    var bk = $('.onb-back', pane); if (bk) bk.style.visibility = (onbStep > 1) ? 'visible' : 'hidden';
    var body = $('.body', pane); if (body) body.scrollTop = 0;
  }
  function applySelfName(name) {
    var raw = (name || 'Mateo').trim();
    var first = raw.split(/\s+/)[0] || 'Mateo';
    var full = raw.indexOf(' ') >= 0 ? raw : (first + ' Alejandro Vega Castillo');
    $all('.js-selfname').forEach(function (e) { e.textContent = first; });
    $all('.js-selfinitial').forEach(function (e) { e.textContent = first.charAt(0).toUpperCase(); });
    MEMBER_NAMES.anant = full;
    $all('.pill[data-member="anant"]').forEach(function (p) {
      for (var i = 0; i < p.childNodes.length; i++) {
        var n = p.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim()) { n.textContent = first; }
      }
    });
  }
  function finishOnb(enabled) {
    var nmEl = document.getElementById('onb-name');
    var nm = (nmEl && nmEl.value.trim()) || 'Mateo';
    try { localStorage.setItem('nfh_onboarded', '1'); localStorage.setItem('nfh_name', nm); } catch (err) {}
    applySelfName(nm);
    show('home', { noStack: true });
    if (enabled) setTimeout(function () { toast('Reminders are on', true); }, 420);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'chat-input') { chatSend(); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'chat-search-input') chatSearchRun(e.target.value.trim());
  });

  /* ---------- draggable chat FAB ---------- */
  function initChatFabDrag() {
    var fab = document.querySelector('.chatfab');
    if (!fab) return;
    var host = fab.parentElement, saved = null;
    try { saved = JSON.parse(localStorage.getItem('nfh-chatfab-pos') || 'null'); } catch (e) {}
    function place(x, y) {
      var hb = host.getBoundingClientRect(), s = fab.offsetWidth, pad = 12;
      x = Math.max(pad, Math.min(x, hb.width - s - pad));
      y = Math.max(pad, Math.min(y, hb.height - s - pad));
      fab.style.left = x + 'px'; fab.style.top = y + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
      return { x: x, y: y };
    }
    if (saved) place(saved.x, saved.y);

    var down = false, moved = false, dx = 0, dy = 0;
    fab.addEventListener('pointerdown', function (e) {
      var fb = fab.getBoundingClientRect(), hb = host.getBoundingClientRect();
      down = true; moved = false;
      dx = e.clientX - fb.left; dy = e.clientY - fb.top;
      if (!fab.style.left) place(fb.left - hb.left, fb.top - hb.top);
      fab.setPointerCapture(e.pointerId);
    });
    fab.addEventListener('pointermove', function (e) {
      if (!down) return;
      var hb = host.getBoundingClientRect();
      var nx = e.clientX - hb.left - dx, ny = e.clientY - hb.top - dy;
      if (!moved && Math.abs(nx - parseFloat(fab.style.left)) + Math.abs(ny - parseFloat(fab.style.top)) > 4) {
        moved = true; fab.classList.add('dragging');
      }
      if (moved) place(nx, ny);
    });
    function end() {
      if (!down) return;
      down = false; fab.classList.remove('dragging');
      if (moved) {
        try { localStorage.setItem('nfh-chatfab-pos', JSON.stringify({ x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) })); } catch (e) {}
        setTimeout(function () { moved = false; }, 0);
      }
    }
    fab.addEventListener('pointerup', end);
    fab.addEventListener('pointercancel', end);
    fab.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ---------- boot ---------- */
  function boot() {
    $all('.pane').forEach(function (p) { panes[p.dataset.screen] = p; });
    buildNav();
    renderMedTimeline();
    initChatFabDrag();
    Object.keys(panes).forEach(function (k) { paintPills(panes[k]); });
    paintPickPills();
    refreshScanConfirm();
    member = homeMember;
    paintMemberChips();

    // cue-card carousel dot sync
    (function () {
      var rail = document.getElementById('cue-rail');
      var dots = $all('#cue-dots .cue-dot');
      if (!rail || !dots.length) return;
      var n = dots.length;
      rail.addEventListener('scroll', function () {
        var idx = Math.round(rail.scrollLeft / (rail.scrollWidth / n));
        idx = Math.max(0, Math.min(n - 1, idx));
        dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
      }, { passive: true });
    }());

    try { onboarded = !!localStorage.getItem('nfh_onboarded'); savedName = localStorage.getItem('nfh_name') || 'Mateo'; } catch (err) {}
    if (onboarded) applySelfName(savedName);

    show('home', { noStack: true });   // underlying fallback (hidden beneath splash)
    var splash = document.getElementById('splash');
    setTimeout(function () {
      if (splash) splash.classList.add('hide');
      var introSeen = false;
      try { introSeen = localStorage.getItem('nfh-intro') === '1'; } catch (e) {}
      if (!introSeen) { introStep = 1; renderIntro(); show('intro', { noStack: true }); }
      else if (onboarded) { show('home', { noStack: true }); }
      else { show('auth', { noStack: true }); }
    }, 1700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ========== STEP CHECK-IN ========== */
  var ckCurrent = 1;
  var CK_TOTAL  = 5;

  function ckRenderDots(step) {
    var el = document.getElementById('ck-dots'); if (!el) return;
    var html = '';
    for (var i = 1; i <= CK_TOTAL; i++) html += '<div class="ck-dot' + (i === step ? ' on' : '') + '"></div>';
    el.innerHTML = html;
  }

  function ckAdvance() {
    var pane = panes['dailycheck']; if (!pane) return;
    var cur = pane.querySelector('.ck-step.active');
    var bar = document.getElementById('ck-bar');
    var nextStep = ckCurrent + 1;

    if (nextStep <= CK_TOTAL) {
      if (cur) cur.classList.remove('active');
      var next = pane.querySelector('.ck-step[data-step="' + nextStep + '"]');
      if (next) next.classList.add('active');
      ckCurrent = nextStep;
      ckRenderDots(ckCurrent);
      // last step = note → change button label
      if (bar) $('button', bar).innerHTML = nextStep === CK_TOTAL
        ? 'Send to Dr. Morales <svg class="ic18" style="stroke:#fff;margin-left:4px;"><use href="#i-check"/></svg>'
        : 'Next <svg class="ic18" style="stroke:#fff;margin-left:4px;"><use href="#i-chevron"/></svg>';
    } else {
      // show done state
      if (cur) cur.classList.remove('active');
      var done = document.getElementById('ck-done');
      if (done) done.classList.add('active');
      if (bar) bar.style.display = 'none';
    }
  }

  // reset step state when entering the screen
  var _origShow = show;
  show = function (name, opts) {
    if (name === 'dailycheck') {
      ckCurrent = 1;
      setTimeout(function () {
        var pane = panes['dailycheck']; if (!pane) return;
        $all('.ck-step', pane).forEach(function (s) { s.classList.remove('active'); });
        var first = pane.querySelector('.ck-step[data-step="1"]');
        if (first) first.classList.add('active');
        var done = document.getElementById('ck-done');
        if (done) done.classList.remove('active');
        var bar = document.getElementById('ck-bar');
        if (bar) { bar.style.display = ''; $('button', bar).innerHTML = 'Next <svg class="ic18" style="stroke:#fff;margin-left:4px;"><use href="#i-chevron"/></svg>'; }
        $all('.ck-opt', pane).forEach(function (o) { o.classList.remove('on'); });
        ckRenderDots(1);
      }, 0);
    }
    return _origShow(name, opts);
  };

  /* ========== HEALTH PULSE CHECK-IN ========== */
  var hpAnswers = {};
  var HP_STEPS = 2;
  var HP_XP_BASE = 450;

  function hpStoreAns(stepIdx, ans) { hpAnswers[stepIdx] = ans; }

  function hpAdvance(stepIdx) {
    var dots = $all('.hp-dot');
    if (dots[stepIdx]) { dots[stepIdx].classList.remove('on'); dots[stepIdx].classList.add('done'); }
    var steps = $all('.hp-step');
    var nextIdx = stepIdx + 1;
    if (nextIdx < HP_STEPS) {
      steps.forEach(function(s) { s.classList.remove('active'); });
      if (steps[nextIdx]) steps[nextIdx].classList.add('active');
      if (dots[nextIdx]) dots[nextIdx].classList.add('on');
    } else {
      var stepsWrap = document.getElementById('hp-steps');
      var dotsWrap  = document.getElementById('hp-dots');
      if (stepsWrap) stepsWrap.style.display = 'none';
      if (dotsWrap)  dotsWrap.style.display  = 'none';
      var done = document.getElementById('hp-done');
      if (done) done.classList.add('on');
      var xpPill = document.getElementById('hp-xp-pill');
      if (xpPill) xpPill.textContent = '⚡ ' + (HP_XP_BASE + 10) + ' XP';
      toast('✨ +10 XP — Day 12 streak alive!', true);
    }
  }

  function hpReset() {
    hpAnswers = {};
    var stepsWrap = document.getElementById('hp-steps');
    var dotsWrap  = document.getElementById('hp-dots');
    if (stepsWrap) stepsWrap.style.display = '';
    if (dotsWrap)  dotsWrap.style.display  = '';
    var done = document.getElementById('hp-done');
    if (done) done.classList.remove('on');
    var steps = $all('.hp-step');
    steps.forEach(function(s, i) {
      s.classList.toggle('active', i === 0);
      $all('.hp-opt', s).forEach(function(o) { o.classList.remove('sel-ok','sel-mid','sel-low'); });
    });
    var dots = $all('.hp-dot');
    dots.forEach(function(d, i) { d.classList.remove('on','done'); if (i === 0) d.classList.add('on'); });
    var xpPill = document.getElementById('hp-xp-pill');
    if (xpPill) xpPill.textContent = '⚡ ' + HP_XP_BASE + ' XP';
  }

  /* ========== VOICE CHECK-IN ========== */
  var voiceRecog = null;
  var voiceActive = false;
  var voiceFinalText = '';

  function getCheckinPane() { return panes['dailycheck'] || document.querySelector('[data-screen="dailycheck"]'); }

  function voiceSetSymptom(symptomName, optionText) {
    var pane = getCheckinPane(); if (!pane) return;
    var grp = pane.querySelector('[data-symptom="' + symptomName + '"]'); if (!grp) return;
    var chips = $all('.ochip', grp);
    chips.forEach(function (c) { c.classList.remove('on'); });
    var match = chips.filter(function (c) { return c.textContent.trim().toLowerCase() === optionText.toLowerCase(); })[0];
    if (match) match.classList.add('on');
  }

  function voiceSetToggle(qid, state) {
    var pane = getCheckinPane(); if (!pane) return;
    var tog = pane.querySelector('[data-qid="' + qid + '"]'); if (!tog) return;
    if (state) tog.classList.add('on'); else tog.classList.remove('on');
  }

  function parseVoice(text) {
    var t = text.toLowerCase();
    var parsed = [];

    // Fever
    if (/fever/.test(t)) {
      if (/no fever|fever.{0,6}none|none.{0,6}fever/.test(t))       { voiceSetSymptom('fever', 'None'); parsed.push('Fever: None'); }
      else if (/fever.{0,6}same|same.{0,6}fever/.test(t))           { voiceSetSymptom('fever', 'Same'); parsed.push('Fever: Same'); }
      else if (/high fever|fever.{0,6}high|fever.{0,6}bad/.test(t)) { voiceSetSymptom('fever', 'High'); parsed.push('Fever: High'); }
    }

    // Cough
    if (/cough/.test(t)) {
      if (/cough.{0,8}better|better.{0,8}cough/.test(t))  { voiceSetSymptom('cough', 'Better'); parsed.push('Cough: Better'); }
      else if (/cough.{0,8}same|same.{0,8}cough/.test(t)) { voiceSetSymptom('cough', 'Same');   parsed.push('Cough: Same'); }
      else if (/cough.{0,8}worse|worse.{0,8}cough/.test(t)){ voiceSetSymptom('cough', 'Worse'); parsed.push('Cough: Worse'); }
    }

    // Energy
    if (/energy|tired|energetic/.test(t)) {
      if (/energy.{0,8}better|feeling better|more energy|energetic/.test(t))  { voiceSetSymptom('energy', 'Better'); parsed.push('Energy: Better'); }
      else if (/energy.{0,8}same|same energy/.test(t))                         { voiceSetSymptom('energy', 'Same');   parsed.push('Energy: Same'); }
      else if (/energy.{0,8}worse|less energy|very tired|exhausted/.test(t))   { voiceSetSymptom('energy', 'Worse'); parsed.push('Energy: Worse'); }
    }

    // Shortness of breath
    if (/short.{0,4}breath|can.t breathe|trouble breath|breathing.{0,6}hard/.test(t)) {
      var hasBreath = !/no shortness|not short|no trouble/.test(t);
      voiceSetToggle('breath', hasBreath);
      parsed.push('Shortness of breath: ' + (hasBreath ? 'Yes' : 'No'));
    }

    // Medication
    if (/took.{0,10}med|took.{0,10}pill|took.{0,10}medicine|yes.{0,6}med/.test(t)) {
      voiceSetToggle('medication', true); parsed.push('Took medication: Yes');
    } else if (/didn.t take|did not take|missed.{0,6}med|no.{0,6}med/.test(t)) {
      voiceSetToggle('medication', false); parsed.push('Took medication: No');
    }

    // New symptoms
    if (/new symptom|something new|new issue|new problem/.test(t)) {
      var hasNew = !/no new|don.t have new/.test(t);
      voiceSetToggle('newsymptoms', hasNew);
      parsed.push('New symptoms: ' + (hasNew ? 'Yes' : 'No'));
    }

    // Care team note — grab anything after "tell", "note", "say", "feeling like", "I feel"
    var noteMatch = t.match(/(?:note(?:s)?[:—\s]+|tell (?:my )?(?:doctor|team|care team)[:—\s]+|i feel like\s+|i feel\s+|i.m feeling\s+)([\w\s,.']+)/);
    if (noteMatch && noteMatch[1] && noteMatch[1].trim().length > 3) {
      var note = noteMatch[1].trim();
      var ta = document.getElementById('checkin-note');
      if (ta) { ta.value = note.charAt(0).toUpperCase() + note.slice(1); parsed.push('Note added'); }
    }

    return parsed;
  }

  function startVoice() {
    var scrim = document.getElementById('voice-scrim'); if (!scrim) return;
    var statusEl = document.getElementById('voice-status');
    var transcriptEl = document.getElementById('voice-transcript');
    var parsedEl = document.getElementById('voice-parsed');

    voiceFinalText = '';
    if (parsedEl) parsedEl.textContent = '';
    if (transcriptEl) transcriptEl.textContent = 'Speak naturally — say things like\n"fever is none, cough is better, took my medication"';

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast('Voice input is not supported in this browser');
      return;
    }

    scrim.classList.add('on');

    voiceRecog = new SR();
    voiceRecog.continuous = true;
    voiceRecog.interimResults = true;
    voiceRecog.lang = 'en-US';
    voiceActive = true;

    voiceRecog.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) voiceFinalText += e.results[i][0].transcript + ' ';
        else interim = e.results[i][0].transcript;
      }
      if (transcriptEl) transcriptEl.textContent = (voiceFinalText + interim).trim() || '';
      var applied = parseVoice(voiceFinalText);
      if (parsedEl && applied.length) parsedEl.textContent = '✓ ' + applied.join(' · ');
    };

    voiceRecog.onerror = function (e) {
      if (statusEl) statusEl.textContent = 'Could not hear you — try again';
      $all('.voice-ring', scrim).forEach(function (r) { r.classList.add('stop'); });
    };

    voiceRecog.onend = function () {
      if (voiceActive) voiceRecog.start(); // keep listening until user taps Done
    };

    voiceRecog.start();
    if (statusEl) statusEl.textContent = 'Listening…';
    $all('.voice-ring', scrim).forEach(function (r) { r.classList.remove('stop'); });
  }

  function stopVoice() {
    voiceActive = false;
    if (voiceRecog) { try { voiceRecog.stop(); } catch(e){} voiceRecog = null; }
    var scrim = document.getElementById('voice-scrim');
    if (scrim) scrim.classList.remove('on');
    var applied = parseVoice(voiceFinalText);
    if (applied.length) toast('Updated: ' + applied.join(', '), true);
  }

})();
