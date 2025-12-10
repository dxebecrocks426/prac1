"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FaucetHelper() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [network, setNetwork] = useState<string>("devnet");

  useEffect(() => {
    // Detect network from RPC endpoint
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
      setNetwork("localnet");
    } else if (endpoint.includes("devnet")) {
      setNetwork("devnet");
    } else if (endpoint.includes("testnet")) {
      setNetwork("testnet");
    } else if (endpoint.includes("mainnet")) {
      setNetwork("mainnet");
    } else {
      setNetwork("custom");
    }
  }, [connection]);

  if (!connected || !publicKey || network === "mainnet") {
    return null;
  }

  const faucetLinks: Record<
    string,
    {
      sol: string;
      usdt: Array<{ name: string; url: string; description?: string }>;
      alternative: string;
    }
  > = {
    devnet: {
      sol: "https://faucet.solana.com/",
      usdt: [
        {
          name: "Split Pool Mock USDC",
          url: "https://www.splitpool.app/faucet",
          description: "Mock USDC faucet for devnet (most reliable)",
        },
        {
          name: "SPL Token Faucet",
          url: "https://spl-token-faucet.com/?token-name=USDT",
          description: "USDT faucet (often unreliable)",
        },
        {
          name: "Solana Faucet",
          url: "https://faucet.solana.com/",
          description: "May provide USDC instead of USDT",
        },
      ],
      alternative: "https://faucet.solana.com/",
    },
    testnet: {
      sol: "https://faucet.solana.com/",
      usdt: [
        {
          name: "SPL Token Faucet",
          url: "https://spl-token-faucet.com/?token-name=USDT",
          description: "USDT faucet (often unreliable)",
        },
        {
          name: "Solana Faucet",
          url: "https://faucet.solana.com/",
          description: "SOL only, then create your own mint",
        },
        {
          name: "QuickNode Testnet Faucet",
          url: "https://faucet.quicknode.com/solana/testnet",
          description: "SOL only, then create your own mint",
        },
      ],
      alternative: "https://faucet.solana.com/",
    },
  };

  const currentFaucets = faucetLinks[network] || faucetLinks.devnet;

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Get Test Tokens
        </CardTitle>
        <CardDescription className="text-xs">
          You need SOL for fees and USDT for trading on {network}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your Address:</span>
            <div className="flex items-center gap-1">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {publicKey.toBase58().slice(0, 8)}...
                {publicKey.toBase58().slice(-8)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  navigator.clipboard.writeText(publicKey.toBase58());
                  alert("Address copied to clipboard!");
                }}
                title="Copy full address"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
                </svg>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => {
                const url = `${
                  currentFaucets.sol
                }?address=${publicKey.toBase58()}`;
                window.open(url, "_blank");
              }}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Get SOL from Faucet
            </Button>

            {network === "localnet" ? (
              <div className="text-xs text-yellow-500/90 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                <p className="font-medium mb-1">For Localnet:</p>
                <p className="text-xs mb-2">
                  Run this script to create USDT mint:
                </p>
                <code className="text-xs bg-background px-2 py-1 rounded block mb-2">
                  ./scripts/create-usdt-mint.sh
                </code>
                <p className="text-xs text-muted-foreground">
                  See USDT_FAUCET_ALTERNATIVES.md for details
                </p>
              </div>
            ) : network === "devnet" || network === "testnet" ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">
                  <p className="font-medium mb-1">USDT Faucet Options:</p>
                  <div className="space-y-1.5">
                    {currentFaucets.usdt.map((faucet, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-1 bg-muted/30 p-2 rounded border border-border/50"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs h-auto py-1.5"
                          onClick={() => {
                            navigator.clipboard.writeText(publicKey.toBase58());
                            window.open(faucet.url, "_blank");
                            alert(
                              `Address copied! Paste it into the faucet form.\n\n${
                                faucet.description || ""
                              }\n\n⚠️ Note: Public faucets may be unreliable.`
                            );
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-2 flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{faucet.name}</div>
                            {faucet.description && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {faucet.description}
                              </div>
                            )}
                          </div>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-yellow-500/90 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                  <p className="font-medium mb-1">💡 Most Reliable Option:</p>
                  <p className="text-xs mb-2">Create your own USDT mint:</p>
                  <code className="text-xs bg-background px-2 py-1 rounded block mb-2">
                    {network === "devnet"
                      ? "./scripts/create-usdt-devnet.sh"
                      : "./scripts/create-usdt-testnet.sh"}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    No dependency on external faucets
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(publicKey.toBase58());
                  window.open(
                    "https://spl-token-faucet.com/?token-name=USDT",
                    "_blank"
                  );
                  alert(
                    "Address copied! Paste it into the faucet form.\n\nNote: SPL Token Faucet may be unreliable."
                  );
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Get USDT (SPL Token Faucet)
              </Button>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 space-y-1">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Quick Guide:</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Get SOL first (for transaction fees)</li>
              {network === "localnet" ? (
                <li>Create USDT mint using the script above</li>
              ) : (
                <>
                  <li>Then get USDT for trading</li>
                  <li>
                    If SPL Token Faucet fails, see USDT_FAUCET_ALTERNATIVES.md
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
