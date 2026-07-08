-- Add CNPJ to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj TEXT;
