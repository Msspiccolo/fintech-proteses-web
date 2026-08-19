import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeSignup } from "@/lib/auth-client";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

async function fetchProfileData() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error(userError?.message || "Usuário não autenticado");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  const { data: rolesData, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) throw new Error(rolesError.message);

  return { profile, roles: rolesData?.map((r) => r.role) ?? [] };
}

function DashboardRedirect() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchProfileData()
      .then(async ({ profile, roles }) => {
        if (!profile) {
          // Social sign-in: create a default patient profile on first visit.
          const { data } = await supabase.auth.getUser();
          const meta = data.user?.user_metadata ?? {};
          await completeSignup({
            fullName: (meta.full_name as string) || (meta.name as string) || "Usuário",
            document: "",
            phone: "",
            role: "patient",
          }).catch(() => undefined);
        }
        if (roles.includes("admin")) {
          router.navigate({ to: "/admin/dashboard", replace: true });
        } else if (roles.includes("clinic")) {
          router.navigate({ to: "/clinica/dashboard", replace: true });
        } else {
          router.navigate({ to: "/paciente/dashboard", replace: true });
        }
      })
      .catch((err) => {
        console.error("DashboardRedirect fetchProfileData error:", err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
      });
  }, [router]);

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-lg bg-destructive/10 p-6 text-destructive max-w-md">
          <h2 className="font-bold text-lg mb-2">Erro ao carregar perfil</h2>
          <p className="font-mono text-sm">{errorMsg}</p>
          <button onClick={() => router.navigate({ to: "/auth" })} className="mt-4 underline">
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Carregando painel...</p>
    </div>
  );
}
