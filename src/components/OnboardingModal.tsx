import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, CreditCard, Phone, ArrowRight, Users, UserRound, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import saranoIcon from "@/assets/sarano-icon.png";
import AudioWaveAnimation from "@/components/AudioWaveAnimation";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// Demo audio - upload to Supabase Storage temp-audio bucket as "demo-call.mp3"
const DEMO_AUDIO_URL = `https://vtsankkghplkfhrlxefs.supabase.co/storage/v1/object/public/temp-audio/demo-call.mp3`;

const CALL_SUGGESTIONS = [
  { icon: UserRound, label: "Il tuo migliore amico", emoji: "👋" },
  { icon: Users, label: "Un collega di lavoro", emoji: "💼" },
  { icon: Smile, label: "Un familiare simpatico", emoji: "😂" },
];

const OnboardingModal = ({ open, onClose, onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
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
        setHasListened(true); // Let them proceed anyway
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
      // Mark as listened after 3 seconds even if not finished
      setTimeout(() => setHasListened(true), 3000);
    }
  };

  const handleAddCard = async () => {
    setLoadingCard(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-card");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Setup card error:", err);
      setLoadingCard(false);
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
            {step === 2 && "Ora prova tu"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 && "Scopri come funziona in 10 secondi"}
            {step === 2 && "La prima chiamata la offriamo noi 🎁"}
          </p>
        </div>

        <div className="p-6 pt-4">
          {step === 1 && (
            <div className="space-y-5">
              {/* Demo Audio Player */}
              <div className="bg-muted/50 rounded-xl p-5 text-center">
                <button
                  onClick={handlePlayDemo}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7" />
                  ) : (
                    <Play className="w-7 h-7 ml-1" />
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-3">
                  {isPlaying ? "In riproduzione..." : "Premi play per ascoltare"}
                </p>
              </div>

              {/* Reassurance */}
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
              {/* Card setup CTA */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      1 chiamata inclusa
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inserisci un metodo di pagamento per iniziare
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleAddCard}
                  className="w-full h-11"
                  disabled={loadingCard}
                >
                  {loadingCard ? (
                    <span className="animate-pulse">Caricamento...</span>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Aggiungi carta e inizia
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Nessun addebito. La carta serve solo per verificare il tuo account.
                </p>
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
