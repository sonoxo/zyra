import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Send, Trash2, Sparkles, User, Shield, AlertTriangle, Activity, Target, ImagePlus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  hasImage?: boolean;
}

const SUGGESTED_QUESTIONS = [
  { icon: Target, label: "Security posture", q: "What's my current security posture score?" },
  { icon: AlertTriangle, label: "Prioritized actions", q: "What should I prioritize right now?" },
  { icon: Shield, label: "Critical vulnerabilities", q: "Show me critical unpatched vulnerabilities" },
  { icon: Activity, label: "Open incidents", q: "Show open incidents and MTTR" },
  { icon: Bot, label: "Attack paths", q: "What are the active attack paths in our environment?" },
  { icon: Sparkles, label: "Full overview", q: "Give me a full security overview" },
];

function renderFormattedContent(content: string) {
  const parts: Array<{ type: "text" | "bold"; value: string }> = [];
  let remaining = content;
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  let lastIndex = 0;
  while ((match = boldRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", value: remaining.slice(lastIndex, match.index) });
    parts.push({ type: "bold", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) parts.push({ type: "text", value: remaining.slice(lastIndex) });

  return parts.map((part, i) => {
    const lines = part.value.split("\n");
    const elements = lines.flatMap((line, li) => {
      const el = part.type === "bold" ? <strong key={`${i}-${li}`}>{line}</strong> : <span key={`${i}-${li}`}>{line}</span>;
      return li < lines.length - 1 ? [el, <br key={`br-${i}-${li}`} />] : [el];
    });
    return elements;
  });
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div data-testid={`message-${message.role}`} className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed",
        isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted border border-border rounded-tl-sm text-foreground"
      )}>
        <div>{renderFormattedContent(message.content)}</div>
        <div className={cn("text-[10px] mt-1.5 opacity-60", isUser ? "text-right" : "text-left")}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

export default function SecurityCopilotPage() {
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: history, isLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/copilot/history"],
  });

  useEffect(() => {
    if (history?.messages) setLocalMessages(history.messages);
  }, [history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/copilot/history"),
    onSuccess: () => { setLocalMessages([]); qc.invalidateQueries({ queryKey: ["/api/copilot/history"] }); toast({ title: "Conversation cleared" }); },
  });

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only image files are supported", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setPendingImage({ base64, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function sendMessage(msg?: string) {
    const text = msg || input.trim();

    if (pendingImage) {
      if (isSending) return;
      setIsSending(true);
      setInput("");
      const prompt = text || "Analyze this image for security issues";
      const userMsg: Message = { role: "user", content: `📎 ${pendingImage.name}\n${prompt}`, hasImage: true, timestamp: new Date().toISOString() };
      setLocalMessages(prev => [...prev, userMsg]);
      const imgData = pendingImage;
      setPendingImage(null);

      try {
        const resp = await apiRequest("POST", "/api/copilot/vision", { image: imgData.base64, mimeType: imgData.mimeType, prompt });
        const data = await resp.json();
        setLocalMessages(data.messages || []);
        qc.invalidateQueries({ queryKey: ["/api/copilot/history"] });
      } catch {
        toast({ title: "Vision analysis failed", variant: "destructive" });
        setLocalMessages(prev => prev.filter(m => m !== userMsg));
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (!text || isSending) return;
    setInput("");
    setIsSending(true);

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    setLocalMessages(prev => [...prev, userMsg]);

    try {
      const resp = await apiRequest("POST", "/api/copilot/chat", { message: text });
      const data = await resp.json();
      setLocalMessages(data.messages || []);
      qc.invalidateQueries({ queryKey: ["/api/copilot/history"] });
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
      setLocalMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsSending(false);
    }
  }

  const messages = localMessages;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            ZyraCopilot
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time AI security analyst — live data, prioritized actions, zero guesswork</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 inline-block" />
            Online
          </Badge>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              data-testid="clear-conversation"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="conversation-area">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">ZyraCopilot</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Real-time security analyst connected to your live data. I compute posture scores, prioritize actions, correlate threats, and guide remediation — all from your actual environment. Ask me anything.
            </p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map(({ icon: Icon, label, q }) => (
                <button
                  key={q}
                  data-testid={`suggested-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => sendMessage(q)}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-left text-xs"
                >
                  <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground font-medium line-clamp-2">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)}
            {isSending && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted border border-border rounded-xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-border bg-background">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {SUGGESTED_QUESTIONS.slice(0, 4).map(({ q }) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {q.length > 35 ? q.slice(0, 35) + "…" : q}
              </button>
            ))}
          </div>
        )}
        {pendingImage && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <ImagePlus className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-foreground truncate flex-1">{pendingImage.name}</span>
            <button data-testid="remove-pending-image" onClick={() => setPendingImage(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <Button
            data-testid="upload-image-button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="shrink-0"
            title="Upload image for security analysis"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
          <Textarea
            data-testid="copilot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={pendingImage ? "Add context for the image analysis (optional)…" : "Ask about vulnerabilities, risks, incidents, attack paths… (Enter to send)"}
            className="min-h-[44px] max-h-32 resize-none text-sm"
            rows={1}
          />
          <Button
            data-testid="send-message-button"
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !pendingImage) || isSending}
            className="shrink-0"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          ZyraCopilot analyzes your live environment data in real time. Upload screenshots for AI-powered security analysis.
        </p>
      </div>
    </div>
  );
}
