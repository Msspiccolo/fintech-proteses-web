import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Box } from "lucide-react";
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

  async function onSubmit(values: ProposalForm) {
    try {
      const purposeText = [
        values.purpose,
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
        <Select onValueChange={(value) => form.setValue("clinicId", value)} defaultValue="">
          <SelectTrigger id="clinic" className="mt-1.5">
            <SelectValue placeholder="Selecione uma clínica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhuma</SelectItem>
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

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="modeling-3d"
              checked={include3D}
              onCheckedChange={(v) => setInclude3D(v === true)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="modeling-3d" className="flex cursor-pointer items-center gap-2 text-base font-semibold text-foreground">
                <Box className="h-4 w-4 text-primary" />
                Modelagem 3D personalizada da prótese
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Escaneamento e impressão 3D sob medida para máximo conforto e precisão anatômica.
                Acréscimo de <span className="font-semibold text-foreground">{formatCurrency(modeling3DCost)}</span> ao valor financiado.
              </p>
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
