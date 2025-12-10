"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { getTokenMint, TokenSymbol } from "@/lib/utils/tokens";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { Wallet, Coins, CheckCircle2 } from "lucide-react";
import { formatBalance, formatNumber } from "@/lib/utils/number-format";

export function LocalnetResources() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { walletAddress, tokenMints, isCompleted } = useOnboardingStore();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<
    Record<TokenSymbol, number | null>
  >({
    USDT: null,
    BTC: null,
    ETH: null,
    XRP: null,
    ADA: null,
  });

  useEffect(() => {
    if (!isCompleted || !connected || !publicKey) {
      return;
    }

    fetchBalances();
  }, [isCompleted, connected, publicKey, connection]);

  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      // Fetch SOL balance
      const solBal = await connection.getBalance(publicKey);
      setSolBalance(solBal / 1_000_000_000);

      // Fetch token balances
      const endpoint = connection.rpcEndpoint;
      const balances: Record<TokenSymbol, number | null> = {
        USDT: null,
        BTC: null,
        ETH: null,
        XRP: null,
        ADA: null,
      };

      for (const symbol of Object.keys(tokenMints) as TokenSymbol[]) {
        if (!tokenMints[symbol]) continue;

        try {
          const mintAddress = getTokenMint(symbol, endpoint);
          const ata = await getAssociatedTokenAddress(
            mintAddress,
            publicKey,
            false
          );

          const account = await getAccount(connection, ata);
          balances[symbol] = Number(account.amount) / 1_000_000; // 6 decimals
        } catch (error) {
          console.error(`Failed to fetch ${symbol} balance:`, error);
        }
      }

      setTokenBalances(balances);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  };

  if (!isCompleted || !connected) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Localnet Wallet Resources
        </CardTitle>
        <CardDescription>Your onchain resources on localnet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet Address:
            </span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {publicKey.toBase58().slice(0, 8)}...
              {publicKey.toBase58().slice(-8)}
            </code>
          </div>
          {solBalance !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" />
                SOL Balance:
              </span>
              <span className="font-medium">{formatBalance(solBalance, 4)} SOL</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Token Balances:</h4>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(tokenBalances) as TokenSymbol[]).map((symbol) => {
              const balance = tokenBalances[symbol];
              return (
                <div
                  key={symbol}
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <span className="text-xs font-medium">{symbol}</span>
                  <span className="text-xs">
                    {formatNumber(balance, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {Object.keys(tokenMints).length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-xs font-semibold mb-2">Token Mints:</h4>
            <div className="space-y-1">
              {Object.entries(tokenMints).map(([symbol, address]) => (
                <div
                  key={symbol}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{symbol}:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {address?.slice(0, 8)}...
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


