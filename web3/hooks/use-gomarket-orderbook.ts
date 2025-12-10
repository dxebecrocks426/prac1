"use client";

import { useState, useEffect, useRef } from "react";
import { GomarketWsClient } from "@/lib/api/gomarket-ws";
import { buildGomarketWsUrl } from "@/lib/utils/symbol-format";

export interface OrderbookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderbookData {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  bestBid: number | null;
  bestAsk: number | null;
}

export function useGomarketOrderbook(
  symbol: string,
  maxLevels: number = 10
) {
  const [bids, setBids] = useState<OrderbookEntry[]>([]);
  const [asks, setAsks] = useState<OrderbookEntry[]>([]);
  const [bestBid, setBestBid] = useState<number | null>(null);
  const [bestAsk, setBestAsk] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<GomarketWsClient | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const url = buildGomarketWsUrl("l2-orderbook", symbol);
    const client = new GomarketWsClient(url, {
      onMessage: (data) => {
        try {
          // Parse bids and asks from WebSocket message
          const rawBids = data.bids || [];
          const rawAsks = data.asks || [];

          // Convert to OrderbookEntry format and limit to maxLevels
          // Bids come sorted highest to lowest (we want highest first for display)
          // Asks come sorted lowest to highest (we want lowest first for display)
          const processedBids: OrderbookEntry[] = [];
          let bidTotal = 0;
          for (let i = 0; i < Math.min(rawBids.length, maxLevels); i++) {
            const [priceStr, sizeStr] = rawBids[i];
            const price = parseFloat(priceStr);
            const size = parseFloat(sizeStr);
            bidTotal += size;
            processedBids.push({
              price,
              size,
              total: bidTotal,
            });
          }

          const processedAsks: OrderbookEntry[] = [];
          let askTotal = 0;
          for (let i = 0; i < Math.min(rawAsks.length, maxLevels); i++) {
            const [priceStr, sizeStr] = rawAsks[i];
            const price = parseFloat(priceStr);
            const size = parseFloat(sizeStr);
            askTotal += size;
            processedAsks.push({
              price,
              size,
              total: askTotal,
            });
          }

          // Bids are already sorted highest to lowest, asks lowest to highest
          setBids(processedBids);
          setAsks(processedAsks);

          // Set best bid/ask (first entry in each array)
          if (processedBids.length > 0) {
            setBestBid(processedBids[0]?.price || null);
          }
          if (processedAsks.length > 0) {
            setBestAsk(processedAsks[0]?.price || null);
          }

          setError(null);
        } catch (err) {
          console.error("Error processing orderbook data:", err);
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      },
      onOpen: () => {
        setIsConnected(true);
        setError(null);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (err) => {
        console.error("GoMarket orderbook WebSocket error:", err);
        setError(new Error("WebSocket connection error"));
        setIsConnected(false);
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
      setBids([]);
      setAsks([]);
      setBestBid(null);
      setBestAsk(null);
    };
  }, [symbol, maxLevels]);

  return {
    bids,
    asks,
    bestBid,
    bestAsk,
    isConnected,
    error,
  };
}

