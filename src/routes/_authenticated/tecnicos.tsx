import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldCheck, ShieldOff, Save } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { inviteUsuario, removerUsuario, alternarRoleGestor, createUsuarioSemEmail, salvarValorHora } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/tecnicos")({ component: TecnicosPage });

function TecnicosPage() {
  const { user, isGestor, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ email: "", nome: "", role: "tecnico" as "tecnico" | "gestor" | "admin" | "estoquista" });
  const [valorEdit, setValorEdit] = useState<Record<string, string>>({});

  const invite = useServerFn(inviteUsuario);
  const createWithoutEmail = useServerFn(createUsuarioSemEmail);
  const remove = useServerFn(removerUsuario);
  const toggleGestor = useServerFn(alternarRoleGestor);
  const saveValor = useServerFn(salvarValorHora);

  const { data: users = [] } = useQuery({
    queryKey: ["tecnicos"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles ?? []).map((p: any) => ({
        ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const doInvite = useMutation({
    mutationFn: async () => { await invite({ data: { ...form, redirectTo: `${window.location.origin}/reset-password` } }); },
    onSuccess: () => {
      toast.success("Convite enviado! O usuário receberá um email para definir a senha.");
      qc.invalidateQueries({ queryKey: ["tecnicos"] });
      setOpen(false); setForm({ email: "", nome: "", role: "tecnico" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const doCreateWithoutEmail = useMutation({
    mutationFn: async () => { await createWithoutEmail({ data: { nome: form.nome, role: form.role } }); },
    onSuccess: () => {
      toast.success("Técnico cadastrado sem email.");
      qc.invalidateQueries({ queryKey: ["tecnicos"] });
      setOpen(false); setForm({ email: "", nome: "", role: "tecnico" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const doRemove = useMutation({
    mutationFn: async (userId: string) => { await remove({ data: { userId } }); },
    onSuccess: () => { toast.success("Usuário removido"); qc.invalidateQueries({ queryKey: ["tecnicos"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const doToggle = useMutation({
    mutationFn: async (v: { userId: string; makeGestor: boolean }) => { await toggleGestor({ data: v }); },
    onSuccess: () => { toast.success("Papel atualizado"); qc.invalidateQueries({ queryKey: ["tecnicos"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const doSaveValor = useMutation({
    mutationFn: async (v: { userId: string; valorHora: number | null }) => { await saveValor({ data: v }); },
    onSuccess: () => { toast.success("Valor/hora salvo"); qc.invalidateQueries({ queryKey: ["tecnicos"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Técnicos & Gestores"
        description="Convide usuários pelo email. Cada pessoa define a própria senha ao abrir o link recebido."
        actions={isGestor && (
          <>
            <Dialog open={open} onOpenChange={(value) => {
              setOpen(value);
              if (!value) setForm({ email: "", nome: "", role: "tecnico" });
            }}>
              <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Convidar</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Convidar novo usuário</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Papel</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="estoquista">Estoquista</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        {isAdmin && <SelectItem value="admin">Admin (gestor total)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando houver email, o usuário recebe um convite para definir a senha. Email opcional.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => doInvite.mutate()} disabled={!form.nome || !form.email || doInvite.isPending}>
                    {doInvite.isPending ? "Enviando…" : "Enviar convite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openAdd} onOpenChange={(value) => {
              setOpenAdd(value);
              if (!value) setForm({ email: "", nome: "", role: "tecnico" });
            }}>
              <DialogTrigger asChild><Button variant="secondary" className="ml-2">Adicionar técnico</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar técnico</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div><Label>Papel</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="estoquista">Estoquista</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        {isAdmin && <SelectItem value="admin">Admin (gestor total)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cria um técnico direto sem exigir email. O cadastro será feito imediatamente.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => doCreateWithoutEmail.mutate()} disabled={!form.nome || doCreateWithoutEmail.isPending}>
                    {doCreateWithoutEmail.isPending ? "Cadastrando…" : "Adicionar técnico"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Papéis</TableHead>
            <TableHead className="w-48">Valor/hora (R$)</TableHead>
            {isGestor && <TableHead className="text-right">Ações</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {users.map((u: any) => {
              const éGestor = u.roles.includes("gestor");
              const éAdmin = u.roles.includes("admin");
              const éEu = u.id === user?.id;
              const val = valorEdit[u.id] ?? (u.valor_hora != null ? String(u.valor_hora) : "");
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    {éAdmin && <Badge className="mr-1 bg-primary text-primary-foreground">admin</Badge>}
                    {u.roles.filter((r: string) => r !== "admin").map((r: string) => (
                      <Badge key={r} variant={r === "gestor" ? "default" : "secondary"} className="mr-1">{r}</Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    {isGestor ? (
                      <div className="flex gap-1">
                        <Input type="number" step="0.01" value={val}
                          onChange={(e) => setValorEdit((s) => ({ ...s, [u.id]: e.target.value }))} />
                        <Button size="icon" variant="ghost"
                          onClick={() => doSaveValor.mutate({ userId: u.id, valorHora: val === "" ? null : Number(val) })}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (u.valor_hora != null ? `R$ ${Number(u.valor_hora).toFixed(2)}` : "—")}
                  </TableCell>
                  {isGestor && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" disabled={éEu || éAdmin}
                        onClick={() => doToggle.mutate({ userId: u.id, makeGestor: !éGestor })}
                        title={éGestor ? "Remover papel de gestor" : "Promover a gestor"}>
                        {éGestor ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={éEu}
                        onClick={() => { if (confirm(`Remover ${u.nome}?`)) doRemove.mutate(u.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
      {isAdmin && (
        <p className="mt-3 text-xs text-muted-foreground">
          Para permissões granulares por módulo, acesse <Link to="/permissoes" className="underline">Usuários & Permissões</Link>.
        </p>
      )}
    </>
  );
}
