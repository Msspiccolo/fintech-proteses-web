import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClinicLoanApplications } from "@/lib/loans.functions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const Route = createFileRoute("/_authenticated/clinica/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel da Clínica — PróteseCrédito" },
      { name: "description", content: "Gerencie propostas de financiamento enviadas pelos pacientes da sua clínica." },
    ],
  }),
  component: ClinicDashboard,
});

function ClinicDashboard() {
  const fetchApplications = useServerFn(getClinicLoanApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["clinic-loan-applications"],
    queryFn: () => fetchApplications({ data: undefined }),
  });

  const applications = data?.applications ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold text-foreground">Painel da Clínica</h1>
          <p className="mt-2 text-muted-foreground">Acompanhe as propostas de financiamento dos seus pacientes.</p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Propostas recebidas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{applications.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Aprovadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {applications.filter((a) => a.status === "approved").length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {applications.filter((a) => a.status === "pending").length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">Propostas da clínica</h2>
            {isLoading ? (
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            ) : applications.length === 0 ? (
              <p className="mt-4 text-muted-foreground">Nenhuma proposta recebida ainda.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {applications.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Paciente</p>
                        <p className="text-lg font-semibold text-foreground">
                          {(app.profiles as { full_name: string | null } | null)?.full_name ?? "Não informado"}
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
