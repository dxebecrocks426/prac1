"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSessionStore } from "@/lib/store/use-session-store";
import { useEphemeralVault } from "@/lib/anchor/ephemeral-vault";
import { SmartContractInfo } from "@/components/flow/smart-contract-info";
import { HighlightOverlay } from "@/components/flow/highlight-overlay";
import { useFlowStore } from "@/lib/store/use-flow-store";
import { Badge } from "@/components/ui/badge";

export function EphemeralSession() {
  const { publicKey, signTransaction } = useWallet();
  const {
    currentSession,
    createSession,
    endSession,
    isSessionActive,
    getTimeRemaining,
  } = useSessionStore();
  const ephemeralVaultHook = useEphemeralVault();
  const [isCreating, setIsCreating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const sessionRef = useRef<HTMLDivElement>(null);

  const sessionActive = isSessionActive();

  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(() => {
        const remaining = getTimeRemaining();
        setTimeRemaining(remaining);
        if (remaining === 0 || remaining === null) {
          endSession();
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [sessionActive, getTimeRemaining, endSession]);

  const handleCreateSession = async () => {
    if (!publicKey || !ephemeralVaultHook || !signTransaction) return;

    setIsCreating(true);
    try {
      const { ephemeralWallet, vaultPda, transaction } =
        await ephemeralVaultHook.createSession(3600); // 1 hour session

      // Sign and send transaction (mock for now)
      // const signed = await signTransaction(transaction);
      // const signature = await connection.sendRawTransaction(signed.serialize());

      // For mock, just create the session in store
      createSession(
        publicKey.toBase58(),
        ephemeralWallet.toBase58(),
        vaultPda.toBase58(),
        3600
      );
    } catch (error: any) {
      console.error("Failed to create session:", error);
      alert(`Failed to create session: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEndSession = () => {
    endSession();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div ref={sessionRef} className="relative">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Trading Session
            {sessionActive && (
              <Badge
                variant="outline"
                className="text-xs bg-primary/10 text-primary"
              >
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Create an ephemeral vault for gasless trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sessionActive ? (
            <>
              <p className="text-sm text-muted-foreground">
                Start a trading session to enable gasless trading. This creates
                a temporary wallet that allows 100+ trades per session without
                constant signing.
              </p>
              <Button
                onClick={handleCreateSession}
                disabled={!publicKey || isCreating}
                className="w-full"
              >
                {isCreating ? "Creating Session..." : "Start Trading Session"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Session Duration:
                  </span>
                  <span className="font-medium">
                    {timeRemaining !== null
                      ? formatTime(timeRemaining)
                      : "Expired"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Ephemeral Wallet:
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {currentSession?.ephemeralWallet.slice(0, 8)}...
                    {currentSession?.ephemeralWallet.slice(-8)}
                  </code>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vault PDA:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {currentSession?.vaultPda.slice(0, 8)}...
                    {currentSession?.vaultPda.slice(-8)}
                  </code>
                </div>
              </div>
              <Button
                onClick={handleEndSession}
                variant="outline"
                className="w-full"
              >
                End Session
              </Button>
            </>
          )}

          {ephemeralVaultHook && (
            <SmartContractInfo
              programId={ephemeralVaultHook.programId}
              pda={currentSession?.vaultPda}
              instructionName="create_session"
              description="Ephemeral vaults enable gasless trading through temporary session-based wallets with delegated authority."
            />
          )}
        </CardContent>
      </Card>

      {isActive && (
        <HighlightOverlay
          targetRef={sessionRef}
          isActive={isActive}
          tooltip="Start a gasless trading session"
          position="bottom"
        />
      )}
    </div>
  );
}


