-- Migration: 20260824000006_crm_tags_support.sql
-- Description: Adds tags array to customers and threads for Vpage-like categorization

BEGIN;

ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.crm_threads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

COMMIT;
