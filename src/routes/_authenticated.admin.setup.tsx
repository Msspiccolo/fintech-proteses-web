import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/setup")({
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const router = useRouter();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("admin_exists");
      setAdminExists(Boolean(data));
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);
        setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      }
    }
    load();
  }, []);

  async function handleClaim() {
    setLoading(true);
    const { error } = await supabase.rpc("claim_first_admin");
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Você agora é administrador da PrótesePay.");
    router.navigate({ to: "/admin/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Configuração de administrador</CardTitle>
            <CardDescription>
              O primeiro administrador da plataforma é definido aqui. Depois disso, apenas
              administradores podem conceder novos acessos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminExists === null ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : isAdmin ? (
              <>
                <p className="text-muted-foreground">
                  Sua conta já possui acesso administrativo.
                </p>
                <Button onClick={() => router.navigate({ to: "/admin/dashboard" })}>
                  Ir para o painel administrativo
                </Button>
              </>
            ) : adminExists ? (
              <p className="text-muted-foreground">
                Já existe um administrador cadastrado. Peça a ele para conceder acesso à sua conta.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Nenhum administrador cadastrado ainda. Você pode assumir esse papel agora.
                </p>
                <Button onClick={handleClaim} disabled={loading}>
                  {loading ? "Ativando..." : "Tornar-me administrador"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
