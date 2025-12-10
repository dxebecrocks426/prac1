import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { CollateralVault, Position, UserAccount } from "@/lib/anchor/types";

/**
 * Parse CollateralVault account data using Anchor Program decoder
 */
export async function parseVaultAccount(
  accountData: Buffer,
  program: Program
): Promise<CollateralVault | null> {
  try {
    const coder = program.coder.accounts;
    
    // Try different account name variations
    const accountNames = ["collateralVault", "CollateralVault", "vault"];
    
    for (const accountName of accountNames) {
      try {
        const decoded = coder.decode(accountName, accountData);
        return decoded as CollateralVault;
      } catch {
        // Try next name
        continue;
      }
    }
    
    // If all decoding attempts fail, try manual parsing as fallback
    return parseVaultAccountManual(accountData);
  } catch (error) {
    console.debug("Failed to parse vault account:", error);
    return parseVaultAccountManual(accountData);
  }
}

/**
 * Parse Position account data using Anchor Program decoder
 */
export async function parsePositionAccount(
  accountData: Buffer,
  program: Program
): Promise<Position | null> {
  try {
    const coder = program.coder.accounts;
    
    // Try different account name variations
    const accountNames = ["position", "Position", "userPosition"];
    
    for (const accountName of accountNames) {
      try {
        const decoded = coder.decode(accountName, accountData);
        return decoded as Position;
      } catch {
        // Try next name
        continue;
      }
    }
    
    // If all decoding attempts fail, try manual parsing as fallback
    return parsePositionAccountManual(accountData);
  } catch (error) {
    console.debug("Failed to parse position account:", error);
    return parsePositionAccountManual(accountData);
  }
}

/**
 * Parse UserAccount account data using Anchor Program decoder
 */
export async function parseUserAccount(
  accountData: Buffer,
  program: Program
): Promise<UserAccount | null> {
  try {
    const coder = program.coder.accounts;
    
    // Try different account name variations
    const accountNames = ["userAccount", "UserAccount", "user"];
    
    for (const accountName of accountNames) {
      try {
        const decoded = coder.decode(accountName, accountData);
        return decoded as UserAccount;
      } catch {
        // Try next name
        continue;
      }
    }
    
    // If all decoding attempts fail, try manual parsing as fallback
    return parseUserAccountManual(accountData);
  } catch (error) {
    console.debug("Failed to parse user account:", error);
    return parseUserAccountManual(accountData);
  }
}

/**
 * Manual parsing fallback for CollateralVault account
 * Based on account structure: owner (32) + tokenAccount (32) + balances (8*6) + timestamps (8*2) + bump (1)
 */
function parseVaultAccountManual(data: Buffer): CollateralVault | null {
  try {
    if (data.length < 8 + 32 + 32 + 8 * 6 + 8 * 2 + 1) {
      return null;
    }

    let offset = 8; // Skip discriminator

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const tokenAccount = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const totalBalance = data.readBigUInt64LE(offset);
    offset += 8;

    const lockedBalance = data.readBigUInt64LE(offset);
    offset += 8;

    const availableBalance = data.readBigUInt64LE(offset);
    offset += 8;

    const totalDeposited = data.readBigUInt64LE(offset);
    offset += 8;

    const totalWithdrawn = data.readBigUInt64LE(offset);
    offset += 8;

    const createdAt = data.readBigUInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      owner,
      tokenAccount,
      totalBalance,
      lockedBalance,
      availableBalance,
      totalDeposited,
      totalWithdrawn,
      createdAt,
      bump,
    };
  } catch (error) {
    console.debug("Manual vault parsing failed:", error);
    return null;
  }
}

/**
 * Manual parsing fallback for Position account
 * Based on account structure with variable-length symbol
 */
export function parsePositionAccountManual(data: Buffer): Position | null {
  try {
    if (data.length < 8 + 32 + 4) {
      return null;
    }

    let offset = 8; // Skip discriminator

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Read symbol length (u32)
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;

    if (data.length < offset + symbolLength + 1 + 8 * 8 + 2 + 8 * 3 + 8 + 1) {
      return null;
    }

    const symbol = data.slice(offset, offset + symbolLength).toString("utf-8");
    offset += symbolLength;

    const side = data[offset] as 0 | 1;
    offset += 1;

    const size = data.readBigUInt64LE(offset);
    offset += 8;

    const entryPrice = data.readBigUInt64LE(offset);
    offset += 8;

    const margin = data.readBigUInt64LE(offset);
    offset += 8;

    const leverage = data.readUInt16LE(offset);
    offset += 2;

    const unrealizedPnl = data.readBigInt64LE(offset);
    offset += 8;

    const realizedPnl = data.readBigInt64LE(offset);
    offset += 8;

    const fundingAccrued = data.readBigInt64LE(offset);
    offset += 8;

    const liquidationPrice = data.readBigUInt64LE(offset);
    offset += 8;

    const lastUpdate = data.readBigUInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      owner,
      symbol,
      side: side as 0 | 1,
      size: BigInt(size),
      entryPrice: BigInt(entryPrice),
      margin: BigInt(margin),
      leverage,
      unrealizedPnl: BigInt(unrealizedPnl),
      realizedPnl: BigInt(realizedPnl),
      fundingAccrued: BigInt(fundingAccrued),
      liquidationPrice: BigInt(liquidationPrice),
      lastUpdate: BigInt(lastUpdate),
      bump,
    };
  } catch (error) {
    console.debug("Manual position parsing failed:", error);
    return null;
  }
}

/**
 * Manual parsing fallback for UserAccount account
 * Based on account structure: owner (32) + collateral (8*2) + pnl (8) + count (4) + bump (1)
 */
function parseUserAccountManual(data: Buffer): UserAccount | null {
  try {
    if (data.length < 8 + 32 + 8 + 8 + 8 + 4 + 1) {
      return null;
    }

    let offset = 8; // Skip discriminator

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const totalCollateral = data.readBigUInt64LE(offset);
    offset += 8;

    const lockedCollateral = data.readBigUInt64LE(offset);
    offset += 8;

    const totalPnl = data.readBigInt64LE(offset);
    offset += 8;

    const positionCount = data.readUInt32LE(offset);
    offset += 4;

    const bump = data[offset];

    return {
      owner,
      totalCollateral,
      lockedCollateral,
      totalPnl,
      positionCount,
      bump,
    };
  } catch (error) {
    console.debug("Manual user account parsing failed:", error);
    return null;
  }
}

