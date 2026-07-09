import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, ClipboardCheck, HeartPulse } from "lucide-react";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como Funciona — PróteseCrédito" },
      { name: "description", content: "Entenda como simular, solicitar e acompanhar o financiamento de próteses ortopédicas." },
      { property: "og:title", content: "Como Funciona — PróteseCrédito" },
      { property: "og:description", content: "Entenda como simular, solicitar e acompanhar o financiamento de próteses ortopédicas." },
    ],
  }),
  component: ComoFuncionaPage,
});

const steps = [
  {
    icon: Search,
    title: "1. Simule",
    description: "Escolha o valor do tratamento, a entrada e o número de parcelas. Veja a prestação mensal em segundos.",
  },
  {
    icon: FileText,
    title: "2. Solicite",
    description: "Crie sua conta com email e senha. Informe seus dados e os da prótese ou clínica escolhida.",
  },
  {
    icon: ClipboardCheck,
    title: "3. Análise",
    description: "Nossa equipe avalia a proposta rapidamente. Você acompanha o status pelo painel.",
  },
  {
    icon: HeartPulse,
    title: "4. Realize",
    description: "Após aprovação, o crédito é liberado para a clínica e você realiza o tratamento.",
  },
];

function ComoFuncionaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Como funciona</h1>
            <p className="mt-4 text-muted-foreground">
              Quatro passos simples para financiar sua prótese ortopédica.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {steps.map((step) => (
              <Card key={step.title}>
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                    <step.icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
