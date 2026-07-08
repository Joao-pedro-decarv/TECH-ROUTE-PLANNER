import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, History } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  component: EquipamentosPage,
});

function EquipamentosPage() {
  const { isGestor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patrimonio: "", numero_serie: "", modelo_id: "", cliente_id: "", observacoes: "" });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => (await supabase.from("equipamentos").select("*, modelos(fabricante, modelo), clientes(nome)").order("patrimonio")).data ?? [],
  });
  const { data: modelos = [] } = useQuery({ queryKey: ["modelos"], queryFn: async () => (await supabase.from("modelos").select("id, fabricante, modelo").order("modelo")).data ?? [] });
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => (await supabase.from("clientes").select("id, nome").order("nome")).data ?? [] });

  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("equipamentos").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["equipamentos"] }); setOpen(false); setForm({ patrimonio: "", numero_serie: "", modelo_id: "", cliente_id: "", observacoes: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("equipamentos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipamentos"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Equipamentos" description="Máquinas em campo com nº de patrimônio."
        actions={isGestor && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo equipamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Patrimônio</Label><Input value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} /></div>
                  <div><Label>Nº de série</Label><Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} /></div>
                </div>
                <div><Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Modelo</Label>
                  <Select value={form.modelo_id} onValueChange={(v) => setForm({ ...form, modelo_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{modelos.map((m) => <SelectItem key={m.id} value={m.id}>{m.fabricante} {m.modelo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.patrimonio || !form.cliente_id || !form.modelo_id}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Patrimônio</TableHead><TableHead>Nº série</TableHead><TableHead>Modelo</TableHead><TableHead>Cliente</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {equipamentos.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.patrimonio}</TableCell>
                <TableCell className="text-muted-foreground">{e.numero_serie ?? "—"}</TableCell>
                <TableCell>{e.modelos?.fabricante} {e.modelos?.modelo}</TableCell>
                <TableCell>{e.clientes?.nome}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" title="Histórico" asChild>
                    <Link to="/equipamentos/$id/historico" params={{ id: e.id }}><History className="h-4 w-4" /></Link>
                  </Button>
                  {isGestor && <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && del.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
            {equipamentos.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum equipamento.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
