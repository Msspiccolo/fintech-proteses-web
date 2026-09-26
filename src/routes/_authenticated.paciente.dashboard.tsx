import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getAuthenticatedUserRole } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyLoanApplications } from "@/lib/loans.functions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProposalForm } from "@/components/proposal-form";
import { PatientApplicationExtras } from "@/components/application-extras";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/paciente/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Paciente | PrótesePay" },
      {
        name: "description",
        content: "Acompanhe suas propostas de financiamento de próteses ortopédicas.",
      },
    ],
  }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const router = useRouter();
  useEffect(() => {
    let isMounted = true;
    getAuthenticatedUserRole().then((role) => {
      if (!isMounted) return;
      if (role === "clinic") {
        router.navigate({ to: "/clinica/dashboard", replace: true });
        return;
      }
      if (role === "admin") {
        router.navigate({ to: "/admin/dashboard", replace: true });
        return;
      }
      if (role === "patient") {
        return; // already here, no need to navigate
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel do Paciente</h1>
              <p className="mt-2 text-muted-foreground">
                Acompanhe o status das suas propostas de financiamento.
              </p>
            </div>
          </div>

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
                  {applications.filter((a: any) => a.status === "approved").length}
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
                  {applications.filter((a: any) => a.status === "pending").length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">Minhas propostas</h2>
            {isLoading ? (
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            ) : applications.length === 0 ? (
              <p className="mt-4 text-muted-foreground">
                Você ainda não tem propostas. Simule e solicite uma abaixo.
              </p>
            ) : (
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                {applications.map((app: any) => (
                  <Card key={app.id}>
                    <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 flex-1">
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
                      </div>
                    </CardContent>
                    <PatientApplicationExtras app={app} />
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form area expanded to full width */}
        <div className="mt-16 w-full bg-muted/20 border-t py-12 px-4 lg:px-12">
          <div className="mx-auto max-w-[1400px]">
            <h2 className="text-2xl font-semibold text-foreground text-center">Nova proposta</h2>
            <p className="mt-2 text-muted-foreground text-center mb-10">
              Ajuste o valor, configure as parcelas e selecione sua prótese em nosso catálogo.
            </p>
            <Card>
              <CardContent className="p-6 md:p-8">
                <ProposalForm
                  onSuccess={() =>
                    queryClient.invalidateQueries({ queryKey: ["my-loan-applications"] })
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
