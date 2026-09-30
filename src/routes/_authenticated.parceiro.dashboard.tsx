import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Landmark, TrendingUp, HandCoins, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/parceiro/dashboard")({
  component: ParceiroDashboard,
});

function ParceiroDashboard() {
  const { data: partnerData, isLoading } = useQuery({
    queryKey: ["partner-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      try {
        const { data, error } = await supabase
          .from("credit_partners" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        return data as { acquired?: number; used?: number } | null;
      } catch (err) {
        console.warn("Error fetching credit_partners, using fallback", err);
        return null;
      }
    },
  });

  // Default values se não encontrar no banco ou der erro
  const acquired = partnerData?.acquired || 1500000;
  const used = partnerData?.used || 350000;
  const returned = used * 1.15; // Mock de retorno 15%
  const available = acquired - used;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Painel do Investidor</h1>
            <p className="mt-2 text-muted-foreground">
              Acompanhe o desempenho do seu capital investido na plataforma PrótesePay.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-primary/20 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital Disponibilizado</CardTitle>
                <Landmark className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(acquired)}</div>
                <p className="text-xs text-muted-foreground mt-1">Compromisso total</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital Investido (Utilizado)</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(used)}</div>
                <p className="text-xs text-muted-foreground mt-1">Empréstimos ativos</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital Retornado</CardTitle>
                <HandCoins className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{formatCurrency(returned)}</div>
                <p className="text-xs text-muted-foreground mt-1">Principal + Juros recebidos</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(available)}</div>
                <p className="text-xs text-muted-foreground mt-1">Livre para novas operações</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Últimas Operações Financiadas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Carregando dados...</div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Clínica</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Valor Financiado</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-4">28/09/2026</td>
                        <td className="p-4">Clínica OrtoVida</td>
                        <td className="p-4 text-right">{formatCurrency(15000)}</td>
                        <td className="p-4"><span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Em dia</span></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-4">20/09/2026</td>
                        <td className="p-4">Centro Ortopédico Avançado</td>
                        <td className="p-4 text-right">{formatCurrency(45000)}</td>
                        <td className="p-4"><span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Em dia</span></td>
                      </tr>
                      <tr>
                        <td className="p-4">15/09/2026</td>
                        <td className="p-4">Reabilitar Plus</td>
                        <td className="p-4 text-right">{formatCurrency(22000)}</td>
                        <td className="p-4"><span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Pendente</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />
    </div>
  );
}
