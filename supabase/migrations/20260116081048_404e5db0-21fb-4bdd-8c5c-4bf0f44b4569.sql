-- Add amount_paid column to processed_payments table
ALTER TABLE public.processed_payments 
ADD COLUMN amount_paid numeric(10,2) DEFAULT NULL,
ADD COLUMN currency text DEFAULT 'eur',
ADD COLUMN package_type text DEFAULT NULL;