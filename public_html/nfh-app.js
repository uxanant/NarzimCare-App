/* Narzim Family Health — App Logic */
(function () {
  'use strict';

  /* ─── Bottom nav config ─── */
  const NAV_TABS = [
    { id: 'home',         label: 'Home',    icon: '#i-home' },
    { id: 'appointments', label: 'Visits',  icon: '#i-cal'  },
    { id: 'fab',          label: '',        icon: '#i-plus' },
    { id: 'medications',  label: 'Meds',    icon: '#i-pill' },
    { id: 'profile',      label: 'Profile', icon: '#i-user' },
  ];

  /* screens whose pane has a persistent bottom nav */
  const NAV_SCREENS = new Set(['home', 'appointments', 'medications', 'profile', 'files', 'doctors', 'insurance']);

  /* ─── Render nav bars into each .nav placeholder ─── */
  function buildNav(navEl, activeScreen) {
    navEl.innerHTML = '';
    NAV_TABS.forEach(tab => {
      if (tab.id === 'fab') {
        const btn = document.createElement('button');
        btn.className = 'nav-fab';
        btn.innerHTML = `<span class="nfb"><svg class="nicon" style="stroke:#fff"><use href="${tab.icon}"/></svg></span>`;
        btn.addEventListener('click', () => navigate('camera'));
        navEl.appendChild(btn);
      } else {
        const btn = document.createElement('button');
        btn.className = 'nav-item' + (tab.id === activeScreen ? ' on' : '');
        btn.dataset.navTab = tab.id;
        btn.innerHTML = `<svg class="nicon"><use href="${tab.icon}"/></svg><span>${tab.label}</span>`;
        btn.addEventListener('click', () => navigate(tab.id));
        navEl.appendChild(btn);
      }
    });
    const ind = document.createElement('div');
    ind.className = 'home-ind';
    navEl.appendChild(ind);
  }

  /* ─── Screen registry & navigation stack ─── */
  const panes = {};
  document.querySelectorAll('[data-screen]').forEach(el => {
    panes[el.dataset.screen] = el;
  });

  let currentScreen = 'home';
  const historyStack = [];

  function showScreen(id, pushHistory) {
    const prev = panes[currentScreen];
    const next = panes[id];
    if (!next) return;

    if (prev && prev !== next) {
      prev.classList.remove('active');
    }
    next.classList.add('active');

    if (pushHistory && currentScreen !== id) {
      historyStack.push(currentScreen);
    }
    currentScreen = id;

    /* update nav tabs */
    document.querySelectorAll('[data-nav-tab]').forEach(b => {
      b.classList.toggle('on', b.dataset.navTab === id);
    });

    /* rebuild nav in the newly active pane */
    next.querySelectorAll('.nav').forEach(nav => buildNav(nav, id));

    /* scroll body to top */
    const body = next.querySelector('.body');
    if (body) body.scrollTop = 0;
  }

  function navigate(id) {
    if (id === 'back') {
      const prev = historyStack.pop();
      if (prev) showScreen(prev, false);
      return;
    }
    showScreen(id, true);
  }

  /* ─── Delegated click handler ─── */
  document.addEventListener('click', function (e) {
    /* data-go */
    const goEl = e.target.closest('[data-go]');
    if (goEl) { navigate(goEl.dataset.go); return; }

    /* data-toast */
    const toastEl = e.target.closest('[data-toast]');
    if (toastEl) { showToast(toastEl.dataset.toast); return; }

    /* data-toggle */
    const togEl = e.target.closest('[data-toggle]');
    if (togEl && !e.target.closest('[data-go]')) {
      togEl.classList.toggle('on');
      return;
    }

    /* data-pick: segmented / ochips / pills — single select within group */
    const pickItem = e.target.closest('.seg, .ochip, [data-pick] .pill');
    if (pickItem) {
      const group = pickItem.closest('[data-pick]');
      if (group) {
        const isExclusive = !group.dataset.pick || group.dataset.pick === 'scanfor' || group.dataset.pick === 'medfor';
        if (pickItem.classList.contains('pill')) {
          /* pills: toggle the clicked one */
          if (group.dataset.pick === 'scanfor' || group.dataset.pick === 'medfor') {
            group.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
            pickItem.classList.add('on');
          } else {
            pickItem.classList.toggle('on');
          }
          syncPillColors(group);
        } else {
          group.querySelectorAll('.seg, .ochip').forEach(s => s.classList.remove('on'));
          pickItem.classList.add('on');
        }
      }
      return;
    }

    /* moods */
    const moodBtn = e.target.closest('[data-moods] [data-mood]');
    if (moodBtn) {
      moodBtn.closest('[data-moods]').querySelectorAll('[data-mood]').forEach(b => b.classList.remove('on'));
      moodBtn.classList.add('on');
      return;
    }

    /* appointment status tabs */
    const statusBtn = e.target.closest('[data-status]');
    if (statusBtn) {
      const seg = statusBtn.closest('.seg-full') || statusBtn.parentElement;
      seg.querySelectorAll('[data-status]').forEach(b => b.classList.remove('on'));
      statusBtn.classList.add('on');
      filterApptStatus(statusBtn.dataset.status);
      return;
    }

    /* data-homefilter — family member filter picker */
    const hfBtn = e.target.closest('[data-homefilter]');
    if (hfBtn) { showToast('Switch family member'); return; }

    /* data-openfilters */
    if (e.target.closest('[data-openfilters]')) { showToast('Filter appointments'); return; }

    /* data-act */
    const actEl = e.target.closest('[data-act]');
    if (actEl) { handleAct(actEl.dataset.act, actEl); return; }

    /* log button (hm-log) */
    if (e.target.closest('.hm-log[data-toast]')) return; // handled above

    /* file open */
    const fileEl = e.target.closest('[data-fileopen]');
    if (fileEl) { navigate('fileviewer'); return; }

    /* doctor row */
    const docEl = e.target.closest('[data-go-doctor]');
    if (docEl) { loadDoctorProfile(docEl.dataset.goDoctor); navigate('doctor'); return; }

    /* member view */
    const memEl = e.target.closest('[data-member-view]');
    if (memEl) { loadMemberView(memEl.dataset.memberView); navigate('memberview'); return; }

    /* chat open widget */
    const chatOpenEl = e.target.closest('[data-chat-open-widget]');
    if (chatOpenEl) { openChatOverlay(); return; }

    /* ac-sug (autocomplete suggestion) */
    const sugEl = e.target.closest('.ac-sug');
    if (sugEl) {
      const input = sugEl.closest('.card').querySelector('.field');
      if (input) input.value = sugEl.textContent.trim();
      sugEl.closest('.border') && (sugEl.closest('[class*="border"]').style.display = 'none');
      return;
    }
  });

  /* ─── Pill color sync ─── */
  function syncPillColors(group) {
    group.querySelectorAll('.pill').forEach(p => {
      const isOn = p.dataset.on !== undefined || p.classList.contains('on');
      const color = p.dataset.mcolor || 'var(--brand)';
      if (p.classList.contains('on') || p.hasAttribute('data-on')) {
        p.style.background = color.replace('var(', 'rgba(').replace(')', ', .12)') || 'rgba(1,96,102,.12)';
        p.style.borderColor = color;
        p.style.color = 'var(--brand-dark)';
        p.querySelector('.pdot') && (p.querySelector('.pdot').style.background = color);
      } else {
        p.style.background = '';
        p.style.borderColor = 'rgba(60,60,67,.2)';
        p.style.color = 'var(--muted)';
      }
    });
  }

  /* init pill colors on load */
  document.querySelectorAll('[data-pick] .pill[data-on]').forEach(p => {
    p.classList.add('on');
  });
  document.querySelectorAll('[data-pick]:has(.pill)').forEach(g => syncPillColors(g));

  /* ─── Appointment status filter ─── */
  function filterApptStatus(status) {
    const upcoming = document.querySelector('[data-apptsec="upcoming"]');
    const past = document.querySelector('[data-apptsec="past"]');
    if (!upcoming || !past) return;
    if (status === 'upcoming') { upcoming.style.display = ''; past.style.display = 'none'; }
    else if (status === 'past') { upcoming.style.display = 'none'; past.style.display = ''; }
    else { upcoming.style.display = ''; past.style.display = ''; }
  }

  /* ─── Toast ─── */
  let toastTimer;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.style.cssText = `
      position:absolute; bottom:96px; left:50%; transform:translateX(-50%);
      background:rgba(30,30,32,.92); color:#fff; font-size:13px; font-weight:500;
      padding:8px 16px; border-radius:10px; white-space:nowrap; z-index:999;
      backdrop-filter:blur(10px); pointer-events:none;
      animation: toastIn .2s ease both;
    `;
    toastTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2200);
    setTimeout(() => { el.style.opacity = ''; el.style.transition = ''; }, 2600);
  }

  /* ─── Action handlers ─── */
  function handleAct(act, el) {
    switch (act) {
      case 'confirm-scan':
        showToast('Saved 2 medications');
        setTimeout(() => navigate('medications'), 600);
        break;
      case 'save-med':
        showToast('Medication saved');
        setTimeout(() => navigate('back'), 600);
        break;
      case 'save-profile':
        showToast('Profile updated');
        setTimeout(() => navigate('back'), 600);
        break;
      case 'save-family':
        showToast('Member saved');
        setTimeout(() => navigate('back'), 600);
        break;
      case 'confirm-book':
        showToast('Appointment booked');
        setTimeout(() => navigate('appointments'), 600);
        break;
      case 'cancel-appt':
        showToast('Appointment cancelled');
        setTimeout(() => navigate('back'), 600);
        break;
      case 'show-invoice':
        navigate('invoice');
        break;
      case 'revoke-clinic':
        showToast('Access revoked');
        break;
      case 'upload-file':
        showToast('Choose a file to upload');
        break;
      case 'rm-tag':
        el.closest('.tag') && el.closest('.tag').remove();
        break;
      case 'add-tag': {
        const section = el.closest('.card');
        const input = section && section.querySelector('input.field');
        const val = input && input.value.trim();
        if (val) {
          const tone = el.dataset.tone || 'teal';
          const colors = { violet: ['rgba(155,111,212,.14)', '#7A4FB5'], amber: ['rgba(212,137,74,.14)', '#B5651D'], teal: ['rgba(1,96,102,.1)', 'var(--brand-dark)'] };
          const [bg, color] = colors[tone] || colors.teal;
          const tagContainer = el.closest('.tag-edit') || el.previousElementSibling;
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.style.cssText = `background:${bg};color:${color};`;
          tag.innerHTML = `${val}<button class="tx" data-act="rm-tag"><svg style="width:12px;height:12px;stroke:currentColor;stroke-width:2.6;fill:none;stroke-linecap:round;"><use href="#i-x"/></svg></button>`;
          el.before(tag);
          input.value = '';
        }
        break;
      }
      case 'to-extract':
        showToast('Extracting from photos…');
        setTimeout(() => navigate('scan'), 1200);
        break;
      case 'cam-done':
        navigate('photocheck');
        break;
      case 'shutter':
        doShutter();
        break;
      case 'ck-next':
        checkinNext();
        break;
      case 'voice-checkin':
        openVoice();
        break;
      case 'voice-stop':
        closeVoice();
        break;
      default:
        showToast(act.replace(/-/g, ' '));
    }
  }

  /* ─── Camera shutter ─── */
  let camCount = 0;
  function doShutter() {
    const flash = document.querySelector('.cam-flash');
    if (flash) { flash.classList.add('go'); setTimeout(() => flash.classList.remove('go'), 400); }
    camCount++;
    const countEl = document.querySelector('[data-cam-count]');
    if (countEl) countEl.textContent = camCount;
    const review = document.querySelector('.cam-review');
    if (review) review.classList.add('show');
    const strip = document.querySelector('.cam-strip');
    if (strip) {
      const thumb = document.createElement('div');
      thumb.className = 'cam-thumb';
      thumb.innerHTML = '<div class="tln" style="width:80%"></div><div class="tln" style="width:60%"></div><div class="tln" style="width:70%"></div>';
      const empty = strip.querySelector('.empty');
      if (empty) empty.remove();
      strip.appendChild(thumb);
    }
  }

  /* ─── Daily check-in ─── */
  let ckStep = 1;
  const CK_TOTAL = 5;

  function initCheckin() {
    ckStep = 1;
    document.querySelectorAll('.ck-step').forEach((s, i) => {
      s.classList.toggle('active', i === 0);
    });
    const done = document.getElementById('ck-done');
    if (done) done.style.display = 'none';
    const bar = document.getElementById('ck-bar');
    if (bar) bar.style.display = '';
    updateCkDots();
  }

  function checkinNext() {
    if (ckStep >= CK_TOTAL) {
      /* show done state */
      document.querySelectorAll('.ck-step').forEach(s => s.classList.remove('active'));
      const done = document.getElementById('ck-done');
      if (done) done.style.display = 'flex';
      const bar = document.getElementById('ck-bar');
      if (bar) bar.style.display = 'none';
      return;
    }
    const current = document.querySelector(`.ck-step[data-step="${ckStep}"]`);
    ckStep++;
    const next = document.querySelector(`.ck-step[data-step="${ckStep}"]`);
    if (current) current.classList.remove('active');
    if (next) next.classList.add('active');
    updateCkDots();
  }

  function updateCkDots() {
    const wrap = document.getElementById('ck-dots');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let i = 1; i <= CK_TOTAL; i++) {
      const d = document.createElement('div');
      d.style.cssText = `width:${i <= ckStep ? 18 : 6}px;height:6px;border-radius:4px;background:${i <= ckStep ? 'var(--brand)' : 'rgba(1,96,102,.2)'};transition:all .3s;`;
      wrap.appendChild(d);
    }
  }

  /* re-init check-in each time we navigate to it */
  const ckObs = new MutationObserver(() => {
    const pane = panes['dailycheck'];
    if (pane && pane.classList.contains('active')) initCheckin();
  });
  if (panes['dailycheck']) ckObs.observe(panes['dailycheck'], { attributeFilter: ['class'] });

  /* ─── Voice overlay ─── */
  function openVoice() {
    const scrim = document.getElementById('voice-scrim');
    if (scrim) scrim.style.display = 'flex';
    const status = document.getElementById('voice-status');
    const parsed = document.getElementById('voice-parsed');
    if (status) status.textContent = 'Listening…';
    if (parsed) parsed.textContent = '';
    /* simulate voice input */
    setTimeout(() => {
      if (status) status.textContent = 'Got it…';
      if (parsed) parsed.textContent = '✓ Energy: Better · Chest: None · Medication: Yes';
    }, 2000);
  }

  function closeVoice() {
    const scrim = document.getElementById('voice-scrim');
    if (scrim) scrim.style.display = 'none';
  }

  document.getElementById('voice-scrim') && document.getElementById('voice-scrim').addEventListener('click', closeVoice);

  /* ─── Doctor profiles ─── */
  const DOCTORS = {
    morales: {
      initials: 'RM', color: 'var(--m-anant)', name: 'Dr. Ricardo Morales',
      spec: 'Cardiology', clinic: 'Hospital Ángeles, Polanco',
      bio: 'Board-certified cardiologist with over 18 years of experience in preventive and interventional cardiology. Known for a calm, methodical approach that puts patients at ease.',
      since: 'Your doctor since March 2024',
      visits: [
        { date: '13', month: 'MAY', time: '11:00', label: 'Follow-up · Cardiology', status: 'completed' },
        { date: '14', month: 'MAR', time: '10:30', label: 'ECG + check-up', status: 'completed' },
      ]
    },
    castillo: {
      initials: 'AC', color: 'var(--m-aryan)', name: 'Dr. Ariel Castillo',
      spec: 'Pediatrics', clinic: 'Clínica Roma',
      bio: 'Pediatrician specializing in childhood respiratory conditions and developmental monitoring. Warm and patient with young patients.',
      since: 'Your doctor since Jan 2025',
      visits: [
        { date: '02', month: 'APR', time: '9:00', label: 'Pulmonology check', status: 'completed' },
      ]
    },
    reyes: {
      initials: 'VR', color: 'var(--m-priya)', name: 'Dr. Valentina Reyes',
      spec: 'Internal Medicine', clinic: 'Hospital Español',
      bio: 'Internist with a focus on managing chronic conditions and coordinating care across specialists. Highly regarded for her thoroughness.',
      since: 'Your doctor since Jun 2023',
      visits: [
        { date: '28', month: 'APR', time: '4:00', label: 'Annual check-up', status: 'completed' },
        { date: '10', month: 'FEB', time: '3:30', label: 'Lab results review', status: 'completed' },
      ]
    }
  };

  function loadDoctorProfile(key) {
    const d = DOCTORS[key]; if (!d) return;
    const av = document.querySelector('[data-doc-av]');
    const nm = document.querySelector('[data-doc-name]');
    const sp = document.querySelector('[data-doc-spec]');
    const cl = document.querySelector('[data-doc-clinic]');
    const bi = document.querySelector('[data-doc-bio]');
    const si = document.querySelector('[data-doc-since]');
    const vs = document.querySelector('[data-doc-visits]');
    if (av) { av.textContent = d.initials; av.style.background = d.color; }
    if (nm) nm.textContent = d.name;
    if (sp) sp.textContent = d.spec;
    if (cl) cl.textContent = d.clinic;
    if (bi) bi.textContent = d.bio;
    if (si) si.textContent = d.since;
    if (vs) {
      vs.innerHTML = d.visits.map(v => `
        <div class="appt-row tap" style="--mc:${d.color};">
          <div class="appt-date"><span class="d">${v.date}</span><span class="m">${v.month}</span><span class="t">${v.time}</span></div>
          <div style="flex:1;min-width:0;"><div class="appt-nm">${v.label}</div></div>
          <span class="chip chip-completed">Done</span>
        </div>`).join('');
    }
  }

  /* ─── Member view ─── */
  const MEMBERS = {
    anant:  { initial: 'A', color: 'var(--m-anant)', name: 'Mateo Alejandro Vega Castillo', rel: 'Self', age: 38, gender: 'Male', blood: 'O+', conditions: ['Hypertension'], allergies: ['Penicillin'] },
    priya:  { initial: 'S', color: 'var(--m-priya)', name: 'Sofía Guadalupe Herrera Ríos',    rel: 'Spouse', age: 35, gender: 'Female', blood: 'A-', conditions: ['Asthma'], allergies: ['Peanuts'] },
    aryan:  { initial: 'D', color: 'var(--m-aryan)', name: 'Diego Emiliano Vega Herrera',      rel: 'Child',  age: 9,  gender: 'Male',   blood: 'B+', conditions: [], allergies: [] },
    mother: { initial: 'L', color: 'var(--m-mother)',name: 'Lucía Esperanza Castillo Ríos',   rel: 'Parent', age: 62, gender: 'Female', blood: 'AB+', conditions: ['Diabetes'], allergies: [] }
  };

  function loadMemberView(key) {
    const m = MEMBERS[key]; if (!m) return;
    const title = document.getElementById('mv-title');
    const hero  = document.getElementById('mv-hero');
    const pers  = document.getElementById('mv-personal');
    const health = document.getElementById('mv-health');
    if (title) title.textContent = m.rel === 'Self' ? 'My profile' : m.name.split(' ')[0];
    if (hero) hero.innerHTML = `
      <div class="pav" style="background:${m.color}">${m.initial}</div>
      <div class="pname">${m.name}</div>
      <div class="pmeta">${m.rel} · ${m.age} years old</div>`;
    if (pers) pers.innerHTML = `
      <div class="info-row"><span class="k">Relationship</span><span class="v">${m.rel}</span></div>
      <div class="info-row"><span class="k">Age</span><span class="v">${m.age}</span></div>
      <div class="info-row"><span class="k">Gender</span><span class="v">${m.gender}</span></div>`;
    if (health) health.innerHTML = `
      <div class="info-row"><span class="k">Blood type</span><span class="v">${m.blood}</span></div>
      <div class="info-row multi"><span class="k">Conditions</span><span class="v">${m.conditions.length ? m.conditions.map(c => `<span class="info-pill" style="background:rgba(155,111,212,.12);color:#7A4FB5;">${c}</span>`).join('') : '—'}</span></div>
      <div class="info-row multi"><span class="k">Allergies</span><span class="v">${m.allergies.length ? m.allergies.map(a => `<span class="info-pill" style="background:rgba(212,137,74,.12);color:#B5651D;">${a}</span>`).join('') : '—'}</span></div>`;
  }

  /* ─── Chat overlay ─── */
  const CHAT_THREADS = [
    { id: 'morales', name: 'Dr. Ricardo Morales', clinic: 'Hospital Ángeles', initial: 'RM', color: '#5E7CE6', time: '10:21', preview: 'Please bring your ECG report.', unread: 1, cat: 'care',
      messages: [
        { dir: 'in', text: 'Good morning! Your appointment is confirmed for tomorrow at 10:30 AM.', time: '9:00' },
        { dir: 'out', text: 'Thank you, Dr. Morales. Should I bring my previous ECG?', time: '9:05' },
        { dir: 'in', text: 'Please bring your ECG report.', time: '10:21' },
      ]
    },
    { id: 'frontdesk', name: 'Hospital Ángeles Front Desk', clinic: 'Hospital Ángeles', initial: 'HA', color: '#018A92', time: 'Yesterday', preview: 'Your invoice is ready to download.', unread: 1, cat: 'frontdesk',
      messages: [
        { dir: 'in', text: 'Hello! Your invoice for the May 13 visit is ready.', time: 'Yesterday' },
        { dir: 'in', text: 'Your invoice is ready to download.', time: 'Yesterday' },
      ]
    }
  ];

  let chatCat = 'frontdesk';
  let activeChatId = null;

  function buildChatThreads(cat) {
    const list = document.getElementById('chat-thread-list');
    if (!list) return;
    list.innerHTML = '';
    const filtered = cat === 'all' ? CHAT_THREADS : CHAT_THREADS.filter(t => t.cat === cat);
    filtered.forEach(t => {
      const el = document.createElement('button');
      el.className = 'chat-thread';
      el.innerHTML = `
        <div class="chat-avatar" style="background:${t.color}">${t.initial}</div>
        <div class="chat-thread-body">
          <div class="chat-thread-top">
            <div class="chat-thread-name">${t.name}</div>
            <div class="chat-thread-time">${t.time}</div>
          </div>
          <div class="chat-thread-clinic">${t.clinic}</div>
          <div class="chat-thread-bottom">
            <div class="chat-thread-preview${t.unread ? ' unread' : ''}">${t.preview}</div>
            ${t.unread ? `<div class="chat-unread-dot">${t.unread}</div>` : ''}
          </div>
        </div>`;
      el.addEventListener('click', () => openChatConvo(t.id));
      list.appendChild(el);
    });
  }

  function openChatOverlay() {
    const overlay = document.getElementById('chat-overlay');
    if (overlay) overlay.classList.add('show');
    buildChatThreads(chatCat);
    showChatView('list');
  }

  function closeChatOverlay() {
    const overlay = document.getElementById('chat-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  function showChatView(view) {
    const list  = document.getElementById('chat-view-list');
    const convo = document.getElementById('chat-view-convo');
    if (list)  list.hidden  = (view !== 'list');
    if (convo) convo.hidden = (view !== 'convo');
  }

  function openChatConvo(id) {
    activeChatId = id;
    const thread = CHAT_THREADS.find(t => t.id === id);
    if (!thread) return;
    thread.unread = 0;
    const avatar = document.getElementById('chat-convo-avatar');
    const name   = document.getElementById('chat-convo-name');
    const clinic = document.getElementById('chat-convo-clinic');
    const msgs   = document.getElementById('chat-convo-msgs');
    if (avatar) { avatar.textContent = thread.initial; avatar.style.background = thread.color; }
    if (name) name.textContent = thread.name;
    if (clinic) clinic.textContent = thread.clinic;
    if (msgs) {
      msgs.innerHTML = '';
      thread.messages.forEach(m => {
        const b = document.createElement('div');
        b.className = `chat-bubble ${m.dir}`;
        b.innerHTML = `${m.text}<span class="chat-bubble-time">${m.time}</span>`;
        msgs.appendChild(b);
      });
      msgs.scrollTop = msgs.scrollHeight;
    }
    showChatView('convo');
  }

  /* chat send */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-chat-close]')) { closeChatOverlay(); return; }
    if (e.target.closest('[data-chat-back]'))  { showChatView('list'); return; }
    if (e.target.closest('[data-chat-send]'))  { sendChatMsg(); return; }
    if (e.target.closest('[data-chat-cat-btn]')) {
      const btn = e.target.closest('[data-chat-cat-btn]');
      document.querySelectorAll('[data-chat-cat-btn]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      chatCat = btn.dataset.chatCatBtn;
      buildChatThreads(chatCat);
      return;
    }
    if (e.target.closest('[data-chat-search-toggle]')) { showToast('Search in conversation'); return; }
    if (e.target.closest('[data-chat-attach-toggle]')) { showToast('Attach a file'); return; }
    if (e.target.closest('[data-chat-attach]')) { showToast('Attach ' + e.target.closest('[data-chat-attach]').dataset.chatAttach); return; }
    if (e.target.closest('[data-chat-reply-cancel]')) { return; }
  });

  function sendChatMsg() {
    const input = document.getElementById('chat-input');
    const val = input && input.value.trim();
    if (!val || !activeChatId) return;
    const thread = CHAT_THREADS.find(t => t.id === activeChatId);
    if (thread) thread.messages.push({ dir: 'out', text: val, time: 'now' });
    const msgs = document.getElementById('chat-convo-msgs');
    if (msgs) {
      const b = document.createElement('div');
      b.className = 'chat-bubble out';
      b.innerHTML = `${val}<span class="chat-bubble-time">now</span>`;
      msgs.appendChild(b);
      msgs.scrollTop = msgs.scrollHeight;
    }
    input.value = '';
  }

  /* ─── Onboarding ─── */
  let onbStep = 1;

  function goOnbStep(step) {
    document.querySelectorAll('.onb-step').forEach(s => s.classList.remove('on'));
    const next = document.querySelector(`.onb-step[data-step="${step}"]`);
    if (next) next.classList.add('on');
    document.querySelectorAll('.onb-dots i').forEach((d, i) => d.classList.toggle('on', i < step));
    const back = document.querySelector('.onb-back');
    if (back) back.style.visibility = step > 1 ? 'visible' : 'hidden';
    onbStep = step;
  }

  document.addEventListener('click', function (e) {
    const onbEl = e.target.closest('[data-onb]');
    if (!onbEl) return;
    const act = onbEl.dataset.onb;
    if (act === 'next')   { goOnbStep(2); return; }
    if (act === 'name')   { goOnbStep(3); return; }
    if (act === 'prev')   { if (onbStep > 1) goOnbStep(onbStep - 1); return; }
    if (act === 'enable' || act === 'later') { finishOnboarding(); return; }
  });

  function finishOnboarding() {
    const onbPane = panes['onboarding'];
    if (onbPane) onbPane.classList.remove('active');
    navigate('home');
  }

  /* ─── Splash ─── */
  function initSplash() {
    const splash = document.getElementById('splash');
    if (!splash) { startApp(); return; }

    /* make sure home is shown initially (it's pre-set to active in HTML) */
    /* hide onboarding */
    if (panes['onboarding']) panes['onboarding'].classList.remove('active');

    setTimeout(() => {
      splash.style.transition = 'opacity .45s ease';
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.classList.add('hide');
        startApp();
      }, 480);
    }, 2200);
  }

  function startApp() {
    /* Show onboarding on first run. After onboarding user lands on home.
       For demo purposes: always show onboarding first. */
    const hasOnboarded = localStorage.getItem('nfh-onboarded');
    if (!hasOnboarded) {
      /* deactivate home, activate onboarding */
      if (panes['home']) panes['home'].classList.remove('active');
      if (panes['onboarding']) panes['onboarding'].classList.add('active');
      currentScreen = 'onboarding';
    } else {
      currentScreen = 'home';
    }
    /* build nav for active screen */
    const activePaneEl = panes[currentScreen];
    if (activePaneEl) activePaneEl.querySelectorAll('.nav').forEach(nav => buildNav(nav, currentScreen));
  }

  /* Mark onboarding done when user reaches home */
  const homeObs = new MutationObserver(() => {
    if (panes['home'] && panes['home'].classList.contains('active')) {
      localStorage.setItem('nfh-onboarded', '1');
    }
  });
  if (panes['home']) homeObs.observe(panes['home'], { attributeFilter: ['class'] });

  /* ─── Status bar clock ─── */
  function updateClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const timeStr = `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')}`;
    document.querySelectorAll('.sb-time').forEach(el => el.textContent = timeStr);
  }
  updateClock();
  setInterval(updateClock, 30000);


  /* ─── Init ─── */
  initSplash();
})();
