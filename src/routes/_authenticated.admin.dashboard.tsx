import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllLoanApplications, updateLoanApplication } from "@/lib/loans.functions";
import { getAllClinicsAdmin, setClinicStatus } from "@/lib/clinics.functions";
import { StatusBadge } from "@/components/status-badge";
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
  const fetchClinics = useServerFn(getAllClinicsAdmin);
  const updateClinicStatus = useServerFn(setClinicStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["all-loan-applications"],
    queryFn: () => fetchApplications({ data: undefined }),
  });

  const applications: any[] = data?.applications ?? [];

  const {
    data: clinicsData,
    isLoading: clinicsLoading,
    refetch: refetchClinics,
  } = useQuery({
    queryKey: ["admin-clinics"],
    queryFn: () => fetchClinics({ data: undefined }),
  });

  const clinics: any[] = clinicsData?.clinics ?? [];

  async function handleClinicStatus(id: string, status: "approved" | "rejected") {
    try {
      await updateClinicStatus({ data: { id, status } });
      toast.success(status === "approved" ? "Clínica aprovada" : "Clínica reprovada");
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar clínica");
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="mt-2 text-muted-foreground">Analise e aprove propostas de financiamento.</p>

          <div className="mt-8 grid gap-6 md:grid-cols-4">
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

          <div className="mt-8">
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
