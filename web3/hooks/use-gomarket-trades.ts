"use client";

import { useState, useEffect, useRef } from "react";
import { GomarketWsClient } from "@/lib/api/gomarket-ws";
import { buildGomarketWsUrl } from "@/lib/utils/symbol-format";

export interface Trade {
  tradeId: number;
  price: number;
  amount: number;
  time: Date;
  side: "buy" | "sell";
}

export function useGomarketTrades(symbol: string, maxTrades: number = 50) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<GomarketWsClient | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const url = buildGomarketWsUrl("last-trades", symbol);
    const client = new GomarketWsClient(url, {
      onMessage: (data) => {
        try {
          // Parse trade from WebSocket message
          const trade: Trade = {
            tradeId: data.trade_id,
            price: parseFloat(data.price),
            amount: parseFloat(data.quantity),
            time: new Date(data.timestamp),
            // buyer_maker: false = buyer was taker = buy side
            // buyer_maker: true = buyer was maker = sell side
            side: data.buyer_maker === false ? "buy" : "sell",
          };

          setTrades((prev) => {
            // Add new trade to beginning, limit to maxTrades
            const updated = [trade, ...prev];
            return updated.slice(0, maxTrades);
          });

          setError(null);
        } catch (err) {
          console.error("Error processing trade data:", err);
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
        console.error("GoMarket trades WebSocket error:", err);
        setError(new Error("WebSocket connection error"));
        setIsConnected(false);
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
      setTrades([]);
    };
  }, [symbol, maxTrades]);

  return {
    trades,
    isConnected,
    error,
  };
}

