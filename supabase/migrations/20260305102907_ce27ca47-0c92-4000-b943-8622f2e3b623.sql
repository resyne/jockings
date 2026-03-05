
UPDATE app_settings SET value = 'openai', updated_at = now() WHERE key = 'vapi_ai_provider';
UPDATE app_settings SET value = 'gpt-4o-mini', updated_at = now() WHERE key = 'vapi_ai_model';
UPDATE app_settings SET value = '1.0', updated_at = now() WHERE key = 'vapi_temperature';
UPDATE app_settings SET value = '150', updated_at = now() WHERE key = 'vapi_max_tokens';
UPDATE app_settings SET value = 'eleven_v3', updated_at = now() WHERE key = 'elevenlabs_model';
UPDATE app_settings SET value = '{{GREETING}}, {{VICTIM_FIRST_NAME}}! Senta, la chiamo perché...', updated_at = now() WHERE key = 'vapi_first_message_it';
UPDATE app_settings SET value = '{{GREETING}}, {{VICTIM_FIRST_NAME}}! Listen, I''m calling because...', updated_at = now() WHERE key = 'vapi_first_message_en';
