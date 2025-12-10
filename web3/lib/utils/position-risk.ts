import { Position } from "@/lib/anchor/types";

/**
 * Calculate current margin ratio for a position
 * @param position The position to calculate for
 * @param markPrice Current market price (scaled by 1e6)
 * @returns Margin ratio (0-1)
 */
function calculateMarginRatio(position: Position, markPrice: number): number {
  // Calculate notional value: size * markPrice / 1e6
  const notionalValue = (Number(position.size) * markPrice) / 1e6;
  
  // Get margin and unrealized PnL (both scaled by 1e6)
  const margin = Number(position.margin) / 1e6;
  const unrealizedPnl = Number(position.unrealizedPnl) / 1e6;
  
  // Margin ratio = (margin + unrealizedPnl) / notionalValue
  if (notionalValue === 0) return 1;
  
  const currentMargin = margin + unrealizedPnl;
  return currentMargin / notionalValue;
}

/**
 * Calculate if a position is at risk of liquidation
 * @param position The position to check
 * @param markPrice Current market price (scaled by 1e6)
 * @param maintenanceMarginRate Maintenance margin rate (default 0.01 = 1%)
 * @returns true if position is at risk
 */
export function isPositionAtRisk(
  position: Position,
  markPrice: number, // Current market price (scaled by 1e6)
  maintenanceMarginRate: number = 0.01 // 1% maintenance margin
): boolean {
  const marginRatio = calculateMarginRatio(position, markPrice);
  return marginRatio < maintenanceMarginRate;
}

/**
 * Calculate liquidation distance as percentage
 * @param position The position to check
 * @param markPrice Current market price (scaled by 1e6)
 * @returns Percentage distance to liquidation (0-100)
 */
export function getLiquidationDistance(
  position: Position,
  markPrice: number
): number {
  const liquidationPrice = Number(position.liquidationPrice) / 1e6;
  const currentPrice = markPrice / 1e6;
  
  if (position.side === 0) {
    // Long position: liquidation happens when price goes down
    if (currentPrice <= liquidationPrice) return 0;
    return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  } else {
    // Short position: liquidation happens when price goes up
    if (currentPrice >= liquidationPrice) return 0;
    return ((liquidationPrice - currentPrice) / currentPrice) * 100;
  }
}
