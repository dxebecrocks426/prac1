import { useEffect, useState, useCallback } from "react";

export interface PositionManagementStatus {
  isRunning: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
}

const POSITION_MANAGEMENT_URL = process.env.NEXT_PUBLIC_POSITION_MANAGEMENT_URL || "http://localhost:8081";

export function usePositionManagementStatus(isEnabled: boolean): PositionManagementStatus {
  const [status, setStatus] = useState<PositionManagementStatus>({
    isRunning: false,
    isLoading: true,
    lastUpdated: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!isEnabled) return;

    try {
      // Check if service is running via Next.js API
      const statusResponse = await fetch("/api/position-management");
      if (!statusResponse.ok) {
        throw new Error("Failed to check position management status");
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

      // Service is running, verify health endpoint works
      try {
        const healthResponse = await fetch(`${POSITION_MANAGEMENT_URL}/health`, {
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

