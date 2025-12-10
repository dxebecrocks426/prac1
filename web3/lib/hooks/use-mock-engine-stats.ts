import { useEffect, useState, useCallback } from "react";
import { mockEngineClient } from "@/lib/api/mock-engine-api";

export interface MockEngineStats {
  ordersReceived: number;
  ordersMatched: number;
  ordersFailed: number;
  tradesSentToRelayer: number;
  tradesRelayerSuccess: number;
  tradesRelayerFailed: number;
  totalVolume: number;
  averageFillPrice: number;
  uptime: number;
  matchRate: number;
  relayerSuccessRate: number;
  startTime: number;
  lastOrderTime: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  isRunning: boolean;
}

const MOCK_ENGINE_URL = process.env.NEXT_PUBLIC_MOCK_ENGINE_URL || "http://localhost:3003";

export function useMockEngineStats(isEnabled: boolean): MockEngineStats {
  const [stats, setStats] = useState<MockEngineStats>({
    ordersReceived: 0,
    ordersMatched: 0,
    ordersFailed: 0,
    tradesSentToRelayer: 0,
    tradesRelayerSuccess: 0,
    tradesRelayerFailed: 0,
    totalVolume: 0,
    averageFillPrice: 0,
    uptime: 0,
    matchRate: 0,
    relayerSuccessRate: 0,
    startTime: 0,
    lastOrderTime: 0,
    isLoading: true,
    lastUpdated: null,
    isRunning: false,
  });

  const fetchStats = useCallback(async () => {
    if (!isEnabled) return;

    try {
      // Check if engine is running via Next.js API
      const statusResponse = await fetch("/api/mock-engine");
      if (!statusResponse.ok) {
        throw new Error("Failed to check engine status");
      }
      
      const status = await statusResponse.json();
      
      if (!status.running) {
        setStats((prev) => ({
          ...prev,
          isRunning: false,
          isLoading: false,
          lastUpdated: new Date(),
        }));
        return;
      }

      // Fetch stats from mock engine directly
      try {
        const response = await fetch(`${MOCK_ENGINE_URL}/api/stats`, {
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`Stats endpoint returned ${response.status}`);
        }

        const data = await response.json();
        setStats({
          ...data,
          isLoading: false,
          lastUpdated: new Date(),
          isRunning: true,
        });
      } catch (statsError) {
        // Stats endpoint failed, but engine might still be starting
        // Keep isRunning as true if status says it's running
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          isRunning: status.running,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      // Engine might not be running or not responding
      setStats((prev) => ({
        ...prev,
        isLoading: false,
        isRunning: false,
        lastUpdated: new Date(),
      }));
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    fetchStats();

    // Poll every 2 seconds
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [isEnabled, fetchStats]);

  return stats;
}

