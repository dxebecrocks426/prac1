import { DevConsoleEvent, EventType } from "@/lib/store/use-dev-console-store";

export function formatEventTime(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTransactionSignature(signature: string, length: number = 8): string {
  if (!signature) return "";
  if (signature.length <= length * 2) return signature;
  return `${signature.slice(0, length)}...${signature.slice(-length)}`;
}

export function formatEventMessage(event: DevConsoleEvent): string {
  const time = formatEventTime(event.timestamp);
  const lines: string[] = [];

  // Main event line
  const typeLabel = getEventTypeLabel(event.type);
  lines.push(`[${time}] ${typeLabel}: ${event.message}`);

  // Transaction signature
  if (event.transaction) {
    const formattedSig = formatTransactionSignature(event.transaction);
    lines.push(`  → Transaction: ${formattedSig}`);
  }

  // Status
  if (event.status) {
    const statusEmoji = event.status === "success" ? "✓" : event.status === "failed" ? "✗" : "⏳";
    const statusLabel = event.status.charAt(0).toUpperCase() + event.status.slice(1);
    lines.push(`  → Status: ${statusEmoji} ${statusLabel}`);
  }

  // Additional details
  if (event.details) {
    Object.entries(event.details).forEach(([key, value]) => {
      let formattedValue: string;
      if (value === null || value === undefined) {
        formattedValue = String(value);
      } else if (typeof value === "object") {
        try {
          // Check for circular references before stringifying
          const seen = new WeakSet();
          formattedValue = JSON.stringify(value, (k, v) => {
            if (typeof v === "object" && v !== null) {
              if (seen.has(v)) {
                return "[Circular]";
              }
              seen.add(v);
            }
            // Filter out React-specific properties that cause circular refs
            if (k && (k.startsWith("__react") || k === "stateNode" || k === "ref")) {
              return undefined;
            }
            return v;
          });
        } catch (error) {
          formattedValue = "[Unable to serialize]";
        }
      } else {
        formattedValue = String(value);
      }
      lines.push(`  → ${key}: ${formattedValue}`);
    });
  }

  return lines.join("\n");
}

function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    transaction: "Transaction",
    airdrop: "Airdrop",
    mint: "Mint",
    deploy: "Deploy",
    authorize: "Authorize",
    deposit: "Deposit",
    withdraw: "Withdraw",
    revoke: "Revoke",
    error: "Error",
    info: "Info",
    validator: "Validator",
    trade: "Trade",
    order: "Order",
  };
  return labels[type] || type;
}

export function getEventTypeColor(type: EventType, status?: "success" | "failed" | "pending"): string {
  if (status === "failed" || type === "error") {
    return "text-red-400 dark:text-red-300"; // Lighter red for better readability
  }
  if (status === "success") {
    return "text-green-500 dark:text-green-400";
  }
  if (status === "pending") {
    return "text-yellow-500 dark:text-yellow-400";
  }

  const colors: Record<EventType, string> = {
    transaction: "text-blue-400 dark:text-blue-300",
    airdrop: "text-purple-400 dark:text-purple-300",
    mint: "text-gray-400 dark:text-gray-300",
    deploy: "text-gray-400 dark:text-gray-300",
    authorize: "text-green-500 dark:text-green-400",
    deposit: "text-green-500 dark:text-green-400",
    withdraw: "text-orange-400 dark:text-orange-300",
    revoke: "text-red-400 dark:text-red-300", // Lighter red
    error: "text-red-400 dark:text-red-300", // Lighter red
    info: "text-muted-foreground",
    validator: "text-blue-400 dark:text-blue-300",
    trade: "text-emerald-400 dark:text-emerald-300",
    order: "text-amber-400 dark:text-amber-300",
  };

  return colors[type] || "text-foreground";
}
