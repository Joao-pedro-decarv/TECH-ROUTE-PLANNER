
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cidade TEXT;

ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS numero_serie TEXT;

-- Novos status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='em_execucao' AND enumtypid = (SELECT oid FROM pg_type WHERE typname='os_status')) THEN
    ALTER TYPE public.os_status ADD VALUE 'em_execucao';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='pausada' AND enumtypid = (SELECT oid FROM pg_type WHERE typname='os_status')) THEN
    ALTER TYPE public.os_status ADD VALUE 'pausada';
  END IF;
END $$;

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS iniciada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pausada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pausa_total_min INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acompanhante TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_cliente TEXT,
  ADD COLUMN IF NOT EXISTS endereco_atendimento TEXT,
  ADD COLUMN IF NOT EXISTS laudo_tecnico TEXT,
  ADD COLUMN IF NOT EXISTS contador_mono INTEGER,
  ADD COLUMN IF NOT EXISTS contador_color INTEGER,
  ADD COLUMN IF NOT EXISTS contador_total INTEGER,
  ADD COLUMN IF NOT EXISTS satisfacao_nota INTEGER,
  ADD COLUMN IF NOT EXISTS satisfacao_observacao TEXT;
