"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkedWallet } from "@/components/settings/linked-wallet";
import { ApiKeys } from "@/components/settings/api-keys";
import { AccountManagement } from "@/components/settings/account-management";
import { ActivityLog } from "@/components/settings/activity-log";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account, API keys, and preferences
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="wallet">Linked Wallet</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="wallet">
            <LinkedWallet />
          </TabsContent>
          <TabsContent value="api-keys">
            <ApiKeys />
          </TabsContent>
          <TabsContent value="account">
            <AccountManagement />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityLog />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


