import { useEffect, useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useOnboardingStore } from "@/lib/store/use-onboarding-store";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";
import { getProgramId } from "@/lib/anchor/types";
import { useCollateralVaultProgram, usePositionMgmtProgram } from "@/lib/anchor/programs";
import { parseVaultAccount, parsePositionAccount, parsePositionAccountManual, parseUserAccount } from "@/lib/utils/account-parser";
import { isPositionAtRisk } from "@/lib/utils/position-risk";
import { Side } from "@/lib/anchor/types";

export interface LocalnetStats {
  programs: {
    deployed: number;
    list: Array<{ name: string; address: string }>;
  };
  wallets: {
    total: number;
    regular: number;
    pdas: number;
  };
  mints: Array<{ symbol: string; address: string }>;
  godark: {
    vaults: {
      total: number;
      totalCollateral: number;
      lockedCollateral: number;
      availableCollateral: number;
      utilizationRate: number;
      totalDeposited: number;
      totalWithdrawn: number;
    };
    positions: {
      total: number;
      long: number;
      short: number;
      bySymbol: Record<string, number>;
      totalMargin: number;
      totalNotional: number;
      totalUnrealizedPnl: number;
      totalRealizedPnl: number;
      averageLeverage: number;
      atRisk: number;
    };
    users: {
      total: number;
      totalCollateral: number;
      averageCollateral: number;
      totalPnl: number;
    };
    oracle: {
      feeds: number;
      symbols: string[];
    };
    cpi: {
      total: number;
      success: number;
      failed: number;
      recent: Array<{
        from: string;
        to: string;
        instruction: string;
        success: boolean;
        timestamp: string;
      }>;
    };
  };
  isLoading: boolean;
  lastUpdated: Date | null;
}

const COLLATERAL_VAULT_ACCOUNT_SIZE = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1; // Approximate size

