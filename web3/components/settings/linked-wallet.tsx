"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function LinkedWallet() {
  const { publicKey, disconnect } = useWallet();
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    // TODO: Link wallet via API
    setIsLinking(true);
    // Implementation would call API to link wallet
    setTimeout(() => {
      setIsLinking(false);
      alert("Wallet linked successfully");
    }, 1000);
  };

  const handleUnlink = async () => {
    // TODO: Unlink wallet via API
    if (confirm("Are you sure you want to unlink your wallet?")) {
      // Implementation would call API to unlink wallet
      alert("Wallet unlinked");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Wallet</CardTitle>
        <CardDescription>
          Connect your Solana wallet to your trading account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {publicKey ? (
          <>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                value={publicKey.toString()}
                readOnly
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleLink} disabled={isLinking}>
                {isLinking ? "Linking..." : "Link Wallet"}
              </Button>
              <Button variant="outline" onClick={handleUnlink}>
                Unlink Wallet
              </Button>
              <Button variant="outline" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Only one wallet can be linked per account.
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Connect your wallet to link it to your account
          </div>
        )}
      </CardContent>
    </Card>
  );
}


