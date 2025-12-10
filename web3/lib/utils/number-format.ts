/**
 * Number formatting utilities for consistent display across the application
 * Formats numbers with commas every 3 significant digits
 */

/**
 * Formats a number with commas every 3 digits
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted string with commas
 */
export function formatNumber(
  value: number | string | null | undefined,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  }
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "—";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  return num.toLocaleString("en-US", {
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    useGrouping: options?.useGrouping ?? true,
  });
}

/**
 * Formats a number with a specific number of decimal places and commas
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with commas
 */
export function formatNumberWithDecimals(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a price value with commas (typically 2 decimal places)
 * @param value - The price to format
 * @returns Formatted price string
 */
export function formatPrice(
  value: number | string | null | undefined
): string {
  return formatNumberWithDecimals(value, 2);
}

/**
 * Formats a balance value with commas (typically 4-9 decimal places for crypto)
 * @param value - The balance to format
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted balance string
 */
export function formatBalance(
  value: number | string | null | undefined,
  decimals: number = 4
): string {
  return formatNumberWithDecimals(value, decimals);
}

/**
 * Formats a large number with appropriate suffix (K, M, B) and commas
 * @param value - The number to format
 * @param decimals - Number of decimal places for suffix (default: 2)
 * @returns Formatted string with suffix
 */
export function formatLargeNumber(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "—";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;
  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return `${formatNumber(num / 1_000_000_000, {
      maximumFractionDigits: decimals,
    })}B`;
  }
  if (absNum >= 1_000_000) {
    return `${formatNumber(num / 1_000_000, {
      maximumFractionDigits: decimals,
    })}M`;
  }
  if (absNum >= 1_000) {
    return `${formatNumber(num / 1_000, {
      maximumFractionDigits: decimals,
    })}K`;
  }

  return formatNumber(num, {
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a percentage value with commas
 * @param value - The percentage to format (as a decimal, e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string with % sign
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "—";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${formatNumberWithDecimals(num, decimals)}%`;
}

