// VAPI Settings Types
// Centralized type definitions for VAPI configuration

export interface VapiSettings {
  phoneNumberId: string;
  assistantId: string;
  callerId: string;
  // Model
  aiProvider: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  // Voice
  voiceProvider: string;
  voiceId: string;
  customVoiceId: string;
  voiceSpeed: number;
  // ElevenLabs Voice Settings
  voiceStability: number;
  voiceSimilarityBoost: number;
  voiceStyle: number;
  voiceUseSpeakerBoost: boolean;
  fillerInjectionEnabled: boolean;
  // Transcriber
  transcriberProvider: string;
  transcriberModel: string;
  transcriberLanguage: string;
  // Call settings
  firstMessage: string;
  firstMessageMode: string;
  silenceTimeoutSeconds: number;
  maxDurationSeconds: number;
  backgroundSound: string;
  backchannelingEnabled: boolean;
  endCallMessage: string;
  voicemailMessage: string;
  endCallPhrases: string;
  // Start Speaking Plan
  startSpeakingWaitSeconds: number;
  smartEndpointingEnabled: boolean;
  smartEndpointingProvider: string;
  transcriptionEndpointingPlanEnabled: boolean;
  // Stop Speaking Plan
  stopSpeakingNumWords: number;
  stopSpeakingVoiceSeconds: number;
  stopSpeakingBackoffSeconds: number;
  // Background Speech Denoising Plan
  smartDenoisingEnabled: boolean;
  // Artifact Plan
  recordingEnabled: boolean;
  transcriptEnabled: boolean;
  // Advanced
  firstMessageInterruptionsEnabled: boolean;
  voicemailDetectionEnabled: boolean;
  hipaaEnabled: boolean;
  backgroundDenoisingEnabled: boolean;
  modelOutputInMessagesEnabled: boolean;
  // System prompt template
  systemPromptTemplateIT: string;
  systemPromptTemplateEN: string;
  // First message template
  firstMessageTemplateIT: string;
  firstMessageTemplateEN: string;
}

export interface VoiceSetting {
  id: string;
  language: string;
  gender: string;
  voice_provider: string;
  elevenlabs_voice_id: string | null;
  elevenlabs_stability: number;
  elevenlabs_similarity: number;
  elevenlabs_style: number;
  elevenlabs_speed: number;
  polly_voice_id: string | null;
  is_active: boolean;
  voice_name: string | null;
  notes: string | null;
  description?: string | null;
  rating?: number;
}

export interface VapiPhoneNumber {
  id: string;
  phone_number_id: string;
  phone_number: string | null;
  friendly_name: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface VerifiedCallerId {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface VapiVoicePreset {
  id: string;
  language: string;
  gender: string;
  voiceId: string;
  voiceProvider: string;
  voice_name: string;
  description: string;
  notes: string;
}

// Default system prompts
export const DEFAULT_SYSTEM_PROMPT_IT = `Sei {{GENDER}} che sta facendo uno scherzo telefonico a {{VICTIM_NAME}} ({{VICTIM_GENDER}}).

SCENARIO DELLO SCHERZO:
{{PRANK_THEME}}

{{REAL_DETAIL_SECTION}}

PERSONALITÀ E TONO:
{{PERSONALITY_TONE}}

REGOLE FONDAMENTALI:
1. Parla SOLO in italiano
2. Risposte BREVI: massimo 1-2 frasi per turno
3. NON rivelare MAI che è uno scherzo
4. Quando ti presenti, usa nomi italiani realistici (es. Marco Bianchi, Giulia Ferri) - MAI "Mario Rossi"
5. Resta SEMPRE nel personaggio, qualunque cosa dica l'interlocutore
6. Se dicono "numero sbagliato", insisti che riconosci la voce
7. Se si arrabbiano, mantieni la calma ma resta nel ruolo
8. Reagisci naturalmente a quello che dice, non seguire uno script rigido
9. Usa espressioni e modi di dire italiani autentici
10. IMPORTANTE: Usa la grammatica corretta per il sesso della vittima (es. se è maschio: "caro", "gentile signore"; se è femmina: "cara", "gentile signora")
11. La priorità è mantenere la conversazione credibile e divertente

IMPORTANTE: I primi 3 secondi sono cruciali. La prima impressione determina il successo dello scherzo.`;

export const DEFAULT_SYSTEM_PROMPT_EN = `You are {{GENDER}} making a prank phone call to {{VICTIM_NAME}} ({{VICTIM_GENDER}}).

PRANK SCENARIO:
{{PRANK_THEME}}

{{REAL_DETAIL_SECTION}}

PERSONALITY AND TONE:
{{PERSONALITY_TONE}}

FUNDAMENTAL RULES:
1. Speak ONLY in English
2. Keep responses SHORT: maximum 1-2 sentences per turn
3. NEVER reveal that this is a prank
4. When introducing yourself, use realistic names (e.g., John Smith, Sarah Miller) - NEVER obviously fake names
5. ALWAYS stay in character, no matter what the person says
6. If they say "wrong number", insist you recognize their voice
7. If they get angry, stay calm but remain in character
8. React naturally to what they say, dont follow a rigid script
9. Use authentic expressions and idioms
10. Priority is keeping the conversation believable and entertaining

IMPORTANT: The first 3 seconds are crucial. First impression determines the success of the prank.`;

export const DEFAULT_FIRST_MESSAGE_IT = `{{GREETING}}! Parlo con {{VICTIM_NAME}}?`;

export const DEFAULT_FIRST_MESSAGE_EN = `{{GREETING}}! Am I speaking with {{VICTIM_NAME}}?`;

// Default VAPI settings
export const DEFAULT_VAPI_SETTINGS: VapiSettings = {
  phoneNumberId: "",
  assistantId: "",
  callerId: "",
  aiProvider: "openai",
  aiModel: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 150,
  voiceProvider: "11labs",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  customVoiceId: "",
  voiceSpeed: 1.0,
  voiceStability: 0.5,
  voiceSimilarityBoost: 0.75,
  voiceStyle: 0,
  voiceUseSpeakerBoost: true,
  fillerInjectionEnabled: true,
  transcriberProvider: "deepgram",
  transcriberModel: "nova-2",
  transcriberLanguage: "it",
  firstMessage: "Pronto?",
  firstMessageMode: "assistant-speaks-first",
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 300,
  backgroundSound: "off",
  backchannelingEnabled: false,
  endCallMessage: "Arrivederci!",
  voicemailMessage: "",
  endCallPhrases: "",
  startSpeakingWaitSeconds: 0.4,
  smartEndpointingEnabled: true,
  smartEndpointingProvider: "livekit",
  transcriptionEndpointingPlanEnabled: false,
  stopSpeakingNumWords: 0,
  stopSpeakingVoiceSeconds: 0.2,
  stopSpeakingBackoffSeconds: 1.0,
  smartDenoisingEnabled: true,
  recordingEnabled: true,
  transcriptEnabled: true,
  firstMessageInterruptionsEnabled: false,
  voicemailDetectionEnabled: false,
  hipaaEnabled: false,
  backgroundDenoisingEnabled: false,
  modelOutputInMessagesEnabled: false,
  systemPromptTemplateIT: DEFAULT_SYSTEM_PROMPT_IT,
  systemPromptTemplateEN: DEFAULT_SYSTEM_PROMPT_EN,
  firstMessageTemplateIT: DEFAULT_FIRST_MESSAGE_IT,
  firstMessageTemplateEN: DEFAULT_FIRST_MESSAGE_EN,
};
