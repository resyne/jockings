import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, RotateCcw, Play, Pause, Download, Loader2, Calendar, Clock, MessageSquare, Home, History } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import saranoIcon from "@/assets/sarano-icon.png";
import LiveCallView from "@/components/LiveCallView";

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
  personality_tone: string;
  voice_gender: string;
  real_detail?: string | null;
}

const QUICK_PROMPTS = [
  { label: "📞 È caduta la linea!", theme: "Dici che è caduta la linea e che stavi dicendo qualcosa di importante" },
  { label: "😤 Perché hai staccato?", theme: "Chiedi perché ha staccato improvvisamente, sembri un po' offeso" },
  { label: "🔄 Ripeti lo scherzo", theme: null },
];

const PrankDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prank, setPrank] = useState<Prank | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (id) {
      fetchPrank(id);
      
      // Subscribe to prank updates
      const channel = supabase
        .channel(`prank-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pranks',
            filter: `id=eq.${id}`
          },
          (payload) => {
            setPrank(prev => prev ? { ...prev, ...payload.new } : null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchPrank = async (prankId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.rpc('get_user_pranks_decrypted');

      if (error) throw error;

      const foundPrank = data?.find((p: Prank) => p.id === prankId);
      if (foundPrank) {
        setPrank(foundPrank);
      } else {
        toast.error("Scherzo non trovato");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error('Error fetching prank:', error);
      toast.error("Errore nel caricamento dello scherzo");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecording = async () => {
    if (!prank?.recording_url) return null;
    
    const { data, error } = await supabase.functions.invoke('get-recording', {
      body: { recordingUrl: prank.recording_url }
    });

    if (error) {
      console.error('Error fetching recording:', error);
      toast.error('Errore nel caricamento della registrazione');
      return null;
    }

    if (data?.audioBase64) {
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
    if (!audioSrc && prank?.recording_url) {
      setIsDownloading(true);
      const url = await fetchRecording();
      setIsDownloading(false);
      if (url) {
        setAudioSrc(url);
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
    if (!prank?.recording_url) return;
    
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

  const handleQuickCall = (theme: string | null) => {
    if (!prank) return;
    
    if (theme === null) {
      // Repeat same prank
      navigate(`/create-prank?repeat=${prank.id}`);
    } else {
      // Quick call with new theme
      navigate(`/create-prank?quickCall=${prank.id}&theme=${encodeURIComponent(theme)}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "recording_available":
        return "text-green-600 border-green-500/30 bg-green-500/10";
      case "in_progress":
      case "ringing":
        return "text-blue-600 border-blue-500/30 bg-blue-500/10";
      case "pending":
      case "queued":
      case "initiated":
        return "text-yellow-600 border-yellow-500/30 bg-yellow-500/10";
      case "failed":
      case "no_answer":
      case "busy":
        return "text-red-600 border-red-500/30 bg-red-500/10";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
      case "queued":
      case "initiated":
        return "In avvio...";
      case "ringing":
        return "Sta squillando...";
      case "in_progress":
        return "In corso";
      case "completed":
      case "recording_available":
        return "Completato";
      case "failed":
        return "Fallito";
      case "no_answer":
        return "Nessuna risposta";
      case "busy":
        return "Occupato";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!prank) {
    return null;
  }

  const isCallActive = ["initiated", "pending", "queued", "ringing", "in_progress"].includes(prank.call_status);
  const isCallCompleted = ["completed", "recording_available", "no_answer", "busy", "failed"].includes(prank.call_status);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <img 
            src={saranoIcon} 
            alt="sarano.ai" 
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain" 
          />
          <div className="flex-1">
            <h1 className="font-bold text-sm sm:text-base">Dettagli Scherzo</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {format(new Date(prank.created_at), "d MMMM yyyy, HH:mm", { locale: it })}
            </p>
          </div>
        </div>
      </header>

      <div className="px-3 sm:px-4 py-4 sm:py-6 max-w-lg mx-auto space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold">
                  {prank.victim_first_name} {prank.victim_last_name}
                </h2>
                {prank.victim_phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {prank.victim_phone}
                  </p>
                )}
              </div>
              <Badge className={`${getStatusColor(prank.call_status)} text-xs sm:text-sm px-2 sm:px-3 py-1`}>
                {getStatusLabel(prank.call_status)}
              </Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tema dello scherzo:</p>
              <p className="text-sm sm:text-base">{prank.prank_theme}</p>
            </div>

            {prank.real_detail && (
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mt-3">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Dettaglio reale:</p>
                <p className="text-sm sm:text-base">{prank.real_detail}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Call View for active calls */}
        {isCallActive && (
          <LiveCallView
            prankId={prank.id}
            victimName={`${prank.victim_first_name} ${prank.victim_last_name}`}
            callStatus={prank.call_status}
          />
        )}

        {/* Recording Controls */}
        {isCallCompleted && prank.recording_url && (
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Registrazione</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-10 sm:h-12"
                  onClick={togglePlay}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  )}
                  <span className="text-sm sm:text-base">{isPlaying ? "Pausa" : "Ascolta"}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-10 sm:h-12 px-4"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              </div>

              {audioSrc && (
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        {isCallCompleted && (
          <Card>
            <CardContent className="p-4 sm:p-6">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-2"
                onClick={() => setShowTranscript(!showTranscript)}
              >
                <span className="flex items-center gap-2 text-sm sm:text-base">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  Conversazione
                </span>
                <span className="text-xs text-muted-foreground">
                  {showTranscript ? "Nascondi" : "Mostra"}
                </span>
              </Button>
              
              {showTranscript && (
                <div className="mt-3 sm:mt-4">
                  <LiveCallView
                    prankId={prank.id}
                    victimName={`${prank.victim_first_name} ${prank.victim_last_name}`}
                    callStatus={prank.call_status}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {isCallCompleted && (
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                Azioni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid gap-2 sm:gap-3">
                {QUICK_PROMPTS.map((prompt, index) => (
                  <Button
                    key={index}
                    variant={prompt.theme === null ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto py-2.5 sm:py-3 px-3 sm:px-4"
                    onClick={() => handleQuickCall(prompt.theme)}
                  >
                    <span className="text-sm sm:text-base">{prompt.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-2 sm:gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-10 sm:h-12"
            onClick={() => navigate("/dashboard")}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Dashboard</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 sm:h-12"
            onClick={() => navigate("/history")}
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Storico</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrankDetail;
