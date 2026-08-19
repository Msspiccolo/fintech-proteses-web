import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface CreditSimulatorProps {
  amount: number;
  setAmount: (value: number) => void;
  downPayment: number;
  setDownPayment: (value: number) => void;
  installments: number;
  setInstallments: (value: number) => void;
  interestRate?: number;
}

export function CreditSimulator({
  amount,
  setAmount,
  downPayment,
  setDownPayment,
  installments,
  setInstallments,
  interestRate = 1.99,
}: CreditSimulatorProps) {
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount">Valor do tratamento / prótese</Label>
          <span className="text-lg font-semibold text-primary">{formatCurrency(amount)}</span>
        </div>
        <Slider
          id="amount"
          min={1000}
          max={100000}
          step={500}
          value={[amount]}
          onValueChange={(value) => setAmount(value[0])}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>R$ 1.000</span>
          <span>R$ 100.000</span>
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
          Taxa de {interestRate}% ao mês · CET estimado {calculation.cet}%
        </p>
      </div>
    </div>
  );
}
