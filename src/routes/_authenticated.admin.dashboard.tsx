import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllLoanApplications, updateLoanApplication } from "@/lib/loans.functions";
import { getAllClinicsForAdmin, updateClinicStatus } from "@/lib/clinics.functions";
import { getAllUsersForAdmin } from "@/lib/auth.functions";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
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

  const { data: clinicsData, isLoading: isLoadingClinics, refetch: refetchClinics } = useQuery({
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
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: () => fetchUsers({ data: undefined }),
  });
  
  const users: any[] = usersData?.users ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="mt-2 text-muted-foreground">Analise e aprove propostas de financiamento.</p>

          <Tabs defaultValue="applications" className="mt-8">
            <TabsList className="grid w-full grid-cols-4 max-w-[800px]">
              <TabsTrigger value="applications">Propostas</TabsTrigger>
              <TabsTrigger value="clinics">Clínicas Parceiras</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
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
                        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
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
                            <p className="text-foreground">{formatCurrency(app.requested_amount)}</p>
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
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
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
                            <p className="text-lg font-semibold text-foreground">
                              {clinic.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {clinic.document}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Contato</p>
                            <p className="text-foreground">{clinic.email ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {clinic.phone ?? "—"}
                            </p>
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
                              <Button size="sm" onClick={() => handleClinicStatus(clinic.id, "approved")}>
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
                            <th className="px-6 py-4 font-medium">Tipo de Conta</th>
                            <th className="px-6 py-4 font-medium">Documento</th>
                            <th className="px-6 py-4 font-medium">Contato</th>
                            <th className="px-6 py-4 font-medium">Data de Cadastro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {users.map((user) => (
                            <tr key={user.user_id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">
                                {user.full_name || "Não informado"}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                  ${user.roles?.includes('admin') ? 'bg-purple-100 text-purple-800 border-purple-200' : 
                                    user.roles?.includes('clinic') ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                    'bg-green-100 text-green-800 border-green-200'}
                                `}>
                                  {user.roles?.includes('admin') ? 'Administrador' : 
                                   user.roles?.includes('clinic') ? 'Clínica' : 'Paciente'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {user.document || "—"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {user.phone || "—"}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {formatDate(user.created_at)}
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
                <h2 className="text-xl font-semibold text-foreground mb-4">Configurações do Sistema</h2>
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
                      <Button className="w-full mt-2" onClick={() => toast.success("Configurações salvas (Mocado)")}>
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
