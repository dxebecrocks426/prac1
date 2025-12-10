"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { oracleSimulator, OraclePrice } from "@/lib/mock/oracle-simulator";
import { SmartContractInfo } from "./smart-contract-info";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface OracleInfoProps {
  symbol: string;
}

export function OracleInfo({ symbol }: OracleInfoProps) {
  const [price, setPrice] = useState<OraclePrice | undefined>();
  const [fundingRate, setFundingRate] = useState<number>(0);
  const [nextFundingTime, setNextFundingTime] = useState<Date>(
    oracleSimulator.getNextFundingTime()
  );

  useEffect(() => {
    // Get initial price
    setPrice(oracleSimulator.getPrice(symbol));
    setFundingRate(oracleSimulator.calculateFundingRate(symbol));

    // Subscribe to price updates
    const unsubscribe = oracleSimulator.subscribe((updatedPrice) => {
      if (updatedPrice.symbol === symbol) {
        setPrice(updatedPrice);
        setFundingRate(oracleSimulator.calculateFundingRate(symbol));
      }
    });

    return unsubscribe;
  }, [symbol]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oracle & Funding Rate</CardTitle>
        <CardDescription>
          Funding rates are calculated on-chain based on oracle prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {price && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Oracle Price:</span>
              <span className="font-medium">
                ${price.price.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium">{price.source}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Funding Rate:</span>
              <span
                className={cn(
                  "font-medium",
                  fundingRate >= 0 ? "text-primary" : "text-destructive"
                )}
              >
                {(fundingRate * 100).toFixed(4)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next Funding:</span>
              <span className="font-medium">
                {formatDistanceToNow(nextFundingTime, { addSuffix: true })}
              </span>
            </div>
          </div>
        )}

        <SmartContractInfo
          programId="Oracle11111111111111111111111111111111111111"
          instructionName="update_price"
          description="Oracle prices are updated on-chain. Positions are funded every 8 hours based on these prices."
        />
      </CardContent>
    </Card>
  );
}


