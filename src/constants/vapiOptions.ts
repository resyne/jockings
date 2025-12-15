// VAPI Configuration Constants
// Centralized constants for voice, model, and transcriber options

export const LANGUAGES = ["Italiano", "English"] as const;

export const GENDERS = ["male", "female"] as const;

// ElevenLabs TTS Models
export const ELEVENLABS_MODELS = [
  { value: "eleven_turbo_v2_5", label: "Turbo v2.5", description: "⚡ Più veloce - 32 lingue - Consigliato", recommended: true },
  { value: "eleven_multilingual_v2", label: "Multilingual v2", description: "Alta qualità - 29 lingue" },
  { value: "eleven_turbo_v2", label: "Turbo v2", description: "Veloce - Solo inglese" },
  { value: "eleven_flash_v2_5", label: "Flash v2.5", description: "Ultra veloce - Bassa latenza" },
] as const;

// AI Models for voice-test function
export const AI_MODELS = [
  { value: "google/gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite", description: "⚡ Velocissimo - Consigliato", recommended: true },
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash", description: "Molto veloce, buona qualità" },
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini", description: "Veloce, economico" },
  { value: "openai/gpt-5-mini", label: "OpenAI GPT-5 Mini", description: "Più potente, più lento" },
] as const;

// VAPI Voice Providers (TTS)
export const VAPI_VOICE_PROVIDERS = [
  { value: "11labs", label: "ElevenLabs", description: "⚡ Alta qualità, bassa latenza", recommended: true },
  { value: "openai", label: "OpenAI", description: "Veloce, buona qualità" },
  { value: "azure", label: "Azure", description: "Microsoft TTS" },
  { value: "deepgram", label: "Deepgram", description: "Ultra veloce" },
  { value: "playht", label: "PlayHT", description: "Voci realistiche" },
  { value: "cartesia", label: "Cartesia", description: "Sonic - Ultra bassa latenza" },
  { value: "rime-ai", label: "Rime AI", description: "Voci naturali" },
  { value: "lmnt", label: "LMNT", description: "Voci espressive" },
  { value: "neets", label: "Neets", description: "Economico" },
  { value: "tavus", label: "Tavus", description: "Video AI voices" },
] as const;

// VAPI Transcriber Providers (STT)
export const VAPI_TRANSCRIBER_PROVIDERS = [
  { value: "deepgram", label: "Deepgram", description: "⚡ Consigliato - Veloce e accurato", recommended: true },
  { value: "google", label: "Google", description: "Google Cloud Speech-to-Text" },
  { value: "assembly-ai", label: "Assembly AI", description: "Alta precisione" },
  { value: "azure", label: "Azure", description: "Microsoft Speech" },
  { value: "11labs", label: "11labs", description: "ElevenLabs STT" },
  { value: "gladia", label: "Gladia", description: "Multilingue avanzato" },
  { value: "openai", label: "OpenAI", description: "Whisper - Alta qualità" },
  { value: "speechmatics", label: "Speechmatics", description: "Enterprise - Multi lingua" },
  { value: "talkscriber", label: "Talkscriber", description: "Whisper ottimizzato" },
  { value: "cartesia", label: "Cartesia", description: "Ultra bassa latenza" },
  { value: "custom-transcriber", label: "Custom", description: "Transcriber personalizzato" },
] as const;

// VAPI AI Models (LLM) - Organized by provider
export const VAPI_AI_MODELS = [
  // OpenAI - Most recommended for VAPI
  { value: "gpt-4o-mini", label: "OpenAI GPT-4o Mini", description: "⚡ Veloce - Consigliato", recommended: true, provider: "openai" },
  { value: "gpt-4o", label: "OpenAI GPT-4o", description: "Potente, multimodale", provider: "openai" },
  { value: "gpt-4-turbo", label: "OpenAI GPT-4 Turbo", description: "Alta qualità", provider: "openai" },
  { value: "gpt-3.5-turbo", label: "OpenAI GPT-3.5 Turbo", description: "Economico, veloce", provider: "openai" },
  { value: "gpt-5", label: "OpenAI GPT-5", description: "Nuovo modello avanzato", provider: "openai" },
  { value: "gpt-5-mini", label: "OpenAI GPT-5 Mini", description: "Veloce, nuovo", provider: "openai" },
  // Anthropic Claude
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", description: "Bilanciato", provider: "anthropic" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus", description: "Più potente", provider: "anthropic" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku", description: "Ultra veloce", provider: "anthropic" },
  // Google
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "⚡ Ultra veloce", provider: "google" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "Veloce", provider: "google" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "Potente", provider: "google" },
  // Groq - Ultra fast inference
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", description: "⚡ Groq - Ultra veloce", recommended: true, provider: "groq" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", description: "Groq - Istantaneo", provider: "groq" },
  { value: "llama3-70b-8192", label: "Llama 3 70B", description: "Groq - Potente", provider: "groq" },
  { value: "llama3-8b-8192", label: "Llama 3 8B", description: "Groq - Veloce", provider: "groq" },
  { value: "gemma2-9b-it", label: "Gemma 2 9B IT", description: "Groq - Google", provider: "groq" },
  { value: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill", description: "Groq - Reasoning", provider: "groq" },
  { value: "mistral-saba-24b", label: "Mistral Saba 24B", description: "Groq - Mistral", provider: "groq" },
] as const;

