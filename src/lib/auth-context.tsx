import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gestor" | "tecnico" | "estoquista";

export interface ModulePermission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  permissions: ModulePermission[];
  isAdmin: boolean;
  isGestor: boolean;
  isTecnico: boolean;
  isEstoquista: boolean;
  canView: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (uid: string) => {
    const [{ data: rs }, { data: ps }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      (supabase.from as any)("user_module_permissions").select("module, can_view, can_edit").eq("user_id", uid),
    ]);
    setRoles((rs ?? []).map((r: any) => r.role as AppRole));
    setPermissions((ps ?? []) as ModulePermission[]);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => fetchRoles(s.user.id), 0);
      else { setRoles([]); setPermissions([]); }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await fetchRoles(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshRoles = async () => { if (session?.user) await fetchRoles(session.user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  const isAdmin = roles.includes("admin");
  const isGestor = roles.includes("gestor") || isAdmin;

  const canView = (module: string) => {
    if (isAdmin || isGestor) return true;
    return permissions.some((p) => p.module === module && p.can_view);
  };
  const canEdit = (module: string) => {
    if (isAdmin || isGestor) return true;
    return permissions.some((p) => p.module === module && p.can_edit);
  };

  return (
    <AuthContext.Provider
      value={{
        session, user: session?.user ?? null, roles, permissions,
        isAdmin, isGestor, isTecnico: roles.includes("tecnico"),
        isEstoquista: roles.includes("estoquista"),
        canView, canEdit, loading, refreshRoles, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de AuthProvider");
  return ctx;
}

export const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "rota", label: "Rota do dia" },
  { key: "os", label: "Ordens de Serviço" },
  { key: "entregas", label: "Entregas" },
  { key: "conferencia", label: "Conferência / Fechamento" },
  { key: "preventivas", label: "Preventivas" },
  { key: "reducao", label: "Redução de custo" },
  { key: "rendimento", label: "Rendimento" },
  { key: "clientes", label: "Clientes" },
  { key: "rotas", label: "Rotas" },
  { key: "equipamentos", label: "Equipamentos" },
  { key: "modelos", label: "Modelos & Problemas" },
  { key: "pecas", label: "Peças" },
  { key: "tecnicos", label: "Técnicos" },
  { key: "permissoes", label: "Permissões" },
] as const;
