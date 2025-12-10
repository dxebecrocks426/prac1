import { useEffect, useState, useCallback } from "react";

export interface SettlementRelayerStatus {
  isRunning: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  totalSettled?: number;
  successRate?: number;
  pendingBatches?: number;
  failedBatches?: number;
}

const SETTLEMENT_RELAYER_URL = process.env.NEXT_PUBLIC_SETTLEMENT_RELAYER_URL || "http://localhost:8080";

export function useSettlementRelayerStatus(isEnabled: boolean): SettlementRelayerStatus {
  const [status, setStatus] = useState<SettlementRelayerStatus>({
    isRunning: false,
    isLoading: true,
    lastUpdated: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!isEnabled) return;

    try {
      // Check if relayer is running via Next.js API
      const statusResponse = await fetch("/api/settlement-relayer");
      if (!statusResponse.ok) {
        throw new Error("Failed to check relayer status");
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
        const statsResponse = await fetch(`${SETTLEMENT_RELAYER_URL}/settlement/stats`, {
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStatus({
            isRunning: true,
            isLoading: false,
            lastUpdated: new Date(),
            totalSettled: statsData.total_settled,
            successRate: statsData.success_rate,
            pendingBatches: statsData.pending_batches,
            failedBatches: statsData.failed_batches,
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
        const healthResponse = await fetch(`${SETTLEMENT_RELAYER_URL}/health`, {
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
      // Relayer might not be running or not responding
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

