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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatsModal({ open, onOpenChange }: StatsModalProps) {
  // TODO: Fetch actual data from API
  const executionQualityData = [
    { date: "2024-01-01", slippageSaved: 1000, mevAvoided: 500 },
    { date: "2024-01-02", slippageSaved: 1200, mevAvoided: 600 },
    // Mock data
  ];

  const marketData = [
    { date: "2024-01-01", volume: 1000000, liquidity: 500000 },
    { date: "2024-01-02", volume: 1200000, liquidity: 600000 },
    // Mock data
  ];

  const operationalData = [
    { date: "2024-01-01", fees: 10000, finalityTime: 1.2 },
    { date: "2024-01-02", fees: 12000, finalityTime: 1.1 },
    // Mock data
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>GoDark Statistics</DialogTitle>
          <DialogDescription>
            Execution quality, market data, and operational transparency
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Execution Quality & Savings */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Quality & Savings</CardTitle>
              <CardDescription>
                Cumulative daily values (published at midnight UTC, T-2 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Slippage & Market Impact Saved
                    </div>
                    <div className="text-2xl font-bold">$1,200 USDT</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      MEV Avoided
                    </div>
                    <div className="text-2xl font-bold">$600 USDT</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={executionQualityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="slippageSaved"
                      stroke="#8884d8"
                      name="Slippage Saved"
                    />
                    <Line
                      type="monotone"
                      dataKey="mevAvoided"
                      stroke="#82ca9d"
                      name="MEV Avoided"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* GoDark Market Data */}
          <Card>
            <CardHeader>
              <CardTitle>GoDark Market Data</CardTitle>
              <CardDescription>
                Cumulative daily values (published at midnight UTC, T-2 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Matched Volume
                  </div>
                  <div className="text-xl font-semibold">$1.2M USDT</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Liquidity Submitted
                  </div>
                  <div className="text-xl font-semibold">$600K USDT</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Buy/Sell Ratio
                  </div>
                  <div className="text-xl font-semibold">55%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Avg Time to Fill
                  </div>
                  <div className="text-xl font-semibold">0.5s</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={marketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#8884d8"
                    name="Matched Volume"
                  />
                  <Line
                    type="monotone"
                    dataKey="liquidity"
                    stroke="#82ca9d"
                    name="Liquidity Submitted"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Operational Transparency */}
          <Card>
            <CardHeader>
              <CardTitle>Operational Transparency</CardTitle>
              <CardDescription>
                Cumulative daily values (published at midnight UTC, T-2 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Fees Collected
                  </div>
                  <div className="text-xl font-semibold">$12K USDT</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Avg Settlement Finality
                  </div>
                  <div className="text-xl font-semibold">1.1s</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Failed Settlements
                  </div>
                  <div className="text-xl font-semibold">0</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    System Downtime
                  </div>
                  <div className="text-xl font-semibold">0 min</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={operationalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="fees"
                    stroke="#8884d8"
                    name="Fees Collected"
                  />
                  <Line
                    type="monotone"
                    dataKey="finalityTime"
                    stroke="#82ca9d"
                    name="Avg Finality Time (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


