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
  elevenlabsSettings?: {
    stability: number;
    similarity: number;
    style: number;
    speed: number;
  };
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const VoiceTestDialog = ({
  open,
  onOpenChange,
  language,
  gender,
  voiceId,
  personality = "friendly",
  elevenlabsSettings
}: VoiceTestDialogProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      disconnect();
    }
  }, [open]);

  const startSession = async () => {
    try {
      // Request microphone permission
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Setup speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language === 'Italiano' ? 'it-IT' : 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              currentTranscriptRef.current += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };
      }

      setIsConnected(true);
      setTranscript([]);
      setConversationHistory([]);
      
      toast({
        title: "Connesso!",
        description: "Tieni premuto il microfono per parlare"
      });
    } catch (error: any) {
      console.error("Error starting session:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile accedere al microfono",
        variant: "destructive"
      });
    }
  };

  const startRecording = () => {
    if (!streamRef.current || isProcessing || isPlaying) return;
    
    currentTranscriptRef.current = "";
    setIsRecording(true);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Wait a moment for final transcript
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userMessage = currentTranscriptRef.current.trim();
    
    if (!userMessage) {
      toast({
        title: "Nessun audio rilevato",
        description: "Prova a parlare più chiaramente",
        variant: "destructive"
      });
      return;
    }

    setTranscript(prev => [...prev, `Tu: ${userMessage}`]);
    await processMessage(userMessage);
  };

  const processMessage = async (userMessage: string) => {
    if (!voiceId) {
      toast({
        title: "Errore",
        description: "Nessuna voce selezionata",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("voice-test", {
        body: { 
          userMessage,
          conversationHistory,
          language, 
          gender, 
          voiceId, 
          personality,
          elevenlabsSettings
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const aiResponse = data.text;
      setCurrentModel(data.model || "");
      
      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: aiResponse }
      ]);
      
      setTranscript(prev => [...prev, `AI: ${aiResponse}`]);

      // Play audio
      if (data.audio) {
        setIsPlaying(true);
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audioRef.current.play();
      }

    } catch (error: any) {
      console.error("Error processing message:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'elaborazione",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  };

  const disconnect = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlaying(false);
    setConversationHistory([]);
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
            Test Voce Completo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {language} - {gender === "male" ? "Maschile" : "Femminile"}
            </p>
            {voiceId && (
              <p className="text-xs font-mono text-muted-foreground">
                ElevenLabs: {voiceId.slice(0, 12)}...
              </p>
            )}
            {currentModel && (
              <p className="text-xs text-muted-foreground">
                Modello AI: {currentModel}
              </p>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex justify-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
              isRecording ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
            }`}>
              {isRecording ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
              <span className="text-xs">Tu</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
              isPlaying ? "bg-purple-500/20 text-purple-500" : 
              isProcessing ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
            }`}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className={`w-4 h-4 ${isPlaying ? "animate-pulse" : ""}`} />
              )}
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

          {/* Controls */}
          <div className="flex justify-center">
            {!isConnected ? (
              <Button
                onClick={startSession}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16"
              >
                <Phone className="w-6 h-6" />
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => isRecording && stopRecording()}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isProcessing || isPlaying}
                  className={`rounded-full w-20 h-20 transition-all ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 scale-110" 
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Mic className={`w-8 h-8 ${isRecording ? "animate-pulse" : ""}`} />
                  )}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Termina
                </Button>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {!isConnected 
              ? "Premi il bottone verde per iniziare" 
              : isRecording 
                ? "Parla ora... rilascia per inviare"
                : isProcessing
                  ? "Elaborazione in corso..."
                  : isPlaying
                    ? "Risposta AI..."
                    : "Tieni premuto il microfono per parlare"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
