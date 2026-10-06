import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllLoanApplications, updateLoanApplication, updateFabricationOrder, confirmInstallmentPayment } from "@/lib/loans.functions";
import { getAllClinicsForAdmin, updateClinicStatus, deleteClinicByAdmin } from "@/lib/clinics.functions";
import {
  getAllUsersForAdmin,
  updateUserRoleForAdmin,
  deleteUserByAdmin,
} from "@/lib/auth.functions";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { openDocument, DOC_TYPES } from "@/components/application-extras";
import { FileText } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — ProMobi" },
      {
        name: "description",
        content: "Gerencie e aprove propostas de financiamento de próteses ortopédicas.",
      },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchApplications = useServerFn(getAllLoanApplications);
  const updateApplication = useServerFn(updateLoanApplication);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["all-loan-applications"],
    queryFn: () => fetchApplications({ data: undefined }),
  });

  const applications: any[] = data?.applications ?? [];

  const updateOrder = useServerFn(updateFabricationOrder);

  async function handleOrderStatus(id: string, status: string) {
    try {
      await updateOrder({ data: { id, status } });
      toast.success("Status de fabricação atualizado com sucesso!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  const confirmInstallment = useServerFn(confirmInstallmentPayment);

  async function handleConfirmInstallment(id: string) {
    try {
      await confirmInstallment({ data: { id } });
      toast.success("Pagamento de parcela confirmado!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pagamento");
    }
  }

  // Reports calculations
  const approvedApps = applications.filter((a) => a.status === "approved");
  const pendingApps = applications.filter((a) => a.status === "pending");
  const rejectedApps = applications.filter((a) => a.status === "rejected");
  
  const approvalRate = applications.length > 0 ? (approvedApps.length / applications.length) * 100 : 0;
  const creditVolume = approvedApps.reduce((acc, app) => acc + app.requested_amount, 0);
  const pendingCredit = pendingApps.reduce((acc, app) => acc + app.requested_amount, 0);
  const totalRepassed = applications.filter(a => a.status === "completed").reduce((acc, app) => acc + app.requested_amount, 0);
  const pendingRepasses = approvedApps.reduce((acc, app) => acc + app.requested_amount, 0);
  
  // Fetch credit partners from Supabase (or use fallback)
  const { data: fetchedPartners } = useQuery({
    queryKey: ["credit-partners"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("credit_partners" as any).select("*");
        if (error) throw error;
        return data as any[];
      } catch (err) {
        console.warn("Table credit_partners doesn't exist yet, using mock data.");
        return null;
      }
    },
  });

  const mockCreditPartners = [
    { name: "Fundo Alpha Invest", type: "Fundo de Investimento", acquired: 2000000, used: 1500000, status: "Ativo" },
    { name: "Banco FinanceBrasil", type: "Banco Institucional", acquired: 1500000, used: 800000, status: "Ativo" },
    { name: "Capital Próteses", type: "Investidor Anjo", acquired: 1500000, used: 200000, status: "Ativo" }
  ];

  const creditPartners = fetchedPartners && fetchedPartners.length > 0 ? fetchedPartners : mockCreditPartners;
  const totalCreditAcquired = creditPartners.reduce((acc, p) => acc + (p.acquired || 0), 0);

  // Fetch partner transactions
  const { data: partnerTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["partner-transactions"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("partner_transactions" as any).select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data as any[];
      } catch (err) {
        console.warn("Table partner_transactions doesn't exist yet.");
        return [];
      }
    },
  });

  async function handleTransactionStatus(id: string, status: "completed" | "rejected") {
    try {
      const { data, error: fetchTxError } = await supabase.from("partner_transactions" as any).select("*").eq("id", id).single();
      const tx = data as any;
      if (fetchTxError) throw fetchTxError;

      const { error } = await supabase.from("partner_transactions" as any).update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "completed" && tx?.type === "deposit") {
        const { data: partnerData } = await supabase.from("credit_partners" as any).select("acquired").eq("user_id", tx.user_id).single();
        const partner = partnerData as any;
        const currentAcquired = partner?.acquired || 0;
        await supabase.from("credit_partners" as any).update({ acquired: currentAcquired + tx.amount }).eq("user_id", tx.user_id);
      }

      toast.success(`Transação ${status === "completed" ? "concluída" : "rejeitada"} com sucesso!`);
      refetchTransactions();
    } catch (err) {
      toast.error("Erro ao atualizar transação");
    }
  }




  async function handleStatus(id: string, status: "approved" | "rejected") {
    try {
      await updateApplication({ data: { id, status } });
      toast.success(`Proposta ${status === "approved" ? "aprovada" : "reprovada"} com sucesso`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar proposta");
    }
  }

  const fetchClinics = useServerFn(getAllClinicsForAdmin);
  const updateClinic = useServerFn(updateClinicStatus);

  const {
    data: clinicsData,
    isLoading: isLoadingClinics,
    refetch: refetchClinics,
  } = useQuery({
    queryKey: ["all-clinics-admin"],
    queryFn: () => fetchClinics({ data: undefined }),
  });

  const clinics: any[] = clinicsData?.clinics ?? [];

  const deleteClinic = useServerFn(deleteClinicByAdmin);

  async function handleClinicStatus(id: string, status: "approved" | "rejected") {
    try {
      await updateClinic({ data: { id, status } });
      toast.success(`Clínica ${status === "approved" ? "aprovada" : "reprovada"} com sucesso`);
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar clínica");
    }
  }

  async function handleDeleteClinic(id: string) {
    if (!confirm("Tem certeza que deseja apagar esta clínica definitivamente? Todas as propostas vinculadas ficarão sem clínica associada.")) return;
    try {
      await deleteClinic({ data: { targetClinicId: id } });
      toast.success("Clínica apagada com sucesso!");
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao apagar clínica");
    }
  }

  const fetchUsers = useServerFn(getAllUsersForAdmin);
  const updateUserRole = useServerFn(updateUserRoleForAdmin);
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => fetchUsers({ data: undefined }),
  });

  if (usersError) {
    console.error("Error fetching users:", usersError);
  }

  const users: any[] = usersData?.users ?? [];
  console.log("Usuários carregados:", users);

  const totalPatients = users.filter((u) => u.role === "patient").length;
  const totalPartnerClinics = clinics.length;

  // Build clinic stats using the loaded clinics array as base
  type ClinicStats = { count: number; totalValue: number; approvedValue: number; uniquePatients: Set<string> };
  const clinicDetailedStats = clinics.reduce<Record<string, ClinicStats>>((acc, clinic) => {
    acc[clinic.name] = { count: 0, totalValue: 0, approvedValue: 0, uniquePatients: new Set<string>() };
    return acc;
  }, {});

  // Then populate with applications data
  applications.forEach((app) => {
    const name = (app.clinics as any)?.name;
    if (!name || !clinicDetailedStats[name]) {
      return;
    }
    clinicDetailedStats[name].count += 1;
    clinicDetailedStats[name].totalValue += app.requested_amount || 0;
    if (app.status === "approved") {
      clinicDetailedStats[name].approvedValue += app.requested_amount || 0;
    }
    if (app.patient_id) {
      clinicDetailedStats[name].uniquePatients.add(app.patient_id);
    }
  });

  const clinicStatsArray = Object.entries(clinicDetailedStats)
    .map(([name, stats]: [string, any]) => ({
      name,
      count: stats.count,
      totalValue: stats.totalValue,
      approvedValue: stats.approvedValue,
      patientsCount: stats.uniquePatients.size,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const totalProposalsValue = clinicStatsArray.reduce((acc, c) => acc + c.totalValue, 0);
  const averagePatientsPerClinic =
    clinics.length > 0
      ? (clinicStatsArray.reduce((acc, c) => acc + c.patientsCount, 0) / clinics.length).toFixed(1)
      : "0";

  const deleteUser = useServerFn(deleteUserByAdmin);

  async function handleRoleChange(userId: string, newRole: "patient" | "clinic" | "admin") {
    try {
      await updateUserRole({ data: { targetUserId: userId, newRole } });
      toast.success("Cargo do usuário atualizado com sucesso!");
      refetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cargo");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Tem certeza que deseja apagar este usuário definitivamente?")) return;
    try {
      await deleteUser({ data: { targetUserId: userId } });
      toast.success("Usuário apagado com sucesso!");
      refetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao apagar usuário");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="mt-2 text-muted-foreground">Analise e aprove propostas de financiamento.</p>
            </div>
          </div>

          <Tabs defaultValue="reports" className="mt-8">
            <TabsList className="grid w-full grid-cols-7 max-w-[1200px]">
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
              <TabsTrigger value="applications">Propostas</TabsTrigger>
              <TabsTrigger value="clinics">Clínicas Parceiras</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="partners">Parceiros de Crédito</TabsTrigger>
              <TabsTrigger value="finance">Financeiro</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pacientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{totalPatients}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clínicas Parceiras</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{totalPartnerClinics}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Propostas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{applications.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Aprovação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{approvalRate.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Aprovado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(creditVolume)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Pendente (Análise)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(pendingCredit)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total de Propostas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(totalProposalsValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Média Pacientes/Clínica</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{averagePatientsPerClinic}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Repassado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRepassed)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Repasses Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(pendingRepasses)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Adquirido (Parceiros)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(totalCreditAcquired)}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Desempenho Detalhado das Clínicas</h2>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted/50 text-foreground">
                      <tr>
                        <th className="px-6 py-3">Clínica</th>
                        <th className="px-6 py-3">Propostas</th>
                        <th className="px-6 py-3">Pacientes Únicos</th>
                        <th className="px-6 py-3">Valor Solicitado</th>
                        <th className="px-6 py-3">Valor Aprovado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinicStatsArray.map((c) => (
                        <tr key={c.name} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                          <td className="px-6 py-4">{c.count}</td>
                          <td className="px-6 py-4">{c.patientsCount}</td>
                          <td className="px-6 py-4">{formatCurrency(c.totalValue)}</td>
                          <td className="px-6 py-4 text-green-600 font-medium">{formatCurrency(c.approvedValue)}</td>
                        </tr>
                      ))}
                      {clinicStatsArray.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center">
                            Nenhuma clínica encontrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="applications" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{applications.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {applications.filter((a) => a.status === "pending").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Aprovadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {applications.filter((a) => a.status === "approved").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Reprovadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {applications.filter((a) => a.status === "rejected").length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground">Todas as propostas</h2>
                {isLoading ? (
                  <p className="mt-4 text-muted-foreground">Carregando...</p>
                ) : applications.length === 0 ? (
                  <p className="mt-4 text-muted-foreground">Nenhuma proposta cadastrada.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {applications.map((app) => (
                      <Card key={app.id}>
                        <CardContent className="flex flex-col gap-4 p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Paciente</p>
                              <p className="text-lg font-semibold text-foreground">
                                {(app.profiles as unknown as { full_name: string | null } | null)
                                  ?.full_name ?? "Não informado"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Clínica</p>
                              <p className="text-foreground">
                                {(app.clinics as { name: string } | null)?.name ?? "Não informada"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Valor</p>
                              <p className="text-foreground">
                                {formatCurrency(app.requested_amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {app.installments}x de {formatCurrency(app.monthly_payment)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <StatusBadge status={app.status} />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Data</p>
                              <p className="text-foreground">{formatDate(app.created_at)}</p>
                            </div>
                            {app.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleStatus(app.id, "approved")}>
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatus(app.id, "rejected")}
                                >
                                  Reprovar
                                </Button>
                              </div>
                            )}
                            {(app.status === "approved" || app.status === "paid") && (
                              <div className="flex flex-col gap-1 items-end">
                                <p className="text-xs text-muted-foreground">
                                  Parcelas pagas: {app.installments_paid || 0}/{app.installments || 1}
                                </p>
                                {(app.installments_paid || 0) < (app.installments || 1) && (
                                  <Button size="sm" variant="outline" onClick={() => handleConfirmInstallment(app.id)}>
                                    Confirmar Parcela
                                  </Button>
                                )}
                                {(app.installments_paid || 0) >= (app.installments || 1) && (
                                  <span className="text-xs font-medium text-green-600">Totalmente Pago</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Details Section */}
                          {(app.loan_documents?.length > 0 || app.fabrication_orders?.length > 0) && (
                            <div className="w-full mt-2 pt-4 border-t flex flex-col md:flex-row gap-8">
                              {app.loan_documents && app.loan_documents.length > 0 && (
                                <div className="flex-1">
                                  <p className="text-sm font-semibold mb-3">Documentos Enviados</p>
                                  <ul className="space-y-2">
                                    {app.loan_documents.map((doc: any) => (
                                      <li key={doc.id} className="flex items-center gap-2 text-sm">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <button className="truncate text-left hover:underline text-primary" onClick={() => openDocument(doc.storage_path)}>
                                          {DOC_TYPES[doc.doc_type] ?? doc.doc_type} — {doc.file_name}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {app.fabrication_orders && app.fabrication_orders.length > 0 && (
                                <div className="flex-1">
                                  <p className="text-sm font-semibold mb-3">Pedidos de Fabricação</p>
                                  <div className="space-y-3">
                                    {app.fabrication_orders.map((order: any) => (
                                      <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 text-sm bg-muted/40 p-3 rounded-lg">
                                        <div className="flex-1 min-w-[200px]">
                                          <p className="font-medium text-foreground">{order.model}</p>
                                          <p className="text-xs text-muted-foreground">{order.material}</p>
                                        </div>
                                        <Select defaultValue={order.status} onValueChange={(v) => handleOrderStatus(order.id, v)}>
                                          <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
                                             <SelectValue placeholder="Status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                             <SelectItem value="requested">Solicitada</SelectItem>
                                             <SelectItem value="in_production">Em produção</SelectItem>
                                             <SelectItem value="shipped">Enviada</SelectItem>
                                             <SelectItem value="delivered">Entregue</SelectItem>
                                             <SelectItem value="cancelled">Cancelada</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="clinics" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{clinics.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {clinics.filter((c) => c.status === "pending").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Aprovadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {clinics.filter((c) => c.status === "approved").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Reprovadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {clinics.filter((c) => c.status === "rejected").length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground">Todas as clínicas</h2>
                {isLoadingClinics ? (
                  <p className="mt-4 text-muted-foreground">Carregando...</p>
                ) : clinics.length === 0 ? (
                  <p className="mt-4 text-muted-foreground">Nenhuma clínica cadastrada.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {clinics.map((clinic) => (
                      <Card key={clinic.id}>
                        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Clínica</p>
                            <p className="text-lg font-semibold text-foreground">{clinic.name}</p>
                            <p className="text-xs text-muted-foreground">{clinic.document}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Contato</p>
                            <p className="text-foreground">{clinic.email ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{clinic.phone ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Localização</p>
                            <p className="text-foreground">
                              {[clinic.city, clinic.state].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <StatusBadge status={clinic.status} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Data</p>
                            <p className="text-foreground">{formatDate(clinic.created_at)}</p>
                          </div>
                          <div className="flex gap-2">
                            {clinic.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleClinicStatus(clinic.id, "approved")}
                                >
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClinicStatus(clinic.id, "rejected")}
                                >
                                  Reprovar
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="px-2 h-8"
                              onClick={() => handleDeleteClinic(clinic.id)}
                            >
                              Apagar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Todos os usuários</h2>
                {isLoadingUsers ? (
                  <p className="mt-4 text-muted-foreground">Carregando...</p>
                ) : users.length === 0 ? (
                  <p className="mt-4 text-muted-foreground">Nenhum usuário cadastrado.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border bg-card shadow-sm mt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="px-6 py-4 font-medium">Nome</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Tipo de Conta</th>
                            <th className="px-6 py-4 font-medium">Documento</th>
                            <th className="px-6 py-4 font-medium">Contato</th>
                            <th className="px-6 py-4 font-medium">Data de Cadastro</th>
                            <th className="px-6 py-4 font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {users.map((user) => (
                            <tr key={user.user_id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">
                                {user.full_name || "Não informado"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {user.email || "—"}
                              </td>
                              <td className="px-6 py-4">
                                {(() => {
                                  const isInvestor = creditPartners.some((p: any) => p.user_id === user.user_id) || user.role === "investor" || user.roles?.includes("investor");
                                  const isAdmin = user.roles?.includes("admin") || user.role === "admin";
                                  const isClinic = user.roles?.includes("clinic") || user.role === "clinic" || user.role === "clinica";
                                  
                                  let badgeClass = "bg-green-100 text-green-800 border-green-200";
                                  let badgeLabel = "Paciente";
                                  
                                  if (isAdmin) {
                                    badgeClass = "bg-purple-100 text-purple-800 border-purple-200";
                                    badgeLabel = "Administrador";
                                  } else if (isClinic) {
                                    badgeClass = "bg-blue-100 text-blue-800 border-blue-200";
                                    badgeLabel = "Clínica";
                                  } else if (isInvestor) {
                                    badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                                    badgeLabel = "Parceiro Financeiro";
                                  }

                                  return (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                                      {badgeLabel}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {user.document || "—"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {user.phone || "—"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDate(user.created_at || new Date().toISOString())}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Select
                                    defaultValue={
                                      creditPartners.some((p: any) => p.user_id === user.user_id) || user.role === "investor" || user.roles?.includes("investor")
                                        ? "investor"
                                        : user.roles?.[0] || user.role || "patient"
                                    }
                                    onValueChange={(val: "patient" | "clinic" | "admin" | "investor") =>
                                      handleRoleChange(user.user_id, val as any)
                                    }
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                      <SelectValue placeholder="Cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="patient">Paciente</SelectItem>
                                      <SelectItem value="clinic">Clínica</SelectItem>
                                      <SelectItem value="investor">Parceiro Financeiro</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleDeleteUser(user.user_id)}
                                  >
                                    Apagar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="partners" className="mt-6 space-y-6">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Parceiros de Crédito</h2>
                  <Link to="/seja-parceiro">
                    <Button variant="outline" size="sm">Ver Página de Captação</Button>
                  </Link>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Total Adquirido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-primary">{formatCurrency(totalCreditAcquired)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Crédito Utilizado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-foreground">{formatCurrency(creditVolume)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Parceiros Ativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-foreground">{creditPartners.length}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-6 py-4 font-medium">Nome do Parceiro</th>
                          <th className="px-6 py-4 font-medium">Tipo</th>
                          <th className="px-6 py-4 font-medium">Crédito Disponibilizado</th>
                          <th className="px-6 py-4 font-medium">Crédito Utilizado</th>
                          <th className="px-6 py-4 font-medium">Lucro / Repasse (15%)</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {creditPartners.map((p) => {
                          let name = p.name;
                          let type = p.type || "Investidor Individual";
                          let acquired = p.acquired || 1500000;
                          let used = p.used || 350000;
                          
                          if (!name && p.user_id) {
                            const user = users.find((u) => u.user_id === p.user_id);
                            name = user?.full_name || user?.email || "Parceiro Desconhecido";
                          }

                          const profit = used * 0.15;

                          return (
                            <tr key={p.user_id || name} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{name}</td>
                              <td className="px-6 py-4 text-muted-foreground">{type}</td>
                              <td className="px-6 py-4 font-semibold text-primary">{formatCurrency(acquired)}</td>
                              <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(used)}</td>
                              <td className="px-6 py-4 font-bold text-emerald-500">{formatCurrency(profit)}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                  {p.status || "Ativo"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="finance" className="mt-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Gerenciamento Financeiro (Aportes e Repasses)</h2>
                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-6 py-4 font-medium">Parceiro</th>
                          <th className="px-6 py-4 font-medium">Tipo</th>
                          <th className="px-6 py-4 font-medium">Valor</th>
                          <th className="px-6 py-4 font-medium">Data</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {partnerTransactions?.map((tx) => {
                          const user = users.find((u) => u.user_id === tx.user_id);
                          const name = user?.full_name || user?.email || "Desconhecido";
                          
                          return (
                            <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{name}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tx.type === "deposit" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-orange-100 text-orange-800 border-orange-200"}`}>
                                  {tx.type === "deposit" ? "Aporte" : "Repasse"}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-foreground">{formatCurrency(tx.amount)}</td>
                              <td className="px-6 py-4 text-muted-foreground">{formatDate(tx.created_at)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tx.status === "completed" ? "bg-green-100 text-green-800 border-green-200" : tx.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}`}>
                                  {tx.status === "completed" ? "Concluído" : tx.status === "rejected" ? "Rejeitado" : "Pendente"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {tx.status === "pending" ? (
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleTransactionStatus(tx.id, "completed")}>Concluir</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleTransactionStatus(tx.id, "rejected")}>Rejeitar</Button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Processado</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {(!partnerTransactions || partnerTransactions.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                              Nenhuma transação financeira encontrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Configurações do Sistema
                </h2>
                <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Taxas e Condições</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="interestRate">Taxa de Juros Mensal (%)</Label>
                        <Input id="interestRate" defaultValue="1.99" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxInstallments">Número Máximo de Parcelas</Label>
                        <Input id="maxInstallments" type="number" defaultValue="48" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="downPaymentMin">Entrada Mínima (%)</Label>
                        <Input id="downPaymentMin" type="number" defaultValue="20" />
                      </div>
                      <Button
                        className="w-full mt-2"
                        onClick={() => toast.success("Configurações salvas")}
                      >
                        Salvar Taxas
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Regras de Aprovação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Aprovação Automática</Label>
                          <p className="text-sm text-muted-foreground">
                            Aprovar propostas abaixo de R$ 5.000 automaticamente.
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Verificação SPC/Serasa</Label>
                          <p className="text-sm text-muted-foreground">
                            Ativar consulta obrigatória na API de crédito.
                          </p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Novas Clínicas</Label>
                          <p className="text-sm text-muted-foreground">
                            Exigir aprovação manual para o cadastro de clínicas.
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
