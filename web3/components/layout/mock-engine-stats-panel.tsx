"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import { useMockEngineStats } from "@/lib/hooks/use-mock-engine-stats";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";

const STORAGE_KEY = "mock-engine-stats-panel-height";
const DEFAULT_HEIGHT = 250;
const MIN_HEIGHT = 150;
const MAX_HEIGHT_PERCENT = 0.6;

export function MockEngineStatsPanel() {
  const { isOpen } = useDevConsoleStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stats = useMockEngineStats(isOpen);

  // Calculate max height based on viewport
  const calculatedMaxHeight = useCallback(() => {
    if (typeof window === "undefined") return 600;
    const viewportHeight = window.innerHeight;
    const devConsoleMaxHeight = viewportHeight * 0.4;
    return Math.max(300, Math.floor(devConsoleMaxHeight * MAX_HEIGHT_PERCENT));
  }, []);

  // Get initial height from localStorage or use default
  const getInitialHeight = () => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT;
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedHeight = saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
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

      const deltaY = e.clientY - dragStartY;
      const maxHeight = calculatedMaxHeight();
      const newHeight = Math.max(
        MIN_HEIGHT,
        Math.min(dragStartHeight + deltaY, maxHeight)
      );

      panelRef.current.style.height = `${newHeight}px`;
      panelRef.current.style.flexShrink = "0";
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

  // Apply height to panel when it changes
  useEffect(() => {
    if (panelRef.current && isExpanded) {
      const maxHeight = calculatedMaxHeight();
      const clampedHeight = Math.min(height, maxHeight);
      panelRef.current.style.height = `${clampedHeight}px`;
      panelRef.current.style.flexShrink = "0";
    } else if (panelRef.current && !isExpanded) {
      panelRef.current.style.height = "";
      panelRef.current.style.flexShrink = "";
    }
  }, [height, isExpanded, calculatedMaxHeight]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div
      ref={panelRef}
      className="border-b border-border flex flex-col overflow-hidden"
      style={{ height: isExpanded ? `${height}px` : "auto" }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors shrink-0"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
          <span className="text-[10px] font-medium text-muted-foreground">
            Mock Engine Stats
          </span>
          {stats.isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {stats.isRunning && (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          )}
        </div>
        {stats.lastUpdated && (
          <span className="text-[9px] text-muted-foreground">
            {new Date(stats.lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </button>

      {isExpanded && (
        <>
          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className="h-1 bg-border/50 hover:bg-border cursor-row-resize flex items-center justify-center shrink-0 group"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Scrollable content */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[10px] min-h-0"
          >
          {!stats.isRunning ? (
            <div className="text-muted-foreground text-center py-4">
              Mock engine is not running
            </div>
          ) : (
            <>
              {/* Order Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-muted-foreground">Orders Received</div>
                  <div className="font-medium">{stats.ordersReceived}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Orders Matched</div>
                  <div className="font-medium text-green-600">{stats.ordersMatched}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Orders Failed</div>
                  <div className="font-medium text-red-600">{stats.ordersFailed}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Match Rate</div>
                  <div className="font-medium">{stats.matchRate.toFixed(1)}%</div>
                </div>
              </div>

              {/* Trade Stats */}
              <div className="border-t border-border pt-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-muted-foreground">Trades to Relayer</div>
                    <div className="font-medium">{stats.tradesSentToRelayer}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Relayer Success</div>
                    <div className="font-medium text-green-600">{stats.tradesRelayerSuccess}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Relayer Failed</div>
                    <div className="font-medium text-red-600">{stats.tradesRelayerFailed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Success Rate</div>
                    <div className="font-medium">{stats.relayerSuccessRate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Volume Stats */}
              <div className="border-t border-border pt-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-muted-foreground">Total Volume</div>
                    <div className="font-medium">{formatNumber(stats.totalVolume)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg Fill Price</div>
                    <div className="font-medium">{stats.averageFillPrice.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Engine Info */}
              <div className="border-t border-border pt-2 mt-2">
                <div className="text-muted-foreground">Uptime</div>
                <div className="font-medium">{formatUptime(stats.uptime)}</div>
              </div>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}

