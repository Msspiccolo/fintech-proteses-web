import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuthenticatedUserRole } from "@/lib/auth-client";
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    getAuthenticatedUserRole()
      .then((role) => {
        if (role === "admin") {
          router.navigate({ to: "/admin/dashboard", replace: true });
        } else if (role === "clinic") {
          router.navigate({ to: "/clinica/dashboard", replace: true });
        } else {
          router.navigate({ to: "/paciente/dashboard", replace: true });
        }
      })
      .catch((err) => {
        console.error("DashboardRedirect error:", err);
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
