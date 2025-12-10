import { apiClient } from "./client";

export interface PlaceOrderRequest {
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit" | "peg_mid" | "peg_bid" | "peg_ask";
  quantity: number;
  price?: number;
  leverage: number;
  time_in_force: "IOC" | "FOK" | "GTD" | "GTC";
  all_or_none?: boolean;
  min_qty?: number;
  nbbo_protection?: boolean;
  visibility?: "dark" | "lit";
  good_till_date?: string; // ISO 8601 for GTD
}

export interface OrderResponse {
  order_id: string;
  algorithm_id: string;
  status: string;
  symbol: string;
  side: string;
  quantity: number;
  filled_quantity: number;
  price?: number;
  timestamp: string;
}

export interface CancelOrderRequest {
  order_id: string;
}

export interface ModifyOrderRequest {
  order_id: string;
  quantity?: number;
  price?: number;
}

export const ordersApi = {
  /**
   * Place a new order
   */
  place: async (order: PlaceOrderRequest) => {
    return apiClient.post<OrderResponse>("/place", order);
  },

  /**
   * Cancel an order
   */
  cancel: async (orderId: string) => {
    return apiClient.post<void>("/cancel", { order_id: orderId });
  },

  /**
   * Modify an existing order
   */
  modify: async (modification: ModifyOrderRequest) => {
    return apiClient.post<OrderResponse>("/modify", modification);
  },
};


