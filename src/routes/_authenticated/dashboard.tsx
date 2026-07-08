import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClipboardList, MapPin, ShieldCheck, PiggyBank } from "lucide-react";
import { startOfMonth, endOfMonth, formatISO, format, eachDayOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TIPOS = ["PREVENTIVA", "START", "ESTOQUE", "NORMAL"] as const;
const CORES: Record<string, string> = {
  PREVENTIVA: "hsl(var(--success))",
  START: "hsl(var(--accent))",
  ESTOQUE: "hsl(var(--primary))",
  NORMAL: "hsl(var(--muted-foreground))",
};

function Dashboard() {
  const { user, isGestor } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));
  const [tiposAtivos, setTiposAtivos] = useState<string[]>([...TIPOS]);

  const monthDate = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1, 1);
  const monthStart = formatISO(startOfMonth(monthDate), { representation: "date" });
  const monthEnd = formatISO(endOfMonth(monthDate), { representation: "date" });

  const { data: osMes = [] } = useQuery({
    queryKey: ["os-mes-dash", monthStart, monthEnd, user?.id, isGestor],
    queryFn: async () => {
      // Query 1: OS finalizadas no mês (por finalizada_em)
      let q1 = supabase.from("ordens_servico")
        .select("id, tipo, status, valor, data_agendada, finalizada_em, tecnico_id")
        .gte("finalizada_em", `${monthStart}T00:00:00`)
        .lte("finalizada_em", `${monthEnd}T23:59:59`);
      if (!isGestor) q1 = q1.eq("tecnico_id", user!.id);

      // Query 2: OS agendadas no mês (para contagem de "no mês")
      let q2 = supabase.from("ordens_servico")
        .select("id, tipo, status, valor, data_agendada, finalizada_em, tecnico_id")
        .gte("data_agendada", monthStart)
        .lte("data_agendada", monthEnd);
      if (!isGestor) q2 = q2.eq("tecnico_id", user!.id);

      const [{ data: d1 }, { data: d2 }] = await Promise.all([q1, q2]);
      const map = new Map<string, any>();
      (d1 ?? []).forEach((r: any) => map.set(r.id, r));
      (d2 ?? []).forEach((r: any) => { if (!map.has(r.id)) map.set(r.id, r); });
      return Array.from(map.values());
    },
  });

  const { data: rotaHojeCount = 0 } = useQuery({
    queryKey: ["rota-hoje-count", today, user?.id, isGestor],
    queryFn: async () => {
      let q = supabase.from("ordens_servico").select("id", { count: "exact", head: true }).eq("data_agendada", today);
      if (!isGestor) q = q.eq("tecnico_id", user!.id);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: reducaoTotal = 0 } = useQuery({
    queryKey: ["red-mes-dash", monthStart, monthEnd, user?.id, isGestor],
    queryFn: async () => {
      let q = supabase.from("reducao_custo").select("valor").gte("data", monthStart).lte("data", monthEnd);
      if (!isGestor) q = q.eq("tecnico_id", user!.id);
      const { data } = await q;
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);
    },
  });

  const { data: preventivasCount = 0 } = useQuery({
    queryKey: ["prev-count", monthStart, monthEnd],
    queryFn: async () => {
      const { count } = await supabase.from("preventivas").select("id", { count: "exact", head: true })
        .gte("data_execucao", monthStart).lte("data_execucao", monthEnd);
      return count ?? 0;
    },
  });

  const finalizadas = osMes.filter((o: any) => o.status === "finalizada" && o.finalizada_em);
  const totalFatura = finalizadas.reduce((s: number, o: any) => s + Number(o.valor ?? 0), 0);

  const porTipo = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of TIPOS) acc[t] = 0;
    finalizadas.forEach((o: any) => { if (o.tipo in acc) acc[o.tipo]++; });
    return acc;
  }, [finalizadas]);

  const dadosGrafico = useMemo(() => {
    const dias = eachDayOfInterval({ start: new Date(monthStart), end: new Date(monthEnd) });
    return dias.map((d) => {
      const iso = formatISO(d, { representation: "date" });
      const row: any = { dia: format(d, "dd") };
      for (const t of TIPOS) row[t] = 0;
      finalizadas.filter((o: any) => (o.finalizada_em ?? "").slice(0, 10) === iso).forEach((o: any) => {
        if (o.tipo in row) row[o.tipo]++;
      });
      return row;
    });
  }, [finalizadas, monthStart, monthEnd]);

  const cards = [
    { label: "OS na rota de hoje", value: rotaHojeCount, icon: MapPin },
    { label: "OS no mês", value: osMes.length, icon: ClipboardList },
    { label: "Finalizadas no mês", value: finalizadas.length, icon: ClipboardList },
    { label: "Faturamento do mês", value: `R$ ${totalFatura.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: ClipboardList, gestorOnly: true },
    { label: "Redução de custo (mês)", value: `R$ ${Number(reducaoTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: PiggyBank },
    { label: "Preventivas registradas", value: preventivasCount, icon: ShieldCheck },
  ].filter((c) => !c.gestorOnly || isGestor);

  const toggleTipo = (t: string) => {
    setTiposAtivos((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={isGestor ? "Visão geral da operação." : "Sua visão operacional."}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="text-base">OS atendidas no mês</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Distribuição diária por tipo de OS.</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Mês</Label>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-3 pb-2">
              {TIPOS.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-xs">
                  <Checkbox checked={tiposAtivos.includes(t)} onCheckedChange={() => toggleTipo(t)} />
                  <span style={{ color: CORES[t] }} className="font-medium">●</span>
                  {t}
                </label>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {TIPOS.map((t) => (
              <div key={t} className="rounded-md border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">{t}</div>
                <div className="font-display text-xl font-semibold" style={{ color: CORES[t] }}>{porTipo[t]}</div>
              </div>
            ))}
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                {TIPOS.filter((t) => tiposAtivos.includes(t)).map((t) => (
                  <Bar key={t} dataKey={t} stackId="a" fill={CORES[t]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
