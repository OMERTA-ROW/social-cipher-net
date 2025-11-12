import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Target, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TradingSignalsPanel from "./TradingSignalsPanel";
import { SpaceshipEntrance } from "./SpaceshipEntrance";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DracoAIProps {
  onFibonacciRequest?: (levels: number[]) => void;
  chartSymbol?: string;
}

const DracoAI = ({ onFibonacciRequest, chartSymbol = "Chart" }: DracoAIProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Draco online. Ready to execute tactical analysis. What's your target?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSpaceship, setShowSpaceship] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for notifications from CyberLink World
  useEffect(() => {
    const channel = supabase
      .channel('cyberlink-notifications')
      .on('broadcast', { event: 'notification' }, () => {
        setShowSpaceship(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draco-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            chartData: { symbol: chartSymbol },
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg?.role === "assistant") {
                  newMsgs[newMsgs.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                } else {
                  newMsgs.push({ role: "assistant", content: assistantContent });
                }
                return newMsgs;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check if Draco is suggesting Fibonacci analysis
      if (assistantContent.toLowerCase().includes("fibonacci") && onFibonacciRequest) {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        onFibonacciRequest(levels);
      }
    } catch (error) {
      console.error("Draco AI error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Mission compromised. System error detected. Regroup and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    streamChat(input);
    setInput("");
  };

  return (
    <>
      <SpaceshipEntrance 
        isActive={showSpaceship} 
        onComplete={() => {
          setShowSpaceship(false);
          setIsOpen(true);
        }} 
      />

      {!isOpen && !showSpaceship && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-600 via-orange-600 to-red-700 hover:from-red-700 hover:via-orange-700 hover:to-red-800 shadow-lg shadow-red-500/50"
          size="lg"
        >
          <Target className="mr-2 h-5 w-5" />
          Call Draco
        </Button>
      )}

      {isOpen && (
    <div className="fixed bottom-6 right-6 z-50 flex gap-4">
      <TradingSignalsPanel symbol={chartSymbol} />
      
      <Card className="w-96 h-[600px] flex flex-col bg-black/95 border-red-600/50 shadow-2xl shadow-red-500/20">
        <div className="flex items-center justify-between p-4 border-b border-red-600/30 bg-gradient-to-r from-red-900/20 to-orange-900/20">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500 animate-pulse" />
            <h3 className="font-bold text-red-500">DRACO</h3>
            <span className="text-xs text-red-400/70">Tactical Analysis AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                    : "bg-gradient-to-r from-red-900/40 to-orange-900/40 text-red-100 border border-red-600/30"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-red-900/40 border border-red-600/30 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-red-600/30 bg-gradient-to-r from-red-950/20 to-orange-950/20">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Request tactical analysis..."
            className="min-h-[60px] bg-black/50 border-red-600/30 text-foreground placeholder:text-red-400/50 focus:border-red-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </Card>
    </div>
      )}
    </>
  );
};

export default DracoAI;
