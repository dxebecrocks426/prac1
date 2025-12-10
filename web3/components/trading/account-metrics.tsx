"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useVault } from "@/lib/anchor/collateral-vault";
import { usePositionsStore } from "@/lib/store/use-positions-store";
import { useSessionStore } from "@/lib/store/use-session-store";
import { cn } from "@/lib/utils";
import { formatPrice, formatBalance, formatPercentage } from "@/lib/utils/number-format";

export function AccountMetrics() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const vaultHook = useVault();
  const { positions } = usePositionsStore();
  const { isSessionActive } = useSessionStore();
  const [vaultData, setVaultData] = useState<any>(null);
  const [totalPnL, setTotalPnL] = useState<number>(0);
  const [marginUtilization, setMarginUtilization] = useState<number>(0);
  const [spotBalance, setSpotBalance] = useState<number>(0);
  
  // Ephemeral vault costs
  const sessionActive = isSessionActive();
  const sessionCreationCost = 0.000895; // ~0.00089 SOL (rent) + ~0.000005 SOL (base fee)
  const perTradeFee = 0.0000075; // ~0.000005-0.00001 SOL average

  useEffect(() => {
    if (vaultHook && publicKey && connected) {
      loadVaultData();
    }
  }, [vaultHook, publicKey, connected]);

  useEffect(() => {
    // Calculate total PnL from positions
    const pnl = positions.reduce((sum, pos) => {
      return (
        sum +
        Number(pos.realizedPnl || 0) / 1_000_000 +
        Number(pos.unrealizedPnl || 0) / 1_000_000
      );
    }, 0);
    setTotalPnL(pnl);

    // Calculate margin utilization
    const totalMargin = positions.reduce((sum, pos) => {
      return sum + Number(pos.margin || 0) / 1_000_000;
    }, 0);
    const availableBalance = vaultData?.availableBalance
      ? Number(vaultData.availableBalance) / 1_000_000
      : 0;
    const totalBalance = vaultData?.totalBalance
      ? Number(vaultData.totalBalance) / 1_000_000
      : 0;
    const utilization =
      totalBalance > 0 ? (totalMargin / totalBalance) * 100 : 0;
    setMarginUtilization(utilization);
  }, [positions, vaultData]);

  const loadVaultData = async () => {
    if (!vaultHook || !publicKey) return;

    try {
      const data = await vaultHook.fetch();
      setVaultData(data);
    } catch (err) {
      console.error("Error loading vault:", err);
    }
  };

  const availableBalance = vaultData?.availableBalance
    ? Number(vaultData.availableBalance) / 1_000_000
    : 0;
  const totalBalance = vaultData?.totalBalance
    ? Number(vaultData.totalBalance) / 1_000_000
    : 0;

  return (
    <Card className="flex flex-col bg-background/20 backdrop-blur-xl border border-primary/20 rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm">Account Metrics</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Available Balance</div>
            <div className="text-base font-semibold">
              ${formatPrice(availableBalance)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Total Balance</div>
            <div className="text-base font-semibold">
              ${formatPrice(totalBalance)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">PnL</div>
            <div
              className={cn(
                "text-base font-semibold",
                totalPnL >= 0 ? "text-primary" : "text-destructive"
              )}
            >
              {totalPnL >= 0 ? "+" : ""}${formatPrice(totalPnL)}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">
              Margin Utilization
            </div>
            <div className="text-base font-semibold">
              {formatPercentage(marginUtilization, 1)}
            </div>
          </div>
        </div>
        
        {sessionActive && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1.5">Session Costs</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Creation:</span>
                <span className="ml-1 font-medium">{formatBalance(sessionCreationCost, 6)} SOL</span>
              </div>
              <div>
                <span className="text-muted-foreground">Per Trade:</span>
                <span className="ml-1 font-medium">~{formatBalance(perTradeFee, 6)} SOL</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
