"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WalletButton } from "@/components/wallet/wallet-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FlowGuide } from "@/components/flow/flow-guide";
import { LocalnetModeSwitcher } from "@/components/onboarding/localnet-mode-switcher";

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();

  // Optionally redirect to trade page
  // useEffect(() => {
  //   router.push("/trade");
  // }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <FlowGuide />
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">GoDark DEX</h1>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to GoDark DEX
          </h2>
          <p className="text-muted-foreground">
            {connected
              ? "Your wallet is connected. Authorize USDT to start trading perpetual futures."
              : "Connect your Solana wallet to start trading perpetual futures"}
          </p>
        </div>

        {/* Localnet Onboarding Mode Switcher */}
        <div className="mb-6 max-w-md">
          <LocalnetModeSwitcher />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Trade</CardTitle>
              <CardDescription>
                Place orders and trade perpetual futures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/trade">
                <Button className="w-full">Go to Trading</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>
                View your positions and balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor your trading activity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Markets</CardTitle>
              <CardDescription>Explore available trading pairs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse all available markets
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/docs">
            <Button variant="outline">View Documentation</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
