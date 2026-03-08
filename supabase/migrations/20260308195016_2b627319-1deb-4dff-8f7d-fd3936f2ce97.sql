-- Update first message templates to ask for victim's name
UPDATE app_settings SET value = '{{GREETING}}, parlo con {{VICTIM_FIRST_NAME}}?', updated_at = now() WHERE key = 'vapi_first_message_it';
UPDATE app_settings SET value = '{{GREETING}}, am I speaking with {{VICTIM_FIRST_NAME}}?', updated_at = now() WHERE key = 'vapi_first_message_en';