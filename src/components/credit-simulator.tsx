import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface CreditSimulatorProps {
  prosthesisAmount: number;
  setProsthesisAmount: (value: number) => void;
  adaptationAmount: number;
  setAdaptationAmount: (value: number) => void;
  maintenanceAmount: number;
  setMaintenanceAmount: (value: number) => void;
  downPayment: number;
  setDownPayment: (value: number) => void;
  installments: number;
  setInstallments: (value: number) => void;
  interestRate?: number;
}

export function CreditSimulator({
  prosthesisAmount,
  setProsthesisAmount,
  adaptationAmount,
  setAdaptationAmount,
  maintenanceAmount,
  setMaintenanceAmount,
  downPayment,
  setDownPayment,
  installments,
  setInstallments,
  interestRate = 1.99,
}: CreditSimulatorProps) {
  const amount = prosthesisAmount + adaptationAmount + maintenanceAmount;
  const financedAmount = Math.max(0, amount - downPayment);

  const calculation = useMemo(() => {
    const monthlyRate = interestRate / 100;
    if (installments === 0) return { monthlyPayment: 0, totalCost: 0, cet: 0 };

    const monthlyPayment =
      monthlyRate === 0
        ? financedAmount / installments
        : (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
          (Math.pow(1 + monthlyRate, installments) - 1);

    const totalCost = monthlyPayment * installments + downPayment;
    const cet = financedAmount > 0 ? ((totalCost - amount) / amount) * 100 : 0;

    return {
      monthlyPayment: Number(monthlyPayment.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      cet: Number(cet.toFixed(2)),
    };
  }, [financedAmount, installments, interestRate, downPayment, amount]);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="prosthesisAmount">Prótese e tratamento</Label>
            <span className="text-lg font-semibold text-primary">{formatCurrency(prosthesisAmount)}</span>
          </div>
          <Slider
            id="prosthesisAmount"
            min={1000}
            max={100000}
            step={500}
            value={[prosthesisAmount]}
            onValueChange={(value) => setProsthesisAmount(value[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="adaptationAmount">Adaptação</Label>
            <span className="text-lg font-semibold text-primary">{formatCurrency(adaptationAmount)}</span>
          </div>
          <Slider
            id="adaptationAmount"
            min={0}
            max={50000}
            step={100}
            value={[adaptationAmount]}
            onValueChange={(value) => setAdaptationAmount(value[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="maintenanceAmount">Manutenção</Label>
            <span className="text-lg font-semibold text-primary">{formatCurrency(maintenanceAmount)}</span>
          </div>
          <Slider
            id="maintenanceAmount"
            min={0}
            max={50000}
            step={100}
            value={[maintenanceAmount]}
            onValueChange={(value) => setMaintenanceAmount(value[0])}
          />
        </div>

        <div className="flex justify-between items-center rounded-lg bg-primary/5 p-3">
          <span className="text-sm font-medium">Soma Total Estimada:</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(amount)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="downPayment">Entrada</Label>
          <span className="text-lg font-semibold text-primary">{formatCurrency(downPayment)}</span>
        </div>
        <Slider
          id="downPayment"
          min={0}
          max={amount}
          step={500}
          value={[downPayment]}
          onValueChange={(value) => setDownPayment(value[0])}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>R$ 0</span>
          <span>{formatCurrency(amount)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="installments">Parcelas</Label>
          <span className="text-lg font-semibold text-primary">{installments}x</span>
        </div>
        <Slider
          id="installments"
          min={1}
          max={48}
          step={1}
          value={[installments]}
          onValueChange={(value) => setInstallments(value[0])}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1x</span>
          <span>48x</span>
        </div>
      </div>

      <div className="rounded-lg bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Parcela mensal</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(calculation.monthlyPayment)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total estimado</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(calculation.totalCost)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Valores de demonstração (taxa ex: {interestRate}% a.m. · CET {calculation.cet}%)
        </p>
      </div>
    </div>
  );
}
