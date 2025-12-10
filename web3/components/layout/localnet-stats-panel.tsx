"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import { useLocalnetStats } from "@/lib/hooks/use-localnet-stats";
import { useConnection } from "@solana/wallet-adapter-react";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import { formatPrice, formatPercentage, formatNumber } from "@/lib/utils/number-format";

const STORAGE_KEY = "localnet-stats-panel-height";
const DEFAULT_HEIGHT = 300; // Default height in pixels (~50% of typical dev console)
const MIN_HEIGHT = 150;
const MAX_HEIGHT_PERCENT = 0.6; // Max 60% of viewport height

export function LocalnetStatsPanel() {
  const { connection } = useConnection();
  const { isOpen } = useDevConsoleStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stats = useLocalnetStats(isOpen);

  // Calculate max height based on viewport
  const calculatedMaxHeight = useCallback(() => {
    if (typeof window === "undefined") return 600;
    // Max height should be 60% of viewport, but also consider dev console max height
    const viewportHeight = window.innerHeight;
    const devConsoleMaxHeight = viewportHeight * 0.4; // Dev console is max 40% of viewport
    // Panel should be max 60% of dev console height, or 300px minimum
    return Math.max(300, Math.floor(devConsoleMaxHeight * MAX_HEIGHT_PERCENT));
  }, []);

  // Get initial height from localStorage or use default
  const getInitialHeight = () => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT;
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedHeight = saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
    // Clamp to reasonable bounds for initial load
    return Math.min(Math.max(savedHeight, MIN_HEIGHT), 500);
  };

  const [height, setHeight] = useState(getInitialHeight);

  // Save height to localStorage
  const saveHeight = useCallback(
    (newHeight: number) => {
      const maxHeight = calculatedMaxHeight();
      const clampedHeight = Math.min(newHeight, maxHeight);
      setHeight(clampedHeight);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, clampedHeight.toString());
      }
    },
    [calculatedMaxHeight]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStartY(e.clientY);
    if (panelRef.current) {
      const currentHeight = panelRef.current.offsetHeight || height;
      setDragStartHeight(currentHeight);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return;

      // Calculate delta: dragging down (increasing Y) should increase height
      const deltaY = e.clientY - dragStartY;
      const maxHeight = calculatedMaxHeight();
      const newHeight = Math.max(
        MIN_HEIGHT,
        Math.min(dragStartHeight + deltaY, maxHeight)
      );

      // Update the panel container height directly for immediate visual feedback
      panelRef.current.style.height = `${newHeight}px`;
      panelRef.current.style.flexShrink = "0"; // Prevent flex from shrinking it
      saveHeight(newHeight);
    },
    [isDragging, dragStartY, dragStartHeight, saveHeight, calculatedMaxHeight]
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

  // Apply height to panel when it changes, clamping to max
  useEffect(() => {
    if (panelRef.current && isExpanded) {
      const maxHeight = calculatedMaxHeight();
      const clampedHeight = Math.min(height, maxHeight);
      panelRef.current.style.height = `${clampedHeight}px`;
      panelRef.current.style.flexShrink = "0"; // Prevent flex from shrinking it
    } else if (panelRef.current && !isExpanded) {
      // Reset height when collapsed
      panelRef.current.style.height = "";
      panelRef.current.style.flexShrink = "";
    }
  }, [height, isExpanded, calculatedMaxHeight]);

  const isLocalnet =
    connection.rpcEndpoint.includes("localhost") ||
    connection.rpcEndpoint.includes("127.0.0.1") ||
    connection.rpcEndpoint.includes("8899");

  if (!isLocalnet) {
    return null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
          <span className="text-[10px] font-medium text-muted-foreground">
            Localnet Stats
          </span>
          {stats.isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        {stats.lastUpdated && (
          <span className="text-[9px] text-muted-foreground">
            {new Date(stats.lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </button>

      {isExpanded && (
        <div
          ref={panelRef}
          className="relative bg-muted/20 flex-shrink-0 overflow-hidden"
          style={{ height: `${height}px` }}
        >
          <div
            ref={contentRef}
            className="px-3 py-2 overflow-y-auto h-full dev-console-scrollbar"
          >
            {/* Top Row: Programs, Wallets, Mints */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Programs Column */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">
                  Programs ({stats.programs.deployed})
                </div>
                <div className="space-y-0.5">
                  {stats.programs.list.map((program) => (
                    <div
                      key={program.address}
                      className="flex items-center justify-between text-[9px] font-mono"
                    >
                      <span className="text-foreground/80 truncate">
                        • {program.name.replace(/-/g, " ")}
                      </span>
                      <button
                        onClick={() => copyToClipboard(program.address)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-1"
                        title="Copy address"
                      >
                        <span>{formatAddress(program.address)}</span>
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  {stats.programs.list.length === 0 && (
                    <div className="text-[9px] text-muted-foreground">None</div>
                  )}
                </div>
              </div>

              {/* Wallets Column */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">
                  Wallets ({stats.wallets.total})
                </div>
                <div className="text-[9px] space-y-0.5 text-foreground/80">
                  <div>• Regular: {stats.wallets.regular}</div>
                  <div>• PDAs: {stats.wallets.pdas}</div>
                </div>
              </div>

              {/* Mints Column */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground">
                  Mints ({stats.mints.length})
                </div>
                <div className="space-y-0.5">
                  {stats.mints.map((mint) => (
                    <div
                      key={mint.address}
                      className="flex items-center justify-between text-[9px] font-mono"
                    >
                      <span className="text-foreground/80">
                        • {mint.symbol}
                      </span>
                      <button
                        onClick={() => copyToClipboard(mint.address)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-1"
                        title="Copy address"
                      >
                        <span>{formatAddress(mint.address)}</span>
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  {stats.mints.length === 0 && (
                    <div className="text-[9px] text-muted-foreground">None</div>
                  )}
                </div>
              </div>
            </div>

            {/* GoDark DEX Section */}
            <div className="border-t border-border pt-2 mt-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-2">
                GoDark DEX
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Vaults Column */}
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground">
                    Vaults ({stats.godark.vaults.total})
                  </div>
                  <div className="text-[9px] space-y-0.5 text-foreground/80">
                    <div>
                      Total: {formatPrice(stats.godark.vaults.totalCollateral)}{" "}
                      USDT
                    </div>
                    <div>
                      Locked: {formatPrice(stats.godark.vaults.lockedCollateral)}
                    </div>
                    <div>
                      Available:{" "}
                      {formatPrice(stats.godark.vaults.availableCollateral)}
                    </div>
                    <div
                      className={`${
                        stats.godark.vaults.utilizationRate > 90
                          ? "text-red-500"
                          : stats.godark.vaults.utilizationRate > 70
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      Utilization:{" "}
                      {formatPercentage(stats.godark.vaults.utilizationRate, 1)}
                    </div>
                    <div className="text-[8px] text-muted-foreground mt-1 pt-1 border-t border-border/50">
                      Deposited: {formatPrice(stats.godark.vaults.totalDeposited)}
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      Withdrawn: {formatPrice(stats.godark.vaults.totalWithdrawn)}
                    </div>
                  </div>
                </div>

                {/* Positions Column */}
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground">
                    Positions ({stats.godark.positions.total})
                  </div>
                  <div className="text-[9px] space-y-0.5 text-foreground/80">
                    <div>
                      Long: {stats.godark.positions.long} | Short:{" "}
                      {stats.godark.positions.short}
                    </div>
                    <div>
                      Margin: {formatPrice(stats.godark.positions.totalMargin)}{" "}
                      USDT
                    </div>
                    <div>
                      Notional:{" "}
                      {formatPrice(stats.godark.positions.totalNotional)}
                    </div>
                    <div
                      className={`${
                        stats.godark.positions.totalUnrealizedPnl >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      PnL:{" "}
                      {formatPrice(stats.godark.positions.totalUnrealizedPnl)}{" "}
                      USDT
                    </div>
                    <div>
                      Avg Leverage:{" "}
                      {formatNumber(stats.godark.positions.averageLeverage, { maximumFractionDigits: 1 })}x
                    </div>
                    {stats.godark.positions.atRisk > 0 && (
                      <div className="text-red-500 font-medium">
                        ⚠ At Risk: {stats.godark.positions.atRisk}
                      </div>
                    )}
                    {Object.keys(stats.godark.positions.bySymbol).length >
                      0 && (
                      <div className="text-[8px] text-muted-foreground mt-1 pt-1 border-t border-border/50">
                        {Object.entries(stats.godark.positions.bySymbol)
                          .slice(0, 3)
                          .map(([symbol, count]) => `${symbol}: ${count}`)
                          .join(", ")}
                        {Object.keys(stats.godark.positions.bySymbol).length >
                          3 && "..."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Users Column */}
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground">
                    Users ({stats.godark.users.total})
                  </div>
                  <div className="text-[9px] space-y-0.5 text-foreground/80">
                    <div>
                      Total Collateral:{" "}
                      {formatPrice(stats.godark.users.totalCollateral)} USDT
                    </div>
                    <div>
                      Avg Collateral:{" "}
                      {formatPrice(stats.godark.users.averageCollateral)}
                    </div>
                    <div
                      className={`${
                        stats.godark.users.totalPnl >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      Total PnL: {formatPrice(stats.godark.users.totalPnl)} USDT
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Oracle & CPI Section */}
            <div className="border-t border-border pt-2 mt-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                Oracle & CPI
              </div>
              <div className="text-[9px] space-y-1 text-foreground/80">
                <div>Oracle Feeds: {stats.godark.oracle.feeds}</div>
                {stats.godark.oracle.symbols.length > 0 && (
                  <div className="text-[8px] text-muted-foreground">
                    {stats.godark.oracle.symbols.join(", ")}
                  </div>
                )}
                <div className="pt-1 border-t border-border/50">
                  CPI Calls: {stats.godark.cpi.total} (
                  <span className="text-green-500">
                    {stats.godark.cpi.success}
                  </span>{" "}
                  /
                  <span className="text-red-500">
                    {" "}
                    {stats.godark.cpi.failed}
                  </span>
                  )
                </div>
                {stats.godark.cpi.total > 0 && (
                  <div className="text-[8px] text-muted-foreground">
                    Success Rate:{" "}
                    {formatPercentage(
                      (stats.godark.cpi.success / stats.godark.cpi.total) *
                      100,
                      1
                    )}
                  </div>
                )}
                {stats.godark.cpi.recent.length > 0 && (
                  <div className="text-[8px] space-y-0.5 mt-1 pt-1 border-t border-border/50">
                    <div className="font-medium text-muted-foreground">
                      Recent:
                    </div>
                    {stats.godark.cpi.recent.slice(0, 3).map((cpi, idx) => (
                      <div key={idx} className="truncate">
                        <span
                          className={
                            cpi.success ? "text-green-500" : "text-red-500"
                          }
                        >
                          {cpi.success ? "✓" : "✗"}
                        </span>{" "}
                        {cpi.from} → {cpi.to}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute bottom-0 left-0 right-0 h-4 cursor-row-resize flex items-center justify-center bg-border/40 hover:bg-border/70 transition-colors group border-t border-border z-10 select-none ${
              isDragging ? "bg-primary/40" : ""
            }`}
            title="Drag to resize panel height"
            style={{ touchAction: "none" }}
          >
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <GripVertical className="h-3 w-3 text-muted-foreground -ml-1" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
