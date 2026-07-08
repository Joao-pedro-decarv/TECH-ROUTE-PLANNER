import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/rotas")({ component: RotasPage });

function RotasPage() {
  const { isGestor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<{ nome: string; descricao: string; cor: string; tecnico_id: string }>({ nome: "", descricao: "", cor: "#3b82f6", tecnico_id: "" });
  const reset = () => setForm({ nome: "", descricao: "", cor: "#3b82f6", tecnico_id: "" });

  const { data: rotas = [] } = useQuery({
    queryKey: ["rotas"],
    queryFn: async () => (await (supabase.from as any)("rotas").select("*").order("nome")).data ?? [],
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["profiles-lista"],
    queryFn: async () => (await supabase.from("profiles").select("id, nome").order("nome")).data ?? [],
  });

  const { data: contagem = {} as Record<string, number> } = useQuery({
    queryKey: ["rotas-contagem"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("rota_id" as any);
      const map: Record<string, number> = {};
      (data ?? []).forEach((c: any) => { if (c.rota_id) map[c.rota_id] = (map[c.rota_id] ?? 0) + 1; });
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tecnico_id: form.tecnico_id || null };
      if (editing) {
        const { error } = await (supabase.from as any)("rotas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("rotas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Rota salva");
      qc.invalidateQueries({ queryKey: ["rotas"] });
      setOpen(false); setEditing(null); reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from as any)("rotas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Rota removida"); qc.invalidateQueries({ queryKey: ["rotas"] }); qc.invalidateQueries({ queryKey: ["clientes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (r: any) => { setEditing(r); setForm({ nome: r.nome, descricao: r.descricao ?? "", cor: r.cor ?? "#3b82f6", tecnico_id: r.tecnico_id ?? "" }); setOpen(true); };

  const nomeTecnico = (id: string | null | undefined) => (tecnicos as any[]).find((t) => t.id === id)?.nome ?? "—";

  const handleSave = () => save.mutate();

  return (
    <>
      <PageHeader title="Rotas" description="Cadastro de rotas de atendimento — usadas para categorizar clientes e filtrar OS."
        actions={isGestor && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova rota</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} rota</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Rota Centro, Rota Zona Sul" /></div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-full p-1" /></div>
                  <div><Label>Técnico responsável</Label>
                    <Select value={form.tecnico_id || "none"} onValueChange={(v) => setForm({ ...form, tecnico_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— nenhum —</SelectItem>
                        {(tecnicos as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleSave} disabled={!form.nome}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Rota</TableHead><TableHead>Descrição</TableHead><TableHead>Técnico responsável</TableHead><TableHead className="text-center">Clientes</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {rotas.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: r.cor ?? "#94a3b8" }} />
                    {r.nome}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.descricao ?? "—"}</TableCell>
                <TableCell>{nomeTecnico(r.tecnico_id)}</TableCell>
                <TableCell className="text-center">{contagem[r.id] ?? 0}</TableCell>
                <TableCell className="text-right">
                  {isGestor && <>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Remover rota?") && del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {rotas.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma rota cadastrada.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
