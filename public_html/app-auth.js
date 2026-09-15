// ═══════════════════════════════════════════════════════════════
// Narzim Patient App — onboarding & auth (visual flow)
//   Splash → Welcome → Log in / Create account → Verify → App
// ═══════════════════════════════════════════════════════════════
(function () {
  const { P, $, $$, esc, svg, openSheet, setStatusBar, enterApp } = NZA;
  const PAT = P.PATIENT, NARZIM = P.NARZIM;
  const DEMO_OTP = "482913";
  let authed = false;

  function ensureStyles() {
    if ($("#authStyles")) return;
    const s = document.createElement("style");
    s.id = "authStyles";
    s.textContent = `
      @keyframes logoIn{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
      .logo-in{animation:logoIn .7s cubic-bezier(.22,.61,.36,1) both}
      @keyframes dotb{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
      .ld span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#fff;margin:0 3px;animation:dotb 1.2s infinite}
      .ld span:nth-child(2){animation-delay:.15s}.ld span:nth-child(3){animation-delay:.3s}
      .auth-inp{width:100%;height:50px;border:1.5px solid #E2E8F0;border-radius:16px;padding:0 16px;font-size:15px;color:#0F172A;background:#fff;outline:none;transition:border .15s,box-shadow .15s}
      .auth-inp:focus{border-color:#33B1F0;box-shadow:0 0 0 4px rgba(0,152,228,.13)}
      select.auth-inp{appearance:none}`;
    document.head.appendChild(s);
  }

  const logoMark = (size) => `<span class="logo-mark" style="width:${size}px;height:${size}px"></span>`;

  // ── splash ──
  function splash() {
    setStatusBar(true);
    openSheet(`<div class="absolute inset-0 z-[100] flex flex-col items-center justify-center fade" style="background:linear-gradient(160deg,#33B1F0 0%,#0098E4 40%,#004B72 100%)">
      <div class="logo-in flex flex-col items-center">
        <div class="size-20 rounded-[26px] bg-white/15 grid place-items-center backdrop-blur">${logoMark(52)}</div>
        <h1 class="mt-5 font-display font-800 text-white text-[34px] tracking-tight">Narzim</h1>
        <p class="mt-1 text-brand-100 text-[14px]">${esc(NARZIM.tagline)}</p>
      </div>
      <div class="ld absolute bottom-16"><span></span><span></span><span></span></div>
    </div>`);
    clearTimeout(splash._t);
    splash._t = setTimeout(() => { if (!authed) welcome(); }, 1700);
  }

  // ── welcome ──
  function welcome() {
    setStatusBar(true);
    const props = [
      ["records", "One record, every clinic", "Labs, prescriptions & visit reports compiled in one place."],
      ["body", "See your whole-body health", "Track vitals, conditions and daily habits at a glance."],
      ["ai", "Snap old reports, AI files them", "Photograph past documents — Narzim reads and organises them."],
    ];
    openSheet(`<div class="absolute inset-0 z-[100] flex flex-col fade" style="background:linear-gradient(165deg,#0098E4 0%,#0070ad 48%,#003E5C 100%)">
      <div style="height:52px"></div>
      <div class="flex-1 flex flex-col px-7 pt-6">
        <div class="flex items-center gap-2.5">${logoMark(34)}<span class="font-display font-800 text-white text-[22px]">Narzim</span></div>
        <h1 class="mt-8 font-display font-800 text-white text-[30px] leading-[1.12]">Your health,<br>across every clinic.</h1>
        <p class="mt-3 text-brand-100 text-[14px] leading-relaxed">Your complete medical record — owned by you, shared on your terms.</p>
        <div class="mt-7 space-y-4">
          ${props.map(p => `<div class="flex items-start gap-3.5">
            <span class="size-10 rounded-2xl bg-white/15 grid place-items-center text-white shrink-0">${svg(p[0], 20, 2)}</span>
            <div><p class="text-[14px] font-700 text-white leading-tight">${esc(p[1])}</p><p class="text-[12.5px] text-brand-100/85 leading-snug mt-0.5">${esc(p[2])}</p></div>
          </div>`).join("")}
        </div>
      </div>
      <div class="px-7 pb-9 space-y-2.5">
        <button data-act="authGoRegister" class="w-full h-13 rounded-2xl bg-white text-brand-700 text-[15px] font-700 tap" style="height:52px">Create account</button>
        <button data-act="authGoLogin" class="w-full rounded-2xl bg-white/12 border border-white/25 text-white text-[15px] font-700 tap" style="height:52px">I already have an account</button>
      </div>
    </div>`);
  }

  function lightHeader(title, backAct) {
    return `<div style="height:52px"></div>
      <div class="px-3 pt-1 pb-2 flex items-center gap-1">
        <button data-act="${backAct}" class="size-10 rounded-full grid place-items-center tap hover:bg-slate-100 text-slate-600">${svg("chevL", 22, 2.2)}</button>
        <span class="font-display font-700 text-[17px] text-slate-900">${esc(title)}</span>
      </div>`;
  }

  // ── login ──
  function login() {
    setStatusBar(false);
    openSheet(`<div class="absolute inset-0 z-[100] bg-white flex flex-col fade">
      ${lightHeader("Log in", "authGoWelcome")}
      <div class="flex-1 overflow-y-auto px-6 pt-2">
        <div class="flex items-center gap-2.5 mb-6">
          <div class="size-12 rounded-2xl grid place-items-center" style="background:linear-gradient(150deg,#33B1F0,#0098E4)">${logoMark(28)}</div>
          <div><p class="font-display font-800 text-[20px] text-slate-900 leading-none">Welcome back</p><p class="text-[12.5px] text-slate-500 mt-1">Log in to your Narzim account</p></div>
        </div>
        <form data-act="authLogin" class="space-y-4">
          <label class="block"><span class="lbl">Email or phone</span><input name="id" class="auth-inp" placeholder="${esc(PAT.email)}"/></label>
          <label class="block"><span class="lbl">Password</span><input name="pw" type="password" class="auth-inp" placeholder="••••••••"/></label>
          <div class="text-right"><button type="button" class="text-[12.5px] font-600 text-brand-600">Forgot password?</button></div>
          <button type="submit" class="w-full rounded-2xl text-white text-[15px] font-700 tap" style="height:52px;background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">Log in</button>
        </form>
        <div class="flex items-center gap-3 my-5"><span class="flex-1 h-px bg-slate-200"></span><span class="text-[11.5px] text-slate-400">or</span><span class="flex-1 h-px bg-slate-200"></span></div>
        <button data-act="authLogin" class="w-full rounded-2xl border border-slate-200 text-slate-700 text-[14px] font-600 tap inline-flex items-center justify-center gap-2" style="height:50px">${svg("phone", 17, 2)} Continue with phone OTP</button>
      </div>
      <div class="px-6 pb-8 pt-3 text-center text-[13px] text-slate-500">New to Narzim? <button data-act="authGoRegister" class="font-700 text-brand-600">Create account</button></div>
    </div>`);
  }

  // ── register ──
  function register() {
    setStatusBar(false);
    openSheet(`<div class="absolute inset-0 z-[100] bg-white flex flex-col fade">
      ${lightHeader("Create account", "authGoWelcome")}
      <form data-act="authRegister" class="flex-1 overflow-y-auto px-6 pt-2 pb-4 space-y-3.5">
        <p class="text-[13px] text-slate-500 -mt-1">Your identity is verified to keep records secure and prevent duplicates across clinics.</p>
        <label class="block"><span class="lbl">Full name</span><input name="name" class="auth-inp" placeholder="Mariana Reyes Castillo"/></label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="lbl">Date of birth</span><input name="dob" type="date" class="auth-inp" value="1991-02-14"/></label>
          <label class="block"><span class="lbl">Sex</span><select name="sex" class="auth-inp"><option>Female</option><option>Male</option><option>Other</option></select></label>
        </div>
        <label class="block"><span class="lbl">Phone</span><input name="phone" class="auth-inp" placeholder="+52 999 118 9042"/></label>
        <label class="block"><span class="lbl">Email</span><input name="email" type="email" class="auth-inp" placeholder="you@email.com"/></label>
        <label class="block"><span class="lbl">CURP</span><input name="curp" class="auth-inp font-mono" placeholder="RECM910214MYNRSR08" style="text-transform:uppercase"/></label>
        <label class="block"><span class="lbl">Social security (NSS) <span class="text-slate-400 font-400">· optional</span></span><input name="nss" class="auth-inp font-mono" placeholder="5602 9114 023"/></label>
        <label class="flex items-start gap-2.5 pt-1 cursor-pointer">
          <input type="checkbox" checked class="size-4 accent-brand-500 mt-0.5"/>
          <span class="text-[12px] text-slate-500 leading-snug">I agree to Narzim's Terms & Privacy Policy and consent to secure storage of my health data under NOM-024-SSA3.</span>
        </label>
        <button type="submit" class="w-full rounded-2xl text-white text-[15px] font-700 tap mt-1" style="height:52px;background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">Continue</button>
        <p class="text-center text-[13px] text-slate-500 pt-1">Already have an account? <button type="button" data-act="authGoLogin" class="font-700 text-brand-600">Log in</button></p>
      </form>
    </div>`);
  }

  // ── verify OTP ──
  function verify() {
    setStatusBar(false);
    const phone = PAT.phone;
    openSheet(`<div class="absolute inset-0 z-[100] bg-white flex flex-col fade">
      ${lightHeader("Verify phone", "authGoRegister")}
      <div class="flex-1 px-6 pt-4">
        <div class="size-14 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center mb-5">${svg("mail", 26, 2)}</div>
        <h1 class="font-display font-800 text-[22px] text-slate-900 leading-tight">Enter the code</h1>
        <p class="text-[13.5px] text-slate-500 mt-1.5">We sent a 6-digit code to <b class="text-slate-700">${esc(phone)}</b></p>
        <form data-act="authVerify" class="mt-6">
          <input name="otp" inputmode="numeric" maxlength="6" class="auth-inp font-mono text-center" style="letter-spacing:.5em;font-size:22px;height:60px" placeholder="••••••"/>
          <p class="text-[11.5px] text-slate-400 mt-2">Demo code: <span class="font-mono font-700 text-slate-500">${DEMO_OTP}</span> · or just continue</p>
          <button type="submit" class="w-full rounded-2xl text-white text-[15px] font-700 tap mt-6" style="height:52px;background:linear-gradient(140deg,#33B1F0,#0098E4 60%,#006093)">Verify & continue</button>
        </form>
        <p class="text-center text-[13px] text-slate-500 mt-4">Didn't get it? <button data-act="authResend" class="font-700 text-brand-600">Resend code</button></p>
      </div>
    </div>`);
  }

  function fdata(el) { const f = el.closest("form") || el; const o = {}; $$("input,select", f).forEach(i => { if (i.name) o[i.name] = i.value.trim(); }); return o; }

  function finish() {
    authed = true;
    clearTimeout(splash._t);
    enterApp();
  }

  Object.assign(NZA.actions, {
    authGoWelcome: welcome,
    authGoLogin: login,
    authGoRegister: register,
    authLogin: () => finish(),
    authRegister: (_a, el) => {
      const d = fdata(el);
      if (d.name) {
        const parts = d.name.split(/\s+/).filter(Boolean);
        PAT.name = d.name; PAT.first = parts[0];
        PAT.initials = ((parts[0] || "")[0] || "M") + ((parts[1] || "")[0] || "R");
      }
      if (d.phone) PAT.phone = d.phone;
      if (d.email) PAT.email = d.email;
      if (d.curp) PAT.curp = d.curp.toUpperCase();
      if (d.nss) PAT.nss = d.nss;
      if (d.sex) { PAT.sexLabel = d.sex; PAT.sex = d.sex[0]; }
      verify();
    },
    authVerify: () => finish(),
    authResend: () => NZA.toast("New code sent — demo code is " + DEMO_OTP, "info"),
  });

  NZA.auth = {
    isAuthed: () => authed,
    start: () => { ensureStyles(); splash(); },
    logout: () => { authed = false; setStatusBar(true); welcome(); },
  };
})();
