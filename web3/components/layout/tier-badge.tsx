"use client";

import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

export function TierBadge() {
  // TODO: Fetch actual tier from user account/API
  const tier = "Bronze";
  const tierPercentage = "25%";

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1.5">
        <Award className="h-3 w-3" />
        <span className="text-xs font-medium">
          {tierPercentage} {tier} Tier
        </span>
      </Badge>
    </div>
  );
}


