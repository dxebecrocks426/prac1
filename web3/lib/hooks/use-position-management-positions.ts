"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Position } from "@/lib/anchor/types";

const POSITION_MGMT_SERVICE_URL = process.env.NEXT_PUBLIC_POSITION_MGMT_SERVICE_URL || "http://localhost:8082";

interface PositionManagementPosition {
  id: string;
  user_id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: string;
  leverage: number;
  entry_price: string;
  margin: string;
  realized_pnl?: string;
  unrealized_pnl?: string;
  mark_price?: string;
  funding_accrued?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to poll positions from position management service API
 */
export function usePositionManagementPositions(isEnabled: boolean = true): Position[] {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);

  const fetchPositions = useCallback(async () => {
    if (!isEnabled || !publicKey) {
      setPositions([]);
      return;
    }

    try {
      const userId = publicKey.toBase58();
      const response = await fetch(
        `${POSITION_MGMT_SERVICE_URL}/users/${userId}/positions?status=OPEN`,
        {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No positions found, that's okay
          setPositions([]);
          return;
        }
        throw new Error(`Failed to fetch positions: ${response.statusText}`);
      }

      const data: PositionManagementPosition[] = await response.json();

      // Convert API positions to Position interface format
      const convertedPositions: Position[] = data.map((pos) => ({
        symbol: pos.symbol,
        side: pos.side === "LONG" ? 0 : 1, // 0 = LONG, 1 = SHORT
        size: BigInt(Math.floor(parseFloat(pos.size) * 1_000_000)), // Convert to u64 with 6 decimals
        leverage: pos.leverage,
        entryPrice: BigInt(Math.floor(parseFloat(pos.entry_price) * 1_000_000)),
        margin: BigInt(Math.floor(parseFloat(pos.margin) * 1_000_000)),
        realizedPnl: BigInt(Math.floor(parseFloat(pos.realized_pnl || "0") * 1_000_000)),
        unrealizedPnl: BigInt(Math.floor(parseFloat(pos.unrealized_pnl || "0") * 1_000_000)),
        markPrice: pos.mark_price ? BigInt(Math.floor(parseFloat(pos.mark_price) * 1_000_000)) : BigInt(0),
        fundingAccrued: BigInt(Math.floor(parseFloat(pos.funding_accrued || "0") * 1_000_000)),
      }));

      setPositions(convertedPositions);
    } catch (error) {
      console.error("Error fetching positions from position management API:", error);
      // Return empty array on error - don't break the UI
      setPositions([]);
    }
  }, [isEnabled, publicKey]);

  useEffect(() => {
    fetchPositions();

    // Poll every 5 seconds
    const intervalId = setInterval(fetchPositions, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchPositions]);

  return positions;
}

