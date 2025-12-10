"use client";

import { useState, useEffect } from "react";
import { SymbolSelector } from "./symbol-selector";
import { FundingRateDisplay } from "./funding-rate-display";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercentage, formatLargeNumber } from "@/lib/utils/number-format";

interface MarketOverviewBarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function MarketOverviewBar({
  symbol,
  onSymbolChange,
}: MarketOverviewBarProps) {
  const [markPrice, setMarkPrice] = useState<number | null>(null);
  const [oraclePrice, setOraclePrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [openInterest, setOpenInterest] = useState<number | null>(null);

  useEffect(() => {
    // TODO: Fetch from WebSocket or API
    // Mock data for now
    const mockPrice = 113452;
    setMarkPrice(mockPrice);
    setOraclePrice(mockPrice);
    setPriceChange24h(0.14);
    setVolume24h(5.03e9); // 5.03B USDT
    setOpenInterest(1.25e9); // 1.25B USDT
  }, [symbol]);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left: Symbol Selector */}
      <SymbolSelector value={symbol} onChange={onSymbolChange} />

      {/* Right: Market Metrics */}
      <Card className="flex flex-col bg-background/20 backdrop-blur-xl border border-primary/20 rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
        <CardContent className="p-2">
          <div className="flex items-center gap-x-4 gap-y-0 flex-wrap text-xs">
            {markPrice !== null && (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground leading-tight">Mark</span>
                  <span className="font-semibold text-xs leading-tight">
                    {formatNumber(markPrice)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground leading-tight">Oracle</span>
                  <span className="font-semibold text-xs leading-tight">
                    {formatNumber(oraclePrice)}
                  </span>
                </div>
              </>
            )}

            {priceChange24h !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground leading-tight">24h change</span>
                <span
                  className={cn(
                    "font-semibold text-xs leading-tight",
                    priceChange24h >= 0 ? "text-primary" : "text-destructive"
                  )}
                >
                  {priceChange24h >= 0 ? "+" : ""}
                  {formatPercentage(priceChange24h, 2)}
                </span>
              </div>
            )}

            {volume24h !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground leading-tight">24h Volume</span>
                <span className="font-semibold text-xs leading-tight">
                  {formatLargeNumber(volume24h)} USDT
                </span>
              </div>
            )}

            {openInterest !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Open Interest
                </span>
                <span className="font-semibold text-xs leading-tight">
                  {formatLargeNumber(openInterest)} USDT
                </span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <FundingRateDisplay />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
