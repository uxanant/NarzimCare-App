/* ════════════════════════════════════════════════════════════
   Narzim Marketplace — gate, i18n, country switch & rendering
   ════════════════════════════════════════════════════════════ */
(function () {
  const M = window.NARZIM_MKT;
  const { COUNTRIES, SPECIALTIES, SPEC_ICON, SPEC_NAME, DOCTORS, AV, I18N, DAY_NAME, LANG_NAME } = M;
  const ORDER = ['MX', 'US', 'IN'];
  const STORE = 'narzim_country';

  let country = localStorage.getItem(STORE);
  if (!COUNTRIES[country]) country = null;
  let lang = country ? COUNTRIES[country].lang : 'en';
  let gatePick = null;

  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── currency ── */
  function fmtFee(c, fee) {
    const cur = COUNTRIES[c].cur;
    return cur.symbol + fee.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US');
  }

  /* ── initials (drop Dr./Dra. titles) ── */
  function initials(name) {
    const parts = name.replace(/^(Dr\.?|Dra\.?)\s+/i, '').trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  /* ── apply i18n text to static nodes ── */
  function applyI18n() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  }

  /* ── specialty grid ── */
  function renderSpecialties() {
    const grid = $('#specGrid');
    grid.innerHTML = SPECIALTIES.map((s, i) => `
      <a href="#doctors" class="reveal in group rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style="animation-delay:${i * 0.03}s">
        <span class="size-12 rounded-xl grid place-items-center" style="background:${s.bg};color:${s.color}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SPEC_ICON[s.key]}</svg>
        </span>
        <span class="mt-3 font-600 text-[14px] text-slate-800 leading-tight">${SPEC_NAME[s.key][lang]}</span>
      </a>`).join('');
  }

  /* ── doctor cards ── */
  function modeBadge(mode) {
    if (mode === 'video') return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[11px] font-600">${videoIcon()} ${t('mode_video')}</span>`;
    if (mode === 'in')    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[11px] font-600">${pinIcon()} ${t('mode_in')}</span>`;
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-600">${videoIcon()} ${t('mode_both')}</span>`;
  }
  const videoIcon = () => `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="m23 7-7 5 7 5z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="2.2"/></svg>`;
  const pinIcon = () => `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`;

  function renderDoctors() {
    const grid = $('#docGrid');
    const list = DOCTORS[country] || [];
    grid.innerHTML = list.map((d, i) => {
      const av = AV[i % AV.length];
      const langStr = d.langs.map(l => LANG_NAME[l][lang]).join(', ');
      const when = `${DAY_NAME[d.day][lang]} · ${d.time}`;
      return `
      <div class="reveal in rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style="animation-delay:${i * 0.04}s">
        <div class="flex items-start gap-3.5">
          <span class="size-14 rounded-2xl grid place-items-center font-display font-800 text-[19px] text-slate-700 shrink-0" style="background:${av}">${initials(d.name)}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <h3 class="font-display font-700 text-[16.5px] text-slate-900 leading-tight truncate">${d.name}</h3>
              <svg class="shrink-0 text-brand-500" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" title="Verified"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/><path d="m9 12 2 2 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <p class="text-[13.5px] text-brand-600 font-600">${SPEC_NAME[d.spec][lang]}</p>
            <div class="mt-1 flex items-center gap-2 text-[12.5px] text-slate-500">
              <span class="inline-flex items-center gap-0.5 text-amber-500 font-700">★ <span class="text-slate-700">${d.rating.toFixed(1)}</span></span>
              <span class="text-slate-400">(${d.reviews} ${t('reviews')})</span>
            </div>
          </div>
        </div>

        <div class="mt-3.5 flex flex-wrap items-center gap-1.5">
          ${modeBadge(d.mode)}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-600">${pinIcon()} ${d.city} · ${d.dist.toLocaleString(lang==='es'?'es-MX':'en-US')} km</span>
        </div>

        <div class="mt-3.5 pt-3.5 border-t border-slate-100 space-y-1.5 text-[12.5px]">
          <div class="flex items-center gap-1.5 text-slate-600">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="text-emerald-500"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="text-slate-500">${t('next_avail')}:</span> <span class="font-600 text-emerald-700">${when}</span>
          </div>
          <div class="flex items-center gap-1.5 text-slate-600">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="text-slate-400"><path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="text-slate-500">${t('speaks')}:</span> <span class="text-slate-700">${langStr}</span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div>
            <span class="font-display font-800 text-[20px] text-slate-900">${fmtFee(country, d.fee)}</span>
            <span class="text-[12px] text-slate-400"> ${t('per_visit')}</span>
          </div>
          <a href="Narzim Login.html?tab=patient&mode=register" data-login="patient" class="inline-flex h-10 items-center gap-1.5 px-4 rounded-xl text-[13.5px] font-600 text-white bg-brand-500 hover:bg-brand-600 shadow-sm shadow-brand-500/30 transition active:scale-[.97]">
            ${t('book_now')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>`;
    }).join('');
  }

  /* ── header switcher ── */
  function renderSwitcher() {
    const c = COUNTRIES[country];
    $('#switchFlag').textContent = c.flag;
    $('#switchName').textContent = c.name[lang];
    const menu = $('#switchMenu');
    menu.innerHTML = `<p class="px-3 pt-2 pb-1 text-[11px] font-700 uppercase tracking-wider text-slate-400">${t('switch_country')}</p>` +
      ORDER.map(code => {
        const cc = COUNTRIES[code];
        const active = code === country;
        return `<button data-code="${code}" class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] transition ${active ? 'bg-brand-50 text-brand-700 font-600' : 'text-slate-700 hover:bg-slate-50'}">
          <span class="text-[18px] leading-none">${cc.flag}</span>
          <span class="flex-1 text-left">${cc.name[lang]}</span>
          <span class="text-[11px] text-slate-400 uppercase">${cc.lang}</span>
          ${active ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        </button>`;
      }).join('');
    $$('#switchMenu [data-code]').forEach(b => b.addEventListener('click', () => {
      setCountry(b.getAttribute('data-code'));
      menu.classList.add('hidden');
    }));
  }

  /* ── full re-render ── */
  function applyAll() {
    applyI18n();
    renderSpecialties();
    renderDoctors();
    renderSwitcher();
  }

  function setCountry(code, fromGate) {
    country = code;
    lang = COUNTRIES[code].lang;
    localStorage.setItem(STORE, code);
    applyAll();
    if (!fromGate) {
      // gentle confirmation pulse on the doctor grid
      const g = $('#docGrid');
      if (g) { g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
    }
  }

  /* ── country gate ── */
  function buildGate() {
    const wrap = $('#gateOptions');
    wrap.innerHTML = ORDER.map(code => {
      const c = COUNTRIES[code];
      return `<button data-code="${code}" class="gate-opt flex items-center gap-3.5 w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition text-left">
        <span class="text-[30px] leading-none">${c.flag}</span>
        <span class="flex-1">
          <span class="block font-display font-700 text-[17px] text-slate-900">${c.name.en}${c.name.en !== c.name.es ? ' · ' + c.name.es : ''}</span>
          <span class="block text-[12.5px] text-slate-500">${c.lang === 'es' ? 'Español' : 'English'} · ${c.cur.code}</span>
        </span>
        <span class="check size-6 rounded-full border-2 border-slate-200 grid place-items-center text-white shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </button>`;
    }).join('');
    $$('#gateOptions .gate-opt').forEach(btn => btn.addEventListener('click', () => {
      gatePick = btn.getAttribute('data-code');
      $$('#gateOptions .gate-opt').forEach(b => {
        const on = b === btn;
        b.classList.toggle('border-brand-500', on);
        b.classList.toggle('bg-brand-50/60', on);
        b.classList.toggle('border-slate-200', !on);
        const chk = b.querySelector('.check');
        chk.classList.toggle('bg-brand-500', on);
        chk.classList.toggle('border-brand-500', on);
        chk.classList.toggle('border-slate-200', !on);
      });
      $('#gateContinue').disabled = false;
    }));
    $('#gateContinue').addEventListener('click', () => {
      if (!gatePick) return;
      setCountry(gatePick, true);
      closeGate();
    });
  }
  function openGate() { $('#gate').classList.remove('hidden'); $('#gate').classList.add('flex'); document.body.style.overflow = 'hidden'; }
  function closeGate() { $('#gate').classList.add('hidden'); $('#gate').classList.remove('flex'); document.body.style.overflow = ''; }

  /* ── switcher open/close ── */
  $('#switchBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#switchMenu').classList.toggle('hidden'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#switchMenu') && !e.target.closest('#switchBtn')) $('#switchMenu').classList.add('hidden'); });

  /* ── search → jump to doctors ── */
  $('#searchBar').addEventListener('submit', (e) => { e.preventDefault(); document.getElementById('doctors').scrollIntoView({ behavior: 'smooth' }); });

  /* ── patient login modal ── */
  const loginModal = $('#loginModal');
  function openLogin() {
    loginModal.classList.remove('hidden'); loginModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = $('#plId'); if (f) f.focus(); }, 50);
  }
  function closeLogin() {
    loginModal.classList.add('hidden'); loginModal.classList.remove('flex');
    if ($('#gate').classList.contains('hidden')) document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    const trig = e.target.closest('[data-login="patient"]');
    if (trig) { e.preventDefault(); openLogin(); return; }
    if (e.target.closest('[data-close-login]')) closeLogin();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !loginModal.classList.contains('hidden')) closeLogin(); });
  $('#patientLoginForm').addEventListener('submit', (e) => { e.preventDefault(); window.location.href = 'Narzim Patient Portal.html'; });

  /* ── nav shadow on scroll ── */
  const navWrap = $('#nav nav');
  window.addEventListener('scroll', () => {
    navWrap.classList.toggle('shadow-[0_10px_40px_rgba(15,23,42,0.10)]', window.scrollY > 20);
  });

  /* ── scroll reveal ── */
  const io = new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ── boot ── */
  buildGate();
  applyI18n();              // gate text in default (en) until picked
  if (country) { applyAll(); }
  else { renderSpecialties(); renderDoctors(); openGate(); }
})();
