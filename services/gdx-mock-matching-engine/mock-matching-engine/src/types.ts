export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "peg_mid" | "peg_bid" | "peg_ask";
  quantity: number;
  price?: number;
  leverage: number;
  timestamp: number;
  status: "pending" | "matched" | "settling" | "settled" | "cancelled" | "failed";
  fills: Trade[];
}

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  price: number;
  timestamp: number;
  orderId: string;
}

export interface OrderRequest {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "peg_mid" | "peg_bid" | "peg_ask";
  quantity: number;
  price?: number;
  leverage: number;
}

export interface TradeRequest {
  user_id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  price: number;
  timestamp: number;
  trade_id?: string; // Optional trade_id from matching engine
}

export interface TradeResponse {
  trade_id: string;
  status: string;
}

export interface SettlementStatusResponse {
  batch_id: string;
  status: string;
  tx_signature?: string;
  trade_count: number;
  created_at: string;
}

export interface EngineConfig {
  port: number;
  settlementRelayerUrl: string;
  solanaRpcUrl: string;
  fillSuccessRate: number;
  marketSlippageBps: number;
  maxBatchSize: number;
  batchWindowMs: number;
  settlementRelayerProgramId?: string;
  positionManagementProgramId?: string;
}


