import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/modelos")({
  component: ModelosPage,
});

function ModelosPage() {
  const qc = useQueryClient();
  const [openModelo, setOpenModelo] = useState(false);
  const [formModelo, setFormModelo] = useState({ fabricante: "", modelo: "", observacoes: "", toner_padrao: "" });

  const [selModelo, setSelModelo] = useState<string | null>(null);
  const [openProb, setOpenProb] = useState(false);
  const [formProb, setFormProb] = useState({ descricao: "" });

  const [openPeca, setOpenPeca] = useState<string | null>(null);
  const [formPeca, setFormPeca] = useState({ peca_id: "", quantidade: 1 });

  const { data: modelos = [] } = useQuery({
    queryKey: ["modelos"],
    queryFn: async () => (await supabase.from("modelos").select("*").order("modelo")).data ?? [],
  });
  const { data: problemas = [] } = useQuery({
    queryKey: ["problemas", selModelo],
    enabled: !!selModelo,
    queryFn: async () => (await supabase.from("problemas").select("*, problema_pecas(id, quantidade, pecas(id, descricao))").eq("modelo_id", selModelo!)).data ?? [],
  });
  const { data: pecas = [] } = useQuery({
    queryKey: ["pecas"],
    queryFn: async () => (await supabase.from("pecas").select("*").order("descricao")).data ?? [],
  });

  const saveModelo = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("modelos").insert(formModelo as any); if (error) throw error; },
    onSuccess: () => { toast.success("Modelo criado"); qc.invalidateQueries({ queryKey: ["modelos"] }); setOpenModelo(false); setFormModelo({ fabricante: "", modelo: "", observacoes: "", toner_padrao: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delModelo = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("modelos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["modelos"] }); if (selModelo) setSelModelo(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProb = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("problemas").insert({ modelo_id: selModelo!, descricao: formProb.descricao }); if (error) throw error; },
    onSuccess: () => { toast.success("Problema criado"); qc.invalidateQueries({ queryKey: ["problemas", selModelo] }); setOpenProb(false); setFormProb({ descricao: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delProb = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("problemas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["problemas", selModelo] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addPeca = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("problema_pecas").insert({ problema_id: openPeca!, peca_id: formPeca.peca_id, quantidade: Number(formPeca.quantidade) }); if (error) throw error; },
    onSuccess: () => { toast.success("Peça vinculada"); qc.invalidateQueries({ queryKey: ["problemas", selModelo] }); setOpenPeca(null); setFormPeca({ peca_id: "", quantidade: 1 }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delPeca = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("problema_pecas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["problemas", selModelo] }),
  });

  return (
    <>
      <PageHeader title="Modelos & Problemas" description="Cadastre modelos e problemas com peças padrão que devem sempre acompanhar o técnico."
        actions={
          <Dialog open={openModelo} onOpenChange={setOpenModelo}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo modelo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo modelo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Fabricante</Label><Input value={formModelo.fabricante} onChange={(e) => setFormModelo({ ...formModelo, fabricante: e.target.value })} placeholder="Canon, HP, Xerox…" /></div>
                <div><Label>Modelo</Label><Input value={formModelo.modelo} onChange={(e) => setFormModelo({ ...formModelo, modelo: e.target.value })} placeholder="1643" /></div>
                <div><Label>Toner padrão</Label><Input value={formModelo.toner_padrao} onChange={(e) => setFormModelo({ ...formModelo, toner_padrao: e.target.value })} placeholder="Ex.: T06, TN-B023, CF283A" /></div>
                <p className="text-xs text-muted-foreground">O toner padrão será sugerido automaticamente ao criar uma entrega para equipamentos deste modelo.</p>
              </div>
              <DialogFooter><Button onClick={() => saveModelo.mutate()} disabled={!formModelo.modelo}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Modelos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Fabricante</TableHead><TableHead>Modelo</TableHead><TableHead>Toner padrão</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {modelos.map((m: any) => (
                  <TableRow key={m.id} onClick={() => setSelModelo(m.id)} className={`cursor-pointer ${selModelo === m.id ? "bg-accent/20" : ""}`}>
                    <TableCell>{m.fabricante}</TableCell>
                    <TableCell className="font-medium">{m.modelo}</TableCell>
                    <TableCell className="text-muted-foreground">{m.toner_padrao ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); confirm("Remover modelo?") && delModelo.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Problemas do modelo</CardTitle>
            {selModelo && (
              <Dialog open={openProb} onOpenChange={setOpenProb}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3 w-3" /> Problema</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo problema</DialogTitle></DialogHeader>
                  <div><Label>Descrição</Label><Input value={formProb.descricao} onChange={(e) => setFormProb({ descricao: e.target.value })} placeholder="atolamento de papel" /></div>
                  <DialogFooter><Button onClick={() => saveProb.mutate()} disabled={!formProb.descricao}>Salvar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selModelo && <p className="text-sm text-muted-foreground">Selecione um modelo para gerenciar seus problemas.</p>}
            {selModelo && problemas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum problema cadastrado.</p>}
            <div className="space-y-3">
              {problemas.map((p: any) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{p.descricao}</div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setOpenPeca(p.id)}><Plus className="mr-1 h-3 w-3" /> Peça</Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && delProb.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.problema_pecas?.map((pp: any) => (
                      <Badge key={pp.id} variant="secondary" className="gap-1">
                        {pp.pecas?.descricao} × {pp.quantidade}
                        <button onClick={() => delPeca.mutate(pp.id)} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
                      </Badge>
                    ))}
                    {(!p.problema_pecas || p.problema_pecas.length === 0) && <span className="text-xs text-muted-foreground">Sem peças vinculadas</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!openPeca} onOpenChange={(o) => { if (!o) setOpenPeca(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular peça ao problema</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Peça</Label>
              <Select value={formPeca.peca_id} onValueChange={(v) => setFormPeca({ ...formPeca, peca_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{pecas.map((p) => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" min={1} value={formPeca.quantidade} onChange={(e) => setFormPeca({ ...formPeca, quantidade: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={() => addPeca.mutate()} disabled={!formPeca.peca_id}>Vincular</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
