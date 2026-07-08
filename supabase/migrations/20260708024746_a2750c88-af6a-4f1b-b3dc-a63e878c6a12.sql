ALTER TABLE public.rotas ADD COLUMN IF NOT EXISTS tecnico_id UUID;
ALTER TABLE public.modelos ADD COLUMN IF NOT EXISTS toner_padrao TEXT;

CREATE TABLE IF NOT EXISTS public.entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  modelo_id UUID REFERENCES public.modelos(id) ON DELETE SET NULL,
  data_agendada DATE NOT NULL DEFAULT CURRENT_DATE,
  tecnico_id UUID,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  toner_sugerido TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas TO authenticated;
GRANT ALL ON public.entregas TO service_role;

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados veem entregas" ON public.entregas;
CREATE POLICY "Todos autenticados veem entregas"
  ON public.entregas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestor/estoquista gerenciam entregas" ON public.entregas;
CREATE POLICY "Gestor/estoquista gerenciam entregas"
  ON public.entregas FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'estoquista')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'estoquista')
  );

DROP TRIGGER IF EXISTS update_entregas_updated_at ON public.entregas;
CREATE TRIGGER update_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();