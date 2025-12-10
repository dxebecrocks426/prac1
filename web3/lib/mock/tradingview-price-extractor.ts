/**
 * TradingView Price Extractor
 * Extracts current price from TradingView widget DOM
 */

let priceObservers: Map<string, MutationObserver> = new Map();
let currentPrices: Map<string, number> = new Map();
let priceCallbacks: Map<string, Set<(price: number) => void>> = new Map();

/**
 * Extract price from TradingView widget DOM
 */
export function extractPriceFromTradingView(containerId: string): number | null {
  const container = document.getElementById(containerId);
  if (!container) {
    return null;
  }

  // TradingView widget structure: look for price elements
  // Common selectors for TradingView price display
  const selectors = [
    '[class*="price"]',
    '[class*="last-price"]',
    '[data-field="last_price"]',
    '.js-symbol-last',
  ];

  for (const selector of selectors) {
    const element = container.querySelector(selector);
    if (element) {
      const text = element.textContent || element.innerText;
      const price = parsePrice(text);
      if (price !== null) {
        return price;
      }
    }
  }

  // Try to find price in any text content
  const allText = container.textContent || container.innerText;
  const priceMatch = allText.match(/[\d,]+\.?\d*/);
  if (priceMatch) {
    const price = parseFloat(priceMatch[0].replace(/,/g, ""));
    if (!isNaN(price) && price > 0) {
      return price;
    }
  }

  return null;
}

/**
 * Parse price from text
 */
function parsePrice(text: string): number | null {
  if (!text) return null;

  // Remove commas and parse
  const cleaned = text.replace(/,/g, "").trim();
  const price = parseFloat(cleaned);

  if (isNaN(price) || price <= 0) {
    return null;
  }

  return price;
}

/**
 * Watch TradingView widget for price updates
 */
export function watchTradingViewPrice(
  containerId: string,
  symbol: string,
  callback: (price: number) => void
): () => void {
  // Store callback
  if (!priceCallbacks.has(symbol)) {
    priceCallbacks.set(symbol, new Set());
  }
  priceCallbacks.get(symbol)!.add(callback);

  // If already watching, just add callback
  if (priceObservers.has(symbol)) {
    // Trigger immediate callback if price exists
    const currentPrice = currentPrices.get(symbol);
    if (currentPrice !== undefined) {
      callback(currentPrice);
    }
    return () => {
      priceCallbacks.get(symbol)?.delete(callback);
    };
  }

  // Create mutation observer
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`TradingView container not found: ${containerId}`);
    return () => {
      priceCallbacks.get(symbol)?.delete(callback);
    };
  }

  const observer = new MutationObserver(() => {
    const price = extractPriceFromTradingView(containerId);
    if (price !== null) {
      currentPrices.set(symbol, price);
      // Notify all callbacks
      priceCallbacks.get(symbol)?.forEach((cb) => cb(price));
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false,
  });

  priceObservers.set(symbol, observer);

  // Try initial extraction
  const initialPrice = extractPriceFromTradingView(containerId);
  if (initialPrice !== null) {
    currentPrices.set(symbol, initialPrice);
    callback(initialPrice);
  }

  // Return cleanup function
  return () => {
    observer.disconnect();
    priceObservers.delete(symbol);
    priceCallbacks.get(symbol)?.delete(callback);
    if (priceCallbacks.get(symbol)?.size === 0) {
      priceCallbacks.delete(symbol);
    }
  };
}

/**
 * Get current price for a symbol (from cache)
 */
export function getCurrentPrice(symbol: string): number | null {
  return currentPrices.get(symbol) || null;
}

/**
 * Stop watching all prices
 */
export function stopAllWatchers(): void {
  priceObservers.forEach((observer) => observer.disconnect());
  priceObservers.clear();
  priceCallbacks.clear();
  currentPrices.clear();
}


