import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdminOrGestor(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isAdmin) return "admin";
  const { data: isGestor } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "gestor" });
  if (isGestor) return "gestor";
  throw new Error("Sem permissão.");
}

export const inviteUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; nome: string; role: "admin" | "gestor" | "tecnico" | "estoquista"; redirectTo: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await ensureAdminOrGestor(context);
    if (data.role === "admin" && caller !== "admin") throw new Error("Apenas admin pode criar outro admin.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { nome: data.nome },
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    const newUserId = inv.user?.id;
    if (!newUserId) throw new Error("Falha ao criar usuário.");

    if (data.role === "gestor" || data.role === "admin") {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: newUserId, role: "gestor" as any },
        { onConflict: "user_id,role" },
      );
    }
    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: newUserId, role: "admin" as any },
        { onConflict: "user_id,role" },
      );
    }
    if (data.role === "estoquista") {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: newUserId, role: "estoquista" as any },
        { onConflict: "user_id,role" },
      );
    }
    return { ok: true, userId: newUserId };
  });

export const removerUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdminOrGestor(context);
    if (data.userId === context.userId) throw new Error("Você não pode remover a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const alternarRoleGestor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; makeGestor: boolean }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdminOrGestor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeGestor) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.userId, role: "gestor" as any },
        { onConflict: "user_id,role" },
      );
    } else {
      if (data.userId === context.userId) throw new Error("Você não pode remover sua própria role de gestor.");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "gestor" as any);
    }
    return { ok: true };
  });

export const alternarRoleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; makeAdmin: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas admin pode alterar admins.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" as any }, { onConflict: "user_id,role" });
    } else {
      if (data.userId === context.userId) throw new Error("Você não pode remover sua própria role de admin.");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin" as any);
    }
    return { ok: true };
  });

export const createUsuarioSemEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { nome: string; role: "admin" | "gestor" | "tecnico" | "estoquista" }) => data)
  .handler(async ({ data, context }) => {
    const caller = await ensureAdminOrGestor(context);
    if (data.role === "admin" && caller !== "admin") throw new Error("Apenas admin pode criar outro admin.");

    const { supabase } = context;
    // Gerar um id localmente para evitar violação de NOT NULL caso o schema
    // ainda não defina um default gen_random_uuid() para profiles.id.
    const newId = (globalThis as any).crypto?.randomUUID
      ? (globalThis as any).crypto.randomUUID()
      : require('crypto').randomUUID();
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: newId, nome: data.nome, email: null })
      .select("id")
      .limit(1);

    if (insertError) throw new Error(insertError.message);
    const newUserId = inserted?.[0]?.id;
    if (!newUserId) throw new Error("Falha ao criar técnico.");

    if (data.role === "gestor" || data.role === "admin" || data.role === "estoquista") {
      const roleEntries = [{ user_id: newUserId, role: data.role }];
      const { error: roleError } = await supabase.from("user_roles").upsert(roleEntries, { onConflict: "user_id,role" });
      if (roleError) throw new Error(roleError.message);
    }

    return { ok: true, userId: newUserId };
  });

export const salvarPermissoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; permissions: { module: string; can_view: boolean; can_edit: boolean }[] }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas admin pode alterar permissões.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // remove todas e reinsere as marcadas
    await supabaseAdmin.from("user_module_permissions" as any).delete().eq("user_id", data.userId);
    const toInsert = data.permissions
      .filter((p) => p.can_view || p.can_edit)
      .map((p) => ({ user_id: data.userId, module: p.module, can_view: p.can_view, can_edit: p.can_edit }));
    if (toInsert.length) {
      const { error } = await supabaseAdmin.from("user_module_permissions" as any).insert(toInsert);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const salvarValorHora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; valorHora: number | null }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdminOrGestor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ valor_hora: data.valorHora } as any).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
