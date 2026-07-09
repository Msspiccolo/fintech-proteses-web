import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getCurrentUserProfile } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const getProfile = useServerFn(getCurrentUserProfile);
  const router = useRouter();

  useEffect(() => {
    getProfile({ data: undefined })
      .then(({ profile, roles }) => {
        if (roles.includes("admin")) {
          router.navigate({ to: "/admin/dashboard", replace: true });
        } else if (roles.includes("clinic")) {
          router.navigate({ to: "/clinica/dashboard", replace: true });
        } else {
          router.navigate({ to: "/paciente/dashboard", replace: true });
        }
      })
      .catch(() => {
        router.navigate({ to: "/auth", replace: true });
      });
  }, [getProfile, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Carregando painel...</p>
    </div>
  );
}
