import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav({ to: "/dashboard" });
  }, [session, loading, nav]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    nav({ to: "/dashboard" });
  };

  const doForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Se este email estiver cadastrado, um link foi enviado.");
    setMode("login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">TechRoute</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "login" ? "Acesso" : "Recuperar senha"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Acesso restrito. Novos usuários entram apenas por convite do gestor."
                : "Enviaremos um link para você definir uma nova senha."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <form onSubmit={doLogin} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : "Entrar"}</Button>
                <button type="button" onClick={() => setMode("forgot")} className="w-full text-sm text-muted-foreground underline">
                  Esqueci minha senha
                </button>
              </form>
            ) : (
              <form onSubmit={doForgot} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "..." : "Enviar link"}</Button>
                <button type="button" onClick={() => setMode("login")} className="w-full text-sm text-muted-foreground underline">
                  Voltar ao login
                </button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Recebeu um convite? <Link to="/reset-password" className="underline">Definir minha senha</Link>
        </p>
      </div>
    </div>
  );
}
