
-- Enums
CREATE TYPE public.app_role AS ENUM ('gestor', 'tecnico');
CREATE TYPE public.os_tipo AS ENUM ('PREVENTIVA', 'START', 'ESTOQUE', 'NORMAL');
CREATE TYPE public.os_status AS ENUM ('aberta', 'em_rota', 'concluida', 'cancelada');

-- Utility: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Trigger para criar profile ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  -- primeiro usuário do sistema vira gestor automaticamente
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'gestor') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gestor');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tecnico');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies profiles
CREATE POLICY "Ver próprio profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Atualizar próprio profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Gestor gerencia profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- Policies user_roles
CREATE POLICY "Ver próprio role" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor gerencia roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  contato TEXT,
  telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticado vê clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor gerencia clientes" ON public.clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- modelos
CREATE TABLE public.modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fabricante TEXT,
  modelo TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos TO authenticated;
GRANT ALL ON public.modelos TO service_role;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticado vê modelos" ON public.modelos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor gerencia modelos" ON public.modelos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE TRIGGER trg_modelos_updated BEFORE UPDATE ON public.modelos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pecas
CREATE TABLE public.pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  descricao TEXT NOT NULL,
  custo NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas TO authenticated;
GRANT ALL ON public.pecas TO service_role;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticado vê peças" ON public.pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor gerencia peças" ON public.pecas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE TRIGGER trg_pecas_updated BEFORE UPDATE ON public.pecas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- equipamentos
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimonio TEXT NOT NULL UNIQUE,
  modelo_id UUID NOT NULL REFERENCES public.modelos(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticado vê equipamentos" ON public.equipamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor gerencia equipamentos" ON public.equipamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE TRIGGER trg_equipamentos_updated BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- problemas
CREATE TABLE public.problemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES public.modelos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problemas TO authenticated;
GRANT ALL ON public.problemas TO service_role;
ALTER TABLE public.problemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticado vê problemas" ON public.problemas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor gerencia problemas" ON public.problemas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE TRIGGER trg_problemas_updated BEFORE UPDATE ON public.problemas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- problema_pecas (peças padrão por problema)
CREATE TABLE public.problema_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problema_id UUID NOT NULL REFERENCES public.problemas(id) ON DELETE CASCADE,
  peca_id UUID NOT NULL REFERENCES public.pecas(id) ON DELETE RESTRICT,
  quantidade INT NOT NULL DEFAULT 1,
  UNIQUE(problema_id, peca_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problema_pecas TO authenticated;
GRANT ALL ON public.problema_pecas TO service_role;
ALTER TABLE public.problema_pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticado vê problema_pecas" ON public.problema_pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor gerencia problema_pecas" ON public.problema_pecas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ordens_servico
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  tipo os_tipo NOT NULL DEFAULT 'NORMAL',
  status os_status NOT NULL DEFAULT 'aberta',
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  equipamento_id UUID REFERENCES public.equipamentos(id),
  problema_id UUID REFERENCES public.problemas(id),
  problema_descricao TEXT,
  tecnico_id UUID REFERENCES auth.users(id),
  data_agendada DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao TIMESTAMPTZ,
  valor NUMERIC(12,2) DEFAULT 0,
  descricao_servico TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_tecnico_data ON public.ordens_servico(tecnico_id, data_agendada);
CREATE INDEX idx_os_status ON public.ordens_servico(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestor vê todas OS" ON public.ordens_servico FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') OR tecnico_id = auth.uid());
CREATE POLICY "Gestor gerencia OS" ON public.ordens_servico FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Técnico atualiza suas OS" ON public.ordens_servico FOR UPDATE TO authenticated
  USING (tecnico_id = auth.uid()) WITH CHECK (tecnico_id = auth.uid());
CREATE TRIGGER trg_os_updated BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- os_pecas (previstas e usadas)
CREATE TABLE public.os_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  peca_id UUID NOT NULL REFERENCES public.pecas(id),
  quantidade_prevista INT NOT NULL DEFAULT 0,
  quantidade_usada INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_pecas_os ON public.os_pecas(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_pecas TO authenticated;
GRANT ALL ON public.os_pecas TO service_role;
ALTER TABLE public.os_pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver peças da OS visível" ON public.os_pecas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = os_pecas.os_id
    AND (public.has_role(auth.uid(), 'gestor') OR o.tecnico_id = auth.uid())));
CREATE POLICY "Gestor gerencia peças da OS" ON public.os_pecas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Técnico atualiza peças usadas" ON public.os_pecas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = os_pecas.os_id AND o.tecnico_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.id = os_pecas.os_id AND o.tecnico_id = auth.uid()));

-- preventivas
CREATE TABLE public.preventivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES auth.users(id),
  data_execucao DATE NOT NULL DEFAULT CURRENT_DATE,
  troca_peca BOOLEAN NOT NULL DEFAULT false,
  pecas_trocadas TEXT,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prev_equip_data ON public.preventivas(equipamento_id, data_execucao DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preventivas TO authenticated;
GRANT ALL ON public.preventivas TO service_role;
ALTER TABLE public.preventivas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver preventivas" ON public.preventivas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') OR tecnico_id = auth.uid());
CREATE POLICY "Técnico registra preventiva" ON public.preventivas FOR INSERT TO authenticated
  WITH CHECK (tecnico_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor gerencia preventivas" ON public.preventivas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Técnico atualiza sua preventiva" ON public.preventivas FOR UPDATE TO authenticated
  USING (tecnico_id = auth.uid()) WITH CHECK (tecnico_id = auth.uid());
CREATE TRIGGER trg_prev_updated BEFORE UPDATE ON public.preventivas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reducao_custo
CREATE TABLE public.reducao_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID NOT NULL REFERENCES auth.users(id),
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reducao_tecnico_data ON public.reducao_custo(tecnico_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reducao_custo TO authenticated;
GRANT ALL ON public.reducao_custo TO service_role;
ALTER TABLE public.reducao_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver redução" ON public.reducao_custo FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor') OR tecnico_id = auth.uid());
CREATE POLICY "Técnico lança redução" ON public.reducao_custo FOR INSERT TO authenticated
  WITH CHECK (tecnico_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestor gerencia redução" ON public.reducao_custo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Técnico edita sua redução" ON public.reducao_custo FOR UPDATE TO authenticated
  USING (tecnico_id = auth.uid()) WITH CHECK (tecnico_id = auth.uid());
