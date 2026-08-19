import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Box, Loader2, Sparkles, Download } from "lucide-react";
import { flushSync } from "react-dom";
import { streamImage } from "@/lib/streamImage";
import {
  Prosthesis3DPreview,
  PROSTHESIS_MODELS,
  type ProsthesisModelId,
} from "@/components/prosthesis-3d-preview";
import { useServerFn } from "@tanstack/react-start";
import { createLoanApplication } from "@/lib/loans.functions";
import { getApprovedClinics } from "@/lib/clinics.functions";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const proposalSchema = z.object({
  requestedAmount: z.number().positive("Valor deve ser maior que zero"),
  downPayment: z.number().min(0),
  installments: z.number().int().min(1).max(60),
  clinicId: z.string().optional(),
  purpose: z.string().optional(),
});

type ProposalForm = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  onSuccess?: () => void;
}

export function ProposalForm({ onSuccess }: ProposalFormProps) {
  const createApplication = useServerFn(createLoanApplication);
  const fetchClinics = useServerFn(getApprovedClinics);

  const { data: clinicsData } = useQuery({
    queryKey: ["approved-clinics"],
    queryFn: () => fetchClinics({ data: undefined }),
  });

  const clinics = clinicsData?.clinics ?? [];

  const [amount, setAmount] = useState(15000);
  const [downPayment, setDownPayment] = useState(3000);
  const [installments, setInstallments] = useState(24);
  const [include3D, setInclude3D] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ProsthesisModelId | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFinal, setPreviewFinal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const modeling3DCost = 1500;
  const interestRate = 1.99;

  const form = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      requestedAmount: amount,
      downPayment,
      installments,
      clinicId: "",
      purpose: "",
    },
  });

  const totalAmount = amount + (include3D ? modeling3DCost : 0);
  const financedAmount = Math.max(0, totalAmount - downPayment);
  const monthlyRate = interestRate / 100;
  const monthlyPayment =
    monthlyRate === 0
      ? financedAmount / installments
      : (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
        (Math.pow(1 + monthlyRate, installments) - 1);
  const totalCost = monthlyPayment * installments + downPayment;

  async function handleGeneratePreview() {
    const description = form.getValues("purpose") || "";
    setGenerating(true);
    setPreviewUrl(null);
    setPreviewFinal(false);
    try {
      await streamImage("/api/generate-3d-preview", { description }, (dataUrl, isFinal) => {
        flushSync(() => {
          setPreviewUrl(dataUrl);
          if (isFinal) setPreviewFinal(true);
        });
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar prévia 3D");
    } finally {
      setGenerating(false);
    }
  }

  async function onSubmit(values: ProposalForm) {
    try {
      const selected = PROSTHESIS_MODELS.find((m) => m.id === selectedModel);
      const purposeText = [
        values.purpose,
        selected ? `[Modelo escolhido: ${selected.name}]` : null,
        include3D ? "[Modelagem 3D personalizada incluída]" : null,
      ]
        .filter(Boolean)
        .join(" ");
      await createApplication({
        data: {
          requestedAmount: totalAmount,
          downPayment: values.downPayment,
          installments: values.installments,
          monthlyPayment: Number(monthlyPayment.toFixed(2)),
          interestRate,
          totalCost: Number(totalCost.toFixed(2)),
          clinicId: values.clinicId || undefined,
          purpose: purposeText,
        },
      });
      toast.success("Proposta enviada com sucesso!");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar proposta");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Valor do tratamento</Label>
          <span className="text-lg font-semibold text-primary">{formatCurrency(amount)}</span>
        </div>
        <Slider
          min={1000}
          max={100000}
          step={500}
          value={[amount]}
          onValueChange={(value) => {
            setAmount(value[0]);
            form.setValue("requestedAmount", value[0]);
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Entrada</Label>
          <span className="text-lg font-semibold text-primary">{formatCurrency(downPayment)}</span>
        </div>
        <Slider
          min={0}
          max={amount}
          step={500}
          value={[downPayment]}
          onValueChange={(value) => {
            setDownPayment(value[0]);
            form.setValue("downPayment", value[0]);
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Parcelas</Label>
          <span className="text-lg font-semibold text-primary">{installments}x</span>
        </div>
        <Slider
          min={1}
          max={48}
          step={1}
          value={[installments]}
          onValueChange={(value) => {
            setInstallments(value[0]);
            form.setValue("installments", value[0]);
          }}
        />
      </div>

      <div>
        <Label htmlFor="clinic">Clínica parceira (opcional)</Label>
        <Select
          onValueChange={(value) => form.setValue("clinicId", value === "none" ? "" : value)}
          defaultValue="none"
        >
          <SelectTrigger id="clinic" className="mt-1.5">
            <SelectValue placeholder="Selecione uma clínica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="purpose">Finalidade / observação</Label>
        <Input
          id="purpose"
          placeholder="Ex: prótese de quadril"
          className="mt-1.5"
          {...form.register("purpose")}
        />
      </div>

      <div className="space-y-3">
        <div>
          <Label>Modelos disponíveis</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha um modelo existente do nosso catálogo — visualize em 3D antes de solicitar.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROSTHESIS_MODELS.map((model) => {
            const active = selectedModel === model.id;
            return (
              <button
                type="button"
                key={model.id}
                onClick={() => {
                  setSelectedModel(active ? null : model.id);
                  if (!active) {
                    setAmount(model.basePrice);
                    form.setValue("requestedAmount", model.basePrice);
                    if (downPayment > model.basePrice) {
                      setDownPayment(0);
                      form.setValue("downPayment", 0);
                    }
                  }
                }}
                className={
                  "group overflow-hidden rounded-lg border text-left transition-all " +
                  (active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/60")
                }
              >
                <Prosthesis3DPreview
                  modelId={model.id}
                  autoRotate={active}
                  className="aspect-square w-full"
                />
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{model.name}</span>
                    <span className="text-xs font-medium text-primary">
                      {formatCurrency(model.basePrice)}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {model.category}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{model.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="modeling-3d"
              checked={include3D}
              onCheckedChange={(v) => {
                setInclude3D(v === true);
                if (v !== true) {
                  setPreviewUrl(null);
                  setPreviewFinal(false);
                }
              }}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor="modeling-3d"
                className="flex cursor-pointer items-center gap-2 text-base font-semibold text-foreground"
              >
                <Box className="h-4 w-4 text-primary" />
                Modelagem 3D personalizada da prótese
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Modelo 3D sob medida, com arquivo{" "}
                <span className="font-semibold text-foreground">.STL</span> compatível com
                impressoras 3D médicas (FDM/SLA/SLS). Entregue após aprovação, junto de renderização
                técnica. Acréscimo de{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(modeling3DCost)}
                </span>{" "}
                ao valor financiado.
              </p>

              {include3D && (
                <div className="mt-4 space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGeneratePreview}
                    disabled={generating}
                    className="gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando prévia...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {previewUrl ? "Gerar novamente" : "Gerar prévia 3D com IA"}
                      </>
                    )}
                  </Button>
                  {previewUrl && (
                    <div className="overflow-hidden rounded-lg border border-border bg-background">
                      <img
                        src={previewUrl}
                        alt="Prévia da prótese modelada em 3D"
                        className={
                          "w-full transition-[filter] duration-500 " +
                          (previewFinal ? "blur-0" : "blur-2xl")
                        }
                      />
                      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        <span>Prévia ilustrativa • Arquivo STL final entregue após aprovação</span>
                        {previewFinal && (
                          <a
                            href={previewUrl}
                            download="prevía-protese-3d.png"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" /> PNG
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Parcela mensal</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyPayment)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total estimado</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(totalCost)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Taxa de {interestRate}% ao mês{include3D ? " • Inclui modelagem 3D" : ""}
          </p>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full">
        Enviar proposta
      </Button>
    </form>
  );
}
