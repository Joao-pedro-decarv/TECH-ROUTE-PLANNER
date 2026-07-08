import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Route as RouteIcon, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">TechRoute</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
            <Button asChild><Link to="/auth">Começar</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Gestão operacional para assistência técnica
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight md:text-5xl">
            A rota do dia, as peças e o rendimento — <span className="text-accent">em um só lugar.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Cadastre equipamentos e problemas, monte as OS do dia com as peças certas por modelo, controle preventivas com alerta de 3 meses e acompanhe rendimento e redução de custo por técnico.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth">Acessar sistema</Link></Button>
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-4">
          {[
            { icon: RouteIcon, title: "Rota do dia", desc: "OS por técnico com peças previstas e relatório consolidado exportável em PDF/Excel." },
            { icon: Wrench, title: "Peças por problema", desc: "Cadastre o problema por modelo e o sistema anexa as peças automaticamente." },
            { icon: ShieldCheck, title: "Preventivas + 3 meses", desc: "Histórico por patrimônio e alerta automático de retorno preventivo." },
            { icon: TrendingUp, title: "Rendimento & custo", desc: "Total de chamados por técnico no mês e lançamento de redução de custo." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
