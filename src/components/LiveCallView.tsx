import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AudioWaveAnimation from "./AudioWaveAnimation";
import { toast } from "sonner";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface LiveCallViewProps {
  prankId: string;
  victimName: string;
  callStatus: string;
  onClose?: () => void;
}

const LiveCallView = ({ prankId, victimName, callStatus, onClose }: LiveCallViewProps) => {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  useEffect(() => {
    // Initial fetch of conversation history
    const fetchTranscript = async () => {
      const { data, error } = await supabase
        .from("pranks")
        .select("conversation_history")
        .eq("id", prankId)
        .single();

      if (data?.conversation_history && Array.isArray(data.conversation_history)) {
        setTranscript(data.conversation_history as unknown as TranscriptMessage[]);
      }
    };

    fetchTranscript();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`prank-${prankId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pranks",
          filter: `id=eq.${prankId}`,
        },
        (payload) => {
          console.log("Prank update received:", payload);
          const newData = payload.new as { conversation_history?: unknown[]; call_status?: string };
          
          if (newData.conversation_history && Array.isArray(newData.conversation_history)) {
            const messages = newData.conversation_history as unknown as TranscriptMessage[];
            setTranscript(messages);
            
            // Check if last message is from assistant to animate
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === "assistant") {
              setIsAISpeaking(true);
              setTimeout(() => setIsAISpeaking(false), 2000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prankId]);

  const isCallActive = ["initiated", "pending", "queued", "ringing", "in_progress"].includes(callStatus);

  const handleEndCall = async () => {
    setIsEndingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke('end-call-vapi', {
        body: { prankId }
      });

      if (error) {
        throw error;
      }

      toast.success("Chiamata terminata");
      onClose?.();
    } catch (error: any) {
      console.error('Error ending call:', error);
      toast.error("Errore nel terminare la chiamata");
    } finally {
      setIsEndingCall(false);
    }
  };

  return (
    <Card className="shadow-glow border-primary/30 bg-background-level-1 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCallActive ? 'bg-green-500/20' : 'bg-muted'}`}>
              {isCallActive ? (
                <Phone className="w-5 h-5 text-green-500 animate-pulse" />
              ) : (
                <PhoneOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{victimName}</h3>
              <Badge 
                variant="outline" 
                className={`text-xs ${isCallActive ? 'border-green-500/50 text-green-500' : 'border-muted-foreground/50'}`}
              >
                {callStatus === "initiated" || callStatus === "pending" || callStatus === "queued" ? "Avviando..." :
                 callStatus === "ringing" ? "Squillando..." : 
                 callStatus === "in_progress" ? "In corso" : 
                 "Chiamata terminata"}
              </Badge>
            </div>
          </div>
          
          {/* Audio Wave Animation */}
          <AudioWaveAnimation isActive={isCallActive && isAISpeaking} barCount={7} />
        </div>

        {/* Transcript Area */}
        <div className="bg-background-level-0 rounded-lg p-3 max-h-48 overflow-y-auto space-y-3">
          {transcript.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              {isCallActive ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>In attesa della conversazione...</span>
                </div>
              ) : (
                "Nessun transcript disponibile"
              )}
            </div>
          ) : (
            transcript.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === "assistant"
                      ? "bg-primary/10 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <span className="text-xs font-medium opacity-70 block mb-1">
                    {message.role === "assistant" ? "🤖 AI" : "👤 Vittima"}
                  </span>
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Active call indicator and End Call button */}
        {isCallActive && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Chiamata attiva
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndCall}
              disabled={isEndingCall}
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              {isEndingCall ? "Terminando..." : "Termina"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveCallView;
