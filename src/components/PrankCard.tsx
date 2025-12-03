import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Calendar, Clock, X, CalendarClock, Download } from "lucide-react";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Prank {
  id: string;
  victim_first_name: string;
  victim_last_name: string;
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
  onCancel?: () => void;
  showDetails?: boolean;
}

const PrankCard = ({ prank, getStatusColor, getStatusLabel, onRepeat, onCancel, showDetails = false }: PrankCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const isScheduled = prank.call_status === "scheduled";

  return (
    <Card className="shadow-soft hover:shadow-glow/20 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">
                {prank.victim_first_name} {prank.victim_last_name}
              </h3>
              <Badge variant="outline" className={`text-xs shrink-0 ${getStatusColor(prank.call_status)}`}>
                {getStatusLabel(prank.call_status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {prank.prank_theme}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {isScheduled && prank.scheduled_at ? (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  <CalendarClock className="w-3 h-3" />
                  {format(new Date(prank.scheduled_at), "d MMM 'alle' HH:mm", { locale: it })}
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(prank.created_at), "d MMM yyyy", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(prank.created_at), "HH:mm")}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isScheduled && onCancel ? (
              <Button
                size="icon"
                variant="outline"
                className="w-10 h-10 rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={onCancel}
                title="Annulla scherzo"
              >
                <X className="w-4 h-4" />
              </Button>
            ) : prank.recording_url ? (
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="w-10 h-10 rounded-full"
                  onClick={togglePlay}
                  title={isPlaying ? "Pausa" : "Ascolta"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-10 h-10 rounded-full"
                  onClick={() => window.open(prank.recording_url!, '_blank')}
                  title="Scarica registrazione"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
            {!isScheduled && (
              <Button
                size="icon"
                variant="ghost"
                className="w-10 h-10 rounded-full"
                onClick={onRepeat}
                title="Ripeti scherzo"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {prank.recording_url && (
          <audio
            ref={audioRef}
            src={prank.recording_url}
            onEnded={handleAudioEnd}
            className="hidden"
          />
        )}

        {showDetails && prank.recording_url && isPlaying && (
          <div className="mt-3 pt-3 border-t">
            <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrankCard;
