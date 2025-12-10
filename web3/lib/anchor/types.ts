// TypeScript types for Anchor programs
// These will be replaced with generated types from IDL files when available

import { PublicKey } from "@solana/web3.js";

// Collateral Vault Types
export interface CollateralVault {
  owner: PublicKey;
  tokenAccount: PublicKey;
  totalBalance: bigint;
  lockedBalance: bigint;
  availableBalance: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  createdAt: bigint;
  bump: number;
}

// Position Management Types
export enum Side {
  Long = 0,
  Short = 1,
}

export interface Position {
  owner: PublicKey;
  symbol: string;
  side: Side;
  size: bigint;
  entryPrice: bigint;
  margin: bigint;
  leverage: number;
  unrealizedPnl: bigint;
  realizedPnl: bigint;
  fundingAccrued: bigint;
  liquidationPrice: bigint;
  lastUpdate: bigint;
  bump: number;
}

export interface UserAccount {
  owner: PublicKey;
  totalCollateral: bigint;
  lockedCollateral: bigint;
  totalPnl: bigint;
  positionCount: number;
  bump: number;
}

// Program ID strings (will be converted to PublicKey when needed, not at module level)
// Using valid devnet program IDs as placeholders (these are example addresses)
const COLLATERAL_VAULT_PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID ||
  "11111111111111111111111111111111"; // System program as placeholder (valid base58)

const POSITION_MGMT_PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_POSITION_MGMT_PROGRAM_ID ||
  "Gdu24TgaP7HAuuBqBx4RKcBgGN29kKUodZFTKVmJNZYn"; // Position Management program ID for localnet

// Network configuration
export function getProgramId(network: string): {
  collateralVault: PublicKey;
  positionMgmt: PublicKey;
  ephemeralVault?: PublicKey;
  fundingRate?: PublicKey;
  oracle?: PublicKey;
} | null {
  // Don't create PublicKey instances during SSR
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }

  // Ensure network is a valid string
  if (!network || typeof network !== "string") {
    return null;
  }

  try {
    // For localnet, check for deployed program IDs in localStorage first
    if (network.includes("localhost") || network.includes("127.0.0.1")) {
      // Try to load deployed programs from onboarding store (localStorage)
      let deployedPrograms: Record<string, string> = {};
      try {
        const stored = localStorage.getItem("localnet-onboarding-storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          deployedPrograms = parsed.state?.deployedPrograms || {};
        }
      } catch {
        // Ignore parsing errors
      }

      // Use deployed program IDs if available, otherwise fall back to expected IDs
      const collateralVaultId =
        deployedPrograms["collateral-vault"] ||
        "6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP";

      const positionMgmtId =
        deployedPrograms["position-mgmt"] ||
        "Gdu24TgaP7HAuuBqBx4RKcBgGN29kKUodZFTKVmJNZYn";

      const result: {
        collateralVault: PublicKey;
        positionMgmt: PublicKey;
        ephemeralVault?: PublicKey;
        fundingRate?: PublicKey;
        oracle?: PublicKey;
      } = {
        collateralVault: new PublicKey(collateralVaultId),
        positionMgmt: new PublicKey(positionMgmtId),
      };

      // Add other programs if deployed
      if (deployedPrograms["ephemeral-vault"]) {
        result.ephemeralVault = new PublicKey(
          deployedPrograms["ephemeral-vault"]
        );
      }
      if (deployedPrograms["funding-rate"]) {
        result.fundingRate = new PublicKey(deployedPrograms["funding-rate"]);
      }
      const oracleId =
        deployedPrograms["oracle"] ||
        "2ZwnbUhnAL5phE2Sy7nF4pvvqWopkq69HuxmgNkeDS4X";
      result.oracle = new PublicKey(oracleId);

      return result;
    }

    // Use System Program as a safe placeholder (valid base58)
    // In production, these will be replaced with actual deployed program IDs
    const envVaultId = process.env.NEXT_PUBLIC_COLLATERAL_VAULT_PROGRAM_ID;
    const envPositionId = process.env.NEXT_PUBLIC_POSITION_MGMT_PROGRAM_ID;

    return {
      collateralVault: envVaultId
        ? new PublicKey(envVaultId)
        : new PublicKey(COLLATERAL_VAULT_PROGRAM_ID_STR),
      positionMgmt: envPositionId
        ? new PublicKey(envPositionId)
        : new PublicKey(POSITION_MGMT_PROGRAM_ID_STR),
    };
  } catch (error) {
    // If PublicKey creation fails (invalid base58), return null
    console.warn("Failed to create PublicKey from program ID:", error);
    return null;
  }
}
