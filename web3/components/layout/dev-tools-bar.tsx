"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getUsdtMint } from "@/lib/utils/tokens";
import { revokeUSDTDelegate } from "@/lib/anchor/collateral-vault";
import { AuthorizeDialog } from "@/components/vault/authorize-dialog";

export function DevToolsBar() {
  const { disconnect, publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authorizeDialogOpen, setAuthorizeDialogOpen] = useState(false);

  useEffect(() => {
    const fetchBalances = async () => {
      if (publicKey && connected) {
        try {
          setIsLoading(true);
          // Fetch SOL balance
          const solBal = await connection.getBalance(publicKey);
          setSolBalance(solBal / LAMPORTS_PER_SOL);

          // Fetch USDT balance
          try {
            const usdtMint = getUsdtMint(connection.rpcEndpoint);
            const ata = await getAssociatedTokenAddress(
              usdtMint,
              publicKey,
              false,
              TOKEN_PROGRAM_ID
            );
            const tokenAccount = await getAccount(connection, ata);
            // USDT has 6 decimals
            const balance = Number(tokenAccount.amount) / 1_000_000;
            setUsdtBalance(balance);
          } catch (error: any) {
            setUsdtBalance(0);
            console.log("USDT balance check:", error.message);
          }
        } catch (error) {
          console.error("Error fetching balances:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSolBalance(null);
        setUsdtBalance(null);
      }
    };

    fetchBalances();
  }, [publicKey, connected, connection]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleAuthorize = () => {
    setAuthorizeDialogOpen(true);
  };

  const handleRevoke = async () => {
    if (!publicKey || !signTransaction) {
      alert("Wallet not connected");
      return;
    }

    setIsLoading(true);
    try {
      const usdtMint = getUsdtMint(connection.rpcEndpoint);
      const transaction = await revokeUSDTDelegate(
        publicKey,
        connection,
        usdtMint
      );

      transaction.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      alert("Delegate approval revoked successfully");
    } catch (err: any) {
      alert(`Failed to revoke: ${err.message}`);
      console.error("Revoke error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show when wallet is connected
  // Wait for publicKey to be available if connected (handles auto-connect timing)
  if (!connected) {
    return null;
  }

  // If connected but publicKey not yet available, show loading state
  if (!publicKey) {
    return (
      <div className="border-b border-border/50 bg-muted/30 px-4 py-2">
        <div className="container mx-auto flex items-center gap-4 text-sm font-mono">
          <span className="text-muted-foreground">Loading wallet...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border/50 bg-muted/30 px-4 py-2">
        <div className="container mx-auto flex items-center gap-4 text-sm font-mono">
          {/* Wallet Address */}
          <span className="text-foreground font-medium">
            {formatAddress(publicKey.toString())}
          </span>

          {/* Separator */}
          <span className="text-muted-foreground">|</span>

          {/* SOL Balance */}
          {isLoading ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : (
            <span className="text-foreground">
              {solBalance !== null
                ? `${solBalance.toFixed(4)} SOL`
                : "0.0000 SOL"}
            </span>
          )}

          {/* USDT Balance */}
          {isLoading ? null : (
            <span className="text-foreground">
              {usdtBalance !== null
                ? `${usdtBalance.toFixed(2)} USDT`
                : "0.00 USDT"}
            </span>
          )}

          {/* Separator */}
          <span className="text-muted-foreground ml-auto">|</span>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAuthorize}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-7 text-xs font-mono"
            >
              Authorize USDT
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-7 text-xs font-mono"
            >
              Withdraw
            </Button>
            <Button
              onClick={handleRevoke}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-7 text-xs font-mono"
            >
              Revoke
            </Button>
            <Button
              onClick={disconnect}
              variant="outline"
              size="sm"
              className="h-7 text-xs font-mono"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </div>
      <AuthorizeDialog
        open={authorizeDialogOpen}
        onOpenChange={setAuthorizeDialogOpen}
      />
    </>
  );
}
