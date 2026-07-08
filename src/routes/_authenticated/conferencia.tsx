import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, RotateCcw, FileDown, Star } from "lucide-react";
import { exportTechnicalReportPDF } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/conferencia")({ component: ConferenciaPage });

const RESULTADO_LABEL: Record<string, string> = {
  OK_COM_PECA: "OK c/ peça", OK_SEM_PECA: "OK s/ peça", NECESSARIO_RETORNO: "Necessário retorno",
};

function ConferenciaPage() {
  const { canView, isGestor } = useAuth();
  const qc = useQueryClient();
  const [conf, setConf] = useState<any>(null);
  const [nota, setNota] = useState<number>(5);
  const [obs, setObs] = useState<string>("");

  const { data: os = [] } = useQuery({
    queryKey: ["conferencia"],
    queryFn: async () => {
      const { data } = await supabase.from("ordens_servico")
        .select("*, clientes(nome, cidade, endereco, telefone, contato), equipamentos(patrimonio, numero_serie, modelos(fabricante, modelo)), problemas(descricao)")
        .eq("status", "em_conferencia" as any)
        .order("finalizada_em", { ascending: false });
      const { data: profs } = await supabase.from("profiles").select("id, nome");
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.nome]));
      return (data ?? []).map((o: any) => ({ ...o, tecnico_nome: o.tecnico_id ? map.get(o.tecnico_id) : "—" }));
    },
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ordens_servico").update({
        status: "finalizada" as any,
        satisfacao_nota: nota,
        satisfacao_observacao: obs || null,
      } as any).eq("id", conf.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("OS finalizada"); qc.invalidateQueries({ queryKey: ["conferencia"] }); qc.invalidateQueries({ queryKey: ["os"] }); setConf(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const reabrir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ordens_servico").update({ status: "aberta" as any, resultado: null, finalizada_em: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("OS reaberta"); qc.invalidateQueries({ queryKey: ["conferencia"] }); qc.invalidateQueries({ queryKey: ["os"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const gerarRelatorio = async (o: any) => {
    const { data: pecas } = await supabase.from("os_pecas")
      .select("quantidade_prevista, quantidade_usada, pecas(descricao)")
      .eq("os_id", o.id);
    exportTechnicalReportPDF({
      numero: o.numero, tipo: o.tipo, data_agendada: o.data_agendada,
      iniciada_em: o.iniciada_em, finalizada_em: o.finalizada_em,
      cliente: o.clientes?.nome, cliente_cidade: o.clientes?.cidade,
      cliente_endereco: o.endereco_atendimento || o.clientes?.endereco,
      cliente_telefone: o.clientes?.telefone, cliente_contato: o.clientes?.contato,
      patrimonio: o.equipamentos?.patrimonio, numero_serie: o.equipamentos?.numero_serie,
      modelo: `${o.equipamentos?.modelos?.fabricante ?? ""} ${o.equipamentos?.modelos?.modelo ?? ""}`.trim(),
      problema: o.problemas?.descricao ?? o.problema_descricao,
      servico: o.laudo_tecnico ?? o.descricao_servico,
      tecnico: o.tecnico_nome, acompanhante: o.acompanhante,
      resultado: o.resultado, custo: o.custo,
      tempo_execucao_min: o.tempo_execucao_min, tempo_deslocamento_min: o.tempo_deslocamento_min,
      contador_mono: o.contador_mono, contador_color: o.contador_color, contador_total: o.contador_total,
      satisfacao_nota: o.satisfacao_nota, satisfacao_observacao: o.satisfacao_observacao,
      assinatura_cliente: o.assinatura_cliente, observacoes_finais: o.observacoes_finais,
      pecas: (pecas ?? []).map((p: any) => ({ descricao: p.pecas?.descricao ?? "—", quantidade: p.quantidade_usada || p.quantidade_prevista })),
      mauUso: o.tipo === "MAU_USO" ? {
        troca: o.mau_uso_troca, defeito: o.mau_uso_defeito, como: o.mau_uso_como_ocorreu,
        responsavel: o.mau_uso_responsavel, contato: o.mau_uso_contato,
      } : null,
    });
  };

  const openConf = (o: any) => {
    setConf(o);
    setNota(o.satisfacao_nota ?? 5);
    setObs(o.satisfacao_observacao ?? "");
  };

  if (!canView("conferencia")) return <p className="text-sm text-muted-foreground">Sem permissão.</p>;

  return (
    <>
      <PageHeader title="Conferência / Fechamento"
        description="OS fechadas pelos técnicos aguardando validação do gestor." />

      {/* Dialog de conferência */}
      <Dialog open={!!conf} onOpenChange={(o) => { if (!o) setConf(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conferir OS {conf?.numero}</DialogTitle>
            <DialogDescription>Registre a pesquisa de satisfação e finalize a OS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resultado do técnico</Label>
              <div><Badge variant="outline">{RESULTADO_LABEL[conf?.resultado] ?? conf?.resultado ?? "—"}</Badge></div>
            </div>
            {conf?.laudo_tecnico && (
              <div>
                <Label>Laudo técnico</Label>
                <p className="rounded-md border border-border bg-muted/30 p-2 text-sm">{conf.laudo_tecnico}</p>
              </div>
            )}
            <div>
              <Label>Pesquisa de satisfação (0 – 5)</Label>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setNota(n)}
                    className="p-1 transition-transform hover:scale-110">
                    <Star className={`h-7 w-7 ${n <= nota ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`} />
                  </button>
                ))}
                <button type="button" onClick={() => setNota(0)}
                  className="ml-2 text-xs text-muted-foreground underline">zerar</button>
              </div>
            </div>
            <div>
              <Label>Observação do gestor</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConf(null)}>Cancelar</Button>
            <Button onClick={() => finalizar.mutate()} disabled={finalizar.isPending}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Finalizar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>OS</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente / Equip.</TableHead>
            <TableHead>Técnico</TableHead><TableHead>Fechada em</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {os.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.numero}</TableCell>
                <TableCell><Badge variant="outline">{o.tipo}</Badge></TableCell>
                <TableCell>
                  <div>{o.clientes?.nome} {o.clientes?.cidade && <span className="text-xs text-muted-foreground">· {o.clientes.cidade}</span>}</div>
                  <div className="text-xs text-muted-foreground">{o.equipamentos?.patrimonio} — {o.equipamentos?.modelos?.modelo}</div>
                </TableCell>
                <TableCell>{o.tecnico_nome}</TableCell>
                <TableCell className="text-xs">{o.finalizada_em ? new Date(o.finalizada_em).toLocaleString("pt-BR") : "—"}</TableCell>
                <TableCell><Badge variant={o.resultado === "NECESSARIO_RETORNO" ? "destructive" : "secondary"}>{RESULTADO_LABEL[o.resultado] ?? o.resultado ?? "—"}</Badge></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" title="Relatório PDF" onClick={() => gerarRelatorio(o)}><FileDown className="h-4 w-4" /></Button>
                  {isGestor && <Button size="sm" variant="ghost" onClick={() => openConf(o)}><CheckCircle2 className="mr-1 h-4 w-4" /> Conferir</Button>}
                  {isGestor && <Button size="sm" variant="ghost" onClick={() => reabrir.mutate(o.id)}><RotateCcw className="mr-1 h-4 w-4" /> Reabrir</Button>}
                </TableCell>
              </TableRow>
            ))}
            {os.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma OS aguardando conferência.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
