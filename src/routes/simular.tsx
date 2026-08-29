import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CreditSimulator } from "@/components/credit-simulator";
import { ArrowRight, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/simular")({
  head: () => ({
    meta: [
      { title: "Simular Crédito — PrótesePay" },
      {
        name: "description",
        content:
          "Simule o financiamento da sua prótese ortopédica. Escolha valor, entrada e parcelas.",
      },
      { property: "og:title", content: "Simular Crédito — PrótesePay" },
      { property: "og:description", content: "Simule o financiamento da sua prótese ortopédica." },
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

      <main className="flex-1 px-4 py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Simule seu crédito</h1>
            <p className="mt-4 text-muted-foreground">
              Ajuste o valor do tratamento, a entrada e o número de parcelas. Veja o resultado em
              tempo real.
            </p>
          </div>

          <div className="mt-10">
            <CreditSimulator
              amount={amount}
              setAmount={setAmount}
              downPayment={downPayment}
              setDownPayment={setDownPayment}
              installments={installments}
              setInstallments={setInstallments}
            />
          </div>

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
      </main>

      <Footer />
    </div>
  );
}