// ElevenLabs Voices
export const VAPI_ELEVENLABS_VOICES = [
  { value: "9BWtsMINqrJLrRacOk9x", label: "Aria", description: "Femminile, espressiva" },
  { value: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger", description: "Maschile, professionale" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", description: "Femminile, naturale" },
  { value: "FGY2WhTYpPnrIDTdsKH5", label: "Laura", description: "Femminile, calda" },
  { value: "IKne3meq5aSn9XLyUdCD", label: "Charlie", description: "Maschile, amichevole" },
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "George", description: "Maschile, autorevole" },
  { value: "N2lVS1w4EtoT3dr4eOWO", label: "Callum", description: "Maschile, britannico" },
  { value: "SAz9YHcvj6GT2YYXdXww", label: "River", description: "Non-binary, moderno" },
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam", description: "Maschile, giovane" },
  { value: "XB0fDUnXU5powFXDhCwa", label: "Charlotte", description: "Femminile, elegante" },
  { value: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice", description: "Femminile, britannica" },
  { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda", description: "Femminile, calma" },
  { value: "bIHbv24MWmeRgasZH58o", label: "Will", description: "Maschile, narratore" },
  { value: "cgSgspJ2msm6clMCkdW9", label: "Jessica", description: "Femminile, americana" },
  { value: "cjVigY5qzO86Huf0OWal", label: "Eric", description: "Maschile, profondo" },
  { value: "iP95p4xoKVk53GoZ742B", label: "Chris", description: "Maschile, energico" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian", description: "Maschile, narratore" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", description: "Maschile, britannico" },
  { value: "pFZP5JQG7iQjIQuC4Bku", label: "Lily", description: "Femminile, britannica" },
  { value: "pqHfZKP75CvOlQylNhV4", label: "Bill", description: "Maschile, americano" },
  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel", description: "Femminile, calma" },
  { value: "custom", label: "Voice ID Personalizzato", description: "Inserisci il tuo Voice ID" },
] as const;

// Deepgram STT Models
export const DEEPGRAM_MODELS = [
  { value: "nova-2", label: "Nova 2", description: "⚡ Più veloce e accurato", recommended: true },
  { value: "nova-2-general", label: "Nova 2 General", description: "General purpose" },
  { value: "nova-2-meeting", label: "Nova 2 Meeting", description: "Ottimizzato per meeting" },
  { value: "nova-2-phonecall", label: "Nova 2 Phonecall", description: "⚡ Ottimizzato per telefonate", recommended: true },
  { value: "nova-2-conversationalai", label: "Nova 2 ConversationalAI", description: "Ottimizzato per AI" },
  { value: "nova", label: "Nova", description: "Versione precedente" },
  { value: "enhanced", label: "Enhanced", description: "Qualità migliorata" },
  { value: "base", label: "Base", description: "Economico" },
] as const;

// Deepgram Languages
export const DEEPGRAM_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "en-US", label: "🇺🇸 English (US)" },
  { value: "en-GB", label: "🇬🇧 English (UK)" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "pt", label: "🇵🇹 Português" },
  { value: "nl", label: "🇳🇱 Nederlands" },
  { value: "multi", label: "🌐 Multi-lingua" },
] as const;

// Google STT Models
export const GOOGLE_STT_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "⚡ Consigliato - Veloce", recommended: true },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", description: "Ultra veloce, economico" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Massima qualità" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "Veloce, stabile" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", description: "Economico" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "Versione precedente" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "Pro, versione precedente" },
] as const;

// Google STT Languages
export const GOOGLE_STT_LANGUAGES = [
  { value: "it-IT", label: "🇮🇹 Italiano" },
  { value: "en-US", label: "🇺🇸 English (US)" },
  { value: "en-GB", label: "🇬🇧 English (UK)" },
  { value: "es-ES", label: "🇪🇸 Español (España)" },
  { value: "es-MX", label: "🇲🇽 Español (México)" },
  { value: "fr-FR", label: "🇫🇷 Français" },
  { value: "de-DE", label: "🇩🇪 Deutsch" },
  { value: "pt-BR", label: "🇧🇷 Português (Brasil)" },
  { value: "pt-PT", label: "🇵🇹 Português (Portugal)" },
  { value: "nl-NL", label: "🇳🇱 Nederlands" },
  { value: "ja-JP", label: "🇯🇵 日本語" },
  { value: "zh-CN", label: "🇨🇳 中文" },
] as const;

// OpenAI STT Models
export const OPENAI_STT_MODELS = [
  { value: "whisper-1", label: "Whisper 1", description: "⚡ Standard - Alta qualità", recommended: true },
] as const;

// OpenAI STT Languages
export const OPENAI_STT_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "pt", label: "🇵🇹 Português" },
  { value: "nl", label: "🇳🇱 Nederlands" },
  { value: "ja", label: "🇯🇵 日本語" },
  { value: "zh", label: "🇨🇳 中文" },
] as const;

