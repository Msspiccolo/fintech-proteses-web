import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyLoanApplications } from "@/lib/loans.functions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProposalForm } from "@/components/proposal-form";

export const Route = createFileRoute("/_authenticated/paciente/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Paciente — ProtesePay" },
      {
        name: "description",
        content: "Acompanhe suas propostas de financiamento de próteses ortopédicas.",
      },
    ],
  }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const fetchApplications = useServerFn(getMyLoanApplications);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-loan-applications"],
    queryFn: () => fetchApplications({ data: undefined }),
  });

  const applications = data?.applications ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold text-foreground">Painel do Paciente</h1>
          <p className="mt-2 text-muted-foreground">
            Acompanhe o status das suas propostas de financiamento.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Propostas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{applications.length}</p>
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
                  Em análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {applications.filter((a) => a.status === "pending").length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Nova proposta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajuste o valor e envie uma nova proposta de financiamento.
              </p>
              <Card className="mt-4">
                <CardContent className="p-6">
                  <ProposalForm
                    onSuccess={() =>
                      queryClient.invalidateQueries({ queryKey: ["my-loan-applications"] })
                    }
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Minhas propostas</h2>
              {isLoading ? (
                <p className="mt-4 text-muted-foreground">Carregando...</p>
              ) : applications.length === 0 ? (
                <p className="mt-4 text-muted-foreground">
                  Você ainda não tem propostas. Simule e solicite uma.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {applications.map((app) => (
                    <Card key={app.id}>
                      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor solicitado</p>
                          <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(app.requested_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.installments}x de {formatCurrency(app.monthly_payment)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Clínica</p>
                          <p className="text-foreground">
                            {(app.clinics as { name: string } | null)?.name ?? "Não informada"}
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
