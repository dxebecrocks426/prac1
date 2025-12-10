"use client";

import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { HighlightOverlay } from "@/components/flow/highlight-overlay";
import { useWallet } from "@solana/wallet-adapter-react";
import { mockTradingEngine } from "@/lib/mock/trading-engine";
import { formatPrice, formatNumber } from "@/lib/utils/number-format";
import { settlementSimulator } from "@/lib/mock/settlement-simulator";
import { useOrdersStore } from "@/lib/store/use-orders-store";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";

const orderFormSchema = z.object({
  orderType: z.enum(["market", "limit", "peg_mid", "peg_bid", "peg_ask"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().min(0.001),
  price: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === "number" && isNaN(val)) ? undefined : val),
    z.union([z.number().positive(), z.undefined()]).optional()
  ),
  leverage: z.number().min(1).max(1000),
  timeInForce: z.enum(["IOC", "FOK", "GTD", "GTC"]),
  allOrNone: z.boolean(),
  minQty: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === "number" && isNaN(val)) ? undefined : val),
    z.union([z.number().positive(), z.undefined()]).optional()
  ),
  nbboProtection: z.boolean(),
}).refine((data) => {
  // For market orders, price is not required
  if (data.orderType === "market") {
    return true;
  }
  // For limit and peg orders, price is required
  if (data.orderType === "limit" || data.orderType.startsWith("peg_")) {
    return data.price !== undefined && data.price !== null && !isNaN(data.price) && data.price > 0;
  }
  return true;
}, {
  message: "Price is required for limit and peg orders",
  path: ["price"],
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  symbol: string;
  currentPrice?: number | null; // TradingView current price
}

export function OrderForm({ symbol, currentPrice }: OrderFormProps) {
  const [leverage, setLeverage] = useState([1]);
  const { publicKey } = useWallet();
  const { isStepActive, completeStep } = useFlowStore();
  const { addWorkingOrder, updateWorkingOrder } = useOrdersStore();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderType: "limit",
      side: "buy",
      quantity: 0.001, // Set to minimum valid value instead of 0
      price: undefined,
      leverage: 1,
      timeInForce: "GTC",
      allOrNone: false,
      minQty: undefined,
      nbboProtection: false,
    },
  });

  const orderType = form.watch("orderType");
  const showPrice = orderType === "limit" || orderType.startsWith("peg_");

  const onSubmit = async (data: OrderFormValues) => {
    try {
      // Clean up any NaN values
      const cleanedData = {
        ...data,
        price: (data.price !== null && data.price !== undefined && !isNaN(data.price)) ? data.price : undefined,
        minQty: (data.minQty !== null && data.minQty !== undefined && !isNaN(data.minQty)) ? data.minQty : undefined,
      };
      
      console.log("Form submitted with data:", cleanedData);
    
    if (!publicKey) {
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: "Please connect your wallet first",
        status: "failed",
      });
      alert("Please connect your wallet first");
      return;
    }
    
    // Validate quantity
    if (!cleanedData.quantity || cleanedData.quantity < 0.001) {
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: "Quantity must be at least 0.001",
        status: "failed",
      });
      return;
    }

    // Use TradingView price if available (prefer prop, fallback to extractor)
    // But don't require it - mock engine will handle price determination
    let tradingViewPrice: number | undefined = currentPrice || undefined;
    if (!tradingViewPrice) {
      try {
        const { getCurrentPrice } = await import("@/lib/mock/tradingview-price-extractor");
        tradingViewPrice = getCurrentPrice(symbol) || undefined;
      } catch (error) {
        // Ignore if price extractor not available
      }
    }
    
    // TradingView price is optional - mock engine will use its own price source if not available

    // Log order placement
    useDevConsoleStore.getState().addEvent({
      type: "order",
      message: `Placing ${cleanedData.side.toUpperCase()} ${cleanedData.orderType} order: ${cleanedData.quantity} ${symbol} @ ${cleanedData.price || "market"} (${cleanedData.leverage}x)`,
      status: "pending",
      details: {
        symbol,
        side: cleanedData.side,
        type: cleanedData.orderType,
        quantity: cleanedData.quantity,
        price: cleanedData.price,
        leverage: cleanedData.leverage,
      },
    });

    // Mock order placement (now async)
    let order;
    try {
      order = await mockTradingEngine.placeOrder({
        userId: publicKey.toBase58(),
        symbol,
        side: cleanedData.side,
        type: cleanedData.orderType,
        quantity: cleanedData.quantity,
        price: cleanedData.price,
        leverage: cleanedData.leverage,
      }, tradingViewPrice);

      // Log order received
      useDevConsoleStore.getState().addEvent({
        type: "order",
        message: `Order received: ${order.id}`,
        status: "success",
        details: {
          orderId: order.id,
          status: order.status,
        },
      });
      
      // Log order placed
      console.log(`Order placed: ${order.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to place order: ${errorMessage}`,
        status: "failed",
        details: { error: errorMessage },
      });
      console.error("Order placement failed:", error);
      return; // Exit early on error
    }

    // Calculate effective price for order value
    const effectiveOrderPrice = cleanedData.orderType === "market" 
      ? (tradingViewPrice || 0)
      : (cleanedData.price || tradingViewPrice || 0);
    
    // Add to working orders
    const workingOrder: any = {
      algorithmId: order.id,
      orderId: order.id,
      dateTime: new Date(order.timestamp),
      type: order.type,
      symbol: order.symbol,
      side: order.side,
      avgFillPrice: null,
      avgOrderPrice: effectiveOrderPrice,
      fillQuantity: 0,
      orderQuantity: order.quantity,
      fillValue: 0,
      orderValue: order.quantity * effectiveOrderPrice,
      fillProgress: 0,
      status: order.status,
    };
    addWorkingOrder(workingOrder);

    // Subscribe to order updates
    const unsubscribe = mockTradingEngine.subscribe((updatedOrder) => {
      if (updatedOrder.id === order.id) {
        // Update order in store
        if (
          updatedOrder.status === "matched" ||
          updatedOrder.status === "settling"
        ) {
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

          // Update working order
          // Note: This would normally use updateWorkingOrder, but for simplicity we'll let it update naturally
        }

        if (updatedOrder.status === "matched") {
          // Extract tradeIds from fills
          const tradeIds = updatedOrder.fills.map((fill) => fill.id);
          
          // Update working order with tradeIds
          updateWorkingOrder(order.id, { tradeIds });
          
          // Log trade matched
          updatedOrder.fills.forEach((fill) => {
            useDevConsoleStore.getState().addEvent({
              type: "trade",
              message: `Trade matched: ${fill.side} ${fill.quantity} ${fill.symbol} @ ${formatPrice(fill.price)}`,
              status: "success",
              details: {
                tradeId: fill.id,
                orderId: fill.orderId,
                symbol: fill.symbol,
                side: fill.side,
                quantity: fill.quantity,
                price: fill.price,
              },
            });
            
            settlementSimulator.addTrade(fill);
            
            // Log trade sent to relayer
            useDevConsoleStore.getState().addEvent({
              type: "trade",
              message: `Trade sent to settlement relayer: ${fill.id}`,
              status: "pending",
              details: {
                tradeId: fill.id,
                relayerUrl: "http://localhost:8080/trades",
              },
            });
          });
        }
        if (updatedOrder.status === "settled") {
          completeStep("place-trade");
          // Auto-complete position management step
          setTimeout(() => {
            completeStep("position-management");
          }, 500);
          unsubscribe();
        }
      }
    });
    
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error in onSubmit:", error);
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Order submission error: ${errorMessage}`,
        status: "failed",
        details: { error: errorMessage },
      });
    }
  };

  const isTradeStepActive = isStepActive("place-trade");
  const cardRef = useRef<HTMLDivElement>(null);

  const quantity = form.watch("quantity") || 0;
  const price = form.watch("price") || 0;
  const leverageValue = leverage[0];
  
  // Use TradingView price for market orders, form price for limit orders
  const effectivePrice = orderType === "market" 
    ? (currentPrice || 0)
    : (price || currentPrice || 0);
  
  const orderValue = quantity * effectivePrice;
  const fees = orderValue * 0.0001; // 0.01% fee estimate
  const marginReq = orderValue / leverageValue;

  return (
    <div className="relative" ref={cardRef}>
      <Card className="flex flex-col bg-background/20 backdrop-blur-xl border border-primary/20 rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-sm">Place Order</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            // Only log if there are actual errors
            const errorKeys = Object.keys(errors);
            if (errorKeys.length === 0) {
              // No field errors - form validation passed, this shouldn't happen
              // But if it does, silently return
              return;
            }
            
            // Sanitize errors to avoid circular references
            const sanitizedErrors: Record<string, string> = {};
            errorKeys.forEach((key) => {
              const error = errors[key as keyof typeof errors];
              if (error?.message) {
                sanitizedErrors[key] = error.message;
              } else if (typeof error === "string") {
                sanitizedErrors[key] = error;
              } else {
                sanitizedErrors[key] = "Validation error";
              }
            });
            
            // Only log if we have sanitized errors
            if (Object.keys(sanitizedErrors).length > 0) {
              console.error("Form validation errors:", sanitizedErrors);
              useDevConsoleStore.getState().addEvent({
                type: "error",
                message: `Form validation failed: ${Object.keys(sanitizedErrors).join(", ")}`,
                status: "failed",
                details: sanitizedErrors,
              });
            }
          })} className="space-y-3">
            {/* Order Type Tabs */}
            <div className="flex gap-1 border-b border-border">
              <button
                type="button"
                onClick={() => {
                  form.setValue("orderType", "market");
                  // Clear price for market orders
                  form.setValue("price", undefined);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium relative",
                  form.watch("orderType") === "market" && "text-primary"
                )}
              >
                Market
                {form.watch("orderType") === "market" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={() => form.setValue("orderType", "limit")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium relative",
                  form.watch("orderType") === "limit" && "text-primary"
                )}
              >
                Limit
                {form.watch("orderType") === "limit" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={() => form.setValue("orderType", "peg_mid")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium relative",
                  form.watch("orderType").startsWith("peg") && "text-primary"
                )}
              >
                Peg
                {form.watch("orderType").startsWith("peg") && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {/* Side */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.watch("side") === "buy" ? "default" : "outline"}
                onClick={() => form.setValue("side", "buy")}
                size="sm"
                className={cn(
                  "w-full font-semibold h-9",
                  form.watch("side") === "buy"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                ↑ Long
              </Button>
              <Button
                type="button"
                variant={form.watch("side") === "sell" ? "default" : "outline"}
                onClick={() => form.setValue("side", "sell")}
                size="sm"
                className={cn(
                  "w-full font-semibold h-9",
                  form.watch("side") === "sell"
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                ↓ Short
              </Button>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <Label htmlFor="quantity" className="text-xs">Quantity</Label>
              <Controller
                name="quantity"
                control={form.control}
                rules={{ 
                  required: "Quantity is required",
                  min: { value: 0.001, message: "Quantity must be at least 0.001" }
                }}
                render={({ field }) => (
                  <NumberInput
                    id="quantity"
                    step="0.001"
                    min="0.001"
                    className="h-9 text-sm border border-primary/30 focus-visible:border-primary/60 bg-background/50"
                    value={field.value}
                    onChange={(_, numericValue) => field.onChange(numericValue)}
                  />
                )}
              />
              {form.formState.errors.quantity && (
                <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
              )}
            </div>

            {/* Price (conditional) */}
            {showPrice && (
              <div className="space-y-1">
                <Label htmlFor="price" className="text-xs">Price</Label>
                <Controller
                  name="price"
                  control={form.control}
                  render={({ field }) => (
                    <NumberInput
                      id="price"
                      step="0.01"
                      className="h-9 text-sm border border-primary/30 focus-visible:border-primary/60 bg-background/50"
                      value={field.value}
                      onChange={(_, numericValue) => field.onChange(numericValue)}
                    />
                  )}
                />
              </div>
            )}

            {/* Leverage */}
            <div className="space-y-1">
              <Label className="text-xs">Leverage: {leverage[0]}x</Label>
              <Slider
                value={leverage}
                onValueChange={(value) => {
                  setLeverage(value);
                  form.setValue("leverage", value[0]);
                }}
                min={1}
                max={1000}
                step={1}
                className="py-2"
              />
              <div className="flex gap-1.5">
                {[1, 10, 100, 1000].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant={leverage[0] === val ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs px-2",
                      leverage[0] === val &&
                        "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    )}
                    onClick={() => {
                      setLeverage([val]);
                      form.setValue("leverage", val);
                    }}
                  >
                    {val}x
                  </Button>
                ))}
              </div>
            </div>

            {/* Time in Force */}
            <div className="space-y-1">
              <Label className="text-xs">Time in Force</Label>
              <Select
                value={form.watch("timeInForce")}
                onValueChange={(value) =>
                  form.setValue(
                    "timeInForce",
                    value as OrderFormValues["timeInForce"]
                  )
                }
              >
                <SelectTrigger className="h-9 text-sm border border-primary/30 focus:border-primary/60 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IOC">Immediate or Cancel</SelectItem>
                  <SelectItem value="FOK">Fill or Kill</SelectItem>
                  <SelectItem value="GTD">Good Till Date</SelectItem>
                  <SelectItem value="GTC">Good Till Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Attributes */}
            <div className="space-y-1">
              <Label className="text-xs">Order Attributes</Label>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allOrNone"
                    checked={form.watch("allOrNone")}
                    onCheckedChange={(checked) =>
                      form.setValue("allOrNone", checked === true)
                    }
                    className="border-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="allOrNone" className="font-normal text-xs">
                    All or None
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nbboProtection"
                    checked={form.watch("nbboProtection")}
                    onCheckedChange={(checked) =>
                      form.setValue("nbboProtection", checked === true)
                    }
                    className="border-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="nbboProtection" className="font-normal text-xs">
                    NBBO Protection
                  </Label>
                </div>
              </div>
            </div>

            {/* Min Quantity (optional) */}
            <div className="space-y-1">
              <Label htmlFor="minQty" className="text-xs">Min Quantity (optional)</Label>
              <Controller
                name="minQty"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    id="minQty"
                    step="0.001"
                    className="h-9 text-sm border border-primary/30 focus-visible:border-primary/60 bg-background/50"
                    value={field.value}
                    onChange={(_, numericValue) => field.onChange(numericValue)}
                  />
                )}
              />
            </div>

            {/* Order Options */}
            <div className="space-y-1">
              <Label className="text-xs">Order Options</Label>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tpSl"
                    checked={false}
                    onCheckedChange={() => {}}
                    className="border-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="tpSl" className="font-normal text-xs">
                    TP/SL
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="darkVisibility"
                    checked={true}
                    disabled
                    onCheckedChange={() => {}}
                    className="border-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="darkVisibility"
                    className="font-normal text-xs"
                  >
                    Dark Visibility
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fillCondition"
                    checked={false}
                    onCheckedChange={() => {}}
                    className="border-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor="fillCondition"
                    className="font-normal text-xs"
                  >
                    Fill Condition
                  </Label>
                </div>
              </div>
            </div>

            {/* Order Details Summary */}
            <div className="space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Order Value</span>
                <span className="font-medium">
                  ${formatNumber(orderValue, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fees</span>
                <span className="font-medium">
                  ${formatNumber(fees, { maximumFractionDigits: 4 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Margin Required</span>
                <span className="font-medium">
                  ${formatNumber(marginReq, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {form.formState.isSubmitting ? "Submitting..." : "Go Dark"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {isTradeStepActive && (
        <HighlightOverlay
          targetRef={cardRef}
          isActive={isTradeStepActive}
          tooltip="Place a trade order"
          position="bottom"
        />
      )}
    </div>
  );
}
