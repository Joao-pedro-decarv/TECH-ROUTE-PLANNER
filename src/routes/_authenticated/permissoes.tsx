import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth, MODULES } from "@/lib/auth-context";
import { salvarPermissoes, alternarRoleAdmin } from "@/lib/admin.functions";
import { Save, Shield, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/permissoes")({ component: PermissoesPage });

// checkbox importado acima

function PermissoesPage() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [state, setState] = useState<Record<string, { view: boolean; edit: boolean }>>({});
  const salvar = useServerFn(salvarPermissoes);
  const toggleAdmin = useServerFn(alternarRoleAdmin);

  const { data: users = [] } = useQuery({
    queryKey: ["users-permissoes"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p, roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
  });

  const { data: perms } = useQuery({
    queryKey: ["perms", selectedUser],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("user_module_permissions")
        .select("module, can_view, can_edit").eq("user_id", selectedUser);
      return data ?? [];
    },
  });

  useEffect(() => {
    const map: Record<string, { view: boolean; edit: boolean }> = {};
    MODULES.forEach((m) => { map[m.key] = { view: false, edit: false }; });
    ((perms as any[]) ?? []).forEach((p) => { map[p.module] = { view: p.can_view, edit: p.can_edit }; });
    setState(map);
  }, [perms, selectedUser]);

  const save = useMutation({
    mutationFn: async () => {
      await salvar({ data: {
        userId: selectedUser,
        permissions: MODULES.map((m) => ({ module: m.key, can_view: state[m.key]?.view ?? false, can_edit: state[m.key]?.edit ?? false })),
      }});
    },
    onSuccess: () => { toast.success("Permissões salvas"); qc.invalidateQueries({ queryKey: ["perms", selectedUser] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const doToggleAdmin = useMutation({
    mutationFn: async (v: { userId: string; makeAdmin: boolean }) => { await toggleAdmin({ data: v }); },
    onSuccess: () => { toast.success("Papel atualizado"); qc.invalidateQueries({ queryKey: ["users-permissoes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) return <Navigate to="/dashboard" />;

  const selUser = users.find((u: any) => u.id === selectedUser);

  return (
    <>
      <PageHeader title="Usuários & Permissões"
        description="Gestor total (admin) libera módulos específicos por usuário. Gestores comuns já veem tudo; técnicos veem apenas o que for marcado aqui." />

      <Card className="mb-4"><CardContent className="p-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label>Usuário</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger><SelectValue placeholder="Selecione um usuário…" /></SelectTrigger>
            <SelectContent>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome} — {u.email} {u.roles.includes("admin") && "· ADMIN"} {u.roles.includes("gestor") && "· gestor"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selUser && (
          <div className="flex items-end">
            <Button variant="outline" disabled={selUser.id === user?.id}
              onClick={() => doToggleAdmin.mutate({ userId: selUser.id, makeAdmin: !selUser.roles.includes("admin") })}>
              {selUser.roles.includes("admin") ? <><ShieldOff className="mr-2 h-4 w-4" /> Remover admin</> : <><Shield className="mr-2 h-4 w-4" /> Tornar admin</>}
            </Button>
          </div>
        )}
      </CardContent></Card>

      {selectedUser && (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Módulo</TableHead>
              <TableHead className="w-32 text-center">Visualizar</TableHead>
              <TableHead className="w-32 text-center">Editar</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {MODULES.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={state[m.key]?.view ?? false}
                      onCheckedChange={(v) => setState((s) => ({ ...s, [m.key]: { view: !!v, edit: !v ? false : (s[m.key]?.edit ?? false) } }))} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={state[m.key]?.edit ?? false}
                      onCheckedChange={(v) => setState((s) => ({ ...s, [m.key]: { view: !!v ? true : (s[m.key]?.view ?? false), edit: !!v } }))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end p-4">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="mr-2 h-4 w-4" /> Salvar permissões
            </Button>
          </div>
        </CardContent></Card>
      )}
    </>
  );
}
