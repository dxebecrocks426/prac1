import express, { Request, Response } from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { MatchingEngine } from "./matching-engine";
import { PriceService } from "./price-service";
import { SettlementIntegration } from "./settlement-integration";
import { OrderRequest, Order } from "./types";

// Load environment variables
dotenv.config();

// PID file for process management
const PID_FILE = path.join(os.tmpdir(), "mock-matching-engine.pid");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || "3003", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Initialize services
const priceService = new PriceService(
  parseInt(process.env.PRICE_CACHE_TTL_MS || "2000", 10),
  process.env.BINANCE_API_URL || "https://api.binance.com/api/v3"
);

const matchingEngine = new MatchingEngine(
  priceService,
  parseFloat(process.env.FILL_SUCCESS_RATE || "0.95"),
  parseInt(process.env.MARKET_SLIPPAGE_BPS || "10", 10)
);

const settlementIntegration = new SettlementIntegration(
  process.env.SETTLEMENT_RELAYER_URL || "http://localhost:8080"
);

// Stats tracking
interface EngineStats {
  ordersReceived: number;
  ordersMatched: number;
  ordersFailed: number;
  tradesSentToRelayer: number;
  tradesRelayerSuccess: number;
  tradesRelayerFailed: number;
  totalVolume: number;
  totalQuantityFilled: number;
  averageFillPrice: number;
  startTime: number;
  lastOrderTime: number;
}

const engineStats: EngineStats = {
  ordersReceived: 0,
  ordersMatched: 0,
  ordersFailed: 0,
  tradesSentToRelayer: 0,
  tradesRelayerSuccess: 0,
  tradesRelayerFailed: 0,
  totalVolume: 0,
  totalQuantityFilled: 0,
  averageFillPrice: 0,
  startTime: Date.now(),
  lastOrderTime: 0,
};

// WebSocket server for real-time updates
const server = app.listen(PORT, HOST, () => {
  console.log(`Mock Matching Engine running on http://${HOST}:${PORT}`);
});

const wss = new WebSocketServer({ server });

// Store WebSocket connections
const connections = new Set<any>();