export function useLocalnetStats(isEnabled: boolean): LocalnetStats {
  const { connection } = useConnection();
  const { deployedPrograms, tokenMints, walletAddress } = useOnboardingStore();
  const { cpiHistory } = useDevConsoleStore();
  const vaultProgram = useCollateralVaultProgram();
  const positionProgram = usePositionMgmtProgram();
  
  const [stats, setStats] = useState<LocalnetStats>({
    programs: { deployed: 0, list: [] },
    wallets: { total: 0, regular: 0, pdas: 0 },
    mints: [],
    godark: {
      vaults: {
        total: 0,
        totalCollateral: 0,
        lockedCollateral: 0,
        availableCollateral: 0,
        utilizationRate: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
      },
      positions: {
        total: 0,
        long: 0,
        short: 0,
        bySymbol: {},
        totalMargin: 0,
        totalNotional: 0,
        totalUnrealizedPnl: 0,
        totalRealizedPnl: 0,
        averageLeverage: 0,
        atRisk: 0,
      },
      users: {
        total: 0,
        totalCollateral: 0,
        averageCollateral: 0,
        totalPnl: 0,
      },
      oracle: {
        feeds: 0,
        symbols: [],
      },
      cpi: {
        total: 0,
        success: 0,
        failed: 0,
        recent: [],
      },
    },
    isLoading: true,
    lastUpdated: null,
  });

  const isLocalnet = connection.rpcEndpoint.includes("localhost") || 
                     connection.rpcEndpoint.includes("127.0.0.1") ||
                     connection.rpcEndpoint.includes("8899");

  const fetchStats = useCallback(async () => {
    if (!isEnabled || !isLocalnet) {
      setStats((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Get program IDs
      const programIds = getProgramId(connection.rpcEndpoint);
      if (!programIds) {
        setStats((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // 1. Get deployed programs
      const programList: Array<{ name: string; address: string }> = [];
      const programIdMap: Record<string, string> = {
        "collateral-vault": programIds.collateralVault.toBase58(),
        "position-mgmt": programIds.positionMgmt.toBase58(),
      };

      if (programIds.oracle) {
        programIdMap["oracle"] = programIds.oracle.toBase58();
      }
      if (programIds.ephemeralVault) {
        programIdMap["ephemeral-vault"] = programIds.ephemeralVault.toBase58();
      }
      if (programIds.fundingRate) {
        programIdMap["funding-rate"] = programIds.fundingRate.toBase58();
      }

      // Check which programs are actually deployed
      for (const [name, address] of Object.entries(programIdMap)) {
        try {
          const programInfo = await connection.getAccountInfo(new PublicKey(address));
          if (programInfo && programInfo.executable) {
            programList.push({ name, address });
          }
        } catch {
          // Program not deployed, skip
        }
      }

      // 2. Get token mints
      const mints: Array<{ symbol: string; address: string }> = [];
      try {
        const mintAccounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            {
              dataSize: 165, // Mint account size
            },
          ],
        });

        // Map known mints from onboarding store, but also include all mints
        const knownMints = Object.entries(tokenMints);
        const knownMintAddresses = new Set(Object.values(tokenMints));
        
        mintAccounts.forEach((account) => {
          const address = account.pubkey.toBase58();
          const knownMint = knownMints.find(([, addr]) => addr === address);
          
          if (knownMint) {
            // Use known symbol
            mints.push({ symbol: knownMint[0], address });
          } else {
            // Show all mints, even if not in store (with shortened address as symbol)
            mints.push({ symbol: `${address.slice(0, 4)}...${address.slice(-4)}`, address });
          }
        });
      } catch (error) {
        console.debug("Failed to fetch mints:", error);
      }

      // 3. Get wallets (regular accounts with balance)
      let regularWallets = 0;
      if (walletAddress) {
        regularWallets = 1; // At least the onboarding wallet
      }

      // 4. Get GoDark DEX specific stats
      let pdas = 0;
      
      // Vault statistics
      let vaultsTotal = 0;
      let vaultsTotalCollateral = 0;
      let vaultsLockedCollateral = 0;
      let vaultsAvailableCollateral = 0;
      let vaultsTotalDeposited = 0;
      let vaultsTotalWithdrawn = 0;

      // Position statistics
      let positionsTotal = 0;
      let positionsLong = 0;
      let positionsShort = 0;
      const positionsBySymbol: Record<string, number> = {};
      let positionsTotalMargin = 0;
      let positionsTotalNotional = 0;
      let positionsTotalUnrealizedPnl = 0;
      let positionsTotalRealizedPnl = 0;
      let positionsTotalLeverage = 0;
      let positionsAtRisk = 0;

      // User account statistics
      let usersTotal = 0;
      let usersTotalCollateral = 0;
      let usersTotalPnl = 0;

      // Parse vaults (CollateralVault accounts)
      if (vaultProgram) {
        try {
          const vaultAccounts = await connection.getProgramAccounts(programIds.collateralVault, {
            filters: [
              {
                dataSize: COLLATERAL_VAULT_ACCOUNT_SIZE,
              },
            ],
          });
          
          vaultsTotal = vaultAccounts.length;
          pdas += vaultAccounts.length;

          // Parse each vault account
          for (const vaultAccount of vaultAccounts) {
            const parsed = await parseVaultAccount(vaultAccount.account.data, vaultProgram);
            if (parsed) {
              const total = Number(parsed.totalBalance) / 1e6;
              const locked = Number(parsed.lockedBalance) / 1e6;
              const available = Number(parsed.availableBalance) / 1e6;
              const deposited = Number(parsed.totalDeposited) / 1e6;
              const withdrawn = Number(parsed.totalWithdrawn) / 1e6;

              vaultsTotalCollateral += total;
              vaultsLockedCollateral += locked;
              vaultsAvailableCollateral += available;
              vaultsTotalDeposited += deposited;
              vaultsTotalWithdrawn += withdrawn;
            }
          }
        } catch (error) {
          console.debug("Failed to fetch/parse vaults:", error);
        }
      }

      // Parse positions (Position Management accounts)
      if (positionProgram) {
        try {
          const positionAccounts = await connection.getProgramAccounts(programIds.positionMgmt, {
            filters: [
              {
                dataSize: 200, // Approximate position account size
              },
            ],
          });
          
          positionsTotal = positionAccounts.length;
          pdas += positionAccounts.length;

          // Parse each position account
          for (const positionAccount of positionAccounts) {
            // Try IDL-based parsing first, fall back to manual parsing
            let parsed = await parsePositionAccount(positionAccount.account.data, positionProgram);
            if (!parsed) {
              // Fallback to manual parsing if IDL parsing fails
              parsed = parsePositionAccountManual(positionAccount.account.data);
            }
            if (parsed) {
              // Count by side
              if (parsed.side === Side.Long) {
                positionsLong++;
              } else {
                positionsShort++;
              }

              // Count by symbol
              positionsBySymbol[parsed.symbol] = (positionsBySymbol[parsed.symbol] || 0) + 1;

              // Aggregate metrics
              const margin = Number(parsed.margin) / 1e6;
              const size = Number(parsed.size) / 1e6;
              const entryPrice = Number(parsed.entryPrice) / 1e6;
              const notional = Math.abs(size * entryPrice);
              const unrealizedPnl = Number(parsed.unrealizedPnl) / 1e6;
              const realizedPnl = Number(parsed.realizedPnl) / 1e6;

              positionsTotalMargin += margin;
              positionsTotalNotional += notional;
              positionsTotalUnrealizedPnl += unrealizedPnl;
              positionsTotalRealizedPnl += realizedPnl;
              positionsTotalLeverage += parsed.leverage;

              // Check if at risk (using entry price as mark price approximation)
              // In production, would use actual oracle price
              if (isPositionAtRisk(parsed, parsed.entryPrice)) {
                positionsAtRisk++;
              }
            }
          }
        } catch (error) {
          console.debug("Failed to fetch/parse positions:", error);
        }
      }

      // Parse user accounts
      // Note: UserAccount size is 61 bytes (8 discriminator + 32 owner + 8*3 collateral/pnl + 4 count + 1 bump)
      if (positionProgram) {
        try {
          const userAccounts = await connection.getProgramAccounts(programIds.positionMgmt, {
            filters: [
              {
                dataSize: 61, // UserAccount::LEN = 61 bytes
              },
            ],
          });

          usersTotal = userAccounts.length;
          // Don't double-count PDAs - user accounts are already counted if they exist
          // But we'll count them separately for accuracy

          // Parse each user account
          for (const userAccount of userAccounts) {
            const parsed = await parseUserAccount(userAccount.account.data, positionProgram);
            if (parsed) {
              const collateral = Number(parsed.totalCollateral) / 1e6;
              const pnl = Number(parsed.totalPnl) / 1e6;

              usersTotalCollateral += collateral;
              usersTotalPnl += pnl;
            }
          }
        } catch (error) {
          console.debug("Failed to fetch/parse user accounts:", error);
        }
      }
      
      // Update PDA count to include user accounts (they weren't counted in positions)
      pdas += usersTotal;

      // Calculate derived metrics
      const vaultsUtilizationRate = vaultsTotalCollateral > 0 
        ? (vaultsLockedCollateral / vaultsTotalCollateral) * 100 
        : 0;
      
      const positionsAverageLeverage = positionsTotal > 0 
        ? positionsTotalLeverage / positionsTotal 
        : 0;

      const usersAverageCollateral = usersTotal > 0 
        ? usersTotalCollateral / usersTotal 
        : 0;

      // Get CPI statistics
      const cpiTotal = cpiHistory.length;
      const cpiSuccess = cpiHistory.filter(cpi => cpi.success).length;
      const cpiFailed = cpiTotal - cpiSuccess;
      const cpiRecent = cpiHistory.slice(0, 5).map(cpi => ({
        from: cpi.fromProgram,
        to: cpi.toProgram,
        instruction: cpi.instruction,
        success: cpi.success,
        timestamp: cpi.timestamp,
      }));

      // Oracle feeds (placeholder - would need to query oracle program)
      const oracleFeeds = 0;
      const oracleSymbols: string[] = [];

      setStats({
        programs: {
          deployed: programList.length,
          list: programList,
        },
        wallets: {
          total: regularWallets + pdas,
          regular: regularWallets,
          pdas,
        },
        mints,
        godark: {
          vaults: {
            total: vaultsTotal,
            totalCollateral: vaultsTotalCollateral,
            lockedCollateral: vaultsLockedCollateral,
            availableCollateral: vaultsAvailableCollateral,
            utilizationRate: vaultsUtilizationRate,
            totalDeposited: vaultsTotalDeposited,
            totalWithdrawn: vaultsTotalWithdrawn,
          },
          positions: {
            total: positionsTotal,
            long: positionsLong,
            short: positionsShort,
            bySymbol: positionsBySymbol,
            totalMargin: positionsTotalMargin,
            totalNotional: positionsTotalNotional,
            totalUnrealizedPnl: positionsTotalUnrealizedPnl,
            totalRealizedPnl: positionsTotalRealizedPnl,
            averageLeverage: positionsAverageLeverage,
            atRisk: positionsAtRisk,
          },
          users: {
            total: usersTotal,
            totalCollateral: usersTotalCollateral,
            averageCollateral: usersAverageCollateral,
            totalPnl: usersTotalPnl,
          },
          oracle: {
            feeds: oracleFeeds,
            symbols: oracleSymbols,
          },
          cpi: {
            total: cpiTotal,
            success: cpiSuccess,
            failed: cpiFailed,
            recent: cpiRecent,
          },
        },
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Failed to fetch localnet stats:", error);
      setStats((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isEnabled, isLocalnet, connection, deployedPrograms, tokenMints, walletAddress, vaultProgram, positionProgram, cpiHistory]);

  useEffect(() => {
    if (!isEnabled || !isLocalnet) {
      return;
    }

    fetchStats();
    // Poll more frequently to catch position updates (every 5 seconds, same as OpenPositionsTable)
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, [isEnabled, isLocalnet, fetchStats]);

  return stats;
}

