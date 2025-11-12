import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Mic, Volume2, Send, Loader2, X, Radio, Zap, MessageSquare, Crown, Lock, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VoiceWaveform from "./VoiceWaveform";
import HyperspacePortal from "./HyperspacePortal";
import ZozoUpgradeDialog from "./ZozoUpgradeDialog";
import { ZozoSpaceshipEntrance } from "./ZozoSpaceshipEntrance";
import { HyperSpeedSequence } from "./HyperSpeedSequence";
import { useNavigate } from "react-router-dom";
import { useZozoSubscription, ZOZO_TIERS } from "@/hooks/useZozoSubscription";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AIBotAssistant = () => {
  const navigate = useNavigate();
  const { tier, loading: subLoading, startCheckout, openCustomerPortal } = useZozoSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoLiveLink, setAutoLiveLink] = useState(false);
  const [hyperspaceOpen, setHyperspaceOpen] = useState(false);
  const [showSpaceship, setShowSpaceship] = useState(false);
  const [showHyperSpeed, setShowHyperSpeed] = useState(false);
  const [hyperSpeedDestination, setHyperSpeedDestination] = useState("/");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isActive = tier !== "free";
  const isPremium = tier === "premium";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for notifications from CyberLink World
  useEffect(() => {
    const channel = supabase
      .channel('cyberlink-notifications')
      .on('broadcast', { event: 'notification' }, (payload: any) => {
        const { type, destination, bot } = payload.payload || {};
        
        // Only respond to Zozo notifications
        if (bot === 'zozo') {
          if (type === 'hyperspeed') {
            setHyperSpeedDestination(destination || '/');
            setShowHyperSpeed(true);
            setIsOpen(false);
          } else {
            setShowSpaceship(true);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Auto-link to live when enabled
    if (autoLiveLink && isOpen) {
      toast.success("Auto-Live feature activated");
    }
  }, [autoLiveLink, isOpen]);

  const createThread = async (content: string) => {
    try {
      toast.success("Thread created and posted!");
      // In a real app, this would create a thread in the database
      const newThread = {
        role: "assistant" as const,
        content: `📝 Thread Posted:\n\n${content}`,
      };
      setMessages((prev) => [...prev, newThread]);
    } catch (error) {
      console.error("Thread creation error:", error);
      toast.error("Failed to create thread");
    }
  };

  const handleAutoReply = async (originalMessage: string) => {
    if (!autoReplyEnabled) return;

    // Generate auto-reply using AI
    const autoReplyPrompt = `Generate a brief, friendly auto-reply to this message: "${originalMessage}". Keep it under 50 words.`;
    await streamAIResponse(autoReplyPrompt, "message");
  };

  const streamAIResponse = async (userMessage: string, action = "chat") => {
    if (!isActive) {
      toast.error("Zozo is inactive. Subscribe to activate AI features!");
      setShowUpgrade(true);
      return;
    }

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
    
    if (!isActive) {
      toast.error("Zozo is inactive. Subscribe to start chatting!");
      setShowUpgrade(true);
      return;
    }

    // Check for special commands
    if (inputMessage.toLowerCase().includes("create thread")) {
      createThread(inputMessage.replace(/create thread:?/i, "").trim());
      setInputMessage("");
      return;
    }

    if (inputMessage.toLowerCase() === "hyperspace") {
      if (!isPremium) {
        toast.error("Hyperspace requires Premium subscription");
        setShowUpgrade(true);
        return;
      }
      setHyperspaceOpen(true);
      setInputMessage("");
      return;
    }

    // Navigation commands
    const commandMap: Record<string, { path: string; message: string; requiresPremium?: boolean }> = {
      "go live": { path: "/studio", message: "Connecting to Live Studio..." },
      "studio": { path: "/studio", message: "Opening Studio..." },
      "cyber gamers": { path: "/cyber-gamers", message: "Opening Cyber Gamers..." },
      "gamers": { path: "/cyber-gamers", message: "Opening Cyber Gamers..." },
      "gaming": { path: "/cyber-gamers", message: "Opening Cyber Gamers..." },
      "cyber streamer": { path: "/cyber-streamer", message: "Opening Cyber Streamer..." },
      "streamer": { path: "/cyber-streamer", message: "Opening Cyber Streamer..." },
      "streaming": { path: "/cyber-streamer", message: "Opening Cyber Streamer..." },
      "monetization": { path: "/monetization", message: "Opening Monetization Dashboard..." },
      "earnings": { path: "/monetization", message: "Opening Monetization Dashboard..." },
      "money": { path: "/monetization", message: "Opening Monetization Dashboard..." },
      "affiliate": { path: "/affiliate", message: "Opening Affiliate Program..." },
      "refer": { path: "/affiliate", message: "Opening Affiliate Program..." },
      "seller dashboard": { path: "/seller-dashboard", message: "Opening Seller Dashboard..." },
      "seller": { path: "/seller-dashboard", message: "Opening Seller Dashboard..." },
      "sell": { path: "/seller-register", message: "Opening Seller Registration..." },
      "register seller": { path: "/seller-register", message: "Opening Seller Registration..." },
      "security": { path: "/security", message: "Opening Security Center..." },
      "privacy": { path: "/security", message: "Opening Security Center..." },
      "home": { path: "/", message: "Going to Home..." },
      "feed": { path: "/", message: "Going to Feed..." }
    };

    const command = Object.keys(commandMap).find(cmd => 
      inputMessage.toLowerCase().includes(cmd)
    );

    if (command) {
      const { path, message, requiresPremium } = commandMap[command];
      if (requiresPremium && !isPremium) {
        toast.error(`${command} requires Premium subscription`);
        setShowUpgrade(true);
        return;
      }
      navigate(path);
      toast.success(message);
      setInputMessage("");
      return;
    }

    streamAIResponse(inputMessage);

    // Trigger auto-reply if enabled
    if (autoReplyEnabled) {
      setTimeout(() => handleAutoReply(inputMessage), 2000);
    }
  };

  const handleHyperSpeedJump = (destination: string) => {
    setHyperSpeedDestination(destination);
    setShowHyperSpeed(true);
    setIsOpen(false);
  };

  const startRecording = async () => {
    if (!isActive) {
      toast.error("Voice features require a subscription");
      setShowUpgrade(true);
      return;
    }
    
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
      <HyperSpeedSequence
        isActive={showHyperSpeed}
        destination={hyperSpeedDestination}
        onComplete={() => setShowHyperSpeed(false)}
      />

      <ZozoSpaceshipEntrance 
        isActive={showSpaceship} 
        onComplete={() => {
          setShowSpaceship(false);
          setIsOpen(true);
        }} 
      />

      {/* Floating Bot Button - Zozo */}
      {!isOpen && !showSpaceship && !showHyperSpeed && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full shadow-lg transition-all ${
            isSpeaking ? "animate-pulse glow-accent scale-110" : "glow-primary"
          }`}
          size="icon"
        >
          <Bot className={`w-8 h-8 transition-transform ${isSpeaking ? "animate-bounce" : ""}`} />
        </Button>
      )}

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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleHyperSpeedJump("/")}
                className="text-accent hover:text-accent/80 hover:bg-accent/10"
                title="Hyper Speed to Hub"
              >
                <Rocket className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Voice Waveform Indicator */}
          {(isSpeaking || isRecording) && (
            <div className="px-4 py-2 border-b border-primary/10 bg-muted/20">
              <VoiceWaveform isActive={isSpeaking || isRecording} />
            </div>
          )}
          
          {/* Settings Panel */}
          <div className="px-4 py-3 border-b border-primary/10 bg-muted/10 space-y-3">
            {!isActive ? (
              <div className="text-center py-4 space-y-3">
                <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Zozo is in free mode - visible but inactive
                </p>
                <Button onClick={() => setShowUpgrade(true)} className="w-full glow-primary">
                  <Crown className="w-4 h-4 mr-2" />
                  Activate Zozo
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    <Label htmlFor="auto-live" className="text-sm">
                      Auto-Live Link
                    </Label>
                  </div>
                  <Switch
                    id="auto-live"
                    checked={autoLiveLink}
                    onCheckedChange={setAutoLiveLink}
                    disabled={!isPremium}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    <Label htmlFor="auto-reply" className="text-sm">
                      Auto-Reply
                    </Label>
                  </div>
                  <Switch
                    id="auto-reply"
                    checked={autoReplyEnabled}
                    onCheckedChange={setAutoReplyEnabled}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isPremium) {
                      toast.error("Hyperspace requires Premium");
                      setShowUpgrade(true);
                      return;
                    }
                    setHyperspaceOpen(true);
                  }}
                  className="w-full glow-primary"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Open Hyperspace {!isPremium && <Lock className="w-3 h-3 ml-2" />}
                </Button>

                <Button variant="ghost" size="sm" onClick={openCustomerPortal} className="w-full text-xs">
                  Manage Subscription
                </Button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!isActive && (
              <div className="bg-muted/30 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">Zozo is in Free Mode</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Zozo is visible but won't respond. Subscribe to activate AI features!
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setShowUpgrade(true)} className="glow-primary">
                        View Plans
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="relative inline-block mb-4">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ${isActive ? 'animate-pulse' : 'opacity-50 grayscale'}`}>
                    <Bot className="w-12 h-12 text-primary-foreground" />
                  </div>
                  {isActive && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />}
                </div>
                <p className="font-bold text-lg mb-1">Hi! I'm Zozo</p>
                <p className="text-sm">{isActive ? 'Your CyberLink AI assistant with animated voice' : 'I\'m visible but inactive in free mode'}</p>
                {isActive && (
                  <>
                    <p className="text-sm mt-2">Try these commands:</p>
                    <div className="text-xs space-y-1 mt-3">
                      {isPremium && <Badge variant="outline" className="mr-2 mb-1">hyperspace</Badge>}
                      <Badge variant="outline" className="mr-2 mb-1">go live</Badge>
                      <Badge variant="outline" className="mr-2 mb-1">cyber streamer</Badge>
                      <Badge variant="outline" className="mr-2 mb-1">cyber gamers</Badge>
                      <Badge variant="outline" className="mr-2 mb-1">monetization</Badge>
                      <Badge variant="outline" className="mr-2 mb-1">affiliate</Badge>
                      <Badge variant="outline" className="mr-2 mb-1">seller dashboard</Badge>
                      <Badge variant="outline" className="mr-2 mb-1">create thread: [text]</Badge>
                    </div>
                  </>
                )}
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
      
      <HyperspacePortal isOpen={hyperspaceOpen} onClose={() => setHyperspaceOpen(false)} />
      <ZozoUpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        onSelectTier={(tier) => {
          startCheckout(tier);
          setShowUpgrade(false);
        }}
      />
    </>
  );
};

export default AIBotAssistant;
