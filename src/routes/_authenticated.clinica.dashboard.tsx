import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClinicLoanApplications } from "@/lib/loans.functions";
import { getClinicByUser, registerClinic } from "@/lib/clinics.functions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const Route = createFileRoute("/_authenticated/clinica/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel da Clínica — PrótesePay" },
      {
        name: "description",
        content: "Confira e faça o gerenciamento das propostas de créditos dos pacientes.",
      },
    ],
  }),
  component: ClinicDashboard,
});

function ClinicDashboard() {
  const fetchApplications = useServerFn(getClinicLoanApplications);
  const fetchMyClinics = useServerFn(getClinicByUser);
  const createClinic = useServerFn(registerClinic);

  const { data, isLoading } = useQuery({
    queryKey: ["clinic-loan-applications"],
    queryFn: () => fetchApplications({ data: undefined }),
  });

  const {
    data: clinicData,
    isLoading: clinicLoading,
    refetch: refetchClinics,
  } = useQuery({
    queryKey: ["my-clinics"],
    queryFn: () => fetchMyClinics({ data: undefined }),
  });

  const clinics: any[] = clinicData?.clinics ?? [];

  const [form, setForm] = useState({
    name: "",
    legalName: "",
    document: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleRegisterClinic(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createClinic({
        data: {
          name: form.name,
          legalName: form.legalName || undefined,
          document: form.document || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          zipCode: form.zipCode || undefined,
        },
      });
      toast.success("Clínica cadastrada! Aguarde a aprovação da equipe ProtesePay.");
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar clínica");
    } finally {
      setSaving(false);
    }
  }

  const applications = data?.applications ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold text-foreground">Painel da Clínica</h1>
          <p className="mt-2 text-muted-foreground">
            Acompanhe as propostas de financiamento dos seus pacientes.
          </p>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">Minha clínica</h2>
            {clinicLoading ? (
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            ) : clinics.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {clinics.map((clinic) => (
                  <Card key={clinic.id}>
                    <CardContent className="space-y-2 p-6">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-lg font-semibold text-foreground">{clinic.name}</p>
                        <StatusBadge status={clinic.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {clinic.city ? `${clinic.city}${clinic.state ? ` - ${clinic.state}` : ""}` : "Endereço não informado"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {clinic.document ? `CNPJ: ${clinic.document}` : "CNPJ não informado"}
                      </p>
                      {clinic.status === "pending" && (
                        <p className="text-sm text-muted-foreground">
                          Cadastro em análise. Assim que aprovado, sua clínica aparece na vitrine
                          pública.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Cadastre sua clínica</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterClinic} className="grid gap-4 sm:grid-cols-2">
                    {[
                      { key: "name", label: "Nome da clínica", required: true },
                      { key: "legalName", label: "Razão social" },
                      { key: "document", label: "CNPJ" },
                      { key: "phone", label: "Telefone" },
                      { key: "email", label: "Email" },
                      { key: "address", label: "Endereço" },
                      { key: "city", label: "Cidade" },
                      { key: "state", label: "UF" },
                      { key: "zipCode", label: "CEP" },
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Input
                          id={field.key}
                          required={field.required}
                          value={form[field.key as keyof typeof form]}
                          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Enviando..." : "Enviar cadastro para aprovação"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Propostas recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">{applications.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aprovadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">
                  {applications.filter((a: any) => a.status === "approved").length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">
                  {applications.filter((a: any) => a.status === "pending").length}
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
                {applications.map((app: any) => (
                  <Card key={app.id}>
                    <CardContent className="flex flex-col gap-8 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Paciente</p>
                        <p className="text-lg font-semibold text-foreground">
                          {(app.profiles as unknown as { full_name: string | null } | null)
                            ?.full_name ?? "Não informado"}
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
