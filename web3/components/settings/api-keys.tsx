"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { accountApi } from "@/lib/api/account";

interface ApiKey {
  key_name: string;
  api_key: string;
  secret_key: string;
  passphrase: string;
  ip_whitelist: string[];
}

export function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newIpWhitelist, setNewIpWhitelist] = useState("");

  const handleCreateKey = async () => {
    try {
      const response = await accountApi.createApiKey({
        key_name: newKeyName,
        ip_whitelist: newIpWhitelist
          ? newIpWhitelist.split(",").map((ip) => ip.trim())
          : undefined,
      });
      // Store securely - show only once
      alert(
        `API Key created! Save these credentials:\nAPI Key: ${response.data.api_key}\nSecret: ${response.data.secret_key}\nPassphrase: ${response.data.passphrase}`
      );
      setIsCreateDialogOpen(false);
      setNewKeyName("");
      setNewIpWhitelist("");
      // Refresh list
    } catch (error) {
      alert(`Failed to create API key: ${error}`);
    }
  };

  const handleDeleteKey = async (apiKey: string) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      // TODO: Implement delete via API
      alert("API key deleted");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>
            Manage your API keys for programmatic trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Add New API Key
            </Button>
          </div>
          {apiKeys.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No API keys created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Secret Key</TableHead>
                  <TableHead>Passphrase</TableHead>
                  <TableHead>IP Whitelist</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.api_key}>
                    <TableCell>
                      <Input
                        value={key.key_name}
                        onChange={(e) => {
                          // TODO: Update via API
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {key.api_key.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {key.secret_key.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {key.passphrase.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Input
                        value={key.ip_whitelist.join(", ")}
                        onChange={(e) => {
                          // TODO: Update via API
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(key.api_key)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="My Trading Bot"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip-whitelist">IP Whitelist (optional)</Label>
              <Input
                id="ip-whitelist"
                value={newIpWhitelist}
                onChange={(e) => setNewIpWhitelist(e.target.value)}
                placeholder="192.168.1.1, 10.0.0.1"
              />
              <div className="text-xs text-muted-foreground">
                Comma-separated list of IP addresses
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={!newKeyName}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


