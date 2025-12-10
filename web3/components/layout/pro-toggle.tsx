"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ProToggle() {
  const [enabled, setEnabled] = useState(true); // Default to Pro mode

  return (
    <div className="flex items-center gap-2">
      <Switch id="pro-mode" checked={enabled} onCheckedChange={setEnabled} />
      <Label
        htmlFor="pro-mode"
        className={cn(
          "text-sm cursor-pointer font-medium",
          enabled && "text-primary"
        )}
      >
        Pro
      </Label>
    </div>
  );
}


