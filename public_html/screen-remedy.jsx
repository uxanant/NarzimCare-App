// Ask Remedy — AI assistant chat. Uses window.claude.complete.

function RemedyScreen({ onClose, contextPatient, seedPrompt }) {
  const { REMEDY_SUGGESTIONS } = window.CHAVITOS;
  const [messages, setMessages] = React.useState([
    {
      role: "assistant",
      content: contextPatient
        ? `Hola Aminata 👋  I have ${contextPatient.name}'s chart open. Ask me anything about this patient, or click a suggestion below.`
        : "Hola Aminata 👋  I'm Narzim, your clinic copilot. Ask me about appointments, patients, invoices, or tasks. I can also draft messages and SOAP notes in seconds."
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollerRef = React.useRef(null);
  const sentSeedRef = React.useRef(false);

  React.useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = React.useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const system = [
        "You are Narzim, the AI copilot embedded inside the Chavitos Clinic EHR — a pediatric clinic in Mérida, Yucatán, Mexico.",
        "You help front-desk staff and clinicians manage appointments, charts, invoices, messages and clinical notes.",
        "Reply in 2-6 short paragraphs OR a tight bulleted list — never long prose. Use markdown sparingly (bold, lists).",
        "When the user is asking about something clinical, be precise and reference the patient context provided.",
        "Mix Spanish phrasing naturally when relevant (clinic is in Mexico). Keep professional, warm tone.",
        contextPatient ? `Current patient context: ${JSON.stringify({
          name: contextPatient.name, mrn: contextPatient.mrn, age: contextPatient.age,
          dob: contextPatient.dob, sex: contextPatient.sex, allergies: contextPatient.allergies,
          chronicCare: contextPatient.chronicCare, status: contextPatient.status,
        })}` : "",
      ].filter(Boolean).join("\n\n");
      const reply = await window.claude.complete({
        messages: [
          { role: "user", content: system + "\n\n---\n\nUser: " + text },
        ],
      });
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(m => [...m, { role: "assistant", content: "Sorry, I couldn't reach the model. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, contextPatient]);

  // Seed prompt handling — only fire once per seed value
  React.useEffect(() => {
    if (seedPrompt && !sentSeedRef.current) {
      sentSeedRef.current = true;
      send(seedPrompt);
    }
  }, [seedPrompt, send]);

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center pb-28">
      <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-[820px] max-w-[92%] bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/70 shadow-[0_24px_64px_rgba(15,23,42,0.28)] overflow-hidden flex flex-col"
        style={{ height: 620 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/60 bg-gradient-to-b from-white/80 to-white/40">
          <div className="size-10 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(180deg,#0098E4,#00C950)" }}>
            <Icon.sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[14.5px] font-semibold text-slate-900 flex items-center gap-2">
              <span>Narzim</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 whitespace-nowrap">AI · Online</span>
            </div>
            <div className="text-[11.5px] text-slate-500">
              {contextPatient ? `Context: ${contextPatient.name}` : "Clinic copilot · Chavitos Clinic"}
            </div>
          </div>
          <div className="flex-1" />
          <button className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600" onClick={onClose}>
            <Icon.close size={16} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && (
            <Bubble role="assistant" content={<TypingDots />} />
          )}

          {/* Suggestions (only before user has sent anything) */}
          {messages.length === 1 && !loading && (
            <div className="pt-2">
              <div className="text-[11.5px] uppercase tracking-wide text-slate-500 mb-2 font-medium">Try asking</div>
              <div className="grid grid-cols-2 gap-2">
                {REMEDY_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-sky-50/60 hover:border-sky-200 transition group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="size-6 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-100">
                        <Icon.sparkles size={12} />
                      </div>
                      <div className="text-[12.5px] text-slate-800 leading-snug">{s}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200/60 bg-white/90 px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-sky-300/40 focus-within:border-sky-400 transition">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask Narzim about appointments, charts, invoices…"
              className="flex-1 resize-none bg-transparent outline-none text-[13.5px] py-1.5 px-2 max-h-32"
              style={{ minHeight: 28 }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="h-9 px-3 rounded-xl text-white text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-40 transition"
              style={{ background: "linear-gradient(180deg,#0098E4,#0086cc)" }}
            >
              <Icon.send size={14} />
              Send
            </button>
          </div>
          <div className="mt-1.5 px-1 text-[10.5px] text-slate-400 flex items-center gap-2">
            <Icon.sparkles size={10} />
            <span>Narzim can make mistakes. Always verify clinical info before acting.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={cx("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cx("size-8 rounded-full flex items-center justify-center text-white shrink-0", isUser ? "bg-slate-700" : "")}
        style={!isUser ? { background: "linear-gradient(180deg,#0098E4,#00C950)" } : {}}
      >
        {isUser ? <span className="text-[11px] font-semibold">A</span> : <Icon.sparkles size={14} />}
      </div>
      <div className={cx(
        "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
        isUser ? "bg-sky-500 text-white rounded-tr-sm" : "bg-slate-100 text-slate-900 rounded-tl-sm"
      )}>
        {typeof content === "string" ? <MarkdownLite text={content} isUser={isUser} /> : content}
      </div>
    </div>
  );
}

function MarkdownLite({ text, isUser }) {
  // very small md: **bold**, lists, paragraphs
  const lines = text.split("\n");
  const out = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length === 0) return;
    out.push(<ul key={out.length} className="list-disc pl-5 space-y-1 my-1.5">{listBuf.map((l,i) => <li key={i}>{renderInline(l)}</li>)}</ul>);
    listBuf = [];
  };
  function renderInline(s) {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => p.startsWith("**") ? <strong key={i}>{p.slice(2,-2)}</strong> : <span key={i}>{p}</span>);
  }
  lines.forEach((ln, i) => {
    const m = ln.match(/^\s*[-*]\s+(.+)/);
    if (m) {
      listBuf.push(m[1]);
    } else {
      flushList();
      if (ln.trim()) out.push(<p key={out.length} className={cx("mb-1.5 last:mb-0", isUser && "text-white")}>{renderInline(ln)}</p>);
    }
  });
  flushList();
  return <div>{out}</div>;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}/>
      <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "120ms" }}/>
      <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "240ms" }}/>
    </div>
  );
}

Object.assign(window, { RemedyScreen });
