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
import { getAiProviderFromModel } from "@/constants/vapiOptions";

export const useVapiSettings = () => {
  const { toast } = useToast();
  
  // Core settings state
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
    const vapiKeys = [
      'vapi_phone_number_id', 'vapi_ai_provider', 'vapi_ai_model',
      'vapi_temperature', 'vapi_max_tokens', 'vapi_voice_provider',
      'vapi_voice_id', 'vapi_custom_voice_id', 'vapi_filler_injection_enabled',
      'vapi_recording_enabled', 'vapi_transcript_enabled',
      'vapi_transcriber_provider', 'vapi_transcriber_model', 'vapi_transcriber_language',
      'vapi_silence_timeout', 'vapi_max_duration', 'vapi_background_sound',
      'vapi_backchanneling', 'vapi_end_call_message',
      'vapi_system_prompt_it', 'vapi_system_prompt_en',
      'vapi_first_message_it', 'vapi_first_message_en',
      'vapi_voice_stability', 'vapi_voice_similarity_boost', 'vapi_voice_style',
      'vapi_voice_use_speaker_boost', 'vapi_voice_speed',
      'vapi_start_speaking_wait_seconds', 'vapi_smart_endpointing_enabled',
      'vapi_smart_endpointing_provider', 'vapi_stop_speaking_num_words',
      'vapi_stop_speaking_voice_seconds', 'vapi_stop_speaking_backoff_seconds',
      'vapi_smart_denoising_enabled', 'vapi_first_message_interruptions_enabled',
      'vapi_voicemail_detection_enabled', 'vapi_hipaa_enabled',
      'vapi_background_denoising_enabled', 'vapi_model_output_in_messages_enabled',
      'elevenlabs_model',
    ];

    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", vapiKeys);

    if (data) {
      const settings: Record<string, string> = {};
      data.forEach((s) => {
        if (s.value) settings[s.key] = s.value;
      });

      setVapiSettings(prev => ({
        ...prev,
        phoneNumberId: settings['vapi_phone_number_id'] || prev.phoneNumberId,
        aiProvider: settings['vapi_ai_provider'] || prev.aiProvider,
        aiModel: settings['vapi_ai_model'] || prev.aiModel,
        temperature: parseFloat(settings['vapi_temperature']) || prev.temperature,
        maxTokens: parseInt(settings['vapi_max_tokens']) || prev.maxTokens,
        voiceProvider: settings['vapi_voice_provider'] || prev.voiceProvider,
        voiceId: settings['vapi_voice_id'] || prev.voiceId,
        customVoiceId: settings['vapi_custom_voice_id'] || prev.customVoiceId,
        voiceSpeed: parseFloat(settings['vapi_voice_speed']) || prev.voiceSpeed,
        voiceStability: parseFloat(settings['vapi_voice_stability']) || prev.voiceStability,
        voiceSimilarityBoost: parseFloat(settings['vapi_voice_similarity_boost']) || prev.voiceSimilarityBoost,
        voiceStyle: parseFloat(settings['vapi_voice_style']) || prev.voiceStyle,
        voiceUseSpeakerBoost: settings['vapi_voice_use_speaker_boost'] === 'true',
        fillerInjectionEnabled: settings['vapi_filler_injection_enabled'] !== 'false',
        transcriberProvider: settings['vapi_transcriber_provider'] || prev.transcriberProvider,
        transcriberModel: settings['vapi_transcriber_model'] || prev.transcriberModel,
        transcriberLanguage: settings['vapi_transcriber_language'] || prev.transcriberLanguage,
        silenceTimeoutSeconds: parseInt(settings['vapi_silence_timeout']) || prev.silenceTimeoutSeconds,
        maxDurationSeconds: parseInt(settings['vapi_max_duration']) || prev.maxDurationSeconds,
        backgroundSound: settings['vapi_background_sound'] || prev.backgroundSound,
        backchannelingEnabled: settings['vapi_backchanneling'] === 'true',
        endCallMessage: settings['vapi_end_call_message'] || prev.endCallMessage,
        recordingEnabled: settings['vapi_recording_enabled'] !== 'false',
        transcriptEnabled: settings['vapi_transcript_enabled'] !== 'false',
        systemPromptTemplateIT: settings['vapi_system_prompt_it'] || prev.systemPromptTemplateIT,
        systemPromptTemplateEN: settings['vapi_system_prompt_en'] || prev.systemPromptTemplateEN,
        firstMessageTemplateIT: settings['vapi_first_message_it'] || prev.firstMessageTemplateIT,
        firstMessageTemplateEN: settings['vapi_first_message_en'] || prev.firstMessageTemplateEN,
        startSpeakingWaitSeconds: parseFloat(settings['vapi_start_speaking_wait_seconds']) || prev.startSpeakingWaitSeconds,
        smartEndpointingEnabled: settings['vapi_smart_endpointing_enabled'] !== 'false',
        smartEndpointingProvider: settings['vapi_smart_endpointing_provider'] || prev.smartEndpointingProvider,
        stopSpeakingNumWords: parseInt(settings['vapi_stop_speaking_num_words']) || prev.stopSpeakingNumWords,
        stopSpeakingVoiceSeconds: parseFloat(settings['vapi_stop_speaking_voice_seconds']) || prev.stopSpeakingVoiceSeconds,
        stopSpeakingBackoffSeconds: parseFloat(settings['vapi_stop_speaking_backoff_seconds']) || prev.stopSpeakingBackoffSeconds,
        smartDenoisingEnabled: settings['vapi_smart_denoising_enabled'] !== 'false',
        firstMessageInterruptionsEnabled: settings['vapi_first_message_interruptions_enabled'] === 'true',
        voicemailDetectionEnabled: settings['vapi_voicemail_detection_enabled'] === 'true',
        hipaaEnabled: settings['vapi_hipaa_enabled'] === 'true',
        backgroundDenoisingEnabled: settings['vapi_background_denoising_enabled'] === 'true',
        modelOutputInMessagesEnabled: settings['vapi_model_output_in_messages_enabled'] === 'true',
      }));

      if (settings['elevenlabs_model']) {
        setElevenlabsModel(settings['elevenlabs_model']);
      }
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
      if (defaultPhone) {
        setVapiSettings(prev => ({ 
          ...prev, 
          phoneNumberId: prev.phoneNumberId || defaultPhone.phone_number_id 
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
      if (defaultCaller) {
        setVapiSettings(prev => ({ 
          ...prev, 
          callerId: prev.callerId || defaultCaller.phone_number 
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

  // Save VAPI settings
  const saveVapiSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'vapi_ai_provider', value: vapiSettings.aiProvider },
        { key: 'vapi_ai_model', value: vapiSettings.aiModel },
        { key: 'vapi_temperature', value: vapiSettings.temperature.toString() },
        { key: 'vapi_max_tokens', value: vapiSettings.maxTokens.toString() },
        { key: 'vapi_voice_provider', value: vapiSettings.voiceProvider },
        { key: 'vapi_voice_id', value: vapiSettings.voiceId },
        { key: 'vapi_custom_voice_id', value: vapiSettings.customVoiceId },
        { key: 'vapi_voice_speed', value: vapiSettings.voiceSpeed.toString() },
        { key: 'vapi_voice_stability', value: vapiSettings.voiceStability.toString() },
        { key: 'vapi_voice_similarity_boost', value: vapiSettings.voiceSimilarityBoost.toString() },
        { key: 'vapi_voice_style', value: vapiSettings.voiceStyle.toString() },
        { key: 'vapi_voice_use_speaker_boost', value: vapiSettings.voiceUseSpeakerBoost.toString() },
        { key: 'vapi_filler_injection_enabled', value: vapiSettings.fillerInjectionEnabled.toString() },
        { key: 'vapi_transcriber_provider', value: vapiSettings.transcriberProvider },
        { key: 'vapi_transcriber_model', value: vapiSettings.transcriberModel },
        { key: 'vapi_transcriber_language', value: vapiSettings.transcriberLanguage },
        { key: 'vapi_silence_timeout', value: vapiSettings.silenceTimeoutSeconds.toString() },
        { key: 'vapi_max_duration', value: vapiSettings.maxDurationSeconds.toString() },
        { key: 'vapi_background_sound', value: vapiSettings.backgroundSound },
        { key: 'vapi_backchanneling', value: vapiSettings.backchannelingEnabled.toString() },
        { key: 'vapi_end_call_message', value: vapiSettings.endCallMessage },
        { key: 'vapi_recording_enabled', value: vapiSettings.recordingEnabled.toString() },
        { key: 'vapi_transcript_enabled', value: vapiSettings.transcriptEnabled.toString() },
        { key: 'vapi_system_prompt_it', value: vapiSettings.systemPromptTemplateIT },
        { key: 'vapi_system_prompt_en', value: vapiSettings.systemPromptTemplateEN },
        { key: 'vapi_first_message_it', value: vapiSettings.firstMessageTemplateIT },
        { key: 'vapi_first_message_en', value: vapiSettings.firstMessageTemplateEN },
        { key: 'vapi_start_speaking_wait_seconds', value: vapiSettings.startSpeakingWaitSeconds.toString() },
        { key: 'vapi_smart_endpointing_enabled', value: vapiSettings.smartEndpointingEnabled.toString() },
        { key: 'vapi_smart_endpointing_provider', value: vapiSettings.smartEndpointingProvider },
        { key: 'vapi_stop_speaking_num_words', value: vapiSettings.stopSpeakingNumWords.toString() },
        { key: 'vapi_stop_speaking_voice_seconds', value: vapiSettings.stopSpeakingVoiceSeconds.toString() },
        { key: 'vapi_stop_speaking_backoff_seconds', value: vapiSettings.stopSpeakingBackoffSeconds.toString() },
        { key: 'vapi_smart_denoising_enabled', value: vapiSettings.smartDenoisingEnabled.toString() },
        { key: 'vapi_first_message_interruptions_enabled', value: vapiSettings.firstMessageInterruptionsEnabled.toString() },
        { key: 'vapi_voicemail_detection_enabled', value: vapiSettings.voicemailDetectionEnabled.toString() },
        { key: 'vapi_hipaa_enabled', value: vapiSettings.hipaaEnabled.toString() },
        { key: 'vapi_background_denoising_enabled', value: vapiSettings.backgroundDenoisingEnabled.toString() },
        { key: 'vapi_model_output_in_messages_enabled', value: vapiSettings.modelOutputInMessagesEnabled.toString() },
        { key: 'elevenlabs_model', value: elevenlabsModel },
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
    fetchVoiceSettings,
    fetchVapiPhoneNumbers,
    fetchVerifiedCallerIds,
  };
};
