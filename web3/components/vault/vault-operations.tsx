"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useVault,
  depositToVault,
  withdrawFromVault,
  deriveVaultPDA,
} from "@/lib/anchor/collateral-vault";
import {
  useCollateralVaultProgram,
  useAnchorProvider,
} from "@/lib/anchor/programs";
import { collateralVaultIdl } from "@/lib/anchor/idl/collateral-vault-idl";
import { getUsdtMint } from "@/lib/utils/tokens";
import { getProgramId } from "@/lib/anchor/types";
import { formatPrice } from "@/lib/utils/number-format";
import { AuthorizeDialog } from "./authorize-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { HighlightOverlay } from "@/components/flow/highlight-overlay";
import { useRef } from "react";
import { SmartContractInfo } from "@/components/flow/smart-contract-info";

export function VaultOperations() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const vaultHook = useVault();
  const program = useCollateralVaultProgram();
  const provider = useAnchorProvider();
  const { isStepActive, completeStep } = useFlowStore();
  const [vaultData, setVaultData] = useState<{
    totalBalance: bigint;
    availableBalance: bigint;
    lockedBalance: bigint;
    totalDeposited: bigint;
    totalWithdrawn: bigint;
    owner: PublicKey;
    tokenAccount: PublicKey;
    createdAt: bigint;
    bump: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authorizeDialogOpen, setAuthorizeDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const vaultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vaultHook && publicKey) {
      loadVaultData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultHook, publicKey]);

  // Fetch USDT balance
  useEffect(() => {
    if (!publicKey) {
      setUsdtBalance(null);
      return;
    }

    const fetchUsdtBalance = async () => {
      try {
        const usdtMint = getUsdtMint(connection.rpcEndpoint);
        const ata = getAssociatedTokenAddressSync(
          usdtMint,
          publicKey,
          false,
          TOKEN_PROGRAM_ID
        );
        const tokenAccount = await getAccount(
          connection,
          ata,
          undefined,
          TOKEN_PROGRAM_ID
        );
        setUsdtBalance(Number(tokenAccount.amount) / 1_000_000); // USDT has 6 decimals
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.name !== "TokenAccountNotFoundError"
        ) {
          console.error("Failed to fetch USDT balance:", error);
        }
        setUsdtBalance(0);
      }
    };

    fetchUsdtBalance();
    const interval = setInterval(fetchUsdtBalance, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  const loadVaultData = async () => {
    if (!vaultHook || !publicKey) return;

    setIsLoading(true);
    try {
      const data = await vaultHook.fetch();
      setVaultData(data);
    } catch (err) {
      console.error("Error loading vault:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction || !vaultHook) {
      setError("Wallet not connected or missing required functions");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const usdtMint = getUsdtMint(connection.rpcEndpoint);
      const programIds =
        typeof window !== "undefined"
          ? getProgramId(connection.rpcEndpoint)
          : null;

      if (!programIds) {
        setError(
          "Unable to get program IDs. Please ensure you're on localnet and contracts are deployed."
        );
        setIsLoading(false);
        return;
      }

      if (!vaultData) {
        // Initialize vault
        if (!program) {
          console.error("Program not initialized");
          console.error("Provider:", provider);
          console.error("Program IDs:", programIds);
          console.error("PublicKey:", publicKey?.toBase58());
          console.error("signTransaction:", !!signTransaction);
          setError(
            "Unable to initialize Anchor program. Please ensure:\n" +
              "1. Your wallet is connected\n" +
              "2. The collateral vault program is deployed\n" +
              "3. Check browser console for details"
          );
          setIsLoading(false);
          return;
        }

        try {
          const { initializeVault } = await import(
            "@/lib/anchor/collateral-vault"
          );

          const transaction = await initializeVault(
            publicKey,
            connection,
            programIds.collateralVault,
            usdtMint,
            program
          );

          // Derive vault PDA for logging
          const [vaultPDA] = deriveVaultPDA(
            publicKey,
            programIds.collateralVault
          );

          transaction.feePayer = publicKey;
          const latestBlockhash = await connection.getLatestBlockhash();
          transaction.recentBlockhash = latestBlockhash.blockhash;

          const signed = await signTransaction(transaction);
          const signature = await connection.sendRawTransaction(
            signed.serialize()
          );
          const confirmation = await connection.confirmTransaction(
            signature,
            "confirmed"
          );

          // Verify transaction actually succeeded
          if (confirmation.value.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
            );
          }

          // Log to dev console
          useDevConsoleStore.getState().addEvent({
            type: "transaction",
            message: "Vault initialized successfully",
            transaction: signature,
            status: "success",
            details: {
              vault: vaultPDA.toBase58(),
              owner: publicKey.toBase58(),
            },
          });

          // Reload vault data
          await loadVaultData();
          completeStep("collateral-vault-setup");
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to initialize vault";
          setError(errorMessage);
          console.error("Initialize vault error:", err);

          // Log error to dev console
          useDevConsoleStore.getState().addEvent({
            type: "error",
            message: `Failed to initialize vault: ${errorMessage}`,
            status: "failed",
            details: {
              error: errorMessage,
            },
          });
        }
      } else {
        // Open deposit dialog
        setDepositDialogOpen(true);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to deposit";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositSubmit = async () => {
    if (!publicKey || !signTransaction || !vaultHook || !program) {
      setError("Wallet not connected or missing required functions");
      return;
    }

    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (usdtBalance !== null && amountNum > usdtBalance) {
      setError("Insufficient USDT balance");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const usdtMint = getUsdtMint(connection.rpcEndpoint);
      const programIds = getProgramId(connection.rpcEndpoint);
      if (!programIds) {
        setError(
          "Unable to get program IDs. Please ensure you're on localnet and contracts are deployed."
        );
        setIsLoading(false);
        return;
      }

      const amountBN = BigInt(Math.floor(amountNum * 1_000_000));

      // Log pending deposit
      useDevConsoleStore.getState().addEvent({
        type: "deposit",
        message: `Depositing ${amountNum.toFixed(2)} USDT to vault`,
        status: "pending",
        details: {
          amount: amountNum,
        },
      });

      const transaction = await depositToVault(
        publicKey,
        amountBN,
        connection,
        programIds.collateralVault,
        usdtMint,
        program
      );

      transaction.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      // Verify transaction actually succeeded
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      // Log success to dev console
      useDevConsoleStore.getState().addEvent({
        type: "deposit",
        message: `Successfully deposited ${amountNum.toFixed(2)} USDT to vault`,
        transaction: signature,
        status: "success",
        details: {
          amount: amountNum,
          amountBN: amountBN.toString(),
        },
      });

      setDepositDialogOpen(false);
      setDepositAmount("");
      await loadVaultData();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to deposit";
      setError(errorMessage);
      console.error("Deposit error:", err);

      // Log error to dev console
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to deposit: ${errorMessage}`,
        status: "failed",
        details: {
          error: errorMessage,
          amount: depositAmount,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !vaultHook || !vaultData) return;

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amountNum > Number(vaultData.availableBalance) / 1_000_000) {
      setError("Insufficient available balance");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!program) {
        setError(
          "Program not initialized. Please ensure the collateral vault program is deployed."
        );
        setIsLoading(false);
        return;
      }

      const usdtMint = getUsdtMint(connection.rpcEndpoint);
      const amountBN = BigInt(Math.floor(amountNum * 1_000_000));

      const transaction = await withdrawFromVault(
        publicKey,
        amountBN,
        connection,
        vaultHook.programId,
        usdtMint,
        program
      );

      transaction.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      // Verify transaction actually succeeded
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      // Log success to dev console
      useDevConsoleStore.getState().addEvent({
        type: "withdraw",
        message: `Successfully withdrew ${amountNum.toFixed(
          2
        )} USDT from vault`,
        transaction: signature,
        status: "success",
        details: {
          amount: amountNum,
        },
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      await loadVaultData();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to withdraw";
      setError(errorMessage);
      console.error("Withdraw error:", err);

      // Log error to dev console
      useDevConsoleStore.getState().addEvent({
        type: "error",
        message: `Failed to withdraw: ${errorMessage}`,
        status: "failed",
        details: {
          error: errorMessage,
          amount: withdrawAmount,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isVaultStepActive = isStepActive("collateral-vault-setup");
  const programIds =
    typeof window !== "undefined" ? getProgramId(connection.rpcEndpoint) : null;

  if (!publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vault</CardTitle>
          <CardDescription>Connect your wallet to view vault</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div ref={vaultRef} className="relative">
      <Card>
        <CardHeader>
          <CardTitle>Collateral Vault</CardTitle>
          <CardDescription>Manage your USDT collateral</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div>Loading vault data...</div>
          ) : vaultData ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Balance
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPrice(Number(vaultData.totalBalance) / 1_000_000)}{" "}
                    USDT
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Available</div>
                  <div className="text-lg font-semibold text-primary">
                    {formatPrice(Number(vaultData.availableBalance) / 1_000_000)}{" "}
                    USDT
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Locked</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {formatPrice(Number(vaultData.lockedBalance) / 1_000_000)}{" "}
                    USDT
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Deposited
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPrice(Number(vaultData.totalDeposited) / 1_000_000)}{" "}
                    USDT
                  </div>
                </div>
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <div className="flex gap-2">
                <Button
                  onClick={() => setDepositDialogOpen(true)}
                  disabled={isLoading}
                >
                  Deposit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWithdrawDialogOpen(true)}
                  disabled={
                    isLoading || Number(vaultData.availableBalance) === 0
                  }
                >
                  Withdraw
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">No vault found</div>
                <div className="text-sm text-muted-foreground">
                  Initialize your collateral vault to start trading. This
                  creates an on-chain account (PDA) that will hold your USDT
                  collateral.
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                    {error.includes("not deployed") && (
                      <div className="mt-2 text-xs space-y-1">
                        <div>To deploy the program:</div>
                        <code className="block bg-muted px-2 py-1 rounded text-xs">
                          cd
                          gdx/contracts/programs/gdx-collateral-vault/collateral-vault
                          && anchor build && anchor deploy --provider.cluster
                          localnet
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleDeposit}
                disabled={
                  isLoading || !program || !publicKey || !signTransaction
                }
                title={
                  !program
                    ? "Program not initialized - check console for details"
                    : !publicKey
                    ? "Wallet not connected"
                    : !signTransaction
                    ? "Wallet missing signTransaction function"
                    : undefined
                }
              >
                {isLoading ? "Initializing..." : "Initialize Vault"}
              </Button>
              {vaultHook && programIds && (
                <SmartContractInfo
                  programId={programIds.collateralVault.toBase58()}
                  instructionName="initialize_vault"
                  description="Create your collateral vault on-chain. This is a Program Derived Address (PDA) that holds your trading collateral."
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {isVaultStepActive && (
        <HighlightOverlay
          targetRef={vaultRef}
          isActive={isVaultStepActive}
          tooltip="Initialize your collateral vault"
          position="bottom"
        />
      )}
      <AuthorizeDialog
        open={authorizeDialogOpen}
        onOpenChange={setAuthorizeDialogOpen}
        onSuccess={loadVaultData}
      />

      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit USDT</DialogTitle>
            <DialogDescription>
              Deposit USDT into your collateral vault
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Amount (USDT)</Label>
              <NumberInput
                id="deposit-amount"
                step="0.01"
                min="0"
                max={usdtBalance !== null ? usdtBalance : undefined}
                placeholder="0.00"
                value={depositAmount}
                onChange={(_, numericValue) => setDepositAmount(numericValue !== undefined ? numericValue.toString() : "")}
                disabled={isLoading}
              />
              {usdtBalance !== null && (
                <div className="text-xs text-muted-foreground">
                  Available: {formatPrice(usdtBalance)} USDT
                </div>
              )}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDepositDialogOpen(false);
                  setDepositAmount("");
                  setError(null);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleDepositSubmit} disabled={isLoading}>
                {isLoading ? "Depositing..." : "Deposit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw USDT</DialogTitle>
            <DialogDescription>
              Withdraw unlocked balance from your vault
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (USDT)</Label>
              <NumberInput
                id="withdraw-amount"
                step="0.01"
                min="0"
                max={
                  vaultData ? Number(vaultData.availableBalance) / 1_000_000 : 0
                }
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(_, numericValue) => setWithdrawAmount(numericValue !== undefined ? numericValue.toString() : "")}
                disabled={isLoading}
              />
              {vaultData && (
                <div className="text-xs text-muted-foreground">
                  Available:{" "}
                  {formatPrice(Number(vaultData.availableBalance) / 1_000_000)}{" "}
                  USDT
                </div>
              )}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setWithdrawDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleWithdraw} disabled={isLoading}>
                {isLoading ? "Withdrawing..." : "Withdraw"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
