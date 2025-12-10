import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

export interface SolanaPerformanceMetrics {
  slot: number | null;
  blockHeight: number | null;
  network: "localnet" | "devnet" | "mainnet" | "unknown";
  connectionStatus: "connected" | "disconnected";
  lastUpdate: Date | null;
}

export function useSolanaPerformance(enabled: boolean = true) {
  const { connection } = useConnection();
  const [metrics, setMetrics] = useState<SolanaPerformanceMetrics>({
    slot: null,
    blockHeight: null,
    network: "unknown",
    connectionStatus: "disconnected",
    lastUpdate: null,
  });

  useEffect(() => {
    if (!enabled) return;

    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const updateMetrics = async () => {
      try {
        // Detect network from RPC endpoint
        const endpoint = connection.rpcEndpoint;
        let network: "localnet" | "devnet" | "mainnet" | "unknown" = "unknown";
        
        if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1") || endpoint.includes("8899")) {
          network = "localnet";
        } else if (endpoint.includes("devnet")) {
          network = "devnet";
        } else if (endpoint.includes("mainnet")) {
          network = "mainnet";
        }

        // Get slot
        const slot = await connection.getSlot();

        // Get block height
        const blockHeight = await connection.getBlockHeight();

        if (isMounted) {
          setMetrics({
            slot,
            blockHeight,
            network,
            connectionStatus: "connected",
            lastUpdate: new Date(),
          });
        }
      } catch (error) {
        console.error("Failed to fetch Solana performance metrics:", error);
        if (isMounted) {
          setMetrics((prev) => ({
            ...prev,
            connectionStatus: "disconnected",
            lastUpdate: new Date(),
          }));
        }
      }
    };

    // Initial update
    updateMetrics();

    // Update every 2-3 seconds
    intervalId = setInterval(updateMetrics, 2500);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connection, enabled]);

  return metrics;
}


