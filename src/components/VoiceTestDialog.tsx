import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  gender: string;
  voiceId: string | null;
  personality?: string;
}

export const VoiceTestDialog = ({
  open,
  onOpenChange,
  language,
  gender,
  voiceId,
  personality = "friendly"
}: VoiceTestDialogProps) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      disconnect();
    }
  }, [open]);

  const startCall = async () => {
    setIsConnecting(true);
    setTranscript([]);
    
    try {
      // Get ephemeral token
      const { data, error } = await supabase.functions.invoke("realtime-session", {
        body: { language, gender, voiceId, personality }
      });

      if (error) throw error;
      
      if (!data?.client_secret?.value) {
        throw new Error("Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;

      // Create audio element
      audioElRef.current = document.createElement("audio");
      audioElRef.current.autoplay = true;

      // Create peer connection
      pcRef.current = new RTCPeerConnection();

      // Set up remote audio
      pcRef.current.ontrack = (e) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      pcRef.current.addTrack(streamRef.current.getTracks()[0]);

      // Set up data channel
      dcRef.current = pcRef.current.createDataChannel("oai-events");
      
      dcRef.current.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("Received event:", event.type);
        
        if (event.type === 'response.audio.delta') {
          setIsAiSpeaking(true);
        } else if (event.type === 'response.audio.done') {
          setIsAiSpeaking(false);
        } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
          setTranscript(prev => [...prev, `Tu: ${event.transcript}`]);
        } else if (event.type === 'response.audio_transcript.done') {
          setTranscript(prev => [...prev, `AI: ${event.transcript}`]);
        } else if (event.type === 'input_audio_buffer.speech_started') {
          setIsSpeaking(true);
        } else if (event.type === 'input_audio_buffer.speech_stopped') {
          setIsSpeaking(false);
        }
      });

      dcRef.current.addEventListener("open", () => {
        console.log("Data channel opened");
      });

      // Create and set local description
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error("Failed to connect to OpenAI Realtime");
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await pcRef.current.setRemoteDescription(answer);
      
      setIsConnected(true);
      toast({
        title: "Connesso!",
        description: "Inizia a parlare per testare la voce"
      });

    } catch (error: any) {
      console.error("Error starting call:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile avviare la chiamata di test",
        variant: "destructive"
      });
      disconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setIsAiSpeaking(false);
  };

  const handleClose = () => {
    disconnect();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-500" />
            Test Chiamata Vocale
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {language} - {gender === "male" ? "Maschile" : "Femminile"}
            </p>
            {voiceId && (
              <p className="text-xs font-mono text-muted-foreground">
                Voice ID: {voiceId.slice(0, 12)}...
              </p>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex justify-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
              isSpeaking ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
            }`}>
              {isSpeaking ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
              <span className="text-xs">Tu</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
              isAiSpeaking ? "bg-purple-500/20 text-purple-500" : "bg-muted text-muted-foreground"
            }`}>
              <Volume2 className={`w-4 h-4 ${isAiSpeaking ? "animate-pulse" : ""}`} />
              <span className="text-xs">AI</span>
            </div>
          </div>

          {/* Transcript */}
          {transcript.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
              {transcript.map((line, i) => (
                <p key={i} className={`text-sm ${
                  line.startsWith("Tu:") ? "text-green-600" : "text-purple-600"
                }`}>
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Call button */}
          <div className="flex justify-center">
            {!isConnected ? (
              <Button
                onClick={startCall}
                disabled={isConnecting}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16"
              >
                {isConnecting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Phone className="w-6 h-6" />
                )}
              </Button>
            ) : (
              <Button
                onClick={handleClose}
                variant="destructive"
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {isConnected 
              ? "Parla per testare. La voce OpenAI simula la chiamata." 
              : "Premi il bottone verde per iniziare il test"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
