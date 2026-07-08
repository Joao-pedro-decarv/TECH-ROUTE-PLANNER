import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, PiggyBank } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/reducao")({
  component: ReducaoPage,
});

function ReducaoPage() {
  const { user, isGestor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ valor: 0, descricao: "", os_id: "", data: new Date().toISOString().slice(0, 10) });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["reducao"],
    queryFn: async () => {
      const [{ data: rows }, { data: profs }] = await Promise.all([
        supabase.from("reducao_custo").select("*, ordens_servico(numero)").order("data", { ascending: false }),
        supabase.from("profiles").select("id, nome"),
      ]);
      const map = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (rows ?? []).map((r: any) => ({ ...r, tecnico_nome: r.tecnico_id ? map.get(r.tecnico_id) : null }));
    },
  });
  const { data: os = [] } = useQuery({ queryKey: ["os-list"], queryFn: async () => (await supabase.from("ordens_servico").select("id, numero").order("data_agendada", { ascending: false }).limit(200)).data ?? [] });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reducao_custo").insert({ ...form, valor: Number(form.valor), tecnico_id: user!.id, os_id: form.os_id || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lançamento registrado"); qc.invalidateQueries({ queryKey: ["reducao"] }); setOpen(false); setForm({ valor: 0, descricao: "", os_id: "", data: new Date().toISOString().slice(0, 10) }); },
    onError: (e: any) => toast.error(e.message),
  });

  const total = lancamentos.reduce((s: number, l: any) => s + Number(l.valor), 0);

  return (
    <>
      <PageHeader title="Redução de custo" description={isGestor ? "Lançamentos de todos os técnicos." : "Seus lançamentos de redução de custo."}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Redução de custo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div><Label>Valor economizado (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div><Label>OS relacionada (opcional)</Label>
                  <Select value={form.os_id} onValueChange={(v) => setForm({ ...form, os_id: v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{os.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.valor}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="mb-4"><CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">Total {isGestor ? "geral" : "seu"}</CardTitle>
        <PiggyBank className="h-4 w-4 text-accent" />
      </CardHeader><CardContent><div className="font-display text-3xl font-semibold">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead>{isGestor && <TableHead>Técnico</TableHead>}<TableHead>OS</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {lancamentos.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{new Date(l.data + "T00:00").toLocaleDateString("pt-BR")}</TableCell>
                {isGestor && <TableCell>{l.tecnico_nome ?? "—"}</TableCell>}
                <TableCell>{l.ordens_servico?.numero ?? "—"}</TableCell>
                <TableCell className="max-w-md truncate">{l.descricao}</TableCell>
                <TableCell className="text-right font-medium">R$ {Number(l.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
            {lancamentos.length === 0 && <TableRow><TableCell colSpan={isGestor ? 5 : 4} className="py-8 text-center text-muted-foreground">Sem lançamentos.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
