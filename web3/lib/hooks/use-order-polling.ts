"use client";

import { useEffect, useRef } from "react";
import { mockEngineClient, Order } from "@/lib/api/mock-engine-api";
import { useOrdersStore } from "@/lib/store/use-orders-store";
import { settlementRelayerClient } from "@/lib/api/settlement-relayer-api";

/**
 * Hook to poll order status from mock engine API
 * Polls active orders and updates their status in the store
 */
export function useOrderPolling() {
  const { workingOrders, updateWorkingOrder, removeWorkingOrder, addToHistory } = useOrdersStore();
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const batchPollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Start polling batch status for an order
   */
  const startBatchPolling = (orderId: string, batchId: string) => {
    // Skip if already polling
    if (batchPollingIntervalsRef.current.has(orderId)) {
      return;
    }

    const batchIntervalId = setInterval(async () => {
      try {
        const batchStatus = await settlementRelayerClient.getBatchStatus(batchId);
        
        if (batchStatus) {
          // Update order status based on batch status
          if (batchStatus.status === "CONFIRMED") {
            // Batch is confirmed, mark order as settled
            updateWorkingOrder(orderId, { status: "settled" });
            clearInterval(batchIntervalId);
            batchPollingIntervalsRef.current.delete(orderId);
          } else if (batchStatus.status === "FAILED") {
            // Batch failed, mark order as failed
            updateWorkingOrder(orderId, { status: "failed" });
            clearInterval(batchIntervalId);
            batchPollingIntervalsRef.current.delete(orderId);
          }
          // If still PENDING, continue polling
        }
      } catch (error) {
        console.error(`Error polling batch status for order ${orderId}:`, error);
        // Don't stop polling on error - might be temporary network issue
      }
    }, 2000); // Poll every 2 seconds

    batchPollingIntervalsRef.current.set(orderId, batchIntervalId);
  };

  useEffect(() => {
    // Start polling for all active orders
    const activeOrders = workingOrders.filter(
      (order) => order.status !== "settled" && order.status !== "cancelled" && order.status !== "failed"
    );

    activeOrders.forEach((order) => {
      // Skip if already polling this order
      if (pollingIntervalsRef.current.has(order.orderId)) {
        return;
      }

      // Determine poll interval based on status
      const pollInterval = order.status === "pending" ? 2000 : 5000; // 2s for pending, 5s for matched/settling

      const intervalId = setInterval(async () => {
        try {
          const updatedOrder = await mockEngineClient.getOrderStatus(order.orderId);

          // Map API order status to UI order status
          const uiStatus = mapOrderStatus(updatedOrder.status);

          // Calculate fill metrics
          const avgFillPrice =
            updatedOrder.fills.length > 0
              ? updatedOrder.fills.reduce((sum, fill) => sum + fill.price, 0) /
                updatedOrder.fills.length
              : null;
          const fillQuantity = updatedOrder.fills.reduce(
            (sum, fill) => sum + fill.quantity,
            0
          );
          const fillValue = updatedOrder.fills.reduce(
            (sum, fill) => sum + fill.price * fill.quantity,
            0
          );
          const fillProgress = order.orderQuantity > 0 ? fillQuantity / order.orderQuantity : 0;

          // Update order in store
          updateWorkingOrder(order.orderId, {
            status: uiStatus,
            avgFillPrice,
            fillQuantity,
            fillValue,
            fillProgress,
          });

          // If order is settling and has tradeIds but no batchId, try to find batch_id
          if (uiStatus === "settling" && order.tradeIds && order.tradeIds.length > 0 && !order.batchId) {
            // Try to find batch_id for any of the trade_ids
            for (const tradeId of order.tradeIds) {
              try {
                const batchId = await settlementRelayerClient.getBatchByTradeId(tradeId);
                if (batchId) {
                  updateWorkingOrder(order.orderId, { batchId });
                  // Start polling batch status
                  startBatchPolling(order.orderId, batchId);
                  break; // Found batch_id, stop searching
                }
              } catch (error) {
                // Continue trying other trade_ids
                console.debug(`Failed to get batch for trade ${tradeId}:`, error);
              }
            }
          }

          // If order has batchId, poll batch status
          if (uiStatus === "settling" && order.batchId && !batchPollingIntervalsRef.current.has(order.orderId)) {
            startBatchPolling(order.orderId, order.batchId);
          }

          // Move to history if settled
          if (uiStatus === "settled" || uiStatus === "cancelled" || uiStatus === "failed") {
            clearInterval(intervalId);
            pollingIntervalsRef.current.delete(order.orderId);
            
            // Stop batch polling if active
            const batchInterval = batchPollingIntervalsRef.current.get(order.orderId);
            if (batchInterval) {
              clearInterval(batchInterval);
              batchPollingIntervalsRef.current.delete(order.orderId);
            }

            // Move to history
            addToHistory({
              ...order,
              status: uiStatus,
              avgFillPrice,
              fillQuantity,
              fillValue,
              fillProgress,
              completedAt: new Date(),
            });

            // Remove from working orders
            removeWorkingOrder(order.orderId);
          }
        } catch (error) {
          console.error(`Error polling order ${order.orderId}:`, error);
          // Don't stop polling on error - might be temporary network issue
        }
      }, pollInterval);

      pollingIntervalsRef.current.set(order.orderId, intervalId);
    });

    // Cleanup: stop polling for orders that are no longer active
    const activeOrderIds = new Set(activeOrders.map((o) => o.orderId));
    pollingIntervalsRef.current.forEach((intervalId, orderId) => {
      if (!activeOrderIds.has(orderId)) {
        clearInterval(intervalId);
        pollingIntervalsRef.current.delete(orderId);
      }
    });

    // Cleanup function
    return () => {
      pollingIntervalsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      pollingIntervalsRef.current.clear();
      batchPollingIntervalsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      batchPollingIntervalsRef.current.clear();
    };
  }, [workingOrders, updateWorkingOrder, removeWorkingOrder, addToHistory, startBatchPolling]);
}

/**
 * Map API order status to UI order status
 */
function mapOrderStatus(apiStatus: Order["status"]): string {
  switch (apiStatus) {
    case "pending":
      return "pending";
    case "matched":
      return "matched";
    case "settling":
      return "settling";
    case "settled":
      return "settled";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}


