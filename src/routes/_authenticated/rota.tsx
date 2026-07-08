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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { exportToPDF, exportToExcel, exportRotaSeparacaoPDF, type RotaSeparacaoItem } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/rota")({
  component: RotaPage,
});

function RotaPage() {
  const { isGestor, isEstoquista, user } = useAuth();
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tecFiltro, setTecFiltro] = useState<string>("all");

  // Gestor e estoquista veem tudo; técnico só as próprias
  const podeFiltrarPorTecnico = isGestor || isEstoquista;

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, nome").order("nome")).data ?? [],
  });

  const { data: os = [] } = useQuery({
    queryKey: ["rota", data, tecFiltro, user?.id, podeFiltrarPorTecnico, tecnicos.length],
    queryFn: async () => {
      let query = supabase.from("ordens_servico")
        .select("*, clientes(nome, cidade, bairro), equipamentos(patrimonio, modelos(fabricante, modelo)), problemas(descricao), os_pecas(quantidade_prevista, pecas(descricao))")
        .eq("data_agendada", data)
        .order("numero");
      if (!podeFiltrarPorTecnico) query = query.eq("tecnico_id", user!.id);
      else if (tecFiltro !== "all") query = query.eq("tecnico_id", tecFiltro);
      const { data: rows } = await query;
      const map = new Map((tecnicos as any[]).map((t) => [t.id, t.nome]));
      return (rows ?? []).map((r: any) => ({ ...r, tecnico_nome: r.tecnico_id ? map.get(r.tecnico_id) : null }));
    },
  });

  const { data: entregas = [] } = useQuery({
    queryKey: ["rota-entregas", data, tecFiltro, user?.id, podeFiltrarPorTecnico, tecnicos.length],
    queryFn: async () => {
      let q = (supabase.from as any)("entregas")
        .select("*, clientes(nome, cidade, bairro), equipamentos(patrimonio, modelos(fabricante, modelo)), modelos(fabricante, modelo, toner_padrao)")
        .eq("data_agendada", data)
        .order("numero");
      if (!podeFiltrarPorTecnico) q = q.eq("tecnico_id", user!.id);
      else if (tecFiltro !== "all") q = q.eq("tecnico_id", tecFiltro);
      const { data: rows } = await q;
      const map = new Map((tecnicos as any[]).map((t) => [t.id, t.nome]));
      return (rows ?? []).map((r: any) => ({ ...r, tecnico_nome: r.tecnico_id ? map.get(r.tecnico_id) : null }));
    },
  });

  const consolidado = useMemo(() => {
    const map = new Map<string, number>();
    os.forEach((o: any) => {
      o.os_pecas?.forEach((p: any) => {
        const k = p.pecas?.descricao ?? "—";
        map.set(k, (map.get(k) ?? 0) + p.quantidade_prevista);
      });
    });
    (entregas as any[]).forEach((e) => {
      const itens = Array.isArray(e.itens) ? e.itens : [];
      itens.forEach((it: any) => {
        const k = it.descricao ?? e.toner_sugerido ?? "Toner";
        map.set(k, (map.get(k) ?? 0) + Number(it.quantidade ?? 1));
      });
      if ((!itens.length) && e.toner_sugerido) {
        map.set(e.toner_sugerido, (map.get(e.toner_sugerido) ?? 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([peca, qtd]) => ({ peca, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [os, entregas]);

  const tecnicoSelecionadoNome = tecFiltro === "all" ? null : (tecnicos as any[]).find((t) => t.id === tecFiltro)?.nome ?? null;

  const romaneio = () => {
    const itens: RotaSeparacaoItem[] = [];
    os.forEach((o: any) => {
      (o.os_pecas ?? []).forEach((p: any) => {
        itens.push({
          numero: o.numero, tipo: "OS", cliente: o.clientes?.nome ?? "",
          cidade: o.clientes?.cidade, bairro: o.clientes?.bairro,
          patrimonio: o.equipamentos?.patrimonio,
          modelo: `${o.equipamentos?.modelos?.fabricante ?? ""} ${o.equipamentos?.modelos?.modelo ?? ""}`.trim(),
          tecnico: o.tecnico_nome ?? undefined,
          peca: p.pecas?.descricao ?? "—",
          qtd: p.quantidade_prevista,
        });
      });
      if (!o.os_pecas || o.os_pecas.length === 0) {
        itens.push({
          numero: o.numero, tipo: "OS", cliente: o.clientes?.nome ?? "",
          cidade: o.clientes?.cidade, bairro: o.clientes?.bairro,
          patrimonio: o.equipamentos?.patrimonio,
          modelo: `${o.equipamentos?.modelos?.fabricante ?? ""} ${o.equipamentos?.modelos?.modelo ?? ""}`.trim(),
          tecnico: o.tecnico_nome ?? undefined,
          peca: "— sem peças previstas —", qtd: 0,
        });
      }
    });
    (entregas as any[]).forEach((e) => {
      const its = Array.isArray(e.itens) && e.itens.length ? e.itens : (e.toner_sugerido ? [{ descricao: e.toner_sugerido, quantidade: 1 }] : [{ descricao: "Toner (a definir)", quantidade: 1 }]);
      its.forEach((it: any) => {
        itens.push({
          numero: e.numero, tipo: "ENTREGA", cliente: e.clientes?.nome ?? "",
          cidade: e.clientes?.cidade, bairro: e.clientes?.bairro,
          patrimonio: e.equipamentos?.patrimonio,
          modelo: `${e.equipamentos?.modelos?.fabricante ?? e.modelos?.fabricante ?? ""} ${e.equipamentos?.modelos?.modelo ?? e.modelos?.modelo ?? ""}`.trim(),
          tecnico: e.tecnico_nome ?? undefined,
          peca: it.descricao ?? "Toner",
          qtd: Number(it.quantidade ?? 1),
        });
      });
    });
    exportRotaSeparacaoPDF(data, tecnicoSelecionadoNome, itens);
  };

  const exportar = (tipo: "pdf" | "xlsx") => {
    const cols = [
      { header: "OS", key: "numero" }, { header: "Tipo", key: "tipo" },
      { header: "Cliente", key: "cliente" }, { header: "Patrimônio", key: "patrimonio" },
      { header: "Modelo", key: "modelo" }, { header: "Problema", key: "problema" },
      { header: "Peças previstas", key: "pecas" }, { header: "Técnico", key: "tecnico" },
    ];
    const rows = os.map((o: any) => ({
      numero: o.numero, tipo: o.tipo, cliente: o.clientes?.nome ?? "",
      patrimonio: o.equipamentos?.patrimonio ?? "", modelo: `${o.equipamentos?.modelos?.fabricante ?? ""} ${o.equipamentos?.modelos?.modelo ?? ""}`,
      problema: o.problemas?.descricao ?? o.problema_descricao ?? "",
      pecas: (o.os_pecas ?? []).map((p: any) => `${p.pecas?.descricao} ×${p.quantidade_prevista}`).join("; "),
      tecnico: o.tecnico_nome ?? "",
    }));
    const filename = `rota-${data}${tecnicoSelecionadoNome ? `-${tecnicoSelecionadoNome.replace(/\s+/g, "_")}` : ""}`;
    if (tipo === "pdf") exportToPDF(`Rota do dia ${data}${tecnicoSelecionadoNome ? ` — ${tecnicoSelecionadoNome}` : ""}`, cols, rows, filename);
    else exportToExcel("Rota", cols, rows, filename);
  };

  const exportarPecas = (tipo: "pdf" | "xlsx") => {
    const cols = [{ header: "Peça / Item", key: "peca" }, { header: "Quantidade", key: "qtd" }];
    const filename = `pecas-${data}`;
    if (tipo === "pdf") exportToPDF(`Peças necessárias ${data}`, cols, consolidado, filename);
    else exportToExcel("Peças", cols, consolidado, filename);
  };

  return (
    <>
      <PageHeader title="Rota do dia" description="OS e entregas do dia com peças/itens consolidados para separação." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
        {podeFiltrarPorTecnico && (
          <div className="min-w-[220px]"><Label>Técnico</Label>
            <Select value={tecFiltro} onValueChange={setTecFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={romaneio}><Printer className="mr-2 h-4 w-4" /> Romaneio de separação (PDF)</Button>
          <Button variant="outline" onClick={() => exportar("pdf")}><FileDown className="mr-2 h-4 w-4" /> Rota PDF</Button>
          <Button variant="outline" onClick={() => exportar("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">OS do dia ({os.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>OS</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente / Equip.</TableHead><TableHead>Problema</TableHead><TableHead>Peças</TableHead>{podeFiltrarPorTecnico && <TableHead>Técnico</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {os.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.numero}</TableCell>
                    <TableCell><Badge variant="outline">{o.tipo}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{o.clientes?.nome}</div>
                      <div className="text-xs text-muted-foreground">{o.equipamentos?.patrimonio} — {o.equipamentos?.modelos?.modelo}</div>
                    </TableCell>
                    <TableCell>{o.problemas?.descricao ?? o.problema_descricao ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {o.os_pecas?.map((p: any, i: number) => (
                          <Badge key={i} variant="secondary">{p.pecas?.descricao} ×{p.quantidade_prevista}</Badge>
                        ))}
                        {(!o.os_pecas || o.os_pecas.length === 0) && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    {podeFiltrarPorTecnico && <TableCell>{o.tecnico_nome ?? "—"}</TableCell>}
                  </TableRow>
                ))}
                {os.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sem OS para esta data.</TableCell></TableRow>}
              </TableBody>
            </Table>

            {entregas.length > 0 && (
              <>
                <div className="border-t border-border bg-muted/30 px-4 py-2 text-sm font-medium">Entregas do dia ({entregas.length})</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Entrega</TableHead><TableHead>Cliente / Equip.</TableHead><TableHead>Itens</TableHead>{podeFiltrarPorTecnico && <TableHead>Técnico</TableHead>}</TableRow></TableHeader>
                  <TableBody>
                    {(entregas as any[]).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.numero}</TableCell>
                        <TableCell>
                          <div className="font-medium">{e.clientes?.nome}</div>
                          <div className="text-xs text-muted-foreground">{e.equipamentos?.patrimonio ?? "—"} — {e.equipamentos?.modelos?.modelo ?? e.modelos?.modelo ?? ""}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(e.itens) ? e.itens : []).map((it: any, i: number) => (
                              <Badge key={i} variant="secondary">{it.descricao} ×{it.quantidade ?? 1}</Badge>
                            ))}
                            {(!Array.isArray(e.itens) || e.itens.length === 0) && e.toner_sugerido && (
                              <Badge variant="secondary">{e.toner_sugerido} ×1</Badge>
                            )}
                          </div>
                        </TableCell>
                        {podeFiltrarPorTecnico && <TableCell>{e.tecnico_nome ?? "—"}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Peças a levar</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => exportarPecas("pdf")}><FileDown className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => exportarPecas("xlsx")}><FileSpreadsheet className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {consolidado.length === 0 && <p className="text-sm text-muted-foreground">Sem peças/itens previstos.</p>}
            <div className="space-y-2">
              {consolidado.map((p) => (
                <div key={p.peca} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{p.peca}</span>
                  <Badge>{p.qtd}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
