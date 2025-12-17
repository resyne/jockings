import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface AuditLogEntry {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  setting_key: string;
  old_value: string | null;
  new_value: string | null;
  details: Record<string, any> | null;
}

// Human-readable labels for settings
const SETTING_LABELS: Record<string, string> = {
  elevenlabs_model: "Modello ElevenLabs",
  vapi_ai_model: "Modello AI",
  vapi_ai_provider: "Provider AI",
  vapi_temperature: "Temperatura",
  vapi_max_tokens: "Max Tokens",
  vapi_voice_provider: "Provider Voce",
  vapi_voice_speed: "Velocità Voce",
  vapi_voice_stability: "Stabilità Voce",
  vapi_voice_similarity_boost: "Similarity Boost",
  vapi_voice_style: "Stile Voce",
  vapi_voice_speaker_boost: "Speaker Boost",
  vapi_transcriber_provider: "Provider STT",
  vapi_transcriber_model: "Modello STT",
  vapi_transcriber_language: "Lingua STT",
  vapi_max_duration: "Durata Max Chiamata",
  vapi_end_call_message: "Messaggio Fine Chiamata",
  vapi_system_prompt_it: "System Prompt IT",
  vapi_system_prompt_en: "System Prompt EN",
  vapi_first_message_it: "Primo Messaggio IT",
  vapi_first_message_en: "Primo Messaggio EN",
  vapi_recording_enabled: "Registrazione",
  vapi_filler_injection_enabled: "Filler Injection",
  vapi_smart_endpointing_enabled: "Smart Endpointing",
  vapi_voicemail_detection: "Rilevamento Segreteria",
  voice_setting_voice_id: "Voice ID",
  voice_setting_voice_name: "Nome Voce",
  voice_setting_rating: "Rating",
  voice_setting_notes: "Note",
  voice_setting_is_active: "Stato Attivo",
};

export const VoiceSettingsAuditLog = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("voice_settings_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as AuditLogEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatValue = (value: string | null) => {
    if (!value) return "-";
    if (value.length > 50) return value.substring(0, 50) + "...";
    return value;
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create": return "Creato";
      case "update": return "Modificato";
      case "delete": return "Eliminato";
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create": return "text-green-500";
      case "update": return "text-yellow-500";
      case "delete": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Log Modifiche
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {loading ? "Caricamento..." : "Nessuna modifica registrata"}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    {SETTING_LABELS[log.setting_key] || log.setting_key}
                  </div>
                  {log.action === "update" && (
                    <div className="mt-1 text-xs space-y-0.5">
                      <div className="text-red-400/70">
                        <span className="opacity-50">Da:</span> {formatValue(log.old_value)}
                      </div>
                      <div className="text-green-400/70">
                        <span className="opacity-50">A:</span> {formatValue(log.new_value)}
                      </div>
                    </div>
                  )}
                  {log.action === "create" && log.new_value && (
                    <div className="mt-1 text-xs text-green-400/70">
                      {formatValue(log.new_value)}
                    </div>
                  )}
                  {log.details && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {log.details.language && <span className="mr-2">🌐 {log.details.language}</span>}
                      {log.details.gender && <span>👤 {log.details.gender}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Helper function to log changes
export const logVoiceSettingChange = async (
  action: "create" | "update" | "delete",
  settingKey: string,
  oldValue: string | null,
  newValue: string | null,
  details?: Record<string, any>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Don't log if values are the same
  if (action === "update" && oldValue === newValue) return;

  await supabase.from("voice_settings_audit_log").insert({
    user_id: user.id,
    action,
    setting_key: settingKey,
    old_value: oldValue,
    new_value: newValue,
    details,
  });
};

// Helper to batch log multiple changes
export const logBatchChanges = async (
  changes: Array<{
    key: string;
    oldValue: string | null;
    newValue: string | null;
  }>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Filter out unchanged values
  const actualChanges = changes.filter(c => c.oldValue !== c.newValue);
  
  if (actualChanges.length === 0) return;

  const logs = actualChanges.map(c => ({
    user_id: user.id,
    action: "update",
    setting_key: c.key,
    old_value: c.oldValue,
    new_value: c.newValue,
  }));

  await supabase.from("voice_settings_audit_log").insert(logs);
};
