import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Building2, LineChart, Users } from "lucide-react";

export const Route = createFileRoute("/cadastro-clinica")({
  head: () => ({
    meta: [
      { title: "Cadastre sua clínica — ProtesePay" },
      {
        name: "description",
        content:
          "Torne-se uma clínica parceira ProtesePay e ofereça financiamento de próteses ortopédicas aos seus pacientes.",
      },
      { property: "og:title", content: "Cadastre sua clínica — ProtesePay" },
      {
        property: "og:description",
        content:
          "Cadastre sua clínica na ProtesePay e acompanhe as propostas de crédito dos seus pacientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClinicSignupPage,
});

const benefits = [
  {
    icon: Users,
    title: "Mais pacientes aprovados",
    description: "Ofereça parcelamento no ato do atendimento e reduza a desistência por preço.",
  },
  {
    icon: LineChart,
    title: "Painel de propostas",
    description: "Acompanhe em tempo real cada proposta enviada pelos seus pacientes.",
  },
  {
    icon: BadgeCheck,
    title: "Selo de clínica parceira",
    description: "Após a aprovação, sua clínica aparece na vitrine pública da ProtesePay.",
  },
];

function ClinicSignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1 text-xs font-medium text-muted-foreground">
              <Building2 size={14} /> Para clínicas e centros ortopédicos
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Cadastre sua clínica na ProtesePay
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Crie a conta da sua clínica em poucos minutos. Após a análise cadastral, você passa a
              receber e acompanhar propostas de financiamento de próteses.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth" search={{ tipo: "clinica" }}>
                <Button size="lg">Criar conta da clínica</Button>
              </Link>
              <Link to="/clinicas-parceiras">
                <Button size="lg" variant="outline">
                  Ver clínicas parceiras
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardHeader>
                  <benefit.icon className="text-primary" size={24} />
                  <CardTitle className="mt-2 text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground">Como funciona o cadastro</h2>
            <ol className="mt-6 space-y-4">
              {[
                "Crie a conta escolhendo o tipo “Sou clínica” e informe o nome do estabelecimento.",
                "Complete os dados cadastrais (CNPJ, endereço e contato) no painel da clínica.",
                "Nossa equipe analisa e aprova o cadastro — o status aparece no seu painel.",
                "Com o cadastro aprovado, sua clínica aparece na vitrine e recebe propostas.",
              ].map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
