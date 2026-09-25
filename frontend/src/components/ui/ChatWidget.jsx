import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageSquare, Send, Sparkles, MapPin, X, ShieldCheck } from 'lucide-react';
import { chatService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import Badge from './Badge';

const SUGGESTIONS = [
  'I lost my keys somewhere on campus',
  'Found a phone today, is anyone missing one?',
  'Show me lost items near the library',
  'How do I claim an item?',
];

function InlineText({ text }) {
  const parts = String(text || '').split('**');
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-brand-700 dark:text-brand-300">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  const firstName = user?.name?.split(' ')[0] || 'friend';

  useEffect(() => {
    if (messages.length > 0) return;
    setMessages([
      {
        role: 'assistant',
        text: `Hey ${firstName}! 👋 I'm your CampusLost assistant. Tell me what you lost or describe an item you found, and I'll search the database for you.`,
      },
    ]);
  }, [firstName, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, open]);

  function openFromLauncher() {
    setOpen((v) => !v);
  }

  async function send(text) {
    const body = (text || input).trim();
    if (!body || busy) return;

    const history = [...messages, { role: 'user', text: body }];
    setMessages(history);
    setInput('');
    setBusy(true);

    try {
      const payload = history.slice(-10).map((m) => ({ role: m.role, content: m.text }));
      const data = await chatService.send(payload);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'Here is what I found for you!',
          items: data.items || [],
          note: data.configured === false ? '⚠️ AI provider not configured — an admin needs to set GROQ_API_KEY.' : null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "Something went wrong on my end. Please try again in a moment, or browse the feed directly.",
          note: null,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function openItem(item) {
    setOpen(false);
    navigate(`/items/${item.id}`);
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={openFromLauncher}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        className="fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-glow md:bottom-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }}>
              <X size={24} />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -60, opacity: 0 }}>
              <MessageSquare size={24} />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-2 bottom-20 z-50 flex h-[min(76vh,640px)] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-2xl md:right-6 md:inset-x-auto md:h-[600px] md:w-[400px] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-200/70 bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3 text-white dark:border-slate-700">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                <Bot size={22} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-brand-600 bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold leading-tight">CampusLost Assistant</p>
                <p className="flex items-center gap-1 text-[11px] text-white/80">
                  <Sparkles size={11} /> AI with live database access
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {messages.map((m, i) =>
                m.role === 'assistant' ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] space-y-2">
                      <div className="rounded-2xl rounded-tl-md border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <InlineText text={m.text} />
                      </div>

                      {m.note && (
                        <p className="px-1 text-[11px] text-amber-500">{m.note}</p>
                      )}

                      {m.items?.length > 0 && (
                        <div className="space-y-2">
                          <p className="pl-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            {m.items.length === 1 ? '1 match found' : `${m.items.length} matches found`}
                          </p>
                          <div className="space-y-2">
                            {m.items.map((item) => (
                              <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openItem(item)}
                                className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-2 text-left shadow-sm transition hover:border-brand-400 hover:shadow-card dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
                              >
                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                                  {item.image ? (
                                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-500/20 dark:to-violet-500/20">
                                      <ShieldCheck className="text-brand-400" size={22} />
                                    </div>
                                  )}
                                  <span className="absolute left-1 top-1">
                                    <Badge color={item.type}>
                                      {item.type}
                                    </Badge>
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-1 text-sm font-bold text-midnight dark:text-white">{item.title}</p>
                                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                    <MapPin size={12} />
                                    <span className="line-clamp-1">{item.location}</span>
                                  </p>
                                  <p className="mt-1">
                                    <Badge color="system">{item.category}</Badge>
                                    {item.status !== 'active' && <Badge color={item.status}>{item.status}</Badge>}
                                  </p>
                                </div>
                                <span className="text-slate-300 transition group-hover:text-brand-600 dark:text-slate-600 dark:group-hover:text-brand-400">
                                  →
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-brand-600 to-violet-600 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-glow">
                      {m.text}
                    </div>
                  </motion.div>
                )
              )}

              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }}
                        className="h-2 w-2 rounded-full bg-brand-500"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && !busy && (
              <div className="flex gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-slate-200/70 p-3 dark:border-slate-700">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe what you lost / found…"
                  className="input-field !py-2.5 text-sm"
                  disabled={busy}
                />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-glow transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={18} />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}