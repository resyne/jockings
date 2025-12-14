-- Permanently decrypt victim data in pranks using correct pgp_sym_decrypt
UPDATE public.pranks
SET
  victim_first_name = extensions.pgp_sym_decrypt(decode(victim_first_name, 'base64'), 'sarano_victim_data_encryption_key_v1'),
  victim_last_name = extensions.pgp_sym_decrypt(decode(victim_last_name, 'base64'), 'sarano_victim_data_encryption_key_v1'),
  victim_phone = extensions.pgp_sym_decrypt(decode(victim_phone, 'base64'), 'sarano_victim_data_encryption_key_v1');