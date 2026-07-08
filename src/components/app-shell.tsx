import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, Users, Cpu, Package, Wrench, ClipboardList, MapPin, Route as RouteIcon,
  ShieldCheck, PiggyBank, TrendingUp, LogOut, Menu, CheckCircle2, KeyRound, Truck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: any; module: string; adminOnly?: boolean }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { to: "/rota", label: "Rota do dia", icon: MapPin, module: "rota" },
  { to: "/os", label: "Ordens de Serviço", icon: ClipboardList, module: "os" },
  { to: "/entregas", label: "Entregas", icon: Truck, module: "entregas" },
  { to: "/conferencia", label: "Conferência", icon: CheckCircle2, module: "conferencia" },
  { to: "/preventivas", label: "Preventivas", icon: ShieldCheck, module: "preventivas" },
  { to: "/reducao", label: "Redução de custo", icon: PiggyBank, module: "reducao" },
  { to: "/rendimento", label: "Rendimento", icon: TrendingUp, module: "rendimento" },
  { to: "/clientes", label: "Clientes", icon: Users, module: "clientes" },
  { to: "/rotas", label: "Rotas", icon: RouteIcon, module: "rotas" },
  { to: "/equipamentos", label: "Equipamentos", icon: Cpu, module: "equipamentos" },
  { to: "/modelos", label: "Modelos & Problemas", icon: Wrench, module: "modelos" },
  { to: "/pecas", label: "Peças", icon: Package, module: "pecas" },
  { to: "/tecnicos", label: "Técnicos", icon: Users, module: "tecnicos" },
  { to: "/permissoes", label: "Permissões", icon: KeyRound, module: "permissoes", adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut, canView, isAdmin } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((i) => (i.adminOnly ? isAdmin : canView(i.module)));

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full bg-sidebar text-sidebar-foreground transition-transform md:relative md:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white">
            <Wrench className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold text-blue-500">Unitech</span>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((it) => {
            const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-sidebar-foreground/60">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 hover:bg-muted"><Menu className="h-5 w-5" /></button>
          <span className="font-display font-semibold">TechRoute</span>
          <span />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
