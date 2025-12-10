"use client";

import { useEffect, useRef, useState } from "react";
import { WebSocketClient } from "@/lib/websocket/client";

export function useWebSocket(
  handshakeToken: string | null,
  isPrivate: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!handshakeToken) {
      return;
    }

    const wsBaseUrl = isPrivate
      ? process.env.NEXT_PUBLIC_WS_PRIVATE_URL ||
        "wss://godark.goquant.io/ws/testnet"
      : process.env.NEXT_PUBLIC_WS_PUBLIC_URL ||
        "wss://godark-testnet.goquant.io/ws/public";

    const client = new WebSocketClient(wsBaseUrl, handshakeToken, isPrivate);

    client.setHandlers({
      onOpen: () => {
        setIsConnected(true);
        setError(null);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (err) => {
        setError(err);
        setIsConnected(false);
      },
      onMessage: (message) => {
        // Handle messages in specific hooks
        console.log("WebSocket message:", message);
      },
    });

    client.connect().catch((err) => {
      setError(err);
      setIsConnected(false);
    });

    wsClientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [handshakeToken, isPrivate]);

  return {
    client: wsClientRef.current,
    isConnected,
    error,
    subscribe: (channel: string) => {
      wsClientRef.current?.subscribe(channel);
    },
    unsubscribe: (channel: string) => {
      wsClientRef.current?.unsubscribe(channel);
    },
  };
}


