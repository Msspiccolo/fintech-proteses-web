import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProposalForm } from "@/components/proposal-form";
import { useRouter } from "@tanstack/react-router";
import { ProsthesisGenerator } from "@/components/prosthesis-generator";
import { PROSTHESIS_MODELS, Prosthesis3DPreview } from "@/components/prosthesis-3d-preview";
import { ArrowRight, CheckCircle, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/simular")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      valor: search.valor ? Number(search.valor) : undefined,
      modelo: search.modelo as string | undefined,
    }
  },
  head: () => ({
    meta: [
      { title: "Simular e Criar — ProMobi" },
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
  const { valor, modelo } = Route.useSearch();
  const router = useRouter();
  const selectedModel = modelo ? PROSTHESIS_MODELS.find(m => m.id === modelo) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          
          {/* Seção 1: Produto Selecionado ou Geração da Prótese */}
          {selectedModel ? (
            <div className="mb-16">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground md:text-4xl">1. Prótese Selecionada</h1>
                <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                  Você selecionou um produto do catálogo. Veja os detalhes e prossiga para a simulação do crédito.
                </p>
              </div>
              
              <div className="w-full max-w-3xl mx-auto overflow-hidden rounded-xl border bg-card shadow-lg flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 bg-muted relative aspect-square flex items-center justify-center">
                  <Prosthesis3DPreview modelId={selectedModel.id as any} autoRotate={true} className="h-full w-full" />
                </div>
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {selectedModel.category}
                  </span>
                  <h3 className="text-2xl font-bold mb-3">{selectedModel.name}</h3>
                  <p className="text-muted-foreground mb-6 line-clamp-4">{selectedModel.description}</p>
                  <div className="mt-auto border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Valor do Produto</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(selectedModel.basePrice)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-16">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground md:text-4xl">1. Personalize sua Prótese</h1>
                <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                  Use nossa Inteligência Artificial para visualizar como será a sua prótese antes mesmo de comprá-la.
                </p>
              </div>
              
              <ProsthesisGenerator />
            </div>
          )}

          <div className="flex justify-center mb-16 opacity-50">
            <ChevronDown className="w-8 h-8 animate-bounce text-primary" />
          </div>

          {/* Seção 2: Simulação de Crédito */}
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">2. Simule e solicite seu crédito</h1>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Ajuste a entrada e o número de parcelas, selecione uma clínica parceira e envie sua proposta para análise.
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
<<<<<<< HEAD
              <CreditSimulator
                prosthesisAmount={prosthesisAmount}
                setProsthesisAmount={setProsthesisAmount}
                adaptationAmount={adaptationAmount}
                setAdaptationAmount={setAdaptationAmount}
                maintenanceAmount={maintenanceAmount}
                setMaintenanceAmount={setMaintenanceAmount}
                downPayment={downPayment}
                setDownPayment={setDownPayment}
                installments={installments}
                setInstallments={setInstallments}
                isFixedValue={!!selectedModel}
              />
=======
              <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
                <ProposalForm 
                  defaultAmount={valor} 
                  defaultModel={modelo as any} 
                  onSuccess={() => router.navigate({ to: "/dashboard" })} 
                />
              </div>
>>>>>>> cb822e4a48025882199f319cb737f38b9afda680

              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Atenção: Valores de Demonstração</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-primary" />
                    <span>Valores e taxas (ex: 1,99% a.m.) são apenas para demonstração.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-primary" />
                    <span>Prazos (ex: até 48x) também são ilustrativos até a definição do parceiro financeiro.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-primary" />
                    <span>As condições reais e o CET serão calculados pelo parceiro financeiro após a análise.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
