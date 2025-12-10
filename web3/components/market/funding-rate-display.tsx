"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { HighlightOverlay } from "@/components/flow/highlight-overlay";
import { cn } from "@/lib/utils";

interface FundingRateData {
  rate: number;
  nextFundingTime: number; // Unix timestamp
}

export function FundingRateDisplay() {
  const { isStepActive } = useFlowStore();
  const fundingRef = useRef<HTMLDivElement>(null);
  const [fundingRate, setFundingRate] = useState<FundingRateData | null>(null);
  const [timeUntilFunding, setTimeUntilFunding] = useState<string>("");

  useEffect(() => {
    // TODO: Fetch from WebSocket or API
    // For now, use mock data
    const mockData: FundingRateData = {
      rate: 0.0001, // 0.01%
      nextFundingTime: Date.now() + 3600000, // 1 hour from now
    };
    setFundingRate(mockData);

    // Update countdown every second
    const interval = setInterval(() => {
      if (mockData.nextFundingTime) {
        const timeLeft = formatDistanceToNow(
          new Date(mockData.nextFundingTime),
          {
            addSuffix: false,
          }
        );
        setTimeUntilFunding(timeLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!fundingRate) {
    return null;
  }

  const isOracleStepActive = isStepActive("oracle-funding-rate");

  return (
    <div ref={fundingRef} className="relative flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground leading-tight">Funding Rate</span>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "font-semibold text-xs leading-tight",
            fundingRate.rate >= 0 ? "text-primary" : "text-destructive"
          )}
        >
          {(fundingRate.rate * 100).toFixed(4)}%
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight">
          {timeUntilFunding}
        </span>
      </div>
      {isOracleStepActive && (
        <HighlightOverlay
          targetRef={fundingRef}
          isActive={isOracleStepActive}
          tooltip="Oracle prices update funding rates"
          position="bottom"
        />
      )}
    </div>
  );
}


