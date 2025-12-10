"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SettlementStatus = "pending" | "matched" | "settling" | "settled";

interface SettlementStatusProps {
  status: SettlementStatus;
  className?: string;
}

export function SettlementStatusBadge({
  status,
  className,
}: SettlementStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          className: "bg-yellow-500/10 text-yellow-500",
        };
      case "matched":
        return {
          label: "Matched",
          className: "bg-blue-500/10 text-blue-500",
        };
      case "settling":
        return {
          label: "Settling...",
          className: "bg-orange-500/10 text-orange-500 animate-pulse",
        };
      case "settled":
        return {
          label: "Settled",
          className: "bg-primary/10 text-primary",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}


