
-- Tabela de rotas
CREATE TABLE public.rotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas TO authenticated;
GRANT ALL ON public.rotas TO service_role;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver rotas" ON public.rotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestores gerenciam rotas" ON public.rotas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER update_rotas_updated_at BEFORE UPDATE ON public.rotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campos novos em clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS rota_id UUID REFERENCES public.rotas(id) ON DELETE SET NULL;
