"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePositions } from "@/lib/anchor/position-mgmt";
import { useEffect, useState } from "react";
import { Position } from "@/lib/anchor/types";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { SmartContractInfo } from "@/components/flow/smart-contract-info";
import { getProgramId } from "@/lib/anchor/types";
import { useConnection } from "@solana/wallet-adapter-react";
import { HighlightOverlay } from "@/components/flow/highlight-overlay";
import { useRef } from "react";
import { formatPrice, formatBalance } from "@/lib/utils/number-format";

export function OpenPositionsTable() {
  const positionsHook = usePositions();
  const { connection } = useConnection();
  const { isStepActive, completeStep } = useFlowStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const programIds =
    typeof window !== "undefined" ? getProgramId(connection.rpcEndpoint) : null;
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      if (positionsHook) {
        try {
          const fetchedPositions = await positionsHook.fetchAll();
          setPositions(fetchedPositions);
        } catch (error) {
          console.error("Error fetching positions:", error);
        }
      }
    };

    fetchPositions();
    
    // Poll for position updates every 5 seconds
    const intervalId = setInterval(fetchPositions, 5000);


    return () => {
      clearInterval(intervalId);
    };
  }, [positionsHook, isStepActive, completeStep]);


  return (
    <div ref={tableRef} className="w-full relative">
      {positions.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No open positions
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Position Value</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Realized PnL</TableHead>
              <TableHead>Unrealized PnL</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Mark Price</TableHead>
              <TableHead>Funding</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => {
              const isLong = position.side === 0;
              const positionValue =
                Number(position.size) * Number(position.entryPrice);
              const marginType = "isolated"; // Always isolated per README

              return (
                <TableRow key={position.symbol}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isLong ? "bg-primary" : "bg-destructive"
                        }`}
                      />
                      <span>{position.symbol}</span>
                      <span className="text-xs text-muted-foreground">
                        {position.leverage}x
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={
                      isLong
                        ? "text-primary font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {isLong ? "+" : "-"}
                    {formatBalance(Number(position.size), 4)}
                  </TableCell>
                  <TableCell>
                    ${formatPrice(positionValue / 1_000_000)}
                  </TableCell>
                  <TableCell>
                    ${formatPrice(Number(position.margin) / 1_000_000)} (
                    {marginType})
                  </TableCell>
                  <TableCell
                    className={
                      Number(position.realizedPnl) >= 0
                        ? "text-primary font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    ${formatPrice(Number(position.realizedPnl) / 1_000_000)}
                  </TableCell>
                  <TableCell
                    className={
                      Number(position.unrealizedPnl) >= 0
                        ? "text-primary font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    ${formatPrice(Number(position.unrealizedPnl) / 1_000_000)}
                  </TableCell>
                  <TableCell>
                    ${formatPrice(Number(position.entryPrice) / 1_000_000)}
                  </TableCell>
                  <TableCell>
                    {/* Mark price would come from oracle */}-
                  </TableCell>
                  <TableCell>
                    ${formatPrice(Number(position.fundingAccrued) / 1_000_000)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Close
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {positions.length === 0 && programIds && (
        <div className="p-4">
          <SmartContractInfo
            programId={programIds.positionMgmt.toBase58()}
            instructionName="open_position"
            description="Your positions are stored on-chain as PDAs. Each position tracks size, entry price, margin, and PnL."
          />
        </div>
      )}
    </div>
  );
}

