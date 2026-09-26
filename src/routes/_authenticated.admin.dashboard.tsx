import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllLoanApplications, updateLoanApplication, updateFabricationOrder } from "@/lib/loans.functions";
import { getAllClinicsForAdmin, updateClinicStatus } from "@/lib/clinics.functions";
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

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — ProtesePay" },
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

  // Reports calculations
  const approvedApps = applications.filter((a) => a.status === "approved");
  const approvalRate = applications.length > 0 ? (approvedApps.length / applications.length) * 100 : 0;
  const creditVolume = approvedApps.reduce((acc, app) => acc + app.requested_amount, 0);

  const clinicCounts = applications.reduce((acc, app) => {
    const name = (app.clinics as any)?.name ?? "Sem Clínica";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topClinics = Object.entries(clinicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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

  async function handleClinicStatus(id: string, status: "approved" | "rejected") {
    try {
      await updateClinic({ data: { id, status } });
      toast.success(`Clínica ${status === "approved" ? "aprovada" : "reprovada"} com sucesso`);
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar clínica");
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
            <TabsList className="grid w-full grid-cols-5 max-w-[1000px]">
              <TabsTrigger value="reports">Relatórios</TabsTrigger>
              <TabsTrigger value="applications">Propostas</TabsTrigger>
              <TabsTrigger value="clinics">Clínicas Parceiras</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
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
                    <CardTitle className="text-sm font-medium text-muted-foreground">Volume de Crédito (Aprovado)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(creditVolume)}</p>
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
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Clínicas Mais Ativas</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {topClinics.map(([name, count]) => (
                    <Card key={name}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="text-sm text-muted-foreground">{count} proposta{count !== 1 ? 's' : ''}</span>
                      </CardContent>
                    </Card>
                  ))}
                  {topClinics.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma clínica encontrada.</p>
                  )}
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
                              {clinic.city ? `${clinic.city}, ${clinic.state}` : "—"}
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
                          {clinic.status === "pending" && (
                            <div className="flex gap-2">
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
                            </div>
                          )}
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
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                  ${
                                    user.roles?.includes("admin") || user.role === "admin"
                                      ? "bg-purple-100 text-purple-800 border-purple-200"
                                      : user.roles?.includes("clinic") ||
                                          user.role === "clinic" ||
                                          user.role === "clinica"
                                        ? "bg-blue-100 text-blue-800 border-blue-200"
                                        : "bg-green-100 text-green-800 border-green-200"
                                  }
                                `}
                                >
                                  {user.roles?.includes("admin") || user.role === "admin"
                                    ? "Administrador"
                                    : user.roles?.includes("clinic") ||
                                        user.role === "clinic" ||
                                        user.role === "clinica"
                                      ? "Clínica"
                                      : "Paciente"}
                                </span>
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
                                    defaultValue={user.roles?.[0] || user.role || "patient"}
                                    onValueChange={(val: "patient" | "clinic" | "admin") =>
                                      handleRoleChange(user.user_id, val)
                                    }
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                      <SelectValue placeholder="Cargo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="patient">Paciente</SelectItem>
                                      <SelectItem value="clinic">Clínica</SelectItem>
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
