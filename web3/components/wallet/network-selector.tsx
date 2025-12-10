"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export function NetworkSelector() {
  const { connection } = useConnection();
  const [currentNetwork, setCurrentNetwork] = useState<string>("devnet");
  const [isCustomRpc, setIsCustomRpc] = useState(false);

  useEffect(() => {
    // Detect current network from RPC endpoint
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes("devnet")) {
      setCurrentNetwork("devnet");
      setIsCustomRpc(false);
    } else if (endpoint.includes("testnet")) {
      setCurrentNetwork("testnet");
      setIsCustomRpc(false);
    } else if (endpoint.includes("mainnet")) {
      setCurrentNetwork("mainnet");
      setIsCustomRpc(false);
    } else {
      setCurrentNetwork("custom");
      setIsCustomRpc(true);
    }
  }, [connection]);

  const handleNetworkChange = (value: string) => {
    if (value === "custom") {
      // Keep custom RPC if set via env var
      return;
    }

    let network: WalletAdapterNetwork;
    switch (value) {
      case "devnet":
        network = WalletAdapterNetwork.Devnet;
        break;
      case "testnet":
        network = WalletAdapterNetwork.Testnet;
        break;
      case "mainnet":
        network = WalletAdapterNetwork.Mainnet;
        break;
      default:
        network = WalletAdapterNetwork.Devnet;
    }

    // Save to localStorage
    localStorage.setItem("solana-network", value);

    // Reload page to apply new network (since ConnectionProvider needs to reinitialize)
    window.location.reload();
  };

  const getNetworkBadge = (network: string) => {
    switch (network) {
      case "devnet":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-500 text-xs"
          >
            Devnet
          </Badge>
        );
      case "testnet":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 text-xs"
          >
            Testnet
          </Badge>
        );
      case "mainnet":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 text-xs"
          >
            Mainnet
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Custom
          </Badge>
        );
    }
  };

  // Don't show if custom RPC is set via env var, show info only
  if (
    isCustomRpc &&
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  ) {
    return (
      <div className="flex items-center gap-2">
        {getNetworkBadge("custom")}
        <span className="text-xs text-muted-foreground font-mono">
          Custom RPC
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentNetwork} onValueChange={handleNetworkChange}>
        <SelectTrigger className="w-[140px] h-7 text-xs font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="devnet">
            <div className="flex items-center gap-2">
              <span>Devnet</span>
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-500 text-xs ml-auto"
              >
                Test
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="testnet">
            <div className="flex items-center gap-2">
              <span>Testnet</span>
              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-500 text-xs ml-auto"
              >
                Test
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="mainnet">
            <div className="flex items-center gap-2">
              <span>Mainnet</span>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 text-xs ml-auto"
              >
                Live
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
