import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { getAuthenticatedUserRole } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/clinica/")({
  component: () => {
    const router = useRouter();
    useEffect(() => {
      getAuthenticatedUserRole().then((role) => {
        if (role === "patient") {
          router.navigate({ to: "/paciente/dashboard", replace: true });
          return;
        }
        if (role === "admin") {
          router.navigate({ to: "/admin/dashboard", replace: true });
          return;
        }
        if (role === "clinic") {
          router.navigate({ to: "/clinica/dashboard", replace: true });
          return;
        }
      });
    }, [router]);
    return null;
  },
});
