import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getCurrentUserProfile } from "@/lib/auth.functions";
import { completeSignup } from "@/lib/auth-client";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const getProfile = useServerFn(getCurrentUserProfile);
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    getProfile({ data: undefined })
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
        console.error("DashboardRedirect getProfile error:", err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
      });
  }, [getProfile, router]);

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="rounded-lg bg-destructive/10 p-6 text-destructive max-w-md">
          <h2 className="font-bold text-lg mb-2">Erro ao carregar perfil</h2>
          <p className="font-mono text-sm">{errorMsg}</p>
          <button onClick={() => router.navigate({ to: "/auth" })} className="mt-4 underline">Voltar para o login</button>
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
