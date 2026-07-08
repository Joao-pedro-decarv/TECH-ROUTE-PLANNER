import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, CheckCircle2, FileDown, Play, Pause, Square, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { exportTechnicalReportPDF } from "@/lib/export";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";

export const Route = createFileRoute("/_authenticated/os")({ component: OSPage });

const TIPOS = ["PREVENTIVA", "START", "ESTOQUE", "NORMAL", "REINCIDENTE", "MAU_USO"] as const;
const TIPO_COLORS: Record<string, string> = {
  PREVENTIVA: "bg-success/20 text-success-foreground border-success/40",
  START: "bg-accent/20 text-accent-foreground border-accent/40",
  ESTOQUE: "bg-secondary text-secondary-foreground",
  NORMAL: "bg-muted text-muted-foreground",
  REINCIDENTE: "bg-orange-200 text-orange-900 border-orange-400",
  MAU_USO: "bg-red-200 text-red-900 border-red-400",
};
const STATUS_COLORS: Record<string, string> = {
  aberta: "bg-muted text-muted-foreground",
  em_rota: "bg-accent/30 text-accent-foreground",
  em_execucao: "bg-blue-200 text-blue-900",
  pausada: "bg-yellow-200 text-yellow-900",
  concluida: "bg-success/20 text-success-foreground",
  em_conferencia: "bg-orange-200 text-orange-900",
  finalizada: "bg-success/30 text-success-foreground",
  cancelada: "bg-destructive/20 text-destructive-foreground",
};

