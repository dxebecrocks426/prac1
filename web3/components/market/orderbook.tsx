"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGomarketOrderbook } from "@/hooks/use-gomarket-orderbook";
import { formatPrice, formatBalance } from "@/lib/utils/number-format";

interface OrderbookProps {
  symbol: string;
}

export function Orderbook({ symbol }: OrderbookProps) {
  const { bids, asks, bestBid, bestAsk, isConnected, error } =
    useGomarketOrderbook(symbol, 10);

  // Calculate max total for visual bars
  const maxTotal = Math.max(
    ...bids.map((b) => b.total),
    ...asks.map((a) => a.total),
    1
  );

  return (
    <Card className="flex flex-col bg-background/20 backdrop-blur-xl border border-primary/20 rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Reference Order Book</CardTitle>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
            {error && (
              <span className="text-xs text-destructive" title={error.message}>
                Error
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {bids.length === 0 && asks.length === 0 ? (
          <div className="text-xs text-center text-muted-foreground py-4">
            {isConnected ? "Waiting for orderbook data..." : "Connecting..."}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Asks (Sell orders) - Red */}
            <div>
              {asks.map((ask, idx) => {
              const barWidth = (ask.total / maxTotal) * 100;
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-between text-xs hover:bg-muted/30 px-2 py-1 group"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-destructive/30 opacity-50 group-hover:opacity-60 transition-opacity"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="text-destructive font-medium relative z-10">
                    {formatPrice(ask.price)} USDT
                  </span>
                  <span className="relative z-10">{formatBalance(ask.size, 4)} BTC</span>
                  <span className="text-muted-foreground relative z-10">
                    {formatBalance(ask.total, 4)} BTC
                  </span>
                </div>
              );
            })}
          </div>

          {/* Spread */}
          {bestBid && bestAsk && (
            <div className="text-center text-xs py-2 border-y border-border bg-muted/30">
              <div className="font-semibold">
                {formatPrice(bestBid)} / {formatPrice(bestAsk)} USDT
              </div>
              <div className="text-muted-foreground mt-1">
                Spread {Math.round(((bestAsk - bestBid) / bestBid) * 10000)} bps / {formatPrice(bestAsk - bestBid)} USDT
              </div>
            </div>
          )}

          {/* Bids (Buy orders) - Green */}
          <div>
            {bids.map((bid, idx) => {
              const barWidth = (bid.total / maxTotal) * 100;
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-between text-xs hover:bg-muted/30 px-2 py-1 group"
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-primary/30 opacity-40 group-hover:opacity-50 transition-opacity backdrop-blur-sm"
                    style={{ width: `${barWidth}%` }}
                  />
                  <span className="text-primary font-medium relative z-10">
                    {formatPrice(bid.price)} USDT
                  </span>
                  <span className="relative z-10">{formatBalance(bid.size, 4)} BTC</span>
                  <span className="text-muted-foreground relative z-10">
                    {formatBalance(bid.total, 4)} BTC
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
