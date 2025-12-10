"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SmartContractInfoProps {
  programId: string;
  pda?: string;
  instructionName?: string;
  description?: string;
  className?: string;
}

export function SmartContractInfo({
  programId,
  pda,
  instructionName,
  description,
  className,
}: SmartContractInfoProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const programIdStr = programId;
  const pdaStr = pda;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getExplorerUrl = (address: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("devnet")
      ? "devnet"
      : "mainnet";
    return `https://explorer.solana.com/address/${address}?cluster=${network}`;
  };

  return (
    <Card className={cn("bg-card/95 backdrop-blur-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-primary">Smart Contract</span>
          {instructionName && (
            <Badge variant="outline" className="text-xs">
              {instructionName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Program ID
            </label>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                {programIdStr.slice(0, 8)}...{programIdStr.slice(-8)}
              </code>
              <button
                onClick={() => copyToClipboard(programIdStr, "program")}
                className="text-muted-foreground hover:text-foreground"
                title="Copy program ID"
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={getExplorerUrl(programIdStr)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                title="View on Solana Explorer"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {pdaStr && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                PDA (Program Derived Address)
              </label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {pdaStr.slice(0, 8)}...{pdaStr.slice(-8)}
                </code>
                <button
                  onClick={() => copyToClipboard(pdaStr, "pda")}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy PDA"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <a
                  href={getExplorerUrl(pdaStr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {copied && (
          <div className="text-xs text-primary animate-in fade-in">
            Copied {copied === "program" ? "Program ID" : "PDA"}!
          </div>
        )}
      </CardContent>
    </Card>
  );
}