function OSPage() {
  const { isGestor, user, canEdit } = useAuth();
  const qc = useQueryClient();

  // ---------- filtros ----------
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [dataDe, setDataDe] = useState<string>("");
  const [dataAte, setDataAte] = useState<string>("");
  const [filtroCidade, setFiltroCidade] = useState<string>("all");
  const [filtroBairro, setFiltroBairro] = useState<string>("all");
  const [filtroRota, setFiltroRota] = useState<string>("all");
  const [filtroTecnico, setFiltroTecnico] = useState<string>("all");

  // ---------- estados de dialog ----------
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    numero: "", tipo: "NORMAL", cliente_id: "", equipamento_id: "", problema_id: "",
    problema_descricao: "", tecnico_id: "", data_agendada: new Date().toISOString().slice(0, 10),
    valor: 0, status: "aberta", descricao_servico: "",
  });

  const [pecasSugeridas, setPecasSugeridas] = useState<{ peca_id: string; descricao: string; quantidade: number; incluir: boolean }[]>([]);
  const [pecasStep, setPecasStep] = useState(false);
  const [pendingOsId, setPendingOsId] = useState<string | null>(null);

  const [fechando, setFechando] = useState<any>(null);
  const [fech, setFech] = useState<any>({
    resultado: "OK_SEM_PECA",
    laudo_tecnico: "", acompanhante: "", endereco_atendimento: "",
    contador_mono: "", contador_color: "", contador_total: "",
    mau_uso_troca: "", mau_uso_defeito: "", mau_uso_como_ocorreu: "",
    mau_uso_responsavel: "", mau_uso_contato: "",
  });
  const sigRef = useRef<SignaturePadHandle>(null);

  // ---------- data ----------
  const { data: osAll = [] } = useQuery({
    queryKey: ["os"],
    queryFn: async () => {
      const [{ data: rows }, { data: profs }] = await Promise.all([
        supabase.from("ordens_servico")
          .select("*, clientes(nome, cidade, bairro, endereco, telefone, contato, rota_id, rotas(id, nome, cor)), equipamentos(patrimonio, numero_serie, modelos(fabricante, modelo)), problemas(descricao), os_pecas(quantidade_prevista, quantidade_usada, pecas(descricao))")
          .order("data_agendada", { ascending: false }),
        supabase.from("profiles").select("id, nome"),
      ]);
      const map = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      return (rows ?? []).map((r: any) => ({ ...r, tecnico_nome: r.tecnico_id ? map.get(r.tecnico_id) : null }));
    },
  });
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => (await supabase.from("clientes").select("*, rotas(id, nome, cor)").order("nome")).data ?? [] });
  const { data: equipamentos = [] } = useQuery({ queryKey: ["equipamentos"], queryFn: async () => (await supabase.from("equipamentos").select("*, modelos(id, fabricante, modelo)").order("patrimonio")).data ?? [] });
  const { data: rotasList = [] } = useQuery({ queryKey: ["rotas"], queryFn: async () => (await (supabase.from as any)("rotas").select("id, nome, cor").order("nome")).data ?? [] });
  const { data: problemas = [] } = useQuery({
    queryKey: ["problemas-por-modelo", form.equipamento_id],
    enabled: !!form.equipamento_id,
    queryFn: async () => {
      const eq = equipamentos.find((e: any) => e.id === form.equipamento_id);
      if (!eq) return [];
      return (await supabase.from("problemas").select("id, descricao").eq("modelo_id", eq.modelo_id)).data ?? [];
    },
  });
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["lista-tecnicos"],
    queryFn: async () => (await supabase.from("profiles").select("id, nome")).data ?? [],
  });

  const cidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (clientes as any[]).forEach((c) => { if (c.cidade) set.add(c.cidade); });
    return Array.from(set).sort();
  }, [clientes]);

  const bairrosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    (clientes as any[]).forEach((c) => {
      if (c.bairro && (filtroCidade === "all" || c.cidade === filtroCidade)) set.add(c.bairro);
    });
    return Array.from(set).sort();
  }, [clientes, filtroCidade]);

  const os = useMemo(() => {
    return osAll.filter((o: any) => {
      if (!mostrarConcluidas && o.status === "finalizada") return false;
      if (dataDe && o.data_agendada < dataDe) return false;
      if (dataAte && o.data_agendada > dataAte) return false;
      if (filtroCidade !== "all" && (o.clientes?.cidade ?? "") !== filtroCidade) return false;
      if (filtroBairro !== "all" && (o.clientes?.bairro ?? "") !== filtroBairro) return false;
      if (filtroRota !== "all" && (o.clientes?.rota_id ?? "") !== filtroRota) return false;
      if (filtroTecnico !== "all" && o.tecnico_id !== filtroTecnico) return false;
      return true;
    });
  }, [osAll, mostrarConcluidas, dataDe, dataAte, filtroCidade, filtroBairro, filtroRota, filtroTecnico]);

  const equipFiltrados = form.cliente_id ? equipamentos.filter((e: any) => e.cliente_id === form.cliente_id) : equipamentos;

  // ---------- mutations ----------
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form, valor: Number(form.valor),
        tecnico_id: form.tecnico_id || null,
        equipamento_id: form.equipamento_id || null,
        problema_id: form.problema_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("ordens_servico").update(payload).eq("id", editing.id);
        if (error) throw error;
        return { id: editing.id, novo: false };
      } else {
        const { data, error } = await supabase.from("ordens_servico").insert(payload).select("id").single();
        if (error) throw error;
        return { id: data.id, novo: true };
      }
    },
    onSuccess: async ({ id, novo }) => {
      if (novo && form.problema_id) {
        const { data: pps } = await supabase.from("problema_pecas")
          .select("peca_id, quantidade, pecas(descricao)")
          .eq("problema_id", form.problema_id);
        if (pps?.length) {
          setPecasSugeridas(pps.map((p: any) => ({ peca_id: p.peca_id, descricao: p.pecas?.descricao ?? "—", quantidade: p.quantidade, incluir: true })));
          setPendingOsId(id); setPecasStep(true); setOpen(false);
          qc.invalidateQueries({ queryKey: ["os"] });
          return;
        }
      }
      toast.success("OS salva");
      qc.invalidateQueries({ queryKey: ["os"] });
      setOpen(false); setEditing(null); resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({
    numero: "", tipo: "NORMAL", cliente_id: "", equipamento_id: "", problema_id: "",
    problema_descricao: "", tecnico_id: "", data_agendada: new Date().toISOString().slice(0, 10),
    valor: 0, status: "aberta", descricao_servico: "",
  });

  const confirmarPecas = useMutation({
    mutationFn: async () => {
      if (!pendingOsId) return;
      const toInsert = pecasSugeridas.filter((p) => p.incluir).map((p) => ({
        os_id: pendingOsId, peca_id: p.peca_id,
        quantidade_prevista: p.quantidade, quantidade_usada: 0, status: "aprovada" as any,
      }));
      if (toInsert.length) {
        const { error } = await supabase.from("os_pecas").insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Peças aprovadas e adicionadas à OS");
      setPecasStep(false); setPendingOsId(null); setPecasSugeridas([]); resetForm();
      qc.invalidateQueries({ queryKey: ["os"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (o: any) => {
    setEditing(o);
    setForm({
      numero: o.numero, tipo: o.tipo, cliente_id: o.cliente_id, equipamento_id: o.equipamento_id ?? "",
      problema_id: o.problema_id ?? "", problema_descricao: o.problema_descricao ?? "",
      tecnico_id: o.tecnico_id ?? "", data_agendada: o.data_agendada, valor: Number(o.valor ?? 0),
      status: o.status, descricao_servico: o.descricao_servico ?? "",
    });
    setOpen(true);
  };

  // Controle de cronômetro (Iniciar, Pausar, Retomar)
  const iniciar = useMutation({
    mutationFn: async (o: any) => {
      const { error } = await supabase.from("ordens_servico").update({
        status: "em_execucao" as any, iniciada_em: new Date().toISOString(),
      } as any).eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atendimento iniciado"); qc.invalidateQueries({ queryKey: ["os"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const pausar = useMutation({
    mutationFn: async (o: any) => {
      const { error } = await supabase.from("ordens_servico").update({
        status: "pausada" as any, pausada_em: new Date().toISOString(),
      } as any).eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pausado"); qc.invalidateQueries({ queryKey: ["os"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const retomar = useMutation({
    mutationFn: async (o: any) => {
      const min = o.pausada_em ? Math.max(0, Math.round((Date.now() - new Date(o.pausada_em).getTime()) / 60000)) : 0;
      const { error } = await supabase.from("ordens_servico").update({
        status: "em_execucao" as any, pausada_em: null,
        pausa_total_min: (o.pausa_total_min ?? 0) + min,
      } as any).eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Retomado"); qc.invalidateQueries({ queryKey: ["os"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openFechar = (o: any) => {
    setFechando(o);
    setFech({
      resultado: o.resultado ?? "OK_SEM_PECA",
      laudo_tecnico: o.laudo_tecnico ?? o.descricao_servico ?? "",
      acompanhante: o.acompanhante ?? "",
      endereco_atendimento: o.endereco_atendimento ?? o.clientes?.endereco ?? "",
      contador_mono: o.contador_mono ?? "", contador_color: o.contador_color ?? "", contador_total: o.contador_total ?? "",
      mau_uso_troca: o.mau_uso_troca ?? "", mau_uso_defeito: o.mau_uso_defeito ?? "",
      mau_uso_como_ocorreu: o.mau_uso_como_ocorreu ?? "",
      mau_uso_responsavel: o.mau_uso_responsavel ?? "", mau_uso_contato: o.mau_uso_contato ?? "",
    });
  };

  const fechar = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const inicio = fechando.iniciada_em ? new Date(fechando.iniciada_em) : null;
      let execMin: number | null = null;
      let deslocMin: number | null = null;
      if (inicio) {
        const totalMin = Math.max(0, Math.round((now.getTime() - inicio.getTime()) / 60000));
        execMin = Math.max(0, totalMin - (fechando.pausa_total_min ?? 0));
      }
      const payload: any = {
        status: "em_conferencia",
        resultado: fech.resultado,
        laudo_tecnico: fech.laudo_tecnico || null,
        acompanhante: fech.acompanhante || null,
        endereco_atendimento: fech.endereco_atendimento || null,
        assinatura_cliente: sigRef.current?.toDataURL() ?? null,
        contador_mono: fech.contador_mono !== "" ? Number(fech.contador_mono) : null,
        contador_color: fech.contador_color !== "" ? Number(fech.contador_color) : null,
        contador_total: fech.contador_total !== "" ? Number(fech.contador_total) : null,
        tempo_execucao_min: execMin,
        tempo_deslocamento_min: deslocMin,
        finalizada_em: now.toISOString(),
        data_conclusao: now.toISOString(),
      };
      if (fechando.tipo === "MAU_USO") {
        Object.assign(payload, {
          mau_uso_troca: fech.mau_uso_troca || null,
          mau_uso_defeito: fech.mau_uso_defeito || null,
          mau_uso_como_ocorreu: fech.mau_uso_como_ocorreu || null,
          mau_uso_responsavel: fech.mau_uso_responsavel || null,
          mau_uso_contato: fech.mau_uso_contato || null,
        });
      }
      const { error } = await supabase.from("ordens_servico").update(payload).eq("id", fechando.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OS fechada — aguardando conferência do gestor");
      qc.invalidateQueries({ queryKey: ["os"] });
      setFechando(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("os_pecas").delete().eq("os_id", id);
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("OS excluída"); qc.invalidateQueries({ queryKey: ["os"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const gerarRelatorio = async (o: any) => {
    const { data: pecas } = await supabase.from("os_pecas")
      .select("quantidade_prevista, quantidade_usada, pecas(descricao)")
      .eq("os_id", o.id);
    exportTechnicalReportPDF({
      numero: o.numero, tipo: o.tipo, data_agendada: o.data_agendada, finalizada_em: o.finalizada_em,
      iniciada_em: o.iniciada_em,
      cliente: o.clientes?.nome,
      cliente_endereco: o.endereco_atendimento || o.clientes?.endereco,
      cliente_cidade: o.clientes?.cidade,
      cliente_telefone: o.clientes?.telefone, cliente_contato: o.clientes?.contato,
      patrimonio: o.equipamentos?.patrimonio,
      numero_serie: o.equipamentos?.numero_serie,
      modelo: `${o.equipamentos?.modelos?.fabricante ?? ""} ${o.equipamentos?.modelos?.modelo ?? ""}`.trim(),
      problema: o.problemas?.descricao ?? o.problema_descricao,
      servico: o.laudo_tecnico ?? o.descricao_servico,
      tecnico: o.tecnico_nome,
      acompanhante: o.acompanhante,
      resultado: o.resultado, custo: o.custo,
      tempo_deslocamento_min: o.tempo_deslocamento_min, tempo_execucao_min: o.tempo_execucao_min,
      contador_mono: o.contador_mono, contador_color: o.contador_color, contador_total: o.contador_total,
      satisfacao_nota: o.satisfacao_nota, satisfacao_observacao: o.satisfacao_observacao,
      assinatura_cliente: o.assinatura_cliente,
      observacoes_finais: o.observacoes_finais,
      pecas: (pecas ?? []).map((p: any) => ({ descricao: p.pecas?.descricao ?? "—", quantidade: p.quantidade_usada || p.quantidade_prevista })),
      mauUso: o.tipo === "MAU_USO" ? {
        troca: o.mau_uso_troca, defeito: o.mau_uso_defeito, como: o.mau_uso_como_ocorreu,
        responsavel: o.mau_uso_responsavel, contato: o.mau_uso_contato,
      } : null,
    });
  };

  const podeEditar = isGestor || canEdit("os");

  return (
    <>
      <PageHeader title="Ordens de Serviço" description={isGestor ? "Todas as OS do sistema." : "Suas OS atribuídas."}
        actions={podeEditar && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova OS</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} OS</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                <div><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, equipamento_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.cidade ? ` (${c.cidade})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Equipamento</Label>
                  <Select value={form.equipamento_id} onValueChange={(v) => setForm({ ...form, equipamento_id: v, problema_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{equipFiltrados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.patrimonio} — {e.modelos?.modelo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Problema (catálogo)</Label>
                  <Select value={form.problema_id} onValueChange={(v) => setForm({ ...form, problema_id: v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{problemas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Técnico</Label>
                  <Select value={form.tecnico_id} onValueChange={(v) => setForm({ ...form, tecnico_id: v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>{tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={form.data_agendada} onChange={(e) => setForm({ ...form, data_agendada: e.target.value })} /></div>
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div className="col-span-2"><Label>Descrição do problema (livre)</Label><Textarea value={form.problema_descricao} onChange={(e) => setForm({ ...form, problema_descricao: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.numero || !form.cliente_id}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div><Label>De</Label><Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} /></div>
          <div><Label>Até</Label><Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} /></div>
          <div className="min-w-[160px]"><Label>Cidade</Label>
            <Select value={filtroCidade} onValueChange={(v) => { setFiltroCidade(v); setFiltroBairro("all"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {cidadesDisponiveis.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]"><Label>Bairro</Label>
            <Select value={filtroBairro} onValueChange={setFiltroBairro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {bairrosDisponiveis.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]"><Label>Rota</Label>
            <Select value={filtroRota} onValueChange={setFiltroRota}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(rotasList as any[]).map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isGestor && (
            <div className="min-w-[180px]"><Label>Técnico</Label>
              <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox checked={mostrarConcluidas} onCheckedChange={(v) => setMostrarConcluidas(!!v)} />
            Mostrar OS concluídas
          </label>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setDataDe(""); setDataAte(""); setFiltroCidade("all"); setFiltroBairro("all"); setFiltroRota("all"); setFiltroTecnico("all"); setMostrarConcluidas(false); }}>
            Limpar filtros
          </Button>
        </CardContent>
      </Card>

      {/* Modal peças */}
      <Dialog open={pecasStep} onOpenChange={(o) => { if (!o) { setPecasStep(false); setPendingOsId(null); setPecasSugeridas([]); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Peças sugeridas para o problema</DialogTitle>
            <DialogDescription>Marque as peças que devem ser adicionadas a esta OS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-auto">
            {pecasSugeridas.map((p, i) => (
              <div key={p.peca_id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <Checkbox checked={p.incluir} onCheckedChange={(v) => setPecasSugeridas((s) => s.map((x, ix) => ix === i ? { ...x, incluir: !!v } : x))} />
                <div className="flex-1"><div className="font-medium text-sm">{p.descricao}</div></div>
                <Input type="number" className="w-20" value={p.quantidade} min={1}
                  onChange={(e) => setPecasSugeridas((s) => s.map((x, ix) => ix === i ? { ...x, quantidade: Number(e.target.value) } : x))} />
              </div>
            ))}
            {pecasSugeridas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma peça cadastrada para este problema.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPecasStep(false); setPendingOsId(null); resetForm(); toast.info("OS criada sem peças"); }}>Pular</Button>
            <Button onClick={() => confirmarPecas.mutate()} disabled={confirmarPecas.isPending}>Aprovar peças</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal fechamento (técnico) */}
      <Dialog open={!!fechando} onOpenChange={(o) => { if (!o) setFechando(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fechar OS {fechando?.numero}</DialogTitle>
            <DialogDescription>Preencha o laudo e colete a assinatura do cliente. O gestor fará a conferência.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Resultado</Label>
              <Select value={fech.resultado} onValueChange={(v) => setFech({ ...fech, resultado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK_COM_PECA">OK c/ peça</SelectItem>
                  <SelectItem value="OK_SEM_PECA">OK s/ peça</SelectItem>
                  <SelectItem value="NECESSARIO_RETORNO">Necessário retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Laudo técnico (o que foi feito)</Label>
              <Textarea rows={4} value={fech.laudo_tecnico} onChange={(e) => setFech({ ...fech, laudo_tecnico: e.target.value })} />
            </div>
            <div><Label>Acompanhante (quem acompanhou)</Label>
              <Input value={fech.acompanhante} onChange={(e) => setFech({ ...fech, acompanhante: e.target.value })} />
            </div>
            <div><Label>Endereço do atendimento</Label>
              <Input value={fech.endereco_atendimento} onChange={(e) => setFech({ ...fech, endereco_atendimento: e.target.value })} />
            </div>
            <div><Label>Contador mono</Label><Input type="number" value={fech.contador_mono} onChange={(e) => setFech({ ...fech, contador_mono: e.target.value })} /></div>
            <div><Label>Contador color</Label><Input type="number" value={fech.contador_color} onChange={(e) => setFech({ ...fech, contador_color: e.target.value })} /></div>
            <div className="col-span-2"><Label>Contador total</Label><Input type="number" value={fech.contador_total} onChange={(e) => setFech({ ...fech, contador_total: e.target.value })} /></div>

            {fechando?.tipo === "MAU_USO" && (
              <div className="col-span-2 rounded-md border border-orange-300 bg-orange-50 p-4 space-y-3">
                <div className="font-medium text-orange-900">Registro de Mau Uso</div>
                <div><Label>Peça danificada foi trocada?</Label>
                  <Select value={fech.mau_uso_troca} onValueChange={(v) => setFech({ ...fech, mau_uso_troca: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Qual o defeito?</Label><Textarea rows={2} value={fech.mau_uso_defeito} onChange={(e) => setFech({ ...fech, mau_uso_defeito: e.target.value })} /></div>
                <div><Label>Como ocorreu?</Label><Textarea rows={2} value={fech.mau_uso_como_ocorreu} onChange={(e) => setFech({ ...fech, mau_uso_como_ocorreu: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Responsável</Label><Input value={fech.mau_uso_responsavel} onChange={(e) => setFech({ ...fech, mau_uso_responsavel: e.target.value })} /></div>
                  <div><Label>Contato (opcional)</Label><Input value={fech.mau_uso_contato} onChange={(e) => setFech({ ...fech, mau_uso_contato: e.target.value })} /></div>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <Label>Assinatura do cliente</Label>
              <SignaturePad ref={sigRef} initial={fechando?.assinatura_cliente ?? null} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => fechar.mutate()} disabled={fechar.isPending}>Fechar OS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Número</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead><TableHead>Cidade</TableHead>
            <TableHead>Equipamento</TableHead><TableHead>Técnico</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {os.map((o: any) => {
              const minhaOs = o.tecnico_id === user?.id;
              const podeAcoesTec = isGestor || minhaOs || canEdit("os");
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.numero}</TableCell>
                  <TableCell><Badge className={TIPO_COLORS[o.tipo]} variant="outline">{o.tipo}</Badge></TableCell>
                  <TableCell>{new Date(o.data_agendada + "T00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{o.clientes?.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{o.clientes?.cidade ?? "—"}</TableCell>
                  <TableCell>{o.equipamentos?.patrimonio} {o.equipamentos?.modelos?.modelo && `— ${o.equipamentos.modelos.modelo}`}</TableCell>
                  <TableCell>{o.tecnico_nome ?? "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[o.status]} variant="outline">{o.status}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {podeAcoesTec && (o.status === "aberta" || o.status === "em_rota") && (
                      <Button size="icon" variant="ghost" title="Iniciar atendimento" onClick={() => iniciar.mutate(o)}>
                        <Play className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {podeAcoesTec && o.status === "em_execucao" && (
                      <>
                        <Button size="icon" variant="ghost" title="Pausar" onClick={() => pausar.mutate(o)}>
                          <Pause className="h-4 w-4 text-yellow-600" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Fechar OS" onClick={() => openFechar(o)}>
                          <Square className="h-4 w-4 text-success" />
                        </Button>
                      </>
                    )}
                    {podeAcoesTec && o.status === "pausada" && (
                      <Button size="icon" variant="ghost" title="Retomar" onClick={() => retomar.mutate(o)}>
                        <RotateCcw className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {isGestor && <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>}
                    {(o.status === "em_conferencia" || o.status === "finalizada") && (
                      <Button size="icon" variant="ghost" title="Relatório técnico (PDF)" onClick={() => gerarRelatorio(o)}><FileDown className="h-4 w-4" /></Button>
                    )}
                    {isGestor && o.status === "em_conferencia" && (
                      <Button size="icon" variant="ghost" title="Ir para conferência" asChild>
                        <a href="/conferencia"><CheckCircle2 className="h-4 w-4 text-orange-600" /></a>
                      </Button>
                    )}
                    {isGestor && (
                      <Button size="icon" variant="ghost" title="Excluir OS (apenas gestor)" onClick={() => { if (confirm(`Excluir OS ${o.numero}? Esta ação é permanente.`)) excluir.mutate(o.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {os.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma OS com os filtros aplicados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
