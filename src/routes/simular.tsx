import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CreditSimulator } from "@/components/credit-simulator";
import { ProsthesisGenerator } from "@/components/prosthesis-generator";
import { ArrowRight, CheckCircle, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/simular")({
  head: () => ({
    meta: [
      { title: "Simular e Criar — PrótesePay" },
      {
        name: "description",
        content:
          "Crie a sua prótese com IA e simule o financiamento em poucos minutos.",
      },
    ],
  }),
  component: SimularPage,
});

function SimularPage() {
  const [amount, setAmount] = useState(15000);
  const [downPayment, setDownPayment] = useState(3000);
  const [installments, setInstallments] = useState(24);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          
          {/* Seção 1: Geração da Prótese */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">1. Personalize sua Prótese</h1>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Use nossa Inteligência Artificial para visualizar como será a sua prótese antes mesmo de comprá-la.
              </p>
            </div>
            
            <ProsthesisGenerator />
          </div>

          <div className="flex justify-center mb-16 opacity-50">
            <ChevronDown className="w-8 h-8 animate-bounce text-primary" />
          </div>

          {/* Seção 2: Simulação de Crédito */}
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">2. Simule seu crédito</h1>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Ajuste o valor do tratamento, a entrada e o número de parcelas. Veja o resultado em tempo real.
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
              <CreditSimulator
                amount={amount}
                setAmount={setAmount}
                downPayment={downPayment}
                setDownPayment={setDownPayment}
                installments={installments}
                setInstallments={setInstallments}
              />

              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">O que você precisa saber:</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-primary" />
                    <span>Taxa a partir de 1,99% ao mês para clientes selecionados.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-primary" />
                    <span>Parcelamento em até 48x, sem burocracia.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-primary" />
                    <span>A análise de crédito é feita em poucos minutos.</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link to="/auth">
                    <Button size="lg" className="w-full gap-2">
                      Solicitar este crédito <ArrowRight size={18} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