wss.on("connection", (ws) => {
  connections.add(ws);
  console.log("Client connected to WebSocket");

  ws.on("close", () => {
    connections.delete(ws);
    console.log("Client disconnected from WebSocket");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Broadcast order updates to all connected clients
function broadcastOrderUpdate(order: Order) {
  const message = JSON.stringify({ type: "order_update", data: order });
  connections.forEach((ws) => {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(message);
    }
  });
}

// Subscribe to order updates
matchingEngine.subscribe((order) => {
  broadcastOrderUpdate(order);

  // Update stats
  if (order.status === "matched") {
    engineStats.ordersMatched++;
    engineStats.lastOrderTime = Date.now();
    
    // Calculate volume and average price
    order.fills.forEach((fill) => {
      const fillValue = fill.quantity * fill.price;
      engineStats.totalVolume += fillValue;
      engineStats.totalQuantityFilled += fill.quantity;
    });
    
    // Calculate weighted average fill price: total volume / total quantity filled
    if (engineStats.totalQuantityFilled > 0) {
      engineStats.averageFillPrice = engineStats.totalVolume / engineStats.totalQuantityFilled;
    }
  } else if (order.status === "failed") {
    engineStats.ordersFailed++;
  }

  // Send matched trades to settlement relayer
  if (order.status === "matched" && order.fills.length > 0) {
    order.fills.forEach(async (trade) => {
      engineStats.tradesSentToRelayer++;
      try {
        await settlementIntegration.submitTrade(trade);
        engineStats.tradesRelayerSuccess++;
        console.log(`Trade ${trade.id} sent to settlement relayer`);
      } catch (error: any) {
        engineStats.tradesRelayerFailed++;
        console.error(`Failed to send trade ${trade.id} to settlement:`, error.message);
      }
    });
  }
});

// REST API Endpoints

/**
 * Health check endpoint
 */
app.get("/api/health", async (req: Request, res: Response) => {
  const settlementHealthy = await settlementIntegration.healthCheck();
  res.json({
    status: "ok",
    timestamp: Date.now(),
    settlementRelayer: settlementHealthy ? "connected" : "disconnected",
  });
});

/**
 * Submit order for matching
 */
app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const orderRequest: OrderRequest = req.body;

    // Validate order request
    if (!orderRequest.userId || !orderRequest.symbol || !orderRequest.side || !orderRequest.type) {
      return res.status(400).json({ error: "Invalid order request" });
    }

    // Update stats
    engineStats.ordersReceived++;
    engineStats.lastOrderTime = Date.now();

    // Get TradingView price if provided
    const tradingViewPrice = req.body.tradingViewPrice;

    const order = await matchingEngine.placeOrder(orderRequest, tradingViewPrice);

    res.json({
      orderId: order.id,
      status: order.status,
      timestamp: order.timestamp,
    });
  } catch (error: any) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get order status
 */
app.get("/api/orders/:id", (req: Request, res: Response) => {
  const orderId = req.params.id;
  const order = matchingEngine.getOrder(orderId);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json(order);
});

/**
 * Get user orders
 */
app.get("/api/orders/user/:userId", (req: Request, res: Response) => {
  const userId = req.params.userId;
  const orders = matchingEngine.getUserOrders(userId);
  res.json(orders);
});

/**
 * Update price from TradingView (called by frontend)
 */
app.post("/api/prices/:symbol", (req: Request, res: Response) => {
  const symbol = req.params.symbol;
  const price = req.body.price;

  if (typeof price !== "number" || price <= 0) {
    return res.status(400).json({ error: "Invalid price" });
  }

  priceService.updatePrice(symbol, price);
  res.json({ symbol, price, timestamp: Date.now() });
});

/**
 * Start engine (if needed for state management)
 */
app.post("/api/start", async (req: Request, res: Response) => {
  const settlementHealthy = await settlementIntegration.healthCheck();
  
  if (!settlementHealthy) {
    return res.status(503).json({
      error: "Settlement relayer is not available",
    });
  }

  res.json({
    status: "started",
    timestamp: Date.now(),
  });
});

/**
 * Get engine statistics
 */
app.get("/api/stats", (req: Request, res: Response) => {
  const uptime = Date.now() - engineStats.startTime;
  const matchRate = engineStats.ordersReceived > 0 
    ? (engineStats.ordersMatched / engineStats.ordersReceived) * 100 
    : 0;
  const relayerSuccessRate = engineStats.tradesSentToRelayer > 0
    ? (engineStats.tradesRelayerSuccess / engineStats.tradesSentToRelayer) * 100
    : 0;
  
  res.json({
    ordersReceived: engineStats.ordersReceived,
    ordersMatched: engineStats.ordersMatched,
    ordersFailed: engineStats.ordersFailed,
    tradesSentToRelayer: engineStats.tradesSentToRelayer,
    tradesRelayerSuccess: engineStats.tradesRelayerSuccess,
    tradesRelayerFailed: engineStats.tradesRelayerFailed,
    totalVolume: engineStats.totalVolume,
    averageFillPrice: engineStats.averageFillPrice || 0,
    uptime,
    matchRate,
    relayerSuccessRate,
    startTime: engineStats.startTime,
    lastOrderTime: engineStats.lastOrderTime,
  });
});

/**
 * Stop engine (if needed for state management)
 */
app.post("/api/stop", (req: Request, res: Response) => {
  res.json({
    status: "stopped",
    timestamp: Date.now(),
  });
});

// Save PID to file
async function savePid() {
  try {
    await fs.writeFile(PID_FILE, process.pid.toString(), "utf-8");
    console.log(`PID saved to ${PID_FILE}: ${process.pid}`);
  } catch (error) {
    console.error("Failed to save PID file:", error);
  }
}

// Clean up PID file on exit
async function cleanupPid() {
  try {
    await fs.unlink(PID_FILE);
  } catch {
    // File might not exist, that's okay
  }
}

// Save PID when server starts
savePid();

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down gracefully...");
  await cleanupPid();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

