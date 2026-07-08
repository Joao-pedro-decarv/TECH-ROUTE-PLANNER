import { createFileRoute } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/pecas")({
  component: PecasPage,
});

function PecasPage() {
  const { isGestor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ codigo: "", descricao: "", custo: 0 });

  const { data: pecas = [] } = useQuery({
    queryKey: ["pecas"],
    queryFn: async () => (await supabase.from("pecas").select("*").order("descricao")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, custo: Number(form.custo) };
      const q = editing ? supabase.from("pecas").update(payload).eq("id", editing.id) : supabase.from("pecas").insert(payload);
      const { error } = await q; if (error) throw error;
    },
    onSuccess: () => { toast.success("Peça salva"); qc.invalidateQueries({ queryKey: ["pecas"] }); setOpen(false); setEditing(null); setForm({ codigo: "", descricao: "", custo: 0 }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pecas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["pecas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Peças" description="Catálogo de peças usadas nos atendimentos."
        actions={isGestor && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ codigo: "", descricao: "", custo: 0 }); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} peça</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
                <div><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: Number(e.target.value) })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.descricao}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>
            {pecas.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell className="font-medium">{p.descricao}</TableCell>
                <TableCell className="text-right">R$ {Number(p.custo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">
                  {isGestor && <>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm({ codigo: p.codigo ?? "", descricao: p.descricao, custo: Number(p.custo ?? 0) }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {pecas.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhuma peça.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  );
}
