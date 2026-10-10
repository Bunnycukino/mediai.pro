import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Mic, Square, Send, Volume2, Plus, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";

const asArray = (value) => Array.isArray(value) ? value : [];

export default function Chat() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { id: routeConvId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [models, setModels] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [model, setModel] = useState("gpt-oss-120b");
  const [language, setLanguage] = useState("en");
  const [recording, setRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const scrollRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, c] = await Promise.all([
          api.get("/chat/models"),
          api.get("/chat/conversations"),
        ]);

        setModels(asArray(m?.data?.models));
        setLanguages(asArray(m?.data?.languages));
        setModel(asArray(m?.data?.models).find(x => x.id === m?.data?.default) ? m.data.default : (asArray(m?.data?.models)[0]?.id || "gpt-oss-120b"));
        setVoiceEnabled(!!m?.data?.voice_enabled);
        setConversations(asArray(c?.data));
      } catch (e) {
        toast.error(formatApiError(e?.response?.data?.detail));
      }
    })();
  }, []);

  useEffect(() => {
    if (!routeConvId) {
      setActiveId(null);
      setMessages([]);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get(`/chat/conversations/${routeConvId}`);
        setActiveId(routeConvId);
        setMessages(asArray(data?.messages));
        if (data?.conversation?.model) {
          const saved = data.conversation.model;
          setModel(({ "llama-3.3-70b": "gpt-oss-120b", "llama-3.1-8b": "gpt-oss-20b" })[saved] || saved);
        }
        if (data?.conversation?.language) setLanguage(data.conversation.language);
      } catch (e) {
        toast.error(formatApiError(e?.response?.data?.detail));
        nav("/chat", { replace: true });
      }
    })();
  }, [routeConvId, nav]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const reloadConversations = useCallback(async () => {
    const { data } = await api.get("/chat/conversations");
    setConversations(asArray(data));
  }, []);

  const newChat = () => {
    nav("/chat");
    setMessages([]);
    setActiveId(null);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    const tempId = `tmp_${Date.now()}`;

    setMessages((prev) => [
      ...asArray(prev),
      {
        id: tempId,
        role: "user",
        content: text,
        sources: [],
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const { data } = await api.post("/chat/send", {
        conversation_id: activeId,
        message: text,
        model,
        language,
      });

      setMessages((prev) => {
        const safePrev = asArray(prev);
        const without = safePrev.filter((x) => x?.id !== tempId);
        return [
          ...without,
          ...(data?.user_message ? [data.user_message] : []),
          ...(data?.message ? [{ ...data.message, sources: asArray(data?.message?.sources) }] : []),
        ];
      });

      if (!activeId && data?.conversation_id) {
        setActiveId(data.conversation_id);
        nav(`/chat/${data.conversation_id}`, { replace: true });
      }

      reloadConversations();

      if (autoSpeak && data?.message) {
        speakMessage({ ...data.message, sources: asArray(data?.message?.sources) });
      }
    } catch (e) {
      setMessages((prev) => asArray(prev).filter((x) => x?.id !== tempId));
      setInput(current => current || text);
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setSending(false);
    }
  };

  const speakMessage = async (msg) => {
    if (!voiceEnabled || !msg) return;

    try {
      setPlayingId(msg.id);
      const cleaned = (msg.content || "").replace(/\n\s*Sources?:[\s\S]*$/i, "").trim();
      const { data } = await api.post("/voice/tts", {
        text: cleaned.slice(0, 4000),
        voice: "sage",
      });

      const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
    } catch (e) {
      setPlayingId(null);
      toast.error("TTS failed");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        if (blob.size < 200) {
          toast.error("Recording too short");
          return;
        }

        const fd = new FormData();
        fd.append("audio", blob, "rec.webm");
        fd.append("language", language);

        try {
          const { data } = await api.post("/voice/transcribe", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (data?.text) setInput((prev) => (prev ? prev + " " : "") + data.text);
        } catch (e) {
          toast.error(formatApiError(e?.response?.data?.detail));
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const deleteConv = async (cid) => {
    if (!window.confirm("Delete this consultation?")) return;

    try {
      await api.delete(`/chat/conversations/${cid}`);
      if (cid === activeId) newChat();
      reloadConversations();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="order-2 lg:order-1 lg:col-span-3 bg-white border border-[#E1DFDA] rounded-3xl p-4 h-72 lg:h-[calc(100dvh-9rem)] flex flex-col min-w-0">
          <Button onClick={newChat} className="rounded-full btn-sage mb-4" data-testid="new-chat-btn">
            <Plus className="w-4 h-4 mr-2" /> {t("newChat")}
          </Button>

          <div className="text-xs uppercase tracking-[0.25em] text-[#5C6A64] mb-2 px-1">Recent</div>

          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-1">
              {asArray(conversations).length === 0 && (
                <p className="text-sm text-[#5C6A64] text-center py-8" data-testid="conv-empty">
                  {t("chatHistoryEmpty")}
                </p>
              )}

              {asArray(conversations).map((c) => (
                <div
                  key={c.id}
                  className={`group rounded-xl px-3 py-2 cursor-pointer flex items-center justify-between ${
                    c.id === activeId ? "bg-[#8BA888]/15" : "hover:bg-[#E8E6E1]/50"
                  }`}
                  onClick={() => nav(`/chat/${c.id}`)}
                  data-testid={`conv-${c.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1A2E25] truncate">{c.title}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#5C6A64]">{c.model}</div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-[#CC7A6B] p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConv(c.id);
                    }}
                    data-testid={`conv-delete-${c.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <main className="order-1 lg:order-2 lg:col-span-9 min-w-0 flex flex-col bg-white border border-[#E1DFDA] rounded-3xl overflow-hidden h-[max(32rem,calc(100dvh-9rem))] lg:h-[calc(100dvh-9rem)]">
          <div className="flex flex-wrap gap-3 items-center px-4 md:px-6 py-3 border-b border-[#E1DFDA] bg-[#F9F8F6]/60">
            <Button onClick={newChat} variant="outline" className="lg:hidden rounded-full h-9" data-testid="new-chat-mobile">
              <Plus className="w-4 h-4 mr-2" /> {t("newChat")}
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8BA888]" />
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-[210px] h-9 rounded-full border-[#E1DFDA] bg-white text-sm" data-testid="model-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {asArray(models).map((m) => (
                    <SelectItem key={m.id} value={m.id} data-testid={`model-${m.id}`}>
                      {m.name} <span className="text-[#5C6A64] text-xs ml-1">({m.provider})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[140px] h-9 rounded-full border-[#E1DFDA] bg-white text-sm" data-testid="language-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {asArray(languages).map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {voiceEnabled && (
              <label className="flex items-center gap-2 text-sm text-[#5C6A64] ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  className="accent-[#8BA888]"
                  data-testid="auto-speak-toggle"
                />
                Auto-read replies
              </label>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-10 py-6 space-y-5">
            {asArray(messages).length === 0 && (
              <div className="text-center py-12 text-[#5C6A64] max-w-xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#8BA888]/12 text-[#8BA888] flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="font-heading text-2xl text-[#1A2E25] mb-3">How can I help you today?</h2>
                <p className="text-sm">
                  Ask an educational health question. AI can be inaccurate and does not replace professional care. Library articles are not automatically consulted to produce these answers.
                </p>
              </div>
            )}

            {asArray(messages).map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                <div className={`max-w-[88%] md:max-w-[78%] ${m.role === "user" ? "bubble-user rounded-2xl rounded-tr-sm" : "bubble-ai rounded-2xl rounded-tl-sm"} p-4`}>
                  <div className="text-[10px] uppercase tracking-[0.25em] mb-2 text-[#5C6A64]">
                    {m.role === "user" ? t("you") : `${t("assistant")}${m.model ? ` · ${m.model}` : ""}`}
                  </div>

                  <div className="text-[15px] leading-relaxed whitespace-pre-wrap" data-testid={`msg-${m.id}`}>
                    {m.content}
                  </div>

                  {asArray(m.sources).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#1A2E25]/10">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[#5C6A64] mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" /> {t("sources")}
                      </div>
                      <ul className="space-y-1.5">
                        {asArray(m.sources).map((s, i) => (
                          <li key={i} className="text-xs text-[#1A2E25]">
                            {s.url ? (
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline inline-flex items-start gap-1"
                                data-testid={`src-${m.id}-${i}`}
                              >
                                <span className="font-medium">{s.name}</span>
                                {s.topic && <span className="text-[#5C6A64]"> — {s.topic}</span>}
                                <ExternalLink className="w-3 h-3 mt-0.5 opacity-60" />
                              </a>
                            ) : (
                              <span>
                                <span className="font-medium">{s.name}</span>
                                {s.topic && <span className="text-[#5C6A64]"> — {s.topic}</span>}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.role === "assistant" && asArray(m.further_reading).length > 0 && (
                    <aside className="mt-4 pt-3 border-t border-[#1A2E25]/10" aria-label="Library further reading">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><BookOpen size={14} /> Library · further reading</h3>
                      <p className="text-xs text-[#5C6A64] mt-2">Topic links only. Article text was not retrieved and does not verify this AI answer.</p>
                      <ul className="mt-3 space-y-2">
                        {asArray(m.further_reading).map(resource => <li key={resource.id} className="text-sm">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">{resource.title}<ExternalLink size={12} /></a>
                          <span className="block text-xs text-[#5C6A64]">{resource.publisher}</span>
                        </li>)}
                      </ul>
                    </aside>
                  )}

                  {m.role === "assistant" && voiceEnabled && (
                    <button
                      onClick={() => speakMessage(m)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#8BA888] hover:text-[#7A9678]"
                      data-testid={`speak-${m.id}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {playingId === m.id ? "Playing..." : t("listen")}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bubble-ai rounded-2xl rounded-tl-sm p-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] mb-2 text-[#5C6A64]">{t("assistant")}</div>
                  <div className="dot-typing text-[#8BA888]"><span>•</span><span>•</span><span>•</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#E1DFDA] p-3 md:p-5 bg-white">
            <div className="rounded-2xl border border-[#E1DFDA] bg-[#F9F8F6] p-2 flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t("askPlaceholder")}
                rows={1}
                className="flex-1 min-w-0 text-base resize-none border-0 bg-transparent focus-visible:ring-0 max-h-40"
                data-testid="chat-input"
              />

              {voiceEnabled && (
                <Button
                  type="button"
                  variant={recording ? "destructive" : "ghost"}
                  size="icon"
                  className={`rounded-full shrink-0 ${recording ? "mic-recording bg-[#CC7A6B] hover:bg-[#CC7A6B]/90" : "text-[#5C6A64]"}`}
                  onClick={recording ? stopRecording : startRecording}
                  data-testid="mic-btn"
                  title={recording ? t("stopRecord") : t("record")}
                >
                  {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}

              <Button
                onClick={send}
                disabled={!input.trim() || sending}
                className="rounded-full btn-sage shrink-0 px-5"
                data-testid="send-btn"
              >
                <Send className="w-4 h-4 sm:mr-1.5" /><span className="sr-only sm:not-sr-only">{t("send")}</span>
              </Button>
            </div>

            <div className="mt-3">
              <MedicalDisclaimer compact />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
