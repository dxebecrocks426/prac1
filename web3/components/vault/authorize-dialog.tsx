"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { approveUSDTDelegate } from "@/lib/anchor/collateral-vault";
import { getUsdtMint } from "@/lib/utils/tokens";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { getProgramId } from "@/lib/anchor/types";

interface AuthorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthorizeDialog({
  open,
  onOpenChange,
  onSuccess,
}: AuthorizeDialogProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { completeStep } = useFlowStore();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthorize = async () => {
    if (!publicKey || !signTransaction) {
      setError("Wallet not connected");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const usdtMint = getUsdtMint(connection.rpcEndpoint);
      // USDT has 6 decimals
      const amountBN = BigInt(Math.floor(amountNum * 1_000_000));

      // Get the collateral vault program ID as delegate
      // For now, we'll use the System Program as a placeholder delegate
      // In production, this will be the actual collateral vault program ID
      const programIds = getProgramId(connection.rpcEndpoint);
      if (!programIds) {
        setError(
          "Unable to get program ID. Please ensure you're connected to a valid network."
        );
        setIsLoading(false);
        return;
      }

      // Use collateral vault program ID, or System Program as fallback for mock/testing
      const vaultProgramId = programIds.collateralVault;

      // Note: This is a mock authorization for demo purposes
      // In production, this would authorize the actual collateral vault program

      const transaction = await approveUSDTDelegate(
        publicKey,
        amountBN,
        connection,
        usdtMint,
        vaultProgramId
      );

      // Sign and send transaction
      transaction.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      onSuccess?.();
      onOpenChange(false);
      setAmount("");
    } catch (err: any) {
      console.error("Authorization error:", err);

      // Provide helpful error messages
      let errorMessage = err.message || "Failed to authorize USDT";

      if (
        errorMessage.includes("reverted") ||
        errorMessage.includes("simulation")
      ) {
        errorMessage =
          "Transaction simulation failed. Make sure:\n" +
          "• The collateral vault program is deployed to localnet\n" +
          "• You have sufficient SOL for fees\n" +
          "• Your token account exists\n" +
          "• Check LOCALNET_SETUP.md for deployment instructions";
      } else if (
        errorMessage.includes("Program") &&
        errorMessage.includes("not found")
      ) {
        errorMessage =
          "Program not found. Please deploy the collateral vault program first.\n" +
          "See LOCALNET_SETUP.md for instructions.";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage =
          "Insufficient SOL for transaction fees. Airdrop SOL:\n" +
          "solana airdrop 10 $(solana address)";
      } else if (
        errorMessage.includes("Token account") &&
        errorMessage.includes("not found")
      ) {
        errorMessage =
          "Token account not found. Create one first:\n" +
          "spl-token create-account <MINT_ADDRESS>";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authorize USDT for Trading</DialogTitle>
          <DialogDescription>
            Authorize GoDark to manage your USDT for trading. You can revoke
            this authorization at any time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDT)</Label>
            <NumberInput
              id="amount"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(_, numericValue) => setAmount(numericValue !== undefined ? numericValue.toString() : "")}
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="text-sm text-destructive whitespace-pre-line bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAuthorize} disabled={isLoading}>
              {isLoading ? "Authorizing..." : "Authorize"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
