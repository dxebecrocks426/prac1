"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function StealthModeToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Eye className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="flex items-center gap-2">
        <Switch
          id="stealth-mode"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <Label htmlFor="stealth-mode" className="text-sm cursor-pointer">
          Stealth Mode
        </Label>
      </div>
    </div>
  );
}


