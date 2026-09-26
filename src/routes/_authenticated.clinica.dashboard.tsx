import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAuthenticatedUserRole } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getClinicLoanApplications } from "@/lib/loans.functions";
import { getClinicByUser, registerClinic } from "@/lib/clinics.functions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  Activity,
  Users,
  CreditCard,
  TrendingUp,
  Package,
  AlertCircle,
  FileText,
  Eye,
  History,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/clinica/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel da Clínica — PrótesePay" },
      {
        name: "description",
        content: "Painel de controle e inteligência de negócios para sua clínica.",
      },
    ],
  }),
  component: ClinicDashboard,
});

// Mock data for most sold prosthetics, since we don't have a products table yet
const MOCK_PROSTHETICS_DATA = [
  { name: "Joelho Biônico (Gen 3)", vendas: 45, valor: 450000 },
  { name: "Pé em Fibra de Carbono", vendas: 32, valor: 160000 },
  { name: "Braço Mioelétrico", vendas: 28, valor: 336000 },
  { name: "Prótese Transfemoral", vendas: 15, valor: 120000 },
  { name: "Mão Robótica", vendas: 10, valor: 250000 },
];

const MOCK_CLIENTS_DATA = [
  {
    id: 1,
    name: "João Carlos Silva",
    propostas: 2,
    statusPagamento: "Em dia",
    valorTotal: 150000,
    produto: "Joelho Biônico (Gen 3)",
    parcelasPagas: 12,
    parcelasRestantes: 12,
    parcelasAtrasadas: 0,
    historicoBoletos: [],
  },
  {
    id: 2,
    name: "Maria Fernanda Oliveira",
    propostas: 1,
    statusPagamento: "Em atraso",
    valorTotal: 45000,
    produto: "Pé em Fibra de Carbono",
    parcelasPagas: 4,
    parcelasRestantes: 20,
    parcelasAtrasadas: 2,
    historicoBoletos: [
      { data: "2023-10-15T10:00:00Z", tipo: "Mensagem de cobrança" },
      { data: "2023-10-18T14:30:00Z", tipo: "Boleto 2ª via gerado" },
    ],
  },
  {
    id: 3,
    name: "Pedro Henrique Santos",
    propostas: 3,
    statusPagamento: "Em dia",
    valorTotal: 210000,
    produto: "Braço Mioelétrico",
    parcelasPagas: 18,
    parcelasRestantes: 6,
    parcelasAtrasadas: 0,
    historicoBoletos: [],
  },
  {
    id: 4,
    name: "Ana Beatriz Costa",
    propostas: 1,
    statusPagamento: "Em dia",
    valorTotal: 85000,
    produto: "Prótese Transfemoral",
    parcelasPagas: 2,
    parcelasRestantes: 22,
    parcelasAtrasadas: 0,
    historicoBoletos: [],
  },
  {
    id: 5,
    name: "Roberto Alves",
    propostas: 1,
    statusPagamento: "Inadimplente",
    valorTotal: 120000,
    produto: "Mão Robótica",
    parcelasPagas: 1,
    parcelasRestantes: 23,
    parcelasAtrasadas: 5,
    historicoBoletos: [
      { data: "2023-09-01T09:15:00Z", tipo: "Mensagem de cobrança" },
      { data: "2023-09-10T11:20:00Z", tipo: "Boleto 2ª via gerado" },
      { data: "2023-09-25T16:45:00Z", tipo: "Aviso de inadimplência" },
    ],
  },
];

