import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deterministic pt-BR formatting: Intl output differs between the server
// runtime and the browser (non-breaking spaces), which breaks hydration.
export function formatCurrency(value: number) {
  const negative = value < 0;
  const [intPart, decPart] = Math.abs(value).toFixed(2).split(".");
  const grouped = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${grouped},${decPart}`;
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function generateFakeBoleto() {
  const content = `======================================
         BOLETO BANCÁRIO - PROMOBI
======================================
Beneficiário: ProMobi S.A.
Linha Digitável: 34191.09008 10738.452097 01340.560002 1 90000000000000
======================================
Utilize a linha digitável acima para realizar o pagamento.`;
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `boleto_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
