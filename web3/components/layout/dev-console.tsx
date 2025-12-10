"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import { useSolanaPerformance } from "@/lib/hooks/use-solana-performance";
import { useValidatorStatus } from "@/lib/hooks/use-validator-status";
import {
  formatEventMessage,
  getEventTypeColor,
} from "@/lib/utils/event-formatter";
import { getUsdtMint } from "@/lib/utils/tokens";
import { AuthorizeDialog } from "@/components/vault/authorize-dialog";
import { revokeUSDTDelegate } from "@/lib/anchor/collateral-vault";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { Trash2 } from "lucide-react";
import { LocalnetStatsPanel } from "./localnet-stats-panel";
import { useMockEngineStats } from "@/lib/hooks/use-mock-engine-stats";
import { useSettlementRelayerStatus } from "@/lib/hooks/use-settlement-relayer-status";
import { usePositionManagementStatus } from "@/lib/hooks/use-position-management-status";
import { useLiquidationEngineStatus } from "@/lib/hooks/use-liquidation-engine-status";
import { GripVertical } from "lucide-react";
import { formatBalance, formatNumber, formatPercentage, formatLargeNumber } from "@/lib/utils/number-format";
import Image from "next/image";

export function DevConsole() {
  const { publicKey, connected, disconnect, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { isOpen, setIsOpen, events, clearEvents } = useDevConsoleStore();
  const { walletAddress: onboardingWalletAddress } = useOnboardingStore();
  const performance = useSolanaPerformance(isOpen);
  const validatorStatus = useValidatorStatus(isOpen);
  const mockEngineStats = useMockEngineStats(isOpen);
  const settlementRelayerStatus = useSettlementRelayerStatus(isOpen);
  const positionManagementStatus = usePositionManagementStatus(isOpen);
  const liquidationEngineStatus = useLiquidationEngineStatus(isOpen);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authorizeDialogOpen, setAuthorizeDialogOpen] = useState(false);
  
  // Drag handle state for event logs section
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  const eventLogsRef = useRef<HTMLDivElement>(null);
  const STORAGE_KEY = "dev-console-event-logs-height";
  const DEFAULT_HEIGHT = 300;
  const MIN_HEIGHT = 100;
  
  const getInitialHeight = () => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  };
  
  const [eventLogsHeight, setEventLogsHeight] = useState(getInitialHeight);
  
  const saveHeight = useCallback((newHeight: number) => {
    const clampedHeight = Math.max(newHeight, MIN_HEIGHT);
    setEventLogsHeight(clampedHeight);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, clampedHeight.toString());
    }
  }, []);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStartY(e.clientY);
    if (eventLogsRef.current) {
      setDragStartHeight(eventLogsRef.current.offsetHeight);
    }
  };
  
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !eventLogsRef.current) return;
      const deltaY = dragStartY - e.clientY; // Inverted because we're dragging up
      const newHeight = Math.max(MIN_HEIGHT, dragStartHeight + deltaY);
      eventLogsRef.current.style.height = `${newHeight}px`;
      eventLogsRef.current.style.flexShrink = "0";
      saveHeight(newHeight);
    },
    [isDragging, dragStartY, dragStartHeight, saveHeight]
  );
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  useEffect(() => {
    if (eventLogsRef.current) {
      eventLogsRef.current.style.height = `${eventLogsHeight}px`;
      eventLogsRef.current.style.flexShrink = "0";
    }
  }, [eventLogsHeight]);

  // Use wallet adapter publicKey or onboarding store wallet address
  const displayWalletAddress = publicKey?.toString() || onboardingWalletAddress;
  const shouldShowBalances = connected || !!onboardingWalletAddress;

  // Auto-open console during onboarding or when there are events
  useEffect(() => {
    if (events.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [events.length, isOpen, setIsOpen]);

  // Fetch balances
  useEffect(() => {
    const walletPubkey =
      publicKey ||
      (onboardingWalletAddress ? new PublicKey(onboardingWalletAddress) : null);

    if (!walletPubkey) {
      setSolBalance(null);
      setUsdtBalance(null);
      return;
    }

    const fetchBalances = async () => {
      try {
        // Fetch SOL balance
        const balance = await connection.getBalance(walletPubkey);
        setSolBalance(balance / LAMPORTS_PER_SOL);

        // Fetch USDT balance
        try {
          const usdtMint = getUsdtMint(connection.rpcEndpoint);
          const ata = getAssociatedTokenAddressSync(
            usdtMint,
            walletPubkey,
            false,
            TOKEN_PROGRAM_ID
          );
          const tokenAccount = await getAccount(
            connection,
            ata,
            undefined,
            TOKEN_PROGRAM_ID
          );
          setUsdtBalance(Number(tokenAccount.amount) / 1_000_000); // USDT has 6 decimals
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            error.name !== "TokenAccountNotFoundError"
          ) {
            console.error("Failed to fetch USDT balance:", error);
          }
          setUsdtBalance(0);
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [connected, publicKey, onboardingWalletAddress, connection]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleAuthorize = () => {
    setAuthorizeDialogOpen(true);
  };

  const handleRevoke = async () => {
    if (!publicKey || !signTransaction) {
      return;
    }

    setIsLoading(true);
    try {
      const usdtMint = getUsdtMint(connection.rpcEndpoint);
      const transaction = await revokeUSDTDelegate(
        publicKey,
        connection,
        usdtMint
      );

      transaction.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      useDevConsoleStore.getState().addEvent({
        type: "revoke",
        message: "Revoked USDT delegate approval",
        transaction: signature,
        status: "success",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to revoke: ${errorMessage}`,
        status: "failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show console even when wallet is not connected (for onboarding)
  // But show simplified version without wallet-specific features

  return (
    <>
      <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-col h-full">
          {/* Wallet Info Bar - Show when wallet address is available */}
          {shouldShowBalances && displayWalletAddress && (
            <div className="border-b border-border px-3 py-1.5 bg-muted/30">
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-foreground font-medium truncate">
                    {formatAddress(displayWalletAddress)}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-foreground font-medium">
                    {solBalance !== null
                      ? `${formatBalance(solBalance, 9)} SOL`
                      : "Loading..."}
                  </span>
                  <span className="text-foreground font-medium">
                    {usdtBalance !== null
                      ? `${formatBalance(usdtBalance, 2)} USDT`
                      : "0.00 USDT"}
                  </span>
                </div>
                {connected && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      onClick={handleAuthorize}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="h-6 px-2 text-xs font-mono"
                    >
                      Authorize
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="h-6 px-2 text-xs font-mono"
                    >
                      Withdraw
                    </Button>
                    <Button
                      onClick={handleRevoke}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="h-6 px-2 text-xs font-mono"
                    >
                      Revoke
                    </Button>
                    <Button
                      onClick={disconnect}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs font-mono"
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Status Row - Mock Engine */}
          <div className="border-b border-border px-3 py-1 bg-muted/20">
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              {/* GoDark Logo */}
              <img
                src="https://godark.xyz/favicon-dark.svg"
                alt="GoDark"
                width={10}
                height={10}
                className="opacity-70 shrink-0"
              />
              {/* Mock Matching Engine Status */}
              <div className="flex items-center gap-1">
                <span
                  className={
                    mockEngineStats.isRunning
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }
                >
                  {mockEngineStats.isRunning ? "●" : "○"}
                </span>
                <span>
                  Mock Engine: {mockEngineStats.isRunning ? "Running" : "Stopped"} (Port 3003)
                </span>
              </div>
              {mockEngineStats.isRunning && !mockEngineStats.isLoading && (
                <>
                  <span>|</span>
                  <span>
                    Orders: {formatNumber(mockEngineStats.ordersReceived)}
                  </span>
                  <span>|</span>
                  <span>
                    Matched: {formatNumber(mockEngineStats.ordersMatched)}
                  </span>
                  <span>|</span>
                  <span>
                    Rate: {formatPercentage(mockEngineStats.matchRate, 1)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Service Status Row - Settlement Relayer */}
          <div className="border-b border-border px-3 py-1 bg-muted/20">
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              {/* GoDark Logo */}
              <img
                src="https://godark.xyz/favicon-dark.svg"
                alt="GoDark"
                width={10}
                height={10}
                className="opacity-70 shrink-0"
              />
              {/* Settlement Relayer Status */}
              <div className="flex items-center gap-1">
                <span
                  className={
                    settlementRelayerStatus.isRunning
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }
                >
                  {settlementRelayerStatus.isRunning ? "●" : "○"}
                </span>
                <span>
                  Settlement Relayer: {settlementRelayerStatus.isRunning ? "Running" : "Stopped"} (Port 8080)
                </span>
              </div>
              {settlementRelayerStatus.isRunning && !settlementRelayerStatus.isLoading && (
                <>
                  {settlementRelayerStatus.totalSettled !== undefined && (
                    <>
                      <span>|</span>
                      <span>
                        Settled: {formatNumber(settlementRelayerStatus.totalSettled)}
                      </span>
                    </>
                  )}
                  {settlementRelayerStatus.successRate !== undefined && settlementRelayerStatus.successRate > 0 && (
                    <>
                      <span>|</span>
                      <span>
                        Success: {formatPercentage(settlementRelayerStatus.successRate * 100, 1)}
                      </span>
                    </>
                  )}
                  {settlementRelayerStatus.pendingBatches !== undefined && settlementRelayerStatus.pendingBatches > 0 && (
                    <>
                      <span>|</span>
                      <span>
                        Pending: {formatNumber(settlementRelayerStatus.pendingBatches)}
                      </span>
                    </>
                  )}
                  {settlementRelayerStatus.failedBatches !== undefined && settlementRelayerStatus.failedBatches > 0 && (
                    <>
                      <span>|</span>
                      <span>
                        Failed: {formatNumber(settlementRelayerStatus.failedBatches)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Service Status Row - Position Management */}
          <div className="border-b border-border px-3 py-1 bg-muted/20">
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              {/* GoDark Logo */}
              <img
                src="https://godark.xyz/favicon-dark.svg"
                alt="GoDark"
                width={10}
                height={10}
                className="opacity-70 shrink-0"
              />
              {/* Position Management Status */}
              <div className="flex items-center gap-1">
                <span
                  className={
                    positionManagementStatus.isRunning
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }
                >
                  {positionManagementStatus.isRunning ? "●" : "○"}
                </span>
                <span>
                  Position Management: {positionManagementStatus.isRunning ? "Running" : "Stopped"} (Port 8081)
                </span>
              </div>
            </div>
          </div>

          {/* Service Status Row - Liquidation Engine */}
          <div className="border-b border-border px-3 py-1 bg-muted/20">
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              {/* GoDark Logo */}
              <img
                src="https://godark.xyz/favicon-dark.svg"
                alt="GoDark"
                width={10}
                height={10}
                className="opacity-70 shrink-0"
              />
              {/* Liquidation Engine Status */}
              <div className="flex items-center gap-1">
                <span
                  className={
                    liquidationEngineStatus.isRunning
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }
                >
                  {liquidationEngineStatus.isRunning ? "●" : "○"}
                </span>
                <span>
                  Liquidation Engine: {liquidationEngineStatus.isRunning ? "Running" : "Stopped"} (Port 8082)
                </span>
              </div>
              {liquidationEngineStatus.isRunning && !liquidationEngineStatus.isLoading && (
                <>
                  {liquidationEngineStatus.totalLiquidations !== undefined && (
                    <>
                      <span>|</span>
                      <span>
                        Liquidations: {formatNumber(liquidationEngineStatus.totalLiquidations)}
                      </span>
                    </>
                  )}
                  {liquidationEngineStatus.successRate !== undefined && liquidationEngineStatus.successRate > 0 && (
                    <>
                      <span>|</span>
                      <span>
                        Success: {formatPercentage(liquidationEngineStatus.successRate * 100, 1)}
                      </span>
                    </>
                  )}
                  {liquidationEngineStatus.pendingLiquidations !== undefined && liquidationEngineStatus.pendingLiquidations > 0 && (
                    <>
                      <span>|</span>
                      <span>
                        Pending: {formatNumber(liquidationEngineStatus.pendingLiquidations)}
                      </span>
                    </>
                  )}
                  {liquidationEngineStatus.insuranceFundBalance !== undefined && (
                    <>
                      <span>|</span>
                      <span>
                        Insurance Fund: {formatNumber(parseFloat(liquidationEngineStatus.insuranceFundBalance) || 0)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="border-b border-border px-3 py-1 bg-muted/20">
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              {/* Solana Logo */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 397.7 311.7"
                className="opacity-70 shrink-0"
                aria-label="Solana"
              >
                <path
                  d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
                  fill="url(#solana-gradient-1)"
                />
                <path
                  d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
                  fill="url(#solana-gradient-2)"
                />
                <path
                  d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
                  fill="url(#solana-gradient-3)"
                />
                <defs>
                  <linearGradient
                    id="solana-gradient-1"
                    x1="200.54"
                    y1="0"
                    x2="200.54"
                    y2="311.7"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#14F195" />
                    <stop offset="1" stopColor="#9945FF" />
                  </linearGradient>
                  <linearGradient
                    id="solana-gradient-2"
                    x1="200.54"
                    y1="0"
                    x2="200.54"
                    y2="311.7"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#14F195" />
                    <stop offset="1" stopColor="#9945FF" />
                  </linearGradient>
                  <linearGradient
                    id="solana-gradient-3"
                    x1="200.54"
                    y1="0"
                    x2="200.54"
                    y2="311.7"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0" stopColor="#14F195" />
                    <stop offset="1" stopColor="#9945FF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex items-center gap-1">
                <span
                  className={
                    validatorStatus.running &&
                    validatorStatus.healthCheck &&
                    performance.connectionStatus === "connected"
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }
                >
                  {validatorStatus.running &&
                  validatorStatus.healthCheck &&
                  performance.connectionStatus === "connected"
                    ? "●"
                    : "○"}
                </span>
                <span>
                  {performance.network === "localnet"
                    ? validatorStatus.running && validatorStatus.healthCheck
                      ? "Localnet: Running"
                      : "Localnet: Stopped"
                    : performance.connectionStatus === "connected"
                    ? "Connected"
                    : "Disconnected"}
                </span>
              </div>
              <span>|</span>
              <span>
                Slot:{" "}
                {performance.slot !== null
                  ? formatNumber(performance.slot)
                  : "—"}
              </span>
              <span>|</span>
              <span>
                Block:{" "}
                {performance.blockHeight !== null
                  ? formatNumber(performance.blockHeight)
                  : "—"}
              </span>
              <span>|</span>
              <span className="capitalize">{performance.network}</span>
              {/* Mock Engine Stats - Commented out for now, can be implemented later */}
              {/* {mockEngineStats.isRunning && (
                <>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-green-600 dark:text-green-400">●</span>
                    <span>Engine</span>
                  </span>
                  <span>|</span>
                  <span>Orders: {mockEngineStats.ordersReceived} / Matched: {mockEngineStats.ordersMatched} / Failed: {mockEngineStats.ordersFailed} / Rate: {mockEngineStats.matchRate.toFixed(1)}%</span>
                  <span>|</span>
                  <span>Volume: {mockEngineStats.totalVolume >= 1000000 
                    ? `${(mockEngineStats.totalVolume / 1000000).toFixed(2)}M`
                    : mockEngineStats.totalVolume >= 1000
                    ? `${(mockEngineStats.totalVolume / 1000).toFixed(2)}K`
                    : mockEngineStats.totalVolume.toFixed(2)} / Avg: {mockEngineStats.averageFillPrice > 0 ? mockEngineStats.averageFillPrice.toFixed(2) : "—"}</span>
                  <span>|</span>
                  <span>Relayer: {mockEngineStats.tradesRelayerSuccess}/{mockEngineStats.tradesSentToRelayer} / Success: {mockEngineStats.tradesSentToRelayer > 0 ? ((mockEngineStats.tradesRelayerSuccess / mockEngineStats.tradesSentToRelayer) * 100).toFixed(1) : "0"}%</span>
                </>
              )} */}
            </div>
          </div>

          {/* Localnet Stats Panel */}
          <LocalnetStatsPanel />
          
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="h-1 bg-border/50 hover:bg-border cursor-row-resize flex items-center justify-center shrink-0 group"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Event Logs */}
          <div ref={eventLogsRef} className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 py-1 border-b border-border">
              <h3 className="text-xs font-semibold">Event Logs</h3>
              <Button
                onClick={clearEvents}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={events.length === 0}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-1 dev-console-scrollbar">
              {events.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6">
                  No events yet. Actions will appear here.
                </div>
              ) : (
                <div className="space-y-1 font-mono text-[10px] leading-relaxed">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`p-1.5 rounded border border-border/50 bg-card ${getEventTypeColor(
                        event.type,
                        event.status
                      )}`}
                    >
                      <pre className="whitespace-pre-wrap break-words">
                        {formatEventMessage(event)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </BottomSheet>

      <AuthorizeDialog
        open={authorizeDialogOpen}
        onOpenChange={setAuthorizeDialogOpen}
      />
    </>
  );
}
