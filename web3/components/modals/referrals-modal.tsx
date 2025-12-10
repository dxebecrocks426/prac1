"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ReferralsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralsModal({ open, onOpenChange }: ReferralsModalProps) {
  // TODO: Fetch referral data from API
  const referralCode = "GODARK123";
  const totalReferrals = 0;
  const totalEarnings = 0;

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Referrals</DialogTitle>
          <DialogDescription>Invite friends and earn rewards</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={referralCode} readOnly className="font-mono" />
                <Button onClick={copyReferralLink}>Copy Link</Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Share this link with friends to earn rewards when they sign up
                and trade.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Referrals
                  </div>
                  <div className="text-2xl font-bold">{totalReferrals}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Earnings
                  </div>
                  <div className="text-2xl font-bold">
                    ${totalEarnings.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


