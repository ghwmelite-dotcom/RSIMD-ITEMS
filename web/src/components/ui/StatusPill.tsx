import { Badge } from "./Badge";

const STATUS_VARIANTS: Record<string, "green" | "gold" | "red" | "gray"> = {
  active: "green",
  completed: "green",
  faulty: "red",
  escalated: "red",
  under_repair: "gold",
  in_progress: "gold",
  pending: "gray",
  decommissioned: "gray",
};

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  const variant = STATUS_VARIANTS[status] ?? "gray";
  const label = status.replace(/_/g, " ");
  return <Badge variant={variant}>{label}</Badge>;
}
