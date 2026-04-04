import { Badge } from "../ui/Badge";

interface ReadinessBadgeProps {
  readiness: "ready" | "can_upgrade" | "cannot_upgrade" | "unknown" | "n/a";
}

const CONFIG: Record<
  string,
  { label: string; variant: "green" | "gold" | "red" | "gray" }
> = {
  ready: { label: "Win11 Ready", variant: "green" },
  can_upgrade: { label: "Can Upgrade", variant: "gold" },
  cannot_upgrade: { label: "Cannot Upgrade", variant: "red" },
  unknown: { label: "OS Unknown", variant: "gray" },
  "n/a": { label: "N/A", variant: "gray" },
};

export function ReadinessBadge({ readiness }: ReadinessBadgeProps) {
  const config = CONFIG[readiness] ?? CONFIG["unknown"]!;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
