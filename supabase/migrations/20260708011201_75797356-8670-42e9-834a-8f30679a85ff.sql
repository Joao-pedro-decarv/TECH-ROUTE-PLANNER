
-- Enums novos
DO $$ BEGIN
  CREATE TYPE public.os_resultado AS ENUM ('OK_COM_PECA','OK_SEM_PECA','NECESSARIO_RETORNO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.os_peca_status AS ENUM ('sugerida','aprovada','usada','descartada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles.valor_hora
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS valor_hora NUMERIC(10,2);

-- os_pecas.status
ALTER TABLE public.os_pecas ADD COLUMN IF NOT EXISTS status public.os_peca_status NOT NULL DEFAULT 'aprovada';

-- ordens_servico - novos campos
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS resultado public.os_resultado,
  ADD COLUMN IF NOT EXISTS custo NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tempo_deslocamento_min INTEGER,
  ADD COLUMN IF NOT EXISTS tempo_execucao_min INTEGER,
  ADD COLUMN IF NOT EXISTS finalizada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes_finais TEXT,
  ADD COLUMN IF NOT EXISTS mau_uso_troca TEXT,
  ADD COLUMN IF NOT EXISTS mau_uso_defeito TEXT,
  ADD COLUMN IF NOT EXISTS mau_uso_como_ocorreu TEXT,
  ADD COLUMN IF NOT EXISTS mau_uso_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS mau_uso_contato TEXT;

-- user_module_permissions
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_module_permissions TO authenticated;
GRANT ALL ON public.user_module_permissions TO service_role;

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin gerencia permissoes" ON public.user_module_permissions;
CREATE POLICY "admin gerencia permissoes" ON public.user_module_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "usuario ve suas permissoes" ON public.user_module_permissions;
CREATE POLICY "usuario ve suas permissoes" ON public.user_module_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_module_permissions_updated_at ON public.user_module_permissions;
CREATE TRIGGER update_user_module_permissions_updated_at
  BEFORE UPDATE ON public.user_module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função can_access_module (SECURITY INVOKER - usa políticas próprias)
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id UUID, _module TEXT, _need_edit BOOLEAN DEFAULT false)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id,'admin')
    OR public.has_role(_user_id,'gestor')
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions
      WHERE user_id = _user_id AND module = _module
        AND can_view = true
        AND (NOT _need_edit OR can_edit = true)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_module(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_module(UUID, TEXT, BOOLEAN) TO authenticated, service_role;

-- Promove primeiro gestor existente a admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role FROM public.user_roles
WHERE role = 'gestor'
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- handle_new_user: primeiro usuário do sistema vira admin+gestor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','gestor')) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gestor');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tecnico');
  END IF;
  RETURN NEW;
END; $$;
