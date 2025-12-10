"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useOrdersStore } from "@/lib/store/use-orders-store";
import { useOrderPolling } from "@/lib/hooks/use-order-polling";
import { formatPrice, formatBalance, formatPercentage } from "@/lib/utils/number-format";

interface WorkingOrder {
  algorithmId: string;
  dateTime: Date;
  type: string;
  symbol: string;
  side: "buy" | "sell";
  avgFillPrice: number | null;
  avgOrderPrice: number;
  fillQuantity: number;
  orderQuantity: number;
  fillValue: number;
  orderValue: number;
  fillProgress: number;
  status: string;
}

export function WorkingOrdersTable() {
  const { workingOrders } = useOrdersStore();
  const orders = workingOrders;
  
  // Start polling for order status updates
  useOrderPolling();

  return (
    <div className="w-full">
      {orders.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No working orders
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Algo ID</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Avg Fill / Order Price</TableHead>
              <TableHead>Fill / Order Qty</TableHead>
              <TableHead>Fill / Order Value</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.algorithmId}>
                <TableCell className="font-mono text-xs">
                  {order.algorithmId.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {format(order.dateTime, "MM/dd HH:mm:ss")}
                </TableCell>
                <TableCell>{order.type}</TableCell>
                <TableCell>{order.symbol}</TableCell>
                <TableCell
                  className={
                    order.side === "buy"
                      ? "text-primary font-medium"
                      : "text-destructive font-medium"
                  }
                >
                  {order.side.toUpperCase()}
                </TableCell>
                <TableCell>
                  {order.avgFillPrice
                    ? `$${formatPrice(order.avgFillPrice)}`
                    : "-"}{" "}
                  / ${formatPrice(order.avgOrderPrice)}
                </TableCell>
                <TableCell>
                  {formatBalance(order.fillQuantity, 4)} /{" "}
                  {formatBalance(order.orderQuantity, 4)}
                </TableCell>
                <TableCell>
                  ${formatPrice(order.fillValue)} / ${formatPrice(order.orderValue)}
                </TableCell>
                <TableCell>{formatPercentage(order.fillProgress * 100, 1)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                    <Button variant="ghost" size="sm">
                      Modify
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

