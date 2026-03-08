import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";

interface VoiceOption {
  id: string;
  voice_name: string | null;
  description: string | null;
  elevenlabs_voice_id: string | null;
  elevenlabs_stability: number | null;
  elevenlabs_similarity: number | null;
  elevenlabs_style: number | null;
  elevenlabs_speed: number | null;
  gender: string;
  language: string;
  sample_audio_url: string | null;
}

interface VoiceCardProps {
  voice: VoiceOption;
  isSelected: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onPlayPreview: () => void;
}

const VoiceCard = ({ voice, isSelected, isPlaying, isLoading, onSelect, onPlayPreview }: VoiceCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm sm:text-base">
            {voice.voice_name || "Voce senza nome"}
          </h4>
          {voice.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              {voice.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPreview();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : isPlaying ? (
              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </Button>
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
            isSelected
              ? "border-primary bg-primary"
              : "border-muted-foreground"
          }`}>
            {isSelected && (
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCard;
export type { VoiceOption };
