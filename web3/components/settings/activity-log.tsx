"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { format } from "date-fns";

interface Activity {
  timestamp: Date;
  action: string;
  device: string;
  ip: string;
  location?: string;
}

export function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // TODO: Fetch from API
    // Mock data
    setActivities([
      {
        timestamp: new Date(),
        action: "Login",
        device: "Chrome on macOS",
        ip: "192.168.1.1",
        location: "San Francisco, US",
      },
    ]);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>Recent account activity</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No activity recorded
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, idx) => (
              <div
                key={idx}
                className="flex justify-between items-start p-4 border rounded-lg"
              >
                <div>
                  <div className="font-semibold">{activity.action}</div>
                  <div className="text-sm text-muted-foreground">
                    {activity.device}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.ip}
                    {activity.location && ` • ${activity.location}`}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(activity.timestamp, "MMM dd, yyyy HH:mm")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


