import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export";
import { startOfMonth, endOfMonth, format, formatISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/rendimento")({
  component: RendimentoPage,
});

function RendimentoPage() {
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));

  const inicio = formatISO(startOfMonth(new Date(mes + "-01")), { representation: "date" });
  const fim = formatISO(endOfMonth(new Date(mes + "-01")), { representation: "date" });

  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: async () => (await supabase.from("profiles").select("id, nome")).data ?? [] });
  const { data: os = [] } = useQuery({
    queryKey: ["os-mes", inicio, fim],
    queryFn: async () => (await supabase.from("ordens_servico").select("*").gte("data_agendada", inicio).lte("data_agendada", fim)).data ?? [],
  });
  const { data: reducao = [] } = useQuery({
    queryKey: ["red-mes", inicio, fim],
    queryFn: async () => (await supabase.from("reducao_custo").select("*").gte("data", inicio).lte("data", fim)).data ?? [],
  });
  const { data: preventivas = [] } = useQuery({
    queryKey: ["prev-mes", inicio, fim],
    queryFn: async () => (await supabase.from("preventivas").select("*").gte("data_execucao", inicio).lte("data_execucao", fim)).data ?? [],
  });

  const linhas = useMemo(() => {
    return profiles.map((p: any) => {
      const suas = os.filter((o: any) => o.tecnico_id === p.id);
      const concluidas = suas.filter((o: any) => o.status === "concluida");
      const valor = concluidas.reduce((s: number, o: any) => s + Number(o.valor ?? 0), 0);
      const red = reducao.filter((r: any) => r.tecnico_id === p.id).reduce((s: number, r: any) => s + Number(r.valor), 0);
      const prev = preventivas.filter((r: any) => r.tecnico_id === p.id).length;
      return { tecnico: p.nome, total_os: suas.length, concluidas: concluidas.length, valor, preventivas: prev, reducao: red };
    }).filter((l) => l.total_os > 0 || l.reducao > 0 || l.preventivas > 0);
  }, [profiles, os, reducao, preventivas]);

  const exportar = (tipo: "pdf" | "xlsx") => {
    const cols = [
      { header: "Técnico", key: "tecnico" }, { header: "OS totais", key: "total_os" },
      { header: "Concluídas", key: "concluidas" }, { header: "Valor OS (R$)", key: "valor" },
      { header: "Preventivas", key: "preventivas" }, { header: "Redução (R$)", key: "reducao" },
    ];
    const rows = linhas.map((l) => ({ ...l, valor: l.valor.toFixed(2), reducao: l.reducao.toFixed(2) }));
    const fname = `rendimento-${mes}`;
    if (tipo === "pdf") exportToPDF(`Rendimento ${mes}`, cols, rows, fname);
    else exportToExcel("Rendimento", cols, rows, fname);
  };

  const totalValor = linhas.reduce((s, l) => s + l.valor, 0);
  const totalRed = linhas.reduce((s, l) => s + l.reducao, 0);

  return (
    <>
      <PageHeader title="Rendimento mensal" description="Soma dos valores das OS concluídas por técnico e redução de custo lançada no mês." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><Label>Mês</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => exportar("pdf")}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
          <Button variant="outline" onClick={() => exportar("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturamento total do mês</CardTitle></CardHeader><CardContent><div className="font-display text-3xl font-semibold">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Redução de custo total</CardTitle></CardHeader><CardContent><div className="font-display text-3xl font-semibold text-accent-foreground">R$ {totalRed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Técnico</TableHead><TableHead className="text-right">OS</TableHead><TableHead className="text-right">Concluídas</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Preventivas</TableHead><TableHead className="text-right">Redução</TableHead></TableRow></TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.tecnico}>
                <TableCell className="font-medium">{l.tecnico}</TableCell>
                <TableCell className="text-right">{l.total_os}</TableCell>
                <TableCell className="text-right">{l.concluidas}</TableCell>
                <TableCell className="text-right">R$ {l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">{l.preventivas}</TableCell>
                <TableCell className="text-right">R$ {l.reducao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
            {linhas.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sem dados neste mês.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
