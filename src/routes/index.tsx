import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CreditSimulator } from "@/components/credit-simulator";
import { Activity, Shield, Clock, Stethoscope, ArrowRight, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProtesePay — Financiamento de Próteses" },
      {
        name: "description",
        content: "Simule e financie próteses com parcelas acessíveis para pacientes.",
      },
      { property: "og:title", content: "ProtesePay — Financiamento de Próteses Ortopédicas" },
      {
        property: "og:description",
        content: "Simule e financie próteses ortopédicas com parcelas acessíveis.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [amount, setAmount] = useState(15000);
  const [downPayment, setDownPayment] = useState(3000);
  const [installments, setInstallments] = useState(24);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background" />
          <div className="relative mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <Shield size={16} />
                  <span>Crédito seguro para saúde</span>
                </div>
                <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
                  Financie sua prótese agora com um preço acessível
                </h1>
                <p className="text-lg text-muted-foreground">
                  A ProtesePay traz facilidades para os pacientes.Transparencia e sem burocracia.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/simular">
                    <Button size="lg" className="gap-2">
                      Simular agora <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link to="/como-funciona">
                    <Button size="lg" variant="outline">
                      Como funciona
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-primary" /> Aprovação em minutos
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-primary" /> Sem consulta ao SPC/Serasa
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-primary" /> Até 48x
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-2 shadow-xl">
                <CreditSimulator
                  amount={amount}
                  setAmount={setAmount}
                  downPayment={downPayment}
                  setDownPayment={setDownPayment}
                  installments={installments}
                  setInstallments={setInstallments}
                />
                <div className="px-6 pb-6">
                  <Link to="/auth">
                    <Button className="w-full">Solicitar este crédito</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section className="border-y border-border bg-secondary/30 px-4 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Por que escolher a ProtesePay?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Tecnologia e cuidado para transformar tratamentos em realidade.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Rápido</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Simule em segundos e receba uma resposta de crédito em poucos minutos, direto no
                  app.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Seguro</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Dados protegidos, transparência total nas taxas e sem surpresas no contrato.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <Stethoscope size={24} />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Especializado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Focamos em próteses ortopédicas e clínicas parceiras, com condições pensadas para
                  saúde.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA clínicas */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-gradient-to-br from-secondary to-background p-8 md:p-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold text-foreground">É uma clínica ou hospital?</h2>
                <p className="mt-4 text-muted-foreground">
                  Ofereça financiamento para seus pacientes e converta mais tratamentos. Cadastre
                  sua clínica gratuitamente.
                </p>
              </div>
              <div className="flex justify-start md:justify-end">
                <Link to="/clinicas-parceiras">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Activity size={18} /> Quero ser parceiro
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
