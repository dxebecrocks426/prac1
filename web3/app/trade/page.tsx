"use client";

import { Header } from "@/components/layout/header";
import { DevConsole } from "@/components/layout/dev-console";
import { OrderForm } from "@/components/trading/order-form";
import { PriceChart } from "@/components/market/chart";
import { Orderbook } from "@/components/market/orderbook";
import { TradesFeed } from "@/components/market/trades-feed";
import { AccountMetrics } from "@/components/trading/account-metrics";
import { MarketOverviewBar } from "@/components/market/market-overview-bar";
import { WorkingOrdersTable } from "@/components/trading/working-orders-table";
import { OrderHistoryTable } from "@/components/trading/order-history-table";
import { OpenPositionsTable } from "@/components/trading/open-positions-table";
import { VaultOperations } from "@/components/vault/vault-operations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { FlowGuide } from "@/components/flow/flow-guide";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSessionStore } from "@/lib/store/use-session-store";
import { useEphemeralVault } from "@/lib/anchor/ephemeral-vault";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { mockEngineClient } from "@/lib/api/mock-engine-api";

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC-USDT-PERP");
  const [tradingViewCurrentPrice, setTradingViewCurrentPrice] = useState<number | null>(null);
  const { publicKey, connected } = useWallet();
  const { isSessionActive, createSession } = useSessionStore();
  const ephemeralVaultHook = useEphemeralVault();
  const { completeStep } = useFlowStore();

  // Send TradingView price updates to mock engine and store locally
  const handlePriceUpdate = useCallback(async (price: number) => {
    setTradingViewCurrentPrice(price);
    try {
      await mockEngineClient.updatePrice(selectedSymbol, price);
    } catch (error) {
      // Silently fail - mock engine might not be running
      console.debug("Failed to update price in mock engine:", error);
    }
  }, [selectedSymbol]);

  // Subtle ephemeral vault gateway - auto-create session in background
  useEffect(() => {
    if (!connected || !publicKey || !ephemeralVaultHook) return;
    
    // Check if session already exists
    if (isSessionActive()) {
      return;
    }

    // Auto-create session silently in background
    const createSessionSilently = async () => {
      try {
        const { ephemeralWallet, vaultPda } = await ephemeralVaultHook.createSession(3600);
        
        // Create session in store (mock for now - actual transaction would be signed/sent)
        createSession(
          publicKey.toBase58(),
          ephemeralWallet.toBase58(),
          vaultPda.toBase58(),
          3600
        );

        // Log to dev console only
        useDevConsoleStore.getState().addEvent({
          type: "info",
          message: "Ephemeral trading session created automatically",
          status: "success",
          details: {
            ephemeralWallet: ephemeralWallet.toBase58(),
            vaultPda: vaultPda.toBase58(),
          },
        });

      } catch (error: unknown) {
        // Silently handle errors - log to dev console only
        const errorMessage = error instanceof Error ? error.message : String(error);
        useDevConsoleStore.getState().addEvent({
          type: "error",
          message: `Failed to create ephemeral session: ${errorMessage}`,
          status: "failed",
          details: { error: errorMessage },
        });
      }
    };

    // Small delay to avoid blocking initial render
    const timer = setTimeout(createSessionSilently, 500);
    return () => clearTimeout(timer);
  }, [connected, publicKey, ephemeralVaultHook, isSessionActive, createSession]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Glassy gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10">
        <Header />
        <DevConsole />
        <FlowGuide />

        <main className="flex-1 w-full px-8 py-4 flex flex-col gap-4 min-h-0 max-w-[1920px] mx-auto">
        {/* Row 1: Three Column Grid (6-3-3) */}
        <div className="grid grid-cols-12 gap-6">
          {/* Column 1: Symbol Selector + Reference Price */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
            <MarketOverviewBar
              symbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
            />
            <PriceChart symbol={selectedSymbol} onPriceUpdate={handlePriceUpdate} />
          </div>

          {/* Column 2: Reference Orderbook + Reference Trades */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
            <Orderbook symbol={selectedSymbol} />
            <TradesFeed symbol={selectedSymbol} />
          </div>

          {/* Column 3: Place Orders + Account Metrics */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
            <OrderForm symbol={selectedSymbol} currentPrice={tradingViewCurrentPrice} />
            <AccountMetrics />
          </div>
        </div>

        {/* Row 2: Tables */}
        <div className="shrink-0 min-h-[400px]">
          <Tabs
            defaultValue="working-orders"
            className="w-full h-full flex flex-col"
          >
            <TabsList className="shrink-0">
              <TabsTrigger value="working-orders">Working Orders</TabsTrigger>
              <TabsTrigger value="order-history">Order History</TabsTrigger>
              <TabsTrigger value="open-positions">Open Positions</TabsTrigger>
              <TabsTrigger value="wallet-holdings">Wallet Holdings</TabsTrigger>
            </TabsList>
            <div className="flex-1 min-h-[350px] mt-4 overflow-hidden">
              <TabsContent
                value="working-orders"
                className="h-full overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <WorkingOrdersTable />
              </TabsContent>
              <TabsContent
                value="order-history"
                className="h-full overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <OrderHistoryTable />
              </TabsContent>
              <TabsContent
                value="open-positions"
                className="h-full overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <OpenPositionsTable />
              </TabsContent>
              <TabsContent
                value="wallet-holdings"
                className="h-full overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <div className="h-full overflow-auto">
                  <VaultOperations />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        </main>
      </div>
    </div>
  );
}
