"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SymbolSelectorProps {
  value: string;
  onChange: (symbol: string) => void;
}

// Top 50 crypto assets + FX pairs as per README
const SYMBOLS = [
  "BTC-USDT-PERP",
  "ETH-USDT-PERP",
  "BNB-USDT-PERP",
  "XRP-USDT-PERP",
  "SOL-USDT-PERP",
  "USDC-USDT-PERP",
  "TRX-USDT-PERP",
  "DOGE-USDT-PERP",
  "ADA-USDT-PERP",
  "HYPE-USDT-PERP",
  "LINK-USDT-PERP",
  "ESDe-USDT-PERP",
  "XLM-USDT-PERP",
  "BCH-USDT-PERP",
  "SUI-USDT-PERP",
  "LEO-USDT-PERP",
  "AVAX-USDT-PERP",
  "LTC-USDT-PERP",
  "HBAR-USDT-PERP",
  "SHIB-USDT-PERP",
  "XMR-USDT-PERP",
  "DAI-USDT-PERP",
  "TON-USDT-PERP",
  "MNT-USDT-PERP",
  "CRO-USDT-PERP",
  "DOT-USDT-PERP",
  "ZEC-USDT-PERP",
  "TAO-USDT-PERP",
  "UNI-USDT-PERP",
  "OKB-USDT-PERP",
  "AAVE-USDT-PERP",
  "BGB-USDT-PERP",
  "ENA-USDT-PERP",
  "WLFI-USDT-PERP",
  "PEPE-USDT-PERP",
  "PYUSD-USDT-PERP",
  "NEAR-USDT-PERP",
  "ETC-USDT-PERP",
  "USD1-USDT-PERP",
  "APT-USDT-PERP",
  "M-USDT-PERP",
  "ONDO-USDT-PERP",
  "POL-USDT-PERP",
  "ASTER-USDT-PERP",
  "WLD-USDT-PERP",
  "KCS-USDT-PERP",
  "IP-USDT-PERP",
  "ARB-USDT-PERP",
  "PI-USDT-PERP",
  "ICP-USDT-PERP",
  // FX pairs
  "USD-USDT-PERP",
  "GBP-USDT-PERP",
  "EUR-USDT-PERP",
  "JPY-USDT-PERP",
  "CHF-USDT-PERP",
  "AUD-USDT-PERP",
  "CAD-USDT-PERP",
  "CNY-USDT-PERP",
  "HKD-USDT-PERP",
  "SGD-USDT-PERP",
];

export function SymbolSelector({ value, onChange }: SymbolSelectorProps) {
  // TODO: Fetch from API: GET /get-instruments
  // For now, use hardcoded list

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-[180px] [&_[data-slot=select-value]]:gap-0 [&_[data-slot=select-value]>span:not(:last-child)]:hidden">
        <SelectValue placeholder="Select symbol" />
      </SelectTrigger>
      <SelectContent>
        {SYMBOLS.map((symbol) => (
          <SelectItem key={symbol} value={symbol}>
            {symbol}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

