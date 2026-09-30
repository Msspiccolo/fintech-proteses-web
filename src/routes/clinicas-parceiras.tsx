import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useServerFn } from "@tanstack/react-start";
import { getApprovedClinics, registerClinic } from "@/lib/clinics.functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Search,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/clinicas-parceiras")({
  head: () => ({
    meta: [
      { title: "Clínicas Parceiras Credenciadas — PrótesePay" },
      {
        name: "description",
        content:
          "Encontre clínicas ortopédicas credenciadas pela PrótesePay em todo o Brasil ou cadastre sua clínica para oferecer financiamento a pacientes.",
      },
      { property: "og:title", content: "Clínicas Parceiras Credenciadas — PrótesePay" },
      {
        property: "og:description",
        content: "Encontre clínicas ortopédicas credenciadas para financiamento de próteses.",
      },
    ],
  }),
  component: ClinicasParceirasPage,
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome da clínica é obrigatório"),
  legalName: z.string().optional(),
  document: z.string().min(14, "CNPJ inválido").max(18, "CNPJ inválido"),
  phone: z.string().min(10, "Telefone inválido").max(20, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "UF inválida (ex: SP)"),
});

type RegisterForm = z.infer<typeof registerSchema>;

interface Clinic {
  id: string;
  name: string;
  legal_name?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  status: string;
  created_at?: string;
}

