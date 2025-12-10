"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import { watchTradingViewPrice } from "@/lib/mock/tradingview-price-extractor";

interface PriceChartProps {
  symbol: string;
  onPriceUpdate?: (price: number) => void;
}

// Map symbol to TradingView symbol format
function getTradingViewSymbol(symbol: string): string {
  // Convert BTC-USDT-PERP to BINANCE:BTCUSDT format
  const parts = symbol.split("-");
  if (parts.length >= 2) {
    const base = parts[0];
    const quote = parts[1];
    // For now, use BINANCE as exchange
    return `BINANCE:${base}${quote}`;
  }
  return "BINANCE:BTCUSDT"; // Default fallback
}

let containerIdCounter = 0;

export function PriceChart({ symbol, onPriceUpdate }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const containerIdRef = useRef(
    `tradingview_${symbol.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${++containerIdCounter}`
  );

  const tradingViewSymbol = getTradingViewSymbol(symbol);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load TradingView widget script
    const scriptId = "tradingview-widget-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initWidget = () => {
      if (!containerRef.current || !(window as any).TradingView) {
        return;
      }

      // Clear container
      containerRef.current.innerHTML = "";

      // Create new widget using TradingView's lightweight widget
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: tradingViewSymbol,
        container_id: containerRef.current.id,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - TradingView widget config
        datafeed: undefined,
        library_path: "",
        locale: "en",
        disabled_features: [
          "use_localstorage_for_settings",
          "volume_force_overlay",
        ],
        enabled_features: [],
        theme: "dark",
        style: "1",
        toolbar_bg: "#1a1a1a",
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        hide_volume: false,
        allow_symbol_change: false,
      });
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        initWidget();
      };
      document.head.appendChild(script);
    } else if (scriptLoadedRef.current || (window as any).TradingView) {
      initWidget();
    } else {
      script.onload = () => {
        scriptLoadedRef.current = true;
        initWidget();
      };
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tradingViewSymbol]);

  // Watch for price updates from TradingView widget
  useEffect(() => {
    if (!containerIdRef.current || !onPriceUpdate) return;

    // Wait a bit for widget to initialize
    let cleanup: (() => void) | undefined;
    const timer = setTimeout(() => {
      cleanup = watchTradingViewPrice(
        containerIdRef.current,
        symbol,
        (price) => {
          onPriceUpdate(price);
        }
      );
    }, 2000);

    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, [symbol, onPriceUpdate]);

  return (
    <Card className="flex flex-col bg-background/20 backdrop-blur-xl border border-primary/20 rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm">Reference Price</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          id={containerIdRef.current}
          ref={containerRef}
          className="w-full h-[600px] lg:h-[700px]"
          style={{ backgroundColor: "transparent" }}
        />
      </CardContent>
    </Card>
  );
}
