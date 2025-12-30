import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Calendar, Clock, X, CalendarClock, Download, Loader2, MessageSquare, ChevronUp } from "lucide-react";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LiveCallView from "./LiveCallView";

interface Prank {
  id: string;
  victim_first_name: string;
  victim_last_name: string;
  victim_phone?: string;
  prank_theme: string;
  call_status: string;
  recording_url: string | null;
  created_at: string;
  scheduled_at?: string | null;
}

interface PrankCardProps {
  prank: Prank;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onRepeat: () => void;
  onQuickCall?: (theme: string) => void;
  onCancel?: () => void;
  showDetails?: boolean;
}

const QUICK_PROMPTS = [
  { label: "📞 È caduta la linea!", theme: "Dici che è caduta la linea e che stavi dicendo qualcosa di importante" },
  { label: "😤 Perché hai staccato?", theme: "Chiedi perché ha staccato improvvisamente, sembri un po' offeso" },
];

const PrankCard = ({ prank, getStatusColor, getStatusLabel, onRepeat, onQuickCall, onCancel, showDetails = false }: PrankCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchRecording = async () => {
    if (!prank.recording_url) return null;
    
    const { data, error } = await supabase.functions.invoke('get-recording', {
      body: { recordingUrl: prank.recording_url }
    });

    if (error) {
      console.error('Error fetching recording:', error);
      toast.error('Errore nel caricamento della registrazione');
      return null;
    }

    if (data?.audioBase64) {
      // Convert base64 to blob URL
      const byteCharacters = atob(data.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    }

    toast.error('Formato registrazione non valido');
    return null;
  };

  const togglePlay = async () => {
    if (!audioSrc && prank.recording_url) {
      setIsDownloading(true);
      const url = await fetchRecording();
      setIsDownloading(false);
      if (url) {
        setAudioSrc(url);
        // Wait for audio to load then play
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    if (!prank.recording_url) return;
    
    setIsDownloading(true);
    try {
      const url = audioSrc || await fetchRecording();
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `scherzo_${prank.victim_first_name}_${prank.victim_last_name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Download avviato!');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Errore nel download');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const isScheduled = prank.call_status === "scheduled";
  const isCallActive = ["initiated", "pending", "queued", "ringing", "in_progress"].includes(prank.call_status);
  const isCallCompleted = prank.call_status === "completed" || prank.call_status === "recording_available" || prank.call_status === "no_answer" || prank.call_status === "busy" || prank.call_status === "failed";

  // Show LiveCallView for active calls
  if (isCallActive) {
    return (
      <LiveCallView
        prankId={prank.id}
        victimName={`${prank.victim_first_name} ${prank.victim_last_name}`}
        callStatus={prank.call_status}
      />
    );
  }

  return (
    <Card className="shadow-soft hover:shadow-glow/20 transition-all">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <h3 className="font-semibold truncate text-sm sm:text-base">
                {prank.victim_first_name} {prank.victim_last_name}
              </h3>
              <Badge variant="outline" className={`text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2 ${getStatusColor(prank.call_status)}`}>
                {getStatusLabel(prank.call_status)}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-1.5 sm:mb-2">
              {prank.prank_theme}
            </p>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
              {isScheduled && prank.scheduled_at ? (
                <span className="flex items-center gap-0.5 sm:gap-1 text-orange-600 font-medium">
                  <CalendarClock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {format(new Date(prank.scheduled_at), "d MMM HH:mm", { locale: it })}
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {format(new Date(prank.created_at), "d MMM", { locale: it })}
                  </span>
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {format(new Date(prank.created_at), "HH:mm")}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2">
            {isScheduled && onCancel ? (
              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={onCancel}
                title="Annulla scherzo"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            ) : prank.recording_url ? (
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                  onClick={togglePlay}
                  disabled={isDownloading}
                  title={isPlaying ? "Pausa" : "Ascolta"}
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  title="Scarica registrazione"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </div>
            ) : null}
            {!isScheduled && (
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                onClick={onRepeat}
                title="Ripeti scherzo"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        </div>

        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onEnded={handleAudioEnd}
            className="hidden"
          />
        )}

        {showDetails && prank.recording_url && isPlaying && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
            <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        )}

        {/* View Transcript Button for completed calls */}
        {isCallCompleted && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[10px] sm:text-xs text-muted-foreground hover:text-foreground h-7 sm:h-8"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              {showTranscript ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Nascondi conversazione
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Vedi conversazione
                </>
              )}
            </Button>
            
            {showTranscript && (
              <div className="mt-2 sm:mt-3">
                <LiveCallView
                  prankId={prank.id}
                  victimName={`${prank.victim_first_name} ${prank.victim_last_name}`}
                  callStatus={prank.call_status}
                />
              </div>
            )}
          </div>
        )}

        {/* Quick Call Buttons */}
        {onQuickCall && !isScheduled && isCallCompleted && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Richiama veloce:</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {QUICK_PROMPTS.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2"
                  onClick={() => onQuickCall(prompt.theme)}
                >
                  {prompt.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrankCard;
