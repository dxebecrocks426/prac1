import { create } from "zustand";

interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  change24h: number;
}

interface OrderbookEntry {
  price: number;
  size: number;
  total: number;
}

interface TradingStore {
  selectedSymbol: string;
  marketData: Map<string, MarketData>;
  orderbook: {
    bids: OrderbookEntry[];
    asks: OrderbookEntry[];
  };
  fundingRate: number | null;
  nextFundingTime: number | null;
  setSelectedSymbol: (symbol: string) => void;
  updateMarketData: (symbol: string, data: MarketData) => void;
  updateOrderbook: (bids: OrderbookEntry[], asks: OrderbookEntry[]) => void;
  updateFundingRate: (rate: number, nextTime: number) => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  selectedSymbol: "BTC-USDT-PERP",
  marketData: new Map(),
  orderbook: {
    bids: [],
    asks: [],
  },
  fundingRate: null,
  nextFundingTime: null,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  updateMarketData: (symbol, data) =>
    set((state) => {
      const newMarketData = new Map(state.marketData);
      newMarketData.set(symbol, data);
      return { marketData: newMarketData };
    }),
  updateOrderbook: (bids, asks) =>
    set({
      orderbook: { bids, asks },
    }),
  updateFundingRate: (rate, nextTime) =>
    set({
      fundingRate: rate,
      nextFundingTime: nextTime,
    }),
}));


