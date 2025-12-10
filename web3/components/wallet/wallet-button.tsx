"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState, useRef } from "react";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useVault } from "@/lib/anchor/collateral-vault";
import { getUsdtMint } from "@/lib/utils/tokens";
import { revokeUSDTDelegate } from "@/lib/anchor/collateral-vault";
import { AuthorizeDialog } from "@/components/vault/authorize-dialog";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { HighlightOverlay } from "@/components/flow/highlight-overlay";
import { NetworkSelector } from "./network-selector";
import { FaucetHelper } from "./faucet-helper";

export function WalletButton() {
  const { wallet, disconnect, publicKey, connected } = useWallet();
  const { signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const vaultHook = useVault();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authorizeDialogOpen, setAuthorizeDialogOpen] = useState(false);
  const { isStepActive, completeStep } = useFlowStore();
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-complete wallet connection step when connected
  useEffect(() => {
    if (connected && isStepActive("wallet-connection")) {
      completeStep("wallet-connection");
    }
  }, [connected, isStepActive, completeStep]);

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
            // Token account doesn't exist or no USDT balance
            // This is normal - user may not have USDT yet
            setUsdtBalance(0);
            console.log("USDT balance check:", error.message);
          }

          // Fetch vault balance
          if (vaultHook) {
            try {
              const vaultData = await vaultHook.fetch();
              if (vaultData) {
                setVaultBalance(Number(vaultData.availableBalance) / 1_000_000);
              } else {
                setVaultBalance(null);
              }
            } catch (error) {
              setVaultBalance(null);
            }
          }
        } catch (error) {
          console.error("Error fetching balances:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSolBalance(null);
        setUsdtBalance(null);
        setVaultBalance(null);
      }
    };

    fetchBalances();
  }, [publicKey, connected, connection, vaultHook]);

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleAuthorize = () => {
    setAuthorizeDialogOpen(true);
  };

  const handleWithdraw = async () => {
    // Withdraw functionality is handled in vault-operations component
    // This button can trigger navigation or show vault operations
    alert("Withdraw functionality - Use the Vault Operations component");
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

  if (!connected) {
    const isWalletStepActive = isStepActive("wallet-connection");
    return (
      <div className="relative">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Connect a wallet on Solana to continue
          </p>
          <Button
            ref={connectButtonRef}
            onClick={handleClick}
            variant="default"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Connect Wallet
          </Button>
        </div>
        {isWalletStepActive && (
          <HighlightOverlay
            targetRef={connectButtonRef}
            isActive={isWalletStepActive}
            tooltip="Connect your wallet to begin"
            position="bottom"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <NetworkSelector />
      {connected && publicKey && (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {formatAddress(publicKey.toString())}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {isLoading ? (
                <span>Loading balances...</span>
              ) : (
                <>
                  {solBalance !== null ? (
                    <span>{solBalance.toFixed(4)} SOL</span>
                  ) : (
                    <span className="text-muted-foreground/50">0.0000 SOL</span>
                  )}
                  {usdtBalance !== null ? (
                    <span>{usdtBalance.toFixed(2)} USDT</span>
                  ) : (
                    <span className="text-muted-foreground/50">0.00 USDT</span>
                  )}
                  {vaultBalance !== null && (
                    <span className="text-primary">
                      Vault: {vaultBalance.toFixed(2)} USDT
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAuthorize}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Authorize USDT
            </Button>
            <Button
              onClick={handleWithdraw}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Withdraw
            </Button>
            <Button
              onClick={handleRevoke}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Revoke
            </Button>
            <Button onClick={handleClick} variant="outline" size="sm">
              Disconnect
            </Button>
          </div>
        </div>
      )}
      <AuthorizeDialog
        open={authorizeDialogOpen}
        onOpenChange={setAuthorizeDialogOpen}
        onSuccess={() => {
          // Refresh balances after authorization
          if (publicKey && connected) {
            const fetchBalances = async () => {
              if (vaultHook) {
                try {
                  const vaultData = await vaultHook.fetch();
                  if (vaultData) {
                    setVaultBalance(
                      Number(vaultData.availableBalance) / 1_000_000
                    );
                  }
                } catch (error) {
                  console.error("Error fetching vault:", error);
                }
              }
            };
            fetchBalances();
          }
        }}
      />
    </div>
  );
}
