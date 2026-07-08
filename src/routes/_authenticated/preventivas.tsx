import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, AlertTriangle, FileDown, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { exportToPDF, exportToExcel } from "@/lib/export";
import { differenceInDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/preventivas")({
  component: PreventivasPage,
});

function PreventivasPage() {
  const { user, isGestor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ equipamento_id: "", os_id: "", troca_peca: false, pecas_trocadas: "", descricao: "", data_execucao: new Date().toISOString().slice(0, 10) });
  const [filtroCliente, setFiltroCliente] = useState<string>("all");

  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => (await supabase.from("equipamentos").select("*, clientes(id, nome), modelos(fabricante, modelo)").order("patrimonio")).data ?? [],
  });
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => (await supabase.from("clientes").select("id, nome")).data ?? [] });
  const { data: os = [] } = useQuery({ queryKey: ["os-list"], queryFn: async () => (await supabase.from("ordens_servico").select("id, numero").order("data_agendada", { ascending: false }).limit(200)).data ?? [] });

  const { data: preventivas = [] } = useQuery({
    queryKey: ["preventivas"],
    queryFn: async () => {
      const [{ data: rows }, { data: profs }] = await Promise.all([
        supabase.from("preventivas").select("*, equipamentos(patrimonio, clientes(nome), modelos(modelo))").order("data_execucao", { ascending: false }),
        supabase.from("profiles").select("id, nome"),
      ]);
      const map = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (rows ?? []).map((r: any) => ({ ...r, tecnico_nome: r.tecnico_id ? map.get(r.tecnico_id) : null }));
    },
  });

  const alertas = useMemo(() => {
    const ultimaPorEquip = new Map<string, any>();
    preventivas.forEach((p: any) => {
      const cur = ultimaPorEquip.get(p.equipamento_id);
      if (!cur || p.data_execucao > cur.data_execucao) ultimaPorEquip.set(p.equipamento_id, p);
    });
    return equipamentos
      .filter((e: any) => filtroCliente === "all" || e.cliente_id === filtroCliente)
      .map((e: any) => {
        const ult = ultimaPorEquip.get(e.id);
        const dias = ult ? differenceInDays(new Date(), new Date(ult.data_execucao)) : null;
        return { equip: e, ultima: ult, dias };
      })
      .filter((r) => r.dias === null || r.dias >= 90)
      .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999));
  }, [equipamentos, preventivas, filtroCliente]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tecnico_id: user!.id, os_id: form.os_id || null };
      const { error } = await supabase.from("preventivas").insert(payload); if (error) throw error;
    },
    onSuccess: () => { toast.success("Preventiva registrada"); qc.invalidateQueries({ queryKey: ["preventivas"] }); setOpen(false); setForm({ equipamento_id: "", os_id: "", troca_peca: false, pecas_trocadas: "", descricao: "", data_execucao: new Date().toISOString().slice(0, 10) }); },
    onError: (e: any) => toast.error(e.message),
  });

  const exportarAlertas = (tipo: "pdf" | "xlsx") => {
    const cols = [
      { header: "Patrimônio", key: "pat" }, { header: "Cliente", key: "cli" }, { header: "Modelo", key: "mod" },
      { header: "Última preventiva", key: "ult" }, { header: "Dias", key: "dias" }, { header: "Última ação", key: "acao" },
    ];
    const rows = alertas.map((a) => ({
      pat: a.equip.patrimonio, cli: a.equip.clientes?.nome, mod: a.equip.modelos?.modelo,
      ult: a.ultima?.data_execucao ?? "—", dias: a.dias ?? "sem histórico", acao: a.ultima?.descricao ?? "—",
    }));
    const fname = `alertas-preventivas-${new Date().toISOString().slice(0, 10)}`;
    if (tipo === "pdf") exportToPDF("Alertas de preventiva (3+ meses)", cols, rows, fname);
    else exportToExcel("Alertas", cols, rows, fname);
  };

  return (
    <>
      <PageHeader title="Preventivas & Análise técnica" description="Registro de preventivas por patrimônio e alertas de retorno após 3 meses."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Registrar preventiva</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova preventiva</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Equipamento (patrimônio)</Label>
                  <Select value={form.equipamento_id} onValueChange={(v) => setForm({ ...form, equipamento_id: v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{equipamentos.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.patrimonio} — {e.modelos?.modelo} ({e.clientes?.nome})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Nº OS relacionada (opcional)</Label>
                  <Select value={form.os_id} onValueChange={(v) => setForm({ ...form, os_id: v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{os.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={form.data_execucao} onChange={(e) => setForm({ ...form, data_execucao: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Checkbox checked={form.troca_peca} onCheckedChange={(v) => setForm({ ...form, troca_peca: !!v })} /><Label>Houve troca de peça</Label></div>
                {form.troca_peca && <div><Label>Peças trocadas</Label><Input value={form.pecas_trocadas} onChange={(e) => setForm({ ...form, pecas_trocadas: e.target.value })} /></div>}
                <div><Label>O que foi feito</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.equipamento_id || !form.descricao}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-accent" /> Atenção — 3 meses ou sem histórico</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar cliente" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => exportarAlertas("pdf")}><FileDown className="mr-1 h-4 w-4" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => exportarAlertas("xlsx")}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Patrimônio</TableHead><TableHead>Cliente</TableHead><TableHead>Modelo</TableHead><TableHead>Última preventiva</TableHead><TableHead>Dias</TableHead><TableHead>Última ação registrada</TableHead></TableRow></TableHeader>
            <TableBody>
              {alertas.map((a) => (
                <TableRow key={a.equip.id}>
                  <TableCell className="font-medium">{a.equip.patrimonio}</TableCell>
                  <TableCell>{a.equip.clientes?.nome}</TableCell>
                  <TableCell>{a.equip.modelos?.modelo}</TableCell>
                  <TableCell>{a.ultima ? new Date(a.ultima.data_execucao + "T00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant={a.dias === null ? "outline" : "default"}>{a.dias === null ? "sem histórico" : `${a.dias} d`}</Badge></TableCell>
                  <TableCell className="max-w-sm truncate text-muted-foreground">{a.ultima?.descricao ?? "—"}</TableCell>
                </TableRow>
              ))}
              {alertas.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum equipamento pendente.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de preventivas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Patrimônio</TableHead><TableHead>Cliente</TableHead><TableHead>Técnico</TableHead><TableHead>Troca</TableHead><TableHead>Descrição</TableHead></TableRow></TableHeader>
            <TableBody>
              {preventivas.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.data_execucao + "T00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{p.equipamentos?.patrimonio}</TableCell>
                  <TableCell>{p.equipamentos?.clientes?.nome}</TableCell>
                  <TableCell>{p.tecnico_nome ?? "—"}</TableCell>
                  <TableCell>{p.troca_peca ? <Badge className="bg-accent/20 text-accent-foreground" variant="outline">{p.pecas_trocadas}</Badge> : "—"}</TableCell>
                  <TableCell className="max-w-md truncate">{p.descricao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
