import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Landmark, TrendingUp, HandCoins, ArrowUpRight, PlusCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/parceiro/dashboard")({
  component: ParceiroDashboard,
});

function ParceiroDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["partner-dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let partnerInfo = null;
      try {
        const { data, error } = await supabase
          .from("credit_partners" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (!error) {
          partnerInfo = data as { acquired?: number; used?: number } | null;
        }
      } catch (err) {
        console.warn("Error fetching credit_partners, using fallback", err);
      }

      // Fetch real loan applications from Supabase
      const { data: loansData, error: loansError } = await supabase
        .from("loan_applications")
        .select("*, clinics(name)")
        .order("created_at", { ascending: false });

      // Fetch partner transactions
      const { data: transactionsData } = await supabase
        .from("partner_transactions" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      return {
        partnerInfo,
        loans: loansData || [],
        transactions: transactionsData || []
      };
    },
  });

  // Calculate stats based on real loan data
  const loans = dashboardData?.loans || [];
  const transactions = dashboardData?.transactions || [];
  
  // Real used amount: sum of all approved/completed loans
  const realUsedAmount = loans
    .filter(l => l.status === "approved" || l.status === "completed" || l.status === "paid")
    .reduce((acc, curr) => acc + (curr.requested_amount || 0), 0);

  // Default values se não encontrar no banco
  const acquired = dashboardData?.partnerInfo?.acquired || 1500000;
  // If the partner has an explicit 'used' value use it, otherwise calculate from real loans
  const used = dashboardData?.partnerInfo?.used || realUsedAmount;
  const returned = used * 1.15; // Mock de retorno 15% 
  const available = acquired - used;

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  async function handleInvest() {
    if (!depositAmount || isNaN(Number(depositAmount))) {
      toast.error("Insira um valor numérico válido");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("partner_transactions" as any).insert({
        user_id: user?.id,
        type: "deposit",
        amount: Number(depositAmount),
        status: "pending"
      });
      toast.success("Solicitação de depósito enviada! Nossa equipe validará o recebimento.");
      setIsDepositOpen(false);
      setDepositAmount("");
    } catch (err) {
      toast.error("Erro ao solicitar aporte.");
      console.error(err);
    }
  }

  async function handleWithdraw() {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      toast.error("Insira um valor numérico válido");
      return;
    }
    if (Number(withdrawAmount) > returned) {
      toast.error("O valor solicitado é maior que o saldo disponível de repasses.");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("partner_transactions" as any).insert({
        user_id: user?.id,
        type: "withdrawal",
        amount: Number(withdrawAmount),
        status: "pending"
      });
      toast.success(`Solicitação de repasse enviada com sucesso!`);
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
    } catch (err) {
      toast.error("Erro ao solicitar repasse.");
      console.error(err);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel do Investidor</h1>
              <p className="mt-2 text-muted-foreground">
                Acompanhe o desempenho do seu capital investido na plataforma ProMobi.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              <Button onClick={() => setIsWithdrawOpen(true)} variant="outline" className="gap-2 w-full sm:w-auto">
                <HandCoins size={16} /> Solicitar Repasse
              </Button>
              <Button onClick={() => setIsDepositOpen(true)} className="gap-2 w-full sm:w-auto">
                <PlusCircle size={16} /> Adicionar Capital
              </Button>
            </div>
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

          <Tabs defaultValue="history" className="mt-8">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="history">Meu Histórico Financeiro</TabsTrigger>
              <TabsTrigger value="loans">Operações da Plataforma</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Histórico de Aportes e Repasses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo da Transação</th>
                          <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Valor</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx: any) => (
                          <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-4">{formatDate(tx.created_at)}</td>
                            <td className="p-4 font-medium text-foreground">
                              {tx.type === "deposit" ? "Aporte de Capital" : "Solicitação de Repasse"}
                            </td>
                            <td className={`p-4 text-right font-semibold ${tx.type === "deposit" ? "text-primary" : "text-orange-500"}`}>
                              {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tx.status === "completed" ? "bg-green-100 text-green-800 border-green-200" : tx.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                                {tx.status === "completed" ? "Concluído" : tx.status === "rejected" ? "Rejeitado" : "Pendente"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {transactions.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              Nenhuma transação financeira encontrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loans" className="mt-6">
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
                          {loans.length > 0 ? (
                            loans.slice(0, 5).map((loan: any) => {
                              // Determine status badge color
                              let statusBg = "bg-muted";
                              let statusText = "text-muted-foreground";
                              let statusLabel = loan.status;

                              if (loan.status === "approved" || loan.status === "paid") {
                                statusBg = "bg-emerald-100";
                                statusText = "text-emerald-700";
                                statusLabel = "Em dia";
                              } else if (loan.status === "pending") {
                                statusBg = "bg-amber-100";
                                statusText = "text-amber-700";
                                statusLabel = "Pendente";
                              } else if (loan.status === "rejected" || loan.status === "cancelled") {
                                statusBg = "bg-red-100";
                                statusText = "text-red-700";
                                statusLabel = "Cancelado";
                              }

                              return (
                                <tr key={loan.id} className="border-b hover:bg-muted/30 transition-colors">
                                  <td className="p-4">
                                    {new Date(loan.created_at).toLocaleDateString("pt-BR")}
                                  </td>
                                  <td className="p-4 font-medium">
                                    {(loan.clinics as any)?.name || "Clínica não informada"}
                                  </td>
                                  <td className="p-4 text-right font-semibold text-foreground">
                                    {formatCurrency(loan.requested_amount || 0)}
                                  </td>
                                  <td className="p-4">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBg} ${statusText}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                Nenhuma operação financiada encontrada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>
      <Footer />

      {/* Modal Depositar */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Capital</DialogTitle>
            <DialogDescription>
              Insira o valor que deseja aportar na plataforma. Nossa equipe entrará em contato com as instruções para transferência.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="deposit">Valor do aporte (R$)</Label>
              <Input
                id="deposit"
                type="number"
                placeholder="Ex: 50000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvest}>Confirmar Depósito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Repasse */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Repasse</DialogTitle>
            <DialogDescription>
              Você possui {formatCurrency(returned)} em repasses disponíveis.
              Insira o valor que deseja transferir para a sua conta bancária.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="withdraw">Valor do repasse (R$)</Label>
              <Input
                id="withdraw"
                type="number"
                placeholder="Ex: 5000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancelar</Button>
            <Button onClick={handleWithdraw}>Solicitar Transferência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