const MOCK_KPIS = {
  clientesCadastrados: 124,
  valoresASeremPagos: 2850000,
  valoresAVencer: 340000,
  clientesInadimplentes: 12,
  protesesVendidas: 130,
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

function ClinicDashboard() {
  const router = useRouter();
  useEffect(() => {
    let isMounted = true;
    getAuthenticatedUserRole().then(async (role) => {
      if (!isMounted) return;

      if (role === "patient") {
        router.navigate({ to: "/paciente/dashboard", replace: true });
        return;
      }

      if (role === "admin") {
        router.navigate({ to: "/admin/dashboard", replace: true });
        return;
      }

      if (role !== "clinic") {
        try {
          const { setAccountAsClinic } = await import("@/lib/auth-client");
          await setAccountAsClinic();
        } catch {
          // Ignore
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const [clients, setClients] = useState(MOCK_CLIENTS_DATA);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  function handleAction(clientId: number, actionType: string, message: string) {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          return {
            ...c,
            historicoBoletos: [
              ...c.historicoBoletos,
              { data: new Date().toISOString(), tipo: actionType },
            ],
          };
        }
        return c;
      }),
    );
    toast.success(message);
    
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient((prev: any) => ({
        ...prev,
        historicoBoletos: [
          ...prev.historicoBoletos,
          { data: new Date().toISOString(), tipo: actionType },
        ],
      }));
    }
  }

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
      toast.success("Clínica cadastrada! Aguarde a aprovação da equipe PrótesePay.");
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar clínica");
    } finally {
      setSaving(false);
    }
  }

  const applications = data?.applications ?? [];

  // Business Intelligence KPIs
  const { totalRevenue, ticketMedio, conversionRate, monthlyData } = useMemo(() => {
    const approvedApps = applications.filter((a: any) => a.status === "approved");
    const total = approvedApps.reduce(
      (acc: number, curr: any) => acc + Number(curr.requested_amount || 0),
      0,
    );
    const ticket = approvedApps.length > 0 ? total / approvedApps.length : 0;
    const rate = applications.length > 0 ? (approvedApps.length / applications.length) * 100 : 0;

    // Aggregate by month for chart
    const monthlyAcc: Record<string, number> = {};
    applications.forEach((app: any) => {
      if (app.status === "approved") {
        const date = new Date(app.created_at);
        const month = date.toLocaleString("pt-BR", { month: "short" });
        monthlyAcc[month] = (monthlyAcc[month] || 0) + Number(app.requested_amount || 0);
      }
    });

    // Format for Recharts
    const chartData = Object.keys(monthlyAcc).map((month) => ({
      name: month,
      Total: monthlyAcc[month],
    }));

    // Add mock months if real data is empty or too small
    if (chartData.length < 3) {
      chartData.push(
        { name: "Jan", Total: 150000 },
        { name: "Fev", Total: 280000 },
        { name: "Mar", Total: 190000 },
      );
    }

    return {
      totalRevenue: total,
      ticketMedio: ticket,
      conversionRate: rate,
      monthlyData: chartData.reverse(), // naive ordering for mock mix
    };
  }, [applications]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Inteligência de Negócios</h1>
              <p className="mt-1 text-muted-foreground">
                Painel analítico e gerenciamento de financiamentos da sua clínica.
              </p>
            </div>

            {clinics.length > 0 && clinics[0].status === "approved" && (
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
                <Activity size={18} />
                <span className="text-sm font-medium">Clínica Ativa e Verificada</span>
              </div>
            )}
          </div>

          {!clinicLoading && clinics.length === 0 && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <Activity size={20} />
                  Complete o Cadastro da Sua Clínica
                </CardTitle>
                <CardDescription>
                  Para começar a receber propostas e analisar métricas reais, precisamos dos dados
                  da sua empresa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleRegisterClinic}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {[
                    { key: "name", label: "Nome da clínica", required: true },
                    { key: "legalName", label: "Razão social" },
                    { key: "document", label: "CNPJ" },
                    { key: "phone", label: "Telefone" },
                    { key: "email", label: "Email" },
                    { key: "city", label: "Cidade" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        required={field.required}
                        value={form[field.key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end mt-4">
                    <Button type="submit" disabled={saving} size="lg">
                      {saving ? "Enviando..." : "Enviar cadastro para aprovação"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* KPIs Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{MOCK_KPIS.clientesCadastrados}</div>
                <p className="text-xs text-muted-foreground mt-1">Pacientes da clínica</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valores a Receber</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(MOCK_KPIS.valoresASeremPagos)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total em financiamentos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valores a Vencer</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(MOCK_KPIS.valoresAVencer)}</div>
                <p className="text-xs text-muted-foreground mt-1">Próximos 30 dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {MOCK_KPIS.clientesInadimplentes}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Clientes que não pagaram</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próteses Vendidas</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{MOCK_KPIS.protesesVendidas}</div>
                <p className="text-xs text-muted-foreground mt-1">Unidades financiadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-8 lg:grid-cols-2 mb-8">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Receita Mensal (Financiamentos)
                </CardTitle>
                <CardDescription>Evolução de crédito aprovado por mês</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        tickFormatter={(value: number) =>
                          Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            notation: "compact",
                            maximumFractionDigits: 1,
                          }).format(value)
                        }
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="Total"
                        fill="var(--color-primary)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Próteses Mais Vendidas
                </CardTitle>
                <CardDescription>
                  Distribuição por volume de unidades (Dados Inteligentes)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={MOCK_PROSTHETICS_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="vendas"
                      >
                        {MOCK_PROSTHETICS_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [`${value} unidades`, "Vendas"]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {MOCK_PROSTHETICS_DATA.slice(0, 4).map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      ></div>
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clients and Proposals Table */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Clientes e Propostas
            </h2>
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-6 py-4 font-medium">Nome do Cliente</th>
                      <th className="px-6 py-4 font-medium text-center">Nº de Propostas</th>
                      <th className="px-6 py-4 font-medium">Valor Total</th>
                      <th className="px-6 py-4 font-medium">Status de Pagamento</th>
                      <th className="px-6 py-4 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{client.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center bg-secondary w-8 h-8 rounded-full font-bold text-secondary-foreground">
                            {client.propostas}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {formatCurrency(client.valorTotal)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${client.statusPagamento === "Em dia" ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" : ""}
                            ${client.statusPagamento === "Em atraso" ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" : ""}
                            ${client.statusPagamento === "Inadimplente" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" : ""}
                          `}
                          >
                            {client.statusPagamento}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedClient(client);
                                setIsClientDialogOpen(true);
                              }}
                              title="Visualizar Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {client.statusPagamento === "Em atraso" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(client.id, "Mensagem de cobrança", `Mensagem de cobrança enviada para ${client.name}!`)}
                                >
                                  Enviar mensagem
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(client.id, "Boleto 2ª via gerado", `Boleto gerado e enviado para ${client.name}!`)}
                                >
                                  Gerar boleto
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedClient.name}</DialogTitle>
                <DialogDescription>Detalhes do cliente e histórico de pagamentos.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="col-span-2 md:col-span-4 bg-muted/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Produto Comprado</p>
                        <p className="text-lg font-semibold flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          {selectedClient.produto}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1
                          ${selectedClient.statusPagamento === "Em dia" ? "bg-green-100 text-green-800 border-green-200" : ""}
                          ${selectedClient.statusPagamento === "Em atraso" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}
                          ${selectedClient.statusPagamento === "Inadimplente" ? "bg-red-100 text-red-800 border-red-200" : ""}
                        `}
                        >
                          {selectedClient.statusPagamento}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Parcelas Pagas</p>
                      <p className="text-3xl font-bold text-primary">{selectedClient.parcelasPagas}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Restantes</p>
                      <p className="text-3xl font-bold">{selectedClient.parcelasRestantes}</p>
                    </CardContent>
                  </Card>

                  <Card className={selectedClient.parcelasAtrasadas > 0 ? "border-destructive/50" : ""}>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Atrasadas</p>
                      <p className={`text-3xl font-bold ${selectedClient.parcelasAtrasadas > 0 ? "text-destructive" : ""}`}>
                        {selectedClient.parcelasAtrasadas}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Valor Total</p>
                      <p className="text-xl font-bold">{formatCurrency(selectedClient.valorTotal)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Histórico de Ações (Mensagens / Boletos)
                  </h3>
                  
                  {selectedClient.historicoBoletos && selectedClient.historicoBoletos.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 font-medium text-left">Data e Hora</th>
                            <th className="px-4 py-2 font-medium text-left">Ação Executada</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedClient.historicoBoletos.map((h: any, i: number) => (
                            <tr key={i}>
                              <td className="px-4 py-3">{formatDate(h.data)} - {new Date(h.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{h.tipo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">
                      Nenhuma ação registrada para este cliente.
                    </p>
                  )}
                </div>

                {selectedClient.statusPagamento === "Em atraso" && (
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleAction(selectedClient.id, "Mensagem de cobrança", `Mensagem de cobrança enviada para ${selectedClient.name}!`)}
                    >
                      Enviar nova mensagem
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => handleAction(selectedClient.id, "Boleto 2ª via gerado", `Boleto gerado e enviado para ${selectedClient.name}!`)}
                    >
                      Gerar novo boleto
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
