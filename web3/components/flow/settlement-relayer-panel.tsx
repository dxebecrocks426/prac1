"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  settlementSimulator,
  SettlementBatch,
} from "@/lib/mock/settlement-simulator";
import { SmartContractInfo } from "./smart-contract-info";
import { useFlowStore } from "@/lib/store/use-flow-store";

export function SettlementRelayerPanel() {
  const { completeStep } = useFlowStore();
  const [currentBatch, setCurrentBatch] = useState<SettlementBatch | null>(
    null
  );
  const [recentBatches, setRecentBatches] = useState<SettlementBatch[]>([]);

  useEffect(() => {
    // Subscribe to batch updates
    const unsubscribe = settlementSimulator.subscribe((batch) => {
      setCurrentBatch(settlementSimulator.getCurrentBatch());
      setRecentBatches(settlementSimulator.getRecentBatches(5));

      // Complete settlement step when settlement is visible/seen
      if (settlementSimulator.getCurrentBatch()) {
        completeStep("settlement-relayer");
      }

      // Auto-complete oracle step when batch settles
      if (batch.status === "settled") {
        completeStep("oracle-funding-rate");
      }
    });

    // Initial state
    setCurrentBatch(settlementSimulator.getCurrentBatch());
    setRecentBatches(settlementSimulator.getRecentBatches(5));

    // Poll for updates
    const interval = setInterval(() => {
      setCurrentBatch(settlementSimulator.getCurrentBatch());
      setRecentBatches(settlementSimulator.getRecentBatches(5));
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getStatusBadge = (status: SettlementBatch["status"]) => {
    switch (status) {
      case "accumulating":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            Accumulating
          </Badge>
        );
      case "settling":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            Settling
          </Badge>
        );
      case "settled":
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary">
            Settled
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement Relayer</CardTitle>
        <CardDescription>
          Trades are batched every 1 second or when 50 trades accumulate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentBatch && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Current Batch
              </span>
              {getStatusBadge(currentBatch.status)}
            </div>
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trades:</span>
                <span className="font-medium">
                  {currentBatch.trades.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Positions:</span>
                <span className="font-medium">
                  {currentBatch.netPositions.size}
                </span>
              </div>
            </div>
          </div>
        )}

        {recentBatches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recent Batches</h4>
            <div className="space-y-1">
              {recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between text-xs p-2 bg-muted rounded"
                >
                  <span className="text-muted-foreground">
                    {batch.trades.length} trades
                  </span>
                  <span className="text-muted-foreground">
                    {batch.settledAt
                      ? new Date(batch.settledAt).toLocaleTimeString()
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <SmartContractInfo
          programId="SettlementRelayer11111111111111111111111111"
          instructionName="process_settlement_batch"
          description="Trades are batched every 1 second or when 50 trades accumulate. Net positions are calculated to minimize on-chain transactions."
        />
      </CardContent>
    </Card>
  );
}


