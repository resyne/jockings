-- Decrypt existing victim data stored in encrypted form
UPDATE public.pranks
SET
  victim_phone = public.decrypt_victim_data(victim_phone),
  victim_first_name = public.decrypt_victim_data(victim_first_name),
  victim_last_name = public.decrypt_victim_data(victim_last_name);
