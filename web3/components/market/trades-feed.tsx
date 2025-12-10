"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useGomarketTrades } from "@/hooks/use-gomarket-trades";
import { formatPrice, formatBalance } from "@/lib/utils/number-format";

interface TradesFeedProps {
  symbol: string;
}

export function TradesFeed({ symbol }: TradesFeedProps) {
  const { trades, isConnected, error } = useGomarketTrades(symbol, 5);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className="flex flex-col bg-background/20 backdrop-blur-xl border border-primary/20 rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Reference Trades</CardTitle>
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
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="h-8 text-xs">Price(USDT)</TableHead>
              <TableHead className="h-8 text-xs">Amt(BTC)</TableHead>
              <TableHead className="h-8 text-xs">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-4">
                  {isConnected ? "Waiting for trades..." : "Connecting..."}
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => (
                <TableRow
                  key={trade.tradeId}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <TableCell
                    className={cn(
                      "text-xs font-medium py-1",
                      trade.side === "buy" ? "text-primary" : "text-destructive"
                    )}
                  >
                    {formatPrice(trade.price)}
                  </TableCell>
                  <TableCell className="text-xs py-1">
                    {formatBalance(trade.amount, 5)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1">
                    {formatTime(trade.time)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