// AssemblyAI Models
export const ASSEMBLYAI_MODELS = [
  { value: "best", label: "Best", description: "⚡ Massima qualità", recommended: true },
  { value: "nano", label: "Nano", description: "⚡ Ultra veloce, economico" },
] as const;

// AssemblyAI Languages
export const ASSEMBLYAI_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "en_us", label: "🇺🇸 English (US)" },
  { value: "en_uk", label: "🇬🇧 English (UK)" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "pt", label: "🇵🇹 Português" },
  { value: "nl", label: "🇳🇱 Nederlands" },
] as const;

// Azure STT Languages
export const AZURE_STT_LANGUAGES = [
  { value: "it-IT", label: "🇮🇹 Italiano" },
  { value: "en-US", label: "🇺🇸 English (US)" },
  { value: "en-GB", label: "🇬🇧 English (UK)" },
  { value: "es-ES", label: "🇪🇸 Español" },
  { value: "fr-FR", label: "🇫🇷 Français" },
  { value: "de-DE", label: "🇩🇪 Deutsch" },
  { value: "pt-BR", label: "🇧🇷 Português" },
  { value: "nl-NL", label: "🇳🇱 Nederlands" },
  { value: "ja-JP", label: "🇯🇵 日本語" },
  { value: "zh-CN", label: "🇨🇳 中文" },
] as const;

// Talkscriber Models
export const TALKSCRIBER_MODELS = [
  { value: "whisper", label: "Whisper", description: "⚡ OpenAI Whisper - Alta qualità", recommended: true },
] as const;

// Talkscriber Languages
export const TALKSCRIBER_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "pt", label: "🇵🇹 Português" },
] as const;

// Gladia Models
export const GLADIA_MODELS = [
  { value: "fast", label: "Fast", description: "⚡ Ultra veloce", recommended: true },
  { value: "accurate", label: "Accurate", description: "Alta precisione" },
] as const;

// Gladia Languages
export const GLADIA_LANGUAGES = [
  { value: "italian", label: "🇮🇹 Italiano" },
  { value: "english", label: "🇬🇧 English" },
  { value: "spanish", label: "🇪🇸 Español" },
  { value: "french", label: "🇫🇷 Français" },
  { value: "german", label: "🇩🇪 Deutsch" },
  { value: "portuguese", label: "🇵🇹 Português" },
  { value: "dutch", label: "🇳🇱 Nederlands" },
  { value: "auto", label: "🌐 Auto-detect" },
] as const;

// Cartesia Models
export const CARTESIA_MODELS = [
  { value: "sonic", label: "Sonic", description: "⚡ Ultra bassa latenza", recommended: true },
] as const;

// Cartesia Languages
export const CARTESIA_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
] as const;

// ElevenLabs STT Languages
export const ELEVENLABS_STT_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "pt", label: "🇵🇹 Português" },
  { value: "pl", label: "🇵🇱 Polski" },
  { value: "hi", label: "🇮🇳 हिन्दी" },
] as const;

// Speechmatics Languages
export const SPEECHMATICS_LANGUAGES = [
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "en", label: "🇬🇧 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "pt", label: "🇵🇹 Português" },
  { value: "nl", label: "🇳🇱 Nederlands" },
  { value: "ja", label: "🇯🇵 日本語" },
  { value: "ar", label: "🇸🇦 العربية" },
  { value: "auto", label: "🌐 Auto-detect" },
] as const;

// Helper function to get models/languages by transcriber provider
export const getTranscriberOptions = (provider: string) => {
  switch (provider) {
    case 'deepgram':
      return { models: DEEPGRAM_MODELS, languages: DEEPGRAM_LANGUAGES };
    case 'google':
      return { models: GOOGLE_STT_MODELS, languages: GOOGLE_STT_LANGUAGES };
    case 'openai':
      return { models: OPENAI_STT_MODELS, languages: OPENAI_STT_LANGUAGES };
    case 'assembly-ai':
      return { models: ASSEMBLYAI_MODELS, languages: ASSEMBLYAI_LANGUAGES };
    case 'azure':
      return { models: null, languages: AZURE_STT_LANGUAGES };
    case 'talkscriber':
      return { models: TALKSCRIBER_MODELS, languages: TALKSCRIBER_LANGUAGES };
    case 'gladia':
      return { models: GLADIA_MODELS, languages: GLADIA_LANGUAGES };
    case 'cartesia':
      return { models: CARTESIA_MODELS, languages: CARTESIA_LANGUAGES };
    case '11labs':
      return { models: null, languages: ELEVENLABS_STT_LANGUAGES };
    case 'speechmatics':
      return { models: null, languages: SPEECHMATICS_LANGUAGES };
    default:
      return { models: null, languages: DEEPGRAM_LANGUAGES };
  }
};

// Helper to get AI provider from model
export const getAiProviderFromModel = (model: string): string => {
  const foundModel = VAPI_AI_MODELS.find(m => m.value === model);
  return foundModel?.provider || 'openai';
};
