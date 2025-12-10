"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { StatsModal } from "@/components/modals/stats-modal";
import { ReferralsModal } from "@/components/modals/referrals-modal";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const [statsOpen, setStatsOpen] = useState(false);
  const [referralsOpen, setReferralsOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <nav className="flex items-center gap-1">
        <Link href="/trade">
          <Button
            variant="ghost"
            className={cn("relative", isActive("/trade") && "text-primary")}
          >
            Trade
            {isActive("/trade") && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Button>
        </Link>
        <Button variant="ghost" onClick={() => setStatsOpen(true)}>
          Stats
        </Button>
        <Button variant="ghost" onClick={() => setReferralsOpen(true)}>
          Referrals
        </Button>
        <Link href="/docs">
          <Button
            variant="ghost"
            className={cn("relative", isActive("/docs") && "text-primary")}
          >
            Docs
            {isActive("/docs") && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Button>
        </Link>
      </nav>

      <StatsModal open={statsOpen} onOpenChange={setStatsOpen} />
      <ReferralsModal open={referralsOpen} onOpenChange={setReferralsOpen} />
    </>
  );
}
