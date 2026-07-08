import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/equipamentos/$id/historico")({ component: HistoricoPage });

function HistoricoPage() {
  const { id } = Route.useParams();

  const { data: equip } = useQuery({
    queryKey: ["equip", id],
    queryFn: async () => (await supabase.from("equipamentos").select("*, modelos(fabricante, modelo), clientes(nome)").eq("id", id).maybeSingle()).data,
  });
  const { data: os = [] } = useQuery({
    queryKey: ["historico-equip", id],
    queryFn: async () => {
      const { data } = await supabase.from("ordens_servico")
        .select("*, problemas(descricao), os_pecas(quantidade_prevista, quantidade_usada, pecas(descricao))")
        .eq("equipamento_id", id)
        .order("data_agendada", { ascending: false });
      const { data: profs } = await supabase.from("profiles").select("id, nome");
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.nome]));
      return (data ?? []).map((o: any) => ({ ...o, tecnico_nome: o.tecnico_id ? map.get(o.tecnico_id) : "—" }));
    },
  });

  const rows = os.map((o: any) => ({
    data: new Date(o.data_agendada + "T00:00").toLocaleDateString("pt-BR"),
    numero: o.numero, tipo: o.tipo, status: o.status,
    problema: o.problemas?.descricao ?? o.problema_descricao ?? "",
    servico: o.descricao_servico ?? "",
    pecas: (o.os_pecas ?? []).map((p: any) => `${p.pecas?.descricao} ×${p.quantidade_usada || p.quantidade_prevista}`).join("; "),
    resultado: o.resultado ?? "",
    custo: o.custo != null ? Number(o.custo).toFixed(2) : "",
    tecnico: o.tecnico_nome ?? "",
  }));

  const cols = [
    { header: "Data", key: "data" }, { header: "OS", key: "numero" }, { header: "Tipo", key: "tipo" },
    { header: "Problema", key: "problema" }, { header: "Serviço", key: "servico" }, { header: "Peças", key: "pecas" },
    { header: "Resultado", key: "resultado" }, { header: "Custo", key: "custo" }, { header: "Técnico", key: "tecnico" },
  ];
  const filename = `historico-${equip?.patrimonio ?? id}`;
  const title = `Histórico ${equip?.patrimonio ?? ""} - ${equip?.modelos?.fabricante ?? ""} ${equip?.modelos?.modelo ?? ""}`;

  return (
    <>
      <PageHeader title={`Histórico ${equip?.patrimonio ?? ""}`}
        description={equip ? `${equip.clientes?.nome} · ${equip.modelos?.fabricante} ${equip.modelos?.modelo}` : ""}
        actions={<>
          <Button variant="outline" asChild><Link to="/equipamentos"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link></Button>
          <Button variant="outline" onClick={() => exportToPDF(title, cols, rows, filename)}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
          <Button variant="outline" onClick={() => exportToExcel("Histórico", cols, rows, filename)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
        </>}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>OS</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Problema</TableHead><TableHead>Peças</TableHead>
            <TableHead>Resultado</TableHead><TableHead>Técnico</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {os.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell>{new Date(o.data_agendada + "T00:00").toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="font-medium">{o.numero}</TableCell>
                <TableCell><Badge variant="outline">{o.tipo}</Badge></TableCell>
                <TableCell>{o.problemas?.descricao ?? o.problema_descricao ?? "—"}</TableCell>
                <TableCell className="text-xs">{(o.os_pecas ?? []).map((p: any) => `${p.pecas?.descricao} ×${p.quantidade_usada || p.quantidade_prevista}`).join(", ") || "—"}</TableCell>
                <TableCell>{o.resultado ? <Badge>{o.resultado}</Badge> : "—"}</TableCell>
                <TableCell>{o.tecnico_nome}</TableCell>
              </TableRow>
            ))}
            {os.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sem histórico.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
