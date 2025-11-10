import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Mic, Volume2, Send, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VoiceWaveform from "./VoiceWaveform";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AIBotAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamAIResponse = async (userMessage: string, action = "chat") => {
    const updatedMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-bot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages,
            action,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

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
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant" as const, content: assistantContent }];
              });
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    } catch (error) {
      console.error("AI bot error:", error);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;
    streamAIResponse(inputMessage);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped, transcribing...");
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];

        const { data, error } = await supabase.functions.invoke("speech-to-text", {
          body: { audio: base64Audio },
        });

        if (error) throw error;

        setInputMessage(data.text);
        toast.success("Transcription complete");
      };
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to transcribe audio");
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text, voice: "alloy" },
      });

      if (error) throw error;

      const audioData = atob(data.audioContent);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("Speech error:", error);
      toast.error("Failed to play speech");
      setIsSpeaking(false);
    }
  };

  return (
    <>
      {/* Floating Bot Button - Zozo */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full shadow-lg transition-all ${
          isSpeaking ? "animate-pulse glow-accent scale-110" : "glow-primary"
        }`}
        size="icon"
      >
        <Bot className={`w-8 h-8 transition-transform ${isSpeaking ? "animate-bounce" : ""}`} />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-28 right-8 z-50 w-96 h-[600px] bg-card/95 backdrop-blur border-primary/20 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ${
                  isSpeaking ? "animate-pulse" : ""
                }`}>
                  <Bot className={`w-6 h-6 text-primary-foreground ${isSpeaking ? "animate-bounce" : ""}`} />
                </div>
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                    <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ animationDelay: "0.2s" }} />
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground">Zozo</h3>
                <p className="text-xs text-muted-foreground">
                  {isSpeaking ? "Speaking..." : isRecording ? "Listening..." : "AI Assistant"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Voice Waveform Indicator */}
          {(isSpeaking || isRecording) && (
            <div className="px-4 py-2 border-b border-primary/10 bg-muted/20">
              <VoiceWaveform isActive={isSpeaking || isRecording} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
                    <Bot className="w-12 h-12 text-primary-foreground" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
                <p className="font-bold text-lg mb-1">Hi! I'm Zozo</p>
                <p className="text-sm">Your CyberLink AI assistant with animated voice</p>
                <p className="text-sm mt-2">How can I help you today?</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-start gap-2">
                    {msg.role === "assistant" && (
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 ${
                        isSpeaking ? "animate-pulse" : ""
                      }`}>
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(msg.content)}
                          disabled={isSpeaking}
                          className="mt-2"
                        >
                          <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`} />
                          <span className="ml-1 text-xs">{isSpeaking ? "Speaking..." : "Listen"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-2 justify-start items-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground mt-1">Zozo is thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-primary/20">
            <div className="flex gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
              >
                <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
              </Button>
              <Input
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={isLoading || !inputMessage.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default AIBotAssistant;
