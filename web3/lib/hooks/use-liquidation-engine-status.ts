import { useEffect, useState, useCallback } from "react";
import { liquidationEngineClient, LiquidationEngineStats } from "@/lib/api/liquidation-engine-api";

export interface LiquidationEngineStatus {
  isRunning: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  totalLiquidations?: number;
  successRate?: number;
  pendingLiquidations?: number;
  insuranceFundBalance?: string;
  liquidatorCount?: number;
}

const LIQUIDATION_ENGINE_URL = process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_URL || "http://localhost:8081";

export function useLiquidationEngineStatus(isEnabled: boolean): LiquidationEngineStatus {
  const [status, setStatus] = useState<LiquidationEngineStatus>({
    isRunning: false,
    isLoading: true,
    lastUpdated: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!isEnabled) return;

    try {
      // Check if service is running via Next.js API
      const statusResponse = await fetch("/api/liquidation-engine");
      if (!statusResponse.ok) {
        throw new Error("Failed to check liquidation engine status");
      }
      
      const apiStatus = await statusResponse.json();
      
      if (!apiStatus.running) {
        setStatus((prev) => ({
          ...prev,
          isRunning: false,
          isLoading: false,
          lastUpdated: new Date(),
        }));
        return;
      }

      // Service is running, fetch stats
      try {
        const stats = await liquidationEngineClient.getStats();
        
        if (stats) {
          setStatus({
            isRunning: true,
            isLoading: false,
            lastUpdated: new Date(),
            totalLiquidations: stats.total_liquidations,
            successRate: stats.success_rate,
            pendingLiquidations: stats.pending_liquidations,
            insuranceFundBalance: stats.insurance_fund_balance,
            liquidatorCount: stats.liquidator_count,
          });
          return;
        }
      } catch (statsError) {
        // Stats endpoint failed, but service is still running
        // Show health status without stats
      }

      // Service is running but stats endpoint not available or failed
      // Verify health endpoint works
      try {
        const healthResponse = await fetch(`${LIQUIDATION_ENGINE_URL}/health`, {
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        
        setStatus({
          isRunning: healthResponse.ok,
          isLoading: false,
          lastUpdated: new Date(),
        });
      } catch (healthError) {
        // Health check failed, but API says it's running
        // Trust the API status
        setStatus({
          isRunning: apiStatus.running,
          isLoading: false,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      // Service might not be running or not responding
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        isRunning: false,
        lastUpdated: new Date(),
      }));
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    fetchStatus();

    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isEnabled, fetchStatus]);

  return status;
}

