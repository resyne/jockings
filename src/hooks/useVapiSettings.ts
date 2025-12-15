import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  VapiSettings, 
  VoiceSetting, 
  VapiPhoneNumber, 
  VerifiedCallerId,
  DEFAULT_VAPI_SETTINGS 
} from "@/types/vapiSettings";
import { getAiProviderFromModel, VAPI_AI_MODELS } from "@/constants/vapiOptions";

// Canonical key names used in app_settings table
// These must match exactly with AdminVoices.tsx fetch/save operations
const VAPI_SETTINGS_KEYS = [
  "call_provider",
  "vapi_phone_number_id",
  "vapi_caller_id",
  "vapi_assistant_id",
  "vapi_ai_provider",
  "vapi_ai_model",
  "vapi_temperature",
  "vapi_max_tokens",
  "vapi_voice_provider",
  "vapi_voice_speed",
  "vapi_voice_stability",
  "vapi_voice_similarity_boost",
  "vapi_voice_style",
  "vapi_voice_speaker_boost",
  "vapi_filler_injection_enabled",
  "vapi_transcriber_provider",
  "vapi_transcriber_model",
  "vapi_transcriber_language",
  "vapi_first_message",
  "vapi_first_message_mode",
  "vapi_silence_timeout",
  "vapi_max_duration",
  "vapi_background_sound",
  "vapi_backchanneling",
  "vapi_end_call_message",
  "vapi_voicemail_message",
  "vapi_end_call_phrases",
  "vapi_system_prompt_it",
  "vapi_system_prompt_en",
  "vapi_first_message_it",
  "vapi_first_message_en",
  "vapi_start_speaking_wait",
  "vapi_smart_endpointing_enabled",
  "vapi_smart_endpointing_provider",
  "vapi_transcription_endpointing_enabled",
  "vapi_stop_speaking_num_words",
  "vapi_stop_speaking_voice_seconds",
  "vapi_stop_speaking_backoff_seconds",
  "vapi_smart_denoising_enabled",
  "vapi_recording_enabled",
  "vapi_transcript_enabled",
  "vapi_first_message_interruptions",
  "vapi_voicemail_detection",
  "vapi_hipaa_enabled",
  "vapi_background_denoising",
  "vapi_model_output_in_messages",
  "elevenlabs_model",
] as const;

