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
      { title: "PróteseCrédito — Financiamento de Próteses Ortopédicas" },
      { name: "description", content: "Simule e financie próteses ortopédicas com parcelas acessíveis. Crédito rápido para pacientes e clínicas parceiras." },
      { property: "og:title", content: "PróteseCrédito — Financiamento de Próteses Ortopédicas" },
      { property: "og:description", content: "Simule e financie próteses ortopédicas com parcelas acessíveis." },
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
                  Financie sua prótese ortopédica com{