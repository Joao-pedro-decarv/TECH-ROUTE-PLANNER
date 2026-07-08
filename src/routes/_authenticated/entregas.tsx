import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Truck, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/entregas")({ component: EntregasPage });

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", em_rota: "Em rota", entregue: "Entregue", cancelada: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_rota: "bg-accent/30 text-accent-foreground",
  entregue: "bg-success/20 text-success-foreground",
  cancelada: "bg-destructive/20 text-destructive-foreground",
};

interface ItemEntrega { descricao: string; quantidade: number }

function EntregasPage() {
  const { isGestor, isEstoquista, isAdmin, user } = useAuth();
  const podeEditar = isAdmin || isGestor || isEstoquista;

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filtroData, setFiltroData] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");

  const [form, setForm] = useState<any>({
    numero: "", cliente_id: "", equipamento_id: "", modelo_id: "",
    tecnico_id: "", data_agendada: new Date().toISOString().slice(0, 10),
    status: "pendente", observacoes: "", toner_sugerido: "",
    itens: [] as ItemEntrega[],
  });

  const reset = () => setForm({
    numero: "", cliente_id: "", equipamento_id: "", modelo_id: "",
    tecnico_id: "", data_agendada: new Date().toISOString().slice(0, 10),
    status: "pendente", observacoes: "", toner_sugerido: "", itens: [],
  });

  const { data: entregas = [] } = useQuery({
    queryKey: ["entregas"],
    queryFn: async () => (await (supabase.from as any)("entregas")
      .select("*, clientes(nome, cidade, bairro), equipamentos(patrimonio, modelo_id, modelos(fabricante, modelo, toner_padrao)), modelos(fabricante, modelo, toner_padrao)")
      .order("data_agendada", { ascending: false })).data ?? [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("nome")).data ?? [],
  });
  const { data: equipamentos = [] } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => (await supabase.from("equipamentos").select("*, modelos(id, fabricante, modelo, toner_padrao)").order("patrimonio")).data ?? [],
  });
  const { data: modelos = [] } = useQuery({
    queryKey: ["modelos"],
    queryFn: async () => (await supabase.from("modelos").select("*").order("modelo")).data ?? [],
  });
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["profiles-lista"],
    queryFn: async () => (await supabase.from("profiles").select("id, nome").order("nome")).data ?? [],
  });

  const equipFiltrados = form.cliente_id ? equipamentos.filter((e: any) => e.cliente_id === form.cliente_id) : equipamentos;

  const tonerSugerido = useMemo(() => {
    if (form.equipamento_id) {
      const eq = equipamentos.find((e: any) => e.id === form.equipamento_id);
      return eq?.modelos?.toner_padrao ?? "";
    }
    if (form.modelo_id) {
      const m = (modelos as any[]).find((mm) => mm.id === form.modelo_id);
      return m?.toner_padrao ?? "";
    }
    return "";
  }, [form.equipamento_id, form.modelo_id, equipamentos, modelos]);

  const aplicarSugestao = () => {
    if (!tonerSugerido) { toast.info("Nenhum toner padrão cadastrado para este modelo."); return; }
    setForm((f: any) => ({
      ...f,
      toner_sugerido: tonerSugerido,
      itens: [{ descricao: tonerSugerido, quantidade: 1 }, ...f.itens.filter((i: ItemEntrega) => i.descricao !== tonerSugerido)],
    }));
    toast.success(`Sugestão aplicada: ${tonerSugerido}`);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        numero: form.numero,
        cliente_id: form.cliente_id || null,
        equipamento_id: form.equipamento_id || null,
        modelo_id: form.modelo_id || null,
        tecnico_id: form.tecnico_id || null,
        data_agendada: form.data_agendada,
        status: form.status,
        observacoes: form.observacoes || null,
        toner_sugerido: form.toner_sugerido || null,
        itens: form.itens,
        criado_por: user?.id ?? null,
      };
      if (editing) {
        const { error } = await (supabase.from as any)("entregas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("entregas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Entrega salva");
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["rota-entregas"] });
      setOpen(false); setEditing(null); reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from as any)("entregas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Entrega removida"); qc.invalidateQueries({ queryKey: ["entregas"] }); qc.invalidateQueries({ queryKey: ["rota-entregas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      numero: e.numero, cliente_id: e.cliente_id ?? "", equipamento_id: e.equipamento_id ?? "",
      modelo_id: e.modelo_id ?? "", tecnico_id: e.tecnico_id ?? "",
      data_agendada: e.data_agendada, status: e.status, observacoes: e.observacoes ?? "",
      toner_sugerido: e.toner_sugerido ?? "",
      itens: Array.isArray(e.itens) ? e.itens : [],
    });
    setOpen(true);
  };

  const addItem = () => setForm((f: any) => ({ ...f, itens: [...f.itens, { descricao: "", quantidade: 1 }] }));
  const updateItem = (i: number, patch: Partial<ItemEntrega>) =>
    setForm((f: any) => ({ ...f, itens: f.itens.map((it: ItemEntrega, ix: number) => ix === i ? { ...it, ...patch } : it) }));
  const removeItem = (i: number) => setForm((f: any) => ({ ...f, itens: f.itens.filter((_: any, ix: number) => ix !== i) }));

  const entregasFiltradas = useMemo(() => (entregas as any[]).filter((e) => {
    if (filtroData && e.data_agendada !== filtroData) return false;
    if (filtroStatus !== "all" && e.status !== filtroStatus) return false;
    return true;
  }), [entregas, filtroData, filtroStatus]);

  const tecnicoNome = (id: string | null) => (tecnicos as any[]).find((t) => t.id === id)?.nome ?? "—";

  return (
    <>
      <PageHeader
        title="Entregas"
        description="Solicitações de toner e itens que entram na rota do dia para separação."
        actions={podeEditar && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova entrega</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar" : "Nova"} entrega</DialogTitle>
                <DialogDescription>Ao selecionar o equipamento ou modelo, o toner padrão será oferecido como sugestão.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex.: ENT-0001" /></div>
                <div><Label>Data agendada</Label><Input type="date" value={form.data_agendada} onChange={(e) => setForm({ ...form, data_agendada: e.target.value })} /></div>

                <div><Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, equipamento_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.cidade ? ` (${c.cidade})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Equipamento (opcional)</Label>
                  <Select value={form.equipamento_id || "none"} onValueChange={(v) => setForm({ ...form, equipamento_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— não vinculado —</SelectItem>
                      {equipFiltrados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.patrimonio} — {e.modelos?.modelo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div><Label>Modelo (se sem equipamento)</Label>
                  <Select value={form.modelo_id || "none"} onValueChange={(v) => setForm({ ...form, modelo_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— nenhum —</SelectItem>
                      {(modelos as any[]).map((m) => <SelectItem key={m.id} value={m.id}>{m.fabricante} {m.modelo}{m.toner_padrao ? ` · ${m.toner_padrao}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Técnico</Label>
                  <Select value={form.tecnico_id || "none"} onValueChange={(v) => setForm({ ...form, tecnico_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— não atribuído —</SelectItem>
                      {(tecnicos as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 rounded-md border border-dashed border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Itens a entregar</span>
                    <div className="flex gap-2">
                      {tonerSugerido && (
                        <Button type="button" size="sm" variant="outline" onClick={aplicarSugestao}>
                          Sugestão: {tonerSugerido}
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Item</Button>
                    </div>
                  </div>
                  {form.itens.length === 0 && <p className="text-xs text-muted-foreground">Adicione ao menos um item ou aplique a sugestão.</p>}
                  <div className="space-y-2">
                    {form.itens.map((it: ItemEntrega, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="flex-1" placeholder="Descrição (ex.: Toner T06)" value={it.descricao} onChange={(e) => updateItem(i, { descricao: e.target.value })} />
                        <Input className="w-24" type="number" min={1} value={it.quantidade} onChange={(e) => updateItem(i, { quantidade: Number(e.target.value) })} />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div />
                <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={!form.numero || !form.cliente_id || save.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div><Label>Data</Label><Input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} /></div>
          <div className="min-w-[160px]"><Label>Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setFiltroData(""); setFiltroStatus("all"); }}>Limpar</Button>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Número</TableHead><TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead><TableHead>Equipamento / Modelo</TableHead>
            <TableHead>Itens</TableHead><TableHead>Técnico</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entregasFiltradas.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-accent" /> {e.numero}</div>
                </TableCell>
                <TableCell>{new Date(e.data_agendada + "T00:00").toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <div className="font-medium">{e.clientes?.nome ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{[e.clientes?.cidade, e.clientes?.bairro].filter(Boolean).join(" · ")}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {e.equipamentos?.patrimonio ?? "—"} {e.equipamentos?.modelos?.modelo ? `· ${e.equipamentos.modelos.modelo}` : (e.modelos?.modelo ? `· ${e.modelos.modelo}` : "")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(e.itens) ? e.itens : []).map((it: any, i: number) => (
                      <Badge key={i} variant="secondary">{it.descricao} ×{it.quantidade ?? 1}</Badge>
                    ))}
                    {(!Array.isArray(e.itens) || e.itens.length === 0) && e.toner_sugerido && <Badge variant="outline">Sugerido: {e.toner_sugerido}</Badge>}
                  </div>
                </TableCell>
                <TableCell>{tecnicoNome(e.tecnico_id)}</TableCell>
                <TableCell><Badge className={STATUS_COLOR[e.status] ?? ""} variant="outline">{STATUS_LABEL[e.status] ?? e.status}</Badge></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {podeEditar && <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>}
                  {(isAdmin || isGestor) && (
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover entrega?")) del.mutate(e.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {entregasFiltradas.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma entrega.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
