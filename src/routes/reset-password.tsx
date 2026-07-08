import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase processa o token do hash automaticamente e dispara PASSWORD_RECOVERY/USER_UPDATED
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setReady(true);
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha definida! Bem-vindo.");
    nav({ to: "/dashboard" });
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
            <CardTitle>Defina sua senha</CardTitle>
            <CardDescription>
              {ready
                ? "Escolha uma senha para acessar o sistema."
                : "Validando seu convite… se não avançar em alguns segundos, verifique se abriu o link mais recente do email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>Nova senha</Label>
                <Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !ready}>
                {busy ? "..." : "Salvar senha e entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
