type WebSocketMessage = {
  channel: string;
  data: any;
  timestamp: string;
};

type WebSocketEventHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
};

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handshakeToken: string | null = null;
  private subscriptions: Set<string> = new Set();
  private handlers: WebSocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  constructor(
    url: string,
    handshakeToken: string | null = null,
    isPrivate: boolean = true
  ) {
    const wsBaseUrl = isPrivate
      ? process.env.NEXT_PUBLIC_WS_PRIVATE_URL ||
        "wss://godark.goquant.io/ws/testnet"
      : process.env.NEXT_PUBLIC_WS_PUBLIC_URL ||
        "wss://godark-testnet.goquant.io/ws/public";

    this.url = `${wsBaseUrl}?handshake_token=${handshakeToken || ""}`;
    this.handshakeToken = handshakeToken;
  }

  setHandlers(handlers: WebSocketEventHandlers) {
    this.handlers = handlers;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.handlers.onOpen?.();
          resolve();
        };

        this.ws.onclose = () => {
          this.handlers.onClose?.();
          if (!this.isManualClose) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.handlers.onError?.(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handlers.onMessage?.(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect().catch(console.error);
    }, delay);
  }

  subscribe(channel: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, subscription queued");
      this.subscriptions.add(channel);
      return;
    }

    this.subscriptions.add(channel);
    this.ws.send(
      JSON.stringify({
        action: "subscribe",
        channel,
      })
    );
  }

  unsubscribe(channel: string) {
    this.subscriptions.delete(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          action: "unsubscribe",
          channel,
        })
      );
    }
  }

  disconnect() {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
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


