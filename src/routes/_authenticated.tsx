import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw redirect({ to: "/auth" });
      }
      return { user: data.user };
    }
    // On the server, we don't have access to localStorage, so we pass
    // an empty user and let the client-side hydration perform the redirect.
    return { user: null };
  },
  component: () => <Outlet />,
});
