import { useEffect, useState } from "react";

export interface ValidatorStatus {
  running: boolean;
  pid?: number;
  rpcEndpoint: string;
  healthCheck?: boolean;
  error?: string;
}

export function useValidatorStatus(enabled: boolean = true) {
  const [status, setStatus] = useState<ValidatorStatus>({
    running: false,
    rpcEndpoint: "http://localhost:8899",
  });

  useEffect(() => {
    if (!enabled) return;

    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const updateStatus = async () => {
      try {
        const response = await fetch("/api/validator");
        const data = await response.json();

        if (isMounted) {
          setStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch validator status:", error);
        if (isMounted) {
          setStatus({
            running: false,
            rpcEndpoint: "http://localhost:8899",
            error: "Failed to check validator status",
          });
        }
      }
    };

    // Initial update
    updateStatus();

    // Update every 2 seconds
    intervalId = setInterval(updateStatus, 2000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enabled]);

  return status;
}