function ClinicasParceirasPage() {
  const fetchApproved = useServerFn(getApprovedClinics);
  const registerClinicFn = useServerFn(registerClinic);

  const {
    data: clinicsData,
    isLoading: isLoadingClinics,
    refetch: refetchClinics,
  } = useQuery({
    queryKey: ["approved-clinics"],
    queryFn: () => fetchApproved({ data: undefined }),
  });

  const clinics: Clinic[] = clinicsData?.clinics ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [submitted, setSubmitted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      legalName: "",
      document: "",
      phone: "",
      email: "",
      city: "",
      state: "",
    },
  });

  async function onSubmit(values: RegisterForm) {
    try {
      await registerClinicFn({
        data: {
          name: values.name,
          legalName: values.legalName,
          document: values.document,
          phone: values.phone,
          email: values.email,
          city: values.city,
          state: values.state.toUpperCase(),
        },
      });
      setSubmitted(true);
      toast.success("Clínica cadastrada com sucesso! Em análise pela equipe.");
      refetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar clínica");
    }
  }

  // Available states from the loaded Supabase clinics
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    clinics.forEach((c) => {
      if (c.state) {
        states.add(c.state.toUpperCase());
      }
    });
    return Array.from(states).sort();
  }, [clinics]);

  // Filtered clinics based on search and state
  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
      const matchesState =
        selectedState === "ALL" || (c.state && c.state.toUpperCase() === selectedState);

      const q = searchTerm.toLowerCase().trim();
      if (!q) return matchesState;

      const matchesQuery =
        c.name.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.legal_name && c.legal_name.toLowerCase().includes(q));

      return matchesState && matchesQuery;
    });
  }, [clinics, searchTerm, selectedState]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-background to-background px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck size={16} />
              <span>Rede Credenciada PrótesePay</span>
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Clínicas Parceiras Credenciadas
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Encontre clínicas e centros de reabilitação ortopédica conveniados em todo o Brasil.
              Realize sua avaliação física e financie sua prótese com aprovação facilitada.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#clinicas-cadastradas">
                <Button size="lg" className="gap-2">
                  <Building2 size={18} /> Ver clínicas credenciadas
                </Button>
              </a>
              {!isAuthenticated && (
                <a href="#cadastrar-clinica">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Sparkles size={18} /> Seja uma parceira
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Directory of Clinics from Supabase */}
        <section id="clinicas-cadastradas" className="scroll-mt-20 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Rede de Clínicas Ativas
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Todas as clínicas abaixo são verificadas e aceitam o parcelamento da PrótesePay.
                </p>
              </div>

              {/* State Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedState("ALL")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    selectedState === "ALL"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Todos ({clinics.length})
                </button>
                {availableStates.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedState(st)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      selectedState === st
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {st} ({clinics.filter((c) => c.state?.toUpperCase() === st).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mt-6">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar clínica por nome, cidade ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-11 pr-4 text-base"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Clinics Cards Grid */}
            <div className="mt-8">
              {isLoadingClinics ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 w-3/4 rounded bg-muted" />
                        <div className="mt-3 h-4 w-1/2 rounded bg-muted/70" />
                        <div className="mt-6 space-y-2">
                          <div className="h-4 w-full rounded bg-muted/50" />
                          <div className="h-4 w-4/5 rounded bg-muted/50" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredClinics.length === 0 ? (
                <Card className="border-dashed bg-muted/20 text-center">
                  <CardContent className="py-12">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      Nenhuma clínica encontrada
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Não encontramos nenhuma clínica com os filtros selecionados.
                    </p>
                    {(searchTerm || selectedState !== "ALL") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-2"
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedState("ALL");
                        }}
                      >
                        <RotateCcw size={14} /> Redefinir filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredClinics.map((clinic) => (
                    <Card
                      key={clinic.id}
                      className="group flex flex-col justify-between border-border transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {clinic.name.charAt(0)}
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium gap-1"
                          >
                            <ShieldCheck size={12} />
                            Verificada
                          </Badge>
                        </div>

                        <div className="mt-4">
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            {clinic.name}
                          </h3>
                          {clinic.legal_name && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {clinic.legal_name}
                            </p>
                          )}
                        </div>

                        <div className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                          {(clinic.address || clinic.city) && (
                            <div className="flex items-start gap-2.5">
                              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                              <span>
                                {[clinic.address, clinic.city, clinic.state]
                                  .filter(Boolean)
                                  .join(", ")}
                                {clinic.zip_code ? ` — CEP ${clinic.zip_code}` : ""}
                              </span>
                            </div>
                          )}

                          {clinic.phone && (
                            <div className="flex items-center gap-2.5">
                              <Phone size={16} className="shrink-0 text-primary" />
                              <a
                                href={`tel:${clinic.phone.replace(/\D/g, "")}`}
                                className="hover:text-foreground hover:underline"
                              >
                                {clinic.phone}
                              </a>
                            </div>
                          )}

                          {clinic.email && (
                            <div className="flex items-center gap-2.5">
                              <Mail size={16} className="shrink-0 text-primary" />
                              <a
                                href={`mailto:${clinic.email}`}
                                className="truncate hover:text-foreground hover:underline"
                              >
                                {clinic.email}
                              </a>
                            </div>
                          )}

                          {clinic.document && (
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground/75 pt-1">
                              <Building2 size={14} className="shrink-0" />
                              <span>CNPJ: {clinic.document}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      <div className="border-t border-border/60 bg-muted/10 p-4">
                        <Link to="/simular">
                          <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                            Simular financiamento nesta clínica <ArrowRight size={14} />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Benefits & Registration Section */}
        {!isAuthenticated && (
          <section
            id="cadastrar-clinica"
            className="border-t border-border bg-muted/20 px-4 py-16 md:py-24"
          >
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1 text-xs font-semibold text-muted-foreground">
                <Building2 size={14} /> Para estabelecimentos de saúde
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Quer cadastrar sua clínica na PrótesePay?
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Ofereça opções de crédito facilitado para próteses ortopédicas e aumente a conversão
                de atendimentos em tratamentos realizados.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                    <Building2 size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Credibilidade Médica</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sua clínica passa a oferecer uma solução financeira séria, transparente e 100%
                    voltada à saúde.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                    <Users size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Mais Pacientes Aprovados</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pacientes com dificuldades para pagar à vista conseguem realizar o tratamento em
                    até 48 parcelas.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                    <TrendingUp size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Recebimento Garantido</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O valor do tratamento é repassado para a clínica de forma rápida e com total
                    segurança anti-inadimplência.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Registration Form Box */}
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
              {isLoadingAuth ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Verificando autenticação...</p>
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Crie uma conta para cadastrar sua clínica
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Faça login ou cadastre-se na PrótesePay com a opção &quot;Sou clínica&quot; para
                    iniciar o credenciamento.
                  </p>
                  <Button asChild className="mt-6" size="lg">
                    <Link to="/auth" search={{ tipo: "clinica" }}>
                      Criar conta ou Fazer login
                    </Link>
                  </Button>
                </div>
              ) : submitted ? (
                <div className="text-center py-6">
                  <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
                  <h3 className="mt-4 text-2xl font-bold text-foreground">Cadastro Recebido!</h3>
                  <p className="mt-2 text-muted-foreground">
                    Nossa equipe técnica e comercial analisará os dados da sua clínica e entrará em
                    contato em breve para a liberação na vitrine.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setSubmitted(false);
                      form.reset();
                    }}
                  >
                    Cadastrar outra clínica
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground">
                      Formulário de Pré-Cadastro
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Preencha os dados do seu estabelecimento para análise:
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Fantasia da Clínica</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Centro de Reabilitação Ortopédica" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="legalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Razão Social</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Clínica Ortopédica Especializada Ltda" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ</FormLabel>
                            <FormControl>
                              <Input placeholder="00.000.000/0001-00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone / WhatsApp</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 98765-4321" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email de Contato</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="contato@clinica.com.br" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                  <Input placeholder="São Paulo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div>
                          <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>UF</FormLabel>
                                <FormControl>
                                  <Input placeholder="SP" maxLength={2} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Button type="submit" size="lg" className="w-full mt-4">
                        Enviar solicitação de credenciamento
                      </Button>
                    </form>
                  </Form>
                </>
              )}
            </div>
          </div>
        </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
