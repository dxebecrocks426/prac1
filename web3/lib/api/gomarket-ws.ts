"use client";

/**
 * GoMarket WebSocket Client
 * Handles connections to GoMarket API WebSocket endpoints
 */

type MessageHandler = (data: any) => void;
type ErrorHandler = (error: Event) => void;

export interface GomarketWsClientOptions {
  onMessage?: MessageHandler;
  onError?: ErrorHandler;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export class GomarketWsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<GomarketWsClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  constructor(url: string, options: GomarketWsClientOptions = {}) {
    this.url = url;
    this.options = {
      onMessage: options.onMessage || (() => {}),
      onError: options.onError || (() => {}),
      onOpen: options.onOpen || (() => {}),
      onClose: options.onClose || (() => {}),
      reconnect: options.reconnect !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      reconnectDelay: options.reconnectDelay || 1000,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.options.onOpen();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        this.options.onError(error);
      };

      this.ws.onclose = () => {
        this.options.onClose();
        if (!this.isManualClose && this.options.reconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.options.onError(error as Event);
    }
  }

  private scheduleReconnect(): void {
    if (
      this.reconnectAttempts >= this.options.maxReconnectAttempts ||
      this.isManualClose
    ) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    ); // Max 30 seconds

    this.reconnectTimer = setTimeout(() => {
      console.log(
        `Reconnecting to GoMarket WebSocket (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`
      );
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

