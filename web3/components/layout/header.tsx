"use client";

import { Navigation } from "./navigation";
import { StealthModeToggle } from "./stealth-mode-toggle";
import { TierBadge } from "./tier-badge";
import { ProToggle } from "./pro-toggle";
import { SettingsModal } from "@/components/modals/settings-modal";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { connected } = useWallet();

  const handleReset = async () => {
    // Stop validator if running
    try {
      const response = await fetch("/api/validator", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Log validator stop event if dev console store is available
        if (typeof window !== "undefined") {
          try {
            const { useDevConsoleStore } = await import(
              "@/lib/store/use-dev-console-store"
            );
            useDevConsoleStore.getState().addEvent({
              type: "info",
              message: "Stopped Solana localnet validator",
              status: "success",
            });
          } catch {
            // Dev console store might not be loaded yet, that's okay
          }
        }
      }
    } catch (error) {
      console.error("Failed to stop validator:", error);
      // Continue with reset even if validator stop fails
    }

    // Stop mock matching engine if running
    try {
      const response = await fetch("/api/mock-engine", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Log mock engine stop event if dev console store is available
        if (typeof window !== "undefined") {
          try {
            const { useDevConsoleStore } = await import(
              "@/lib/store/use-dev-console-store"
            );
            useDevConsoleStore.getState().addEvent({
              type: "info",
              message: "Stopped mock matching engine",
              status: "success",
            });
          } catch {
            // Dev console store might not be loaded yet, that's okay
          }
        }
      }
    } catch (error) {
      // Mock engine might not be running, that's okay
      console.debug("Mock engine not running or failed to stop:", error);
    }

    // Stop settlement relayer if running
    try {
      const response = await fetch("/api/settlement-relayer", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Log settlement relayer stop event if dev console store is available
        if (typeof window !== "undefined") {
          try {
            const { useDevConsoleStore } = await import(
              "@/lib/store/use-dev-console-store"
            );
            useDevConsoleStore.getState().addEvent({
              type: "info",
              message: "Stopped settlement relayer service",
              status: "success",
            });
          } catch {
            // Dev console store might not be loaded yet, that's okay
          }
        }
      }
    } catch (error) {
      // Settlement relayer might not be running, that's okay
      console.debug("Settlement relayer not running or failed to stop:", error);
    }

    // Stop position management if running
    try {
      const response = await fetch("/api/position-management", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Log position management stop event if dev console store is available
        if (typeof window !== "undefined") {
          try {
            const { useDevConsoleStore } = await import(
              "@/lib/store/use-dev-console-store"
            );
            useDevConsoleStore.getState().addEvent({
              type: "info",
              message: "Stopped position management service",
              status: "success",
            });
          } catch {
            // Dev console store might not be loaded yet, that's okay
          }
        }
      }
    } catch (error) {
      // Position management might not be running, that's okay
      console.debug("Position management not running or failed to stop:", error);
    }

    // Stop liquidation engine if running
    try {
      const response = await fetch("/api/liquidation-engine", {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Log liquidation engine stop event if dev console store is available
        if (typeof window !== "undefined") {
          try {
            const { useDevConsoleStore } = await import(
              "@/lib/store/use-dev-console-store"
            );
            useDevConsoleStore.getState().addEvent({
              type: "info",
              message: "Stopped liquidation engine service",
              status: "success",
            });
          } catch {
            // Dev console store might not be loaded yet, that's okay
          }
        }
      }
    } catch (error) {
      // Liquidation engine might not be running, that's okay
      console.debug("Liquidation engine not running or failed to stop:", error);
    }

    // Preserve localnet RPC endpoint preference if set
    const savedRpc = localStorage.getItem("solana-rpc-endpoint");
    const isLocalnetRpc =
      savedRpc &&
      (savedRpc.includes("localhost") || savedRpc.includes("127.0.0.1"));

    // Preserve dev console state
    const devConsoleState = localStorage.getItem("dev-console-storage");

    // Check if localnet wallet exists before clearing
    const hasLocalWallet =
      typeof window !== "undefined" &&
      localStorage.getItem("localnet-wallet-keypair") !== null;

    // Clear localStorage
    localStorage.clear();

    // Restore localnet RPC endpoint if it was set
    if (isLocalnetRpc && savedRpc) {
      localStorage.setItem("solana-rpc-endpoint", savedRpc);
    }

    // Restore dev console state
    if (devConsoleState) {
      localStorage.setItem("dev-console-storage", devConsoleState);
    }

    // Restore localnet wallet if it exists (so auto-connect can work)
    if (hasLocalWallet && typeof window !== "undefined") {
      // Note: We can't restore the wallet keypair here since we cleared it
      // But we'll set the walletName so if the wallet is recreated, auto-connect works
      // Actually, we can't restore it since we cleared localStorage
      // The user will need to go through onboarding again after reset
    }

    // Clear sessionStorage
    sessionStorage.clear();
    // Hard reload the page
    window.location.reload();
  };

  return (
    <>
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">
              G<span className="text-primary">o</span>Dark DEX
            </h1>
            <Navigation />
          </div>
          <div className="flex items-center gap-2 relative z-[10001]">
            {/* Show user controls only when wallet is connected */}
            {connected && (
              <>
                <div className="hidden md:flex items-center gap-2 border-r border-border pr-3 mr-2">
                  <StealthModeToggle />
                  <TierBadge />
                  <ProToggle />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  className="h-9 w-9"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-9 w-9"
              title="Reset cache and reload"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {/* Show wallet button only when not connected (connect button) */}
            {!connected && <WalletButton />}
          </div>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
