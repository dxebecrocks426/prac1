/**
 * Symbol format conversion utilities for GoMarket API
 */

/**
 * Convert internal symbol format to GoMarket API format
 * @param symbol Internal symbol format (e.g., "BTC-USDT-PERP")
 * @returns GoMarket symbol format (e.g., "BTCUSDT")
 */
export function convertToGomarketSymbol(symbol: string): string {
  const parts = symbol.split("-");
  if (parts.length >= 2) {
    // Take base and quote, ignore PERP suffix
    const base = parts[0];
    const quote = parts[1];
    return `${base}${quote}`;
  }
  // Fallback: remove dashes
  return symbol.replace(/-/g, "");
}

/**
 * Get exchange identifier for GoMarket API
 * @param symbol Internal symbol format (e.g., "BTC-USDT-PERP")
 * @returns Exchange identifier (e.g., "binance-usdm")
 */
export function getExchangeFromSymbol(symbol: string): string {
  // For now, all symbols use binance-usdm
  // In the future, this could detect exchange from symbol
  return "binance-usdm";
}

/**
 * Build GoMarket WebSocket URL
 * @param endpoint WebSocket endpoint (e.g., "l2-orderbook", "last-trades")
 * @param symbol Internal symbol format (e.g., "BTC-USDT-PERP")
 * @returns Full WebSocket URL
 */
export function buildGomarketWsUrl(
  endpoint: string,
  symbol: string
): string {
  const gomarketSymbol = convertToGomarketSymbol(symbol);
  const exchange = getExchangeFromSymbol(symbol);
  return `wss://gomarket-api.goquant.io/ws/${endpoint}/${exchange}/${gomarketSymbol}`;
}