export const useVapiSettings = () => {
  const { toast } = useToast();
  
  // Core settings state
  const [callProvider, setCallProvider] = useState<"twilio" | "vapi">("vapi");
  const [vapiSettings, setVapiSettings] = useState<VapiSettings>(DEFAULT_VAPI_SETTINGS);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSetting[]>([]);
  const [vapiPhoneNumbers, setVapiPhoneNumbers] = useState<VapiPhoneNumber[]>([]);
  const [verifiedCallerIds, setVerifiedCallerIds] = useState<VerifiedCallerId[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash-lite");
  const [elevenlabsModel, setElevenlabsModel] = useState("eleven_turbo_v2_5");

  // Fetch all settings on mount
  const fetchAllSettings = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchVapiSettings(),
        fetchVoiceSettings(),
        fetchVapiPhoneNumbers(),
        fetchVerifiedCallerIds(),
        fetchAiModel(),
      ]);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch VAPI settings from app_settings
  const fetchVapiSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", VAPI_SETTINGS_KEYS);

    if (data) {
      const newSettings = { ...DEFAULT_VAPI_SETTINGS };
      
      data.forEach(({ key, value }) => {
        if (key === "call_provider") setCallProvider(value as "twilio" | "vapi");
        if (key === "vapi_phone_number_id") newSettings.phoneNumberId = value;
        if (key === "vapi_caller_id") newSettings.callerId = value;
        if (key === "vapi_assistant_id") newSettings.assistantId = value;
        if (key === "vapi_ai_provider") newSettings.aiProvider = value;
        if (key === "vapi_ai_model") newSettings.aiModel = value;
        if (key === "vapi_temperature") newSettings.temperature = parseFloat(value);
        if (key === "vapi_max_tokens") newSettings.maxTokens = parseInt(value);
        if (key === "vapi_voice_provider") newSettings.voiceProvider = value;
        if (key === "vapi_voice_speed") newSettings.voiceSpeed = parseFloat(value);
        if (key === "vapi_voice_stability") newSettings.voiceStability = parseFloat(value);
        if (key === "vapi_voice_similarity_boost") newSettings.voiceSimilarityBoost = parseFloat(value);
        if (key === "vapi_voice_style") newSettings.voiceStyle = parseFloat(value);
        if (key === "vapi_voice_speaker_boost") newSettings.voiceUseSpeakerBoost = value === "true";
        if (key === "vapi_filler_injection_enabled") newSettings.fillerInjectionEnabled = value === "true";
        if (key === "vapi_transcriber_provider") newSettings.transcriberProvider = value;
        if (key === "vapi_transcriber_model") newSettings.transcriberModel = value;
        if (key === "vapi_transcriber_language") newSettings.transcriberLanguage = value;
        if (key === "vapi_first_message") newSettings.firstMessage = value;
        if (key === "vapi_first_message_mode") newSettings.firstMessageMode = value;
        if (key === "vapi_silence_timeout") newSettings.silenceTimeoutSeconds = parseInt(value);
        if (key === "vapi_max_duration") newSettings.maxDurationSeconds = parseInt(value);
        if (key === "vapi_background_sound") newSettings.backgroundSound = value;
        if (key === "vapi_backchanneling") newSettings.backchannelingEnabled = value === "true";
        if (key === "vapi_end_call_message") newSettings.endCallMessage = value;
        if (key === "vapi_voicemail_message") newSettings.voicemailMessage = value;
        if (key === "vapi_end_call_phrases") newSettings.endCallPhrases = value;
        if (key === "vapi_system_prompt_it") newSettings.systemPromptTemplateIT = value;
        if (key === "vapi_system_prompt_en") newSettings.systemPromptTemplateEN = value;
        if (key === "vapi_first_message_it") newSettings.firstMessageTemplateIT = value;
        if (key === "vapi_first_message_en") newSettings.firstMessageTemplateEN = value;
        if (key === "vapi_start_speaking_wait") newSettings.startSpeakingWaitSeconds = parseFloat(value);
        if (key === "vapi_smart_endpointing_enabled") newSettings.smartEndpointingEnabled = value === "true";
        if (key === "vapi_smart_endpointing_provider") newSettings.smartEndpointingProvider = value;
        if (key === "vapi_transcription_endpointing_enabled") newSettings.transcriptionEndpointingPlanEnabled = value === "true";
        if (key === "vapi_stop_speaking_num_words") newSettings.stopSpeakingNumWords = parseInt(value);
        if (key === "vapi_stop_speaking_voice_seconds") newSettings.stopSpeakingVoiceSeconds = parseFloat(value);
        if (key === "vapi_stop_speaking_backoff_seconds") newSettings.stopSpeakingBackoffSeconds = parseFloat(value);
        if (key === "vapi_smart_denoising_enabled") newSettings.smartDenoisingEnabled = value === "true";
        if (key === "vapi_recording_enabled") newSettings.recordingEnabled = value === "true";
        if (key === "vapi_transcript_enabled") newSettings.transcriptEnabled = value === "true";
        if (key === "vapi_first_message_interruptions") newSettings.firstMessageInterruptionsEnabled = value === "true";
        if (key === "vapi_voicemail_detection") newSettings.voicemailDetectionEnabled = value === "true";
        if (key === "vapi_hipaa_enabled") newSettings.hipaaEnabled = value === "true";
        if (key === "vapi_background_denoising") newSettings.backgroundDenoisingEnabled = value === "true";
        if (key === "vapi_model_output_in_messages") newSettings.modelOutputInMessagesEnabled = value === "true";
        if (key === "elevenlabs_model") setElevenlabsModel(value);
      });

      // Auto-sync provider from model if mismatched
      const selectedModel = VAPI_AI_MODELS.find(m => m.value === newSettings.aiModel);
      if (selectedModel && selectedModel.provider !== newSettings.aiProvider) {
        newSettings.aiProvider = selectedModel.provider;
      }

      setVapiSettings(newSettings);
    }
  };

  // Fetch voice settings
  const fetchVoiceSettings = async () => {
    const { data } = await supabase
      .from("voice_settings")
      .select("*")
      .order("language", { ascending: true });

    if (data) {
      setVoiceSettings(data);
    }
  };

  // Fetch VAPI phone numbers
  const fetchVapiPhoneNumbers = async () => {
    const { data } = await supabase
      .from("vapi_phone_numbers")
      .select("*")
      .order("is_default", { ascending: false });

    if (data) {
      setVapiPhoneNumbers(data);
      const defaultPhone = data.find(p => p.is_default && p.is_active);
      if (defaultPhone && !vapiSettings.phoneNumberId) {
        setVapiSettings(prev => ({ 
          ...prev, 
          phoneNumberId: defaultPhone.phone_number_id 
        }));
      }
    }
  };

  // Fetch verified caller IDs
  const fetchVerifiedCallerIds = async () => {
    const { data } = await supabase
      .from("verified_caller_ids")
      .select("id, phone_number, friendly_name, is_active, is_default")
      .eq("is_active", true)
      .order("is_default", { ascending: false });

    if (data) {
      setVerifiedCallerIds(data);
      const defaultCaller = data.find(c => c.is_default);
      if (defaultCaller && !vapiSettings.callerId) {
        setVapiSettings(prev => ({ 
          ...prev, 
          callerId: defaultCaller.phone_number 
        }));
      }
    }
  };

  // Fetch AI model
  const fetchAiModel = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_model")
      .maybeSingle();

    if (data?.value) {
      setAiModel(data.value);
    }
  };

  // Save VAPI settings - keys must match VAPI_SETTINGS_KEYS
  const saveVapiSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: "call_provider", value: callProvider },
        { key: "vapi_phone_number_id", value: vapiSettings.phoneNumberId },
        { key: "vapi_caller_id", value: vapiSettings.callerId },
        { key: "vapi_assistant_id", value: vapiSettings.assistantId },
        { key: "vapi_ai_provider", value: vapiSettings.aiProvider },
        { key: "vapi_ai_model", value: vapiSettings.aiModel },
        { key: "vapi_temperature", value: vapiSettings.temperature.toString() },
        { key: "vapi_max_tokens", value: vapiSettings.maxTokens.toString() },
        { key: "vapi_voice_provider", value: vapiSettings.voiceProvider },
        { key: "vapi_voice_speed", value: vapiSettings.voiceSpeed.toString() },
        { key: "vapi_voice_stability", value: vapiSettings.voiceStability.toString() },
        { key: "vapi_voice_similarity_boost", value: vapiSettings.voiceSimilarityBoost.toString() },
        { key: "vapi_voice_style", value: vapiSettings.voiceStyle.toString() },
        { key: "vapi_voice_speaker_boost", value: vapiSettings.voiceUseSpeakerBoost.toString() },
        { key: "vapi_filler_injection_enabled", value: vapiSettings.fillerInjectionEnabled.toString() },
        { key: "vapi_transcriber_provider", value: vapiSettings.transcriberProvider },
        { key: "vapi_transcriber_model", value: vapiSettings.transcriberModel },
        { key: "vapi_transcriber_language", value: vapiSettings.transcriberLanguage },
        { key: "vapi_first_message", value: vapiSettings.firstMessage },
        { key: "vapi_first_message_mode", value: vapiSettings.firstMessageMode },
        { key: "vapi_silence_timeout", value: vapiSettings.silenceTimeoutSeconds.toString() },
        { key: "vapi_max_duration", value: vapiSettings.maxDurationSeconds.toString() },
        { key: "vapi_background_sound", value: vapiSettings.backgroundSound },
        { key: "vapi_backchanneling", value: vapiSettings.backchannelingEnabled.toString() },
        { key: "vapi_end_call_message", value: vapiSettings.endCallMessage },
        { key: "vapi_voicemail_message", value: vapiSettings.voicemailMessage },
        { key: "vapi_end_call_phrases", value: vapiSettings.endCallPhrases },
        { key: "vapi_system_prompt_it", value: vapiSettings.systemPromptTemplateIT },
        { key: "vapi_system_prompt_en", value: vapiSettings.systemPromptTemplateEN },
        { key: "vapi_first_message_it", value: vapiSettings.firstMessageTemplateIT },
        { key: "vapi_first_message_en", value: vapiSettings.firstMessageTemplateEN },
        { key: "vapi_start_speaking_wait", value: vapiSettings.startSpeakingWaitSeconds.toString() },
        { key: "vapi_smart_endpointing_enabled", value: vapiSettings.smartEndpointingEnabled.toString() },
        { key: "vapi_smart_endpointing_provider", value: vapiSettings.smartEndpointingProvider },
        { key: "vapi_transcription_endpointing_enabled", value: vapiSettings.transcriptionEndpointingPlanEnabled.toString() },
        { key: "vapi_stop_speaking_num_words", value: vapiSettings.stopSpeakingNumWords.toString() },
        { key: "vapi_stop_speaking_voice_seconds", value: vapiSettings.stopSpeakingVoiceSeconds.toString() },
        { key: "vapi_stop_speaking_backoff_seconds", value: vapiSettings.stopSpeakingBackoffSeconds.toString() },
        { key: "vapi_smart_denoising_enabled", value: vapiSettings.smartDenoisingEnabled.toString() },
        { key: "vapi_recording_enabled", value: vapiSettings.recordingEnabled.toString() },
        { key: "vapi_transcript_enabled", value: vapiSettings.transcriptEnabled.toString() },
        { key: "vapi_first_message_interruptions", value: vapiSettings.firstMessageInterruptionsEnabled.toString() },
        { key: "vapi_voicemail_detection", value: vapiSettings.voicemailDetectionEnabled.toString() },
        { key: "vapi_hipaa_enabled", value: vapiSettings.hipaaEnabled.toString() },
        { key: "vapi_background_denoising", value: vapiSettings.backgroundDenoisingEnabled.toString() },
        { key: "vapi_model_output_in_messages", value: vapiSettings.modelOutputInMessagesEnabled.toString() },
        { key: "elevenlabs_model", value: elevenlabsModel },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from("app_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });
      }

      toast({ title: "Salvato!", description: "Impostazioni VAPI salvate" });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Save AI model
  const saveAiModel = async () => {
    setSaving(true);
    try {
      await supabase
        .from("app_settings")
        .upsert({ key: "ai_model", value: aiModel }, { onConflict: "key" });
      
      toast({ title: "Salvato!", description: "Modello AI aggiornato" });
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Update VAPI model and sync provider
  const updateVapiModel = (model: string) => {
    const provider = getAiProviderFromModel(model);
    setVapiSettings(prev => ({
      ...prev,
      aiModel: model,
      aiProvider: provider,
    }));
  };

  // Voice settings CRUD
  const addVoiceSetting = async (setting: Omit<VoiceSetting, 'id'>) => {
    const { error } = await supabase.from("voice_settings").insert(setting);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVoiceSettings();
    toast({ title: "Aggiunto!", description: "Voce aggiunta" });
    return true;
  };

  const updateVoiceSetting = async (id: string, updates: Partial<VoiceSetting>) => {
    const { error } = await supabase
      .from("voice_settings")
      .update(updates)
      .eq("id", id);
    
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVoiceSettings();
    toast({ title: "Salvato!", description: "Voce aggiornata" });
    return true;
  };

  const deleteVoiceSetting = async (id: string) => {
    const { error } = await supabase.from("voice_settings").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVoiceSettings();
    toast({ title: "Eliminata!", description: "Voce rimossa" });
    return true;
  };

  // VAPI phone number management
  const addVapiPhone = async (phone: { phone_number_id: string; phone_number?: string; friendly_name?: string }) => {
    const { error } = await supabase.from("vapi_phone_numbers").insert({
      phone_number_id: phone.phone_number_id,
      phone_number: phone.phone_number || null,
      friendly_name: phone.friendly_name || null,
      is_default: vapiPhoneNumbers.length === 0,
    });
    
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVapiPhoneNumbers();
    toast({ title: "Aggiunto!", description: "Numero VAPI aggiunto" });
    return true;
  };

  const deleteVapiPhone = async (id: string) => {
    const { error } = await supabase.from("vapi_phone_numbers").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVapiPhoneNumbers();
    toast({ title: "Eliminato!", description: "Numero VAPI rimosso" });
    return true;
  };

  const setDefaultVapiPhone = async (id: string) => {
    const { error } = await supabase
      .from("vapi_phone_numbers")
      .update({ is_default: true })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVapiPhoneNumbers();
    toast({ title: "Aggiornato!", description: "Default aggiornato" });
    return true;
  };

  return {
    // State
    callProvider,
    setCallProvider,
    vapiSettings,
    setVapiSettings,
    voiceSettings,
    vapiPhoneNumbers,
    verifiedCallerIds,
    loading,
    saving,
    aiModel,
    setAiModel,
    elevenlabsModel,
    setElevenlabsModel,
    
    // Actions
    fetchAllSettings,
    saveVapiSettings,
    saveAiModel,
    updateVapiModel,
    
    // Voice settings CRUD
    addVoiceSetting,
    updateVoiceSetting,
    deleteVoiceSetting,
    
    // VAPI phone management
    addVapiPhone,
    deleteVapiPhone,
    setDefaultVapiPhone,
    
    // Refresh functions
    fetchVapiSettings,
    fetchVoiceSettings,
    fetchVapiPhoneNumbers,
    fetchVerifiedCallerIds,
  };
};
