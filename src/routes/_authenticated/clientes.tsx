import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const { isGestor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { nome: "", rota_id: "", contato: "", telefone: "", observacoes: "" };
  const [form, setForm] = useState<any>(emptyForm);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*, rotas(id, nome, cor)").order("nome")).data ?? [],
  });

  const { data: rotas = [] } = useQuery({
    queryKey: ["rotas"],
    queryFn: async () => (await (supabase.from as any)("rotas").select("id, nome, cor").order("nome")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, rota_id: form.rota_id || null };
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cliente salvo");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false); setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("clientes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["clientes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      nome: c.nome ?? "",
      rota_id: c.rota_id ?? "", contato: c.contato ?? "", telefone: c.telefone ?? "", observacoes: c.observacoes ?? "",
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader title="Clientes" description="Cadastro de clientes atendidos."
        actions={isGestor && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Razão social ou nome fantasia" /></div>
                <div><Label>Rota</Label>
                  <Select value={form.rota_id || "none"} onValueChange={(v) => setForm({ ...form, rota_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Sem rota" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem rota</SelectItem>
                      {rotas.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.nome}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Rota</TableHead>
            <TableHead>Contato</TableHead><TableHead>Telefone</TableHead><TableHead className="w-24"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {clientes.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>
                  {c.rotas ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.rotas.cor ?? "#94a3b8" }} />
                      {c.rotas.nome}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>{c.contato}</TableCell>
                <TableCell>{c.telefone}</TableCell>
                <TableCell className="text-right">
                  {isGestor && <>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {clientes.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum cliente cadastrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

    </>
  );
}
