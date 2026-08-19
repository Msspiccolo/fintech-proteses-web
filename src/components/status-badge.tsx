import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | null }
> = {
  pending: { label: "Em análise", variant: "secondary" },
  approved: { label: "Aprovada", variant: "default" },
  rejected: { label: "Reprovada", variant: "destructive" },
  paid: { label: "Paga", variant: "default" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: "outline" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
