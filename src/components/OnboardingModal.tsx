import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, Phone, ArrowRight, Users, UserRound, Smile, MessageSquare, ShieldCheck } from "lucide-react";
import saranoIcon from "@/assets/sarano-icon.png";
import AudioWaveAnimation from "@/components/AudioWaveAnimation";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const DEMO_AUDIO_URL = `/demo-call.mp3`;

const CALL_SUGGESTIONS = [
  { icon: UserRound, label: "Il tuo migliore amico", emoji: "👋" },
  { icon: Users, label: "Un collega di lavoro", emoji: "💼" },
  { icon: Smile, label: "Un familiare simpatico", emoji: "😂" },
];

const OnboardingModal = ({ open, onClose, onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayDemo = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(DEMO_AUDIO_URL);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setHasListened(true);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setHasListened(true);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
        setHasListened(true);
      });
      setIsPlaying(true);
      setTimeout(() => setHasListened(true), 3000);
    }
  };

  const handleStartPrank = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card shadow-lg mb-3 overflow-hidden">
            <img src={saranoIcon} alt="Sarano" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {step === 1 && "Ascolta una chiamata Sarano"}
            {step === 2 && "Hai 1 scherzo gratis! 🎁"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 && "Scopri come funziona in 10 secondi"}
            {step === 2 && "Chiama chi vuoi, subito e senza costi"}
          </p>
        </div>

        <div className="p-6 pt-4">
          {step === 1 && (
            <div className="space-y-5">
              {/* Demo Audio Player */}
              <div className="bg-muted/50 rounded-xl p-5 text-center space-y-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <img src={saranoIcon} alt="Sarano" className="w-12 h-12 object-contain rounded-full" />
                    {isPlaying && (
                      <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
                    )}
                  </div>
                  <AudioWaveAnimation isActive={isPlaying} barCount={7} className="h-8" />
                </div>

                <button
                  onClick={handlePlayDemo}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95 text-sm font-medium"
                >
                  {isPlaying ? (
                    <><Pause className="w-4 h-4" /> Pausa</>
                  ) : (
                    <><Play className="w-4 h-4 ml-0.5" /> Ascolta la demo</>
                  )}
                </button>
                <p className="text-xs text-muted-foreground">
                  {isPlaying ? "Ascolta come suona una chiamata Sarano..." : "~1 minuto di esempio reale"}
                </p>
              </div>

              <p className="text-xs text-center text-muted-foreground/80 italic">
                Se non fa ridere, chiudi. Zero rischi.
              </p>

              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 text-base"
                disabled={!hasListened}
              >
                Continua <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {!hasListened && (
                <p className="text-xs text-center text-muted-foreground">
                  Ascolta la demo per continuare
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Free prank info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      1 chiamata gratis verso qualsiasi numero
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Nessuna carta richiesta, parti subito!
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleStartPrank}
                  className="w-full h-11"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Crea il tuo primo scherzo
                </Button>
              </div>

              {/* Mandatory reveal SMS info */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-medium text-sm text-foreground">SMS rivelatore obbligatorio</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Per lo scherzo gratuito, la vittima riceverà un SMS dopo la chiamata che rivela lo scherzo e <strong className="text-foreground">include il tuo numero di telefono</strong>. Questo garantisce un uso responsabile del servizio.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span>Per la sicurezza di tutti</span>
                </div>
              </div>

              {/* Who to call suggestions */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Chi vuoi chiamare?
                </p>
                <div className="space-y-2">
                  {CALL_SUGGESTIONS.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span className="text-sm text-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
