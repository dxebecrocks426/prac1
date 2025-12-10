"use client";

import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, Commitment } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { getProgramId } from "./types";
import { collateralVaultIdl } from "./idl/collateral-vault-idl";

// IDL types
interface CollateralVaultIdl extends Idl {
  name: "collateral_vault";
}

interface PositionMgmtIdl extends Idl {
  name: "position_management";
}

/**
 * Load IDL - tries to fetch from deployed program, falls back to bundled IDL
 */
async function loadIdl(
  programName: string,
  programId: PublicKey,
  connection: Connection
): Promise<Idl | null> {
  // Try to fetch IDL from deployed program first
  try {
    const idl = await Program.fetchIdl(programId, { connection } as any);
    if (idl) {
      return idl;
    }
  } catch (error) {
    console.log(
      `Could not fetch IDL from program ${programId.toBase58()}:`,
      error
    );
  }

  // Fall back to bundled IDL for collateral vault
  if (programName === "collateral_vault") {
    return collateralVaultIdl as Idl;
  }

  return null;
}

/**
 * Create Anchor provider from wallet and connection
 */
export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      return null;
    }

    // Ensure wallet.publicKey is a valid PublicKey instance
    if (!(wallet.publicKey instanceof PublicKey)) {
      console.warn(
        "[useAnchorProvider] wallet.publicKey is not a PublicKey instance",
        {
          type: typeof wallet.publicKey,
          value: wallet.publicKey,
        }
      );
      return null;
    }

    // Create wallet object that matches Anchor's expected structure
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };

    // Validate all wallet methods exist
    if (!anchorWallet.signTransaction || !anchorWallet.signAllTransactions) {
      console.warn("[useAnchorProvider] Wallet missing required methods", {
        hasSignTransaction: !!anchorWallet.signTransaction,
        hasSignAllTransactions: !!anchorWallet.signAllTransactions,
      });
      return null;
    }

    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    // Validate provider was created correctly
    if (!provider.wallet?.publicKey) {
      console.warn(
        "[useAnchorProvider] Provider created but wallet.publicKey is missing"
      );
      return null;
    }

    // Additional validation - ensure provider.wallet.publicKey is a PublicKey
    if (!(provider.wallet.publicKey instanceof PublicKey)) {
      console.warn(
        "[useAnchorProvider] Provider wallet.publicKey is not a PublicKey instance"
      );
      return null;
    }

    return provider;
  }, [
    connection,
    wallet.publicKey,
    wallet.signTransaction,
    wallet.signAllTransactions,
  ]);
}

/**
 * Initialize Collateral Vault program
 */
export function useCollateralVaultProgram(): Program<CollateralVaultIdl> | null {
  const provider = useAnchorProvider();
  const { connection } = useConnection();

  return useMemo(() => {
    console.log("[useCollateralVaultProgram] Starting initialization...");

    // Step 1: Check provider
    if (!provider) {
      console.warn("[useCollateralVaultProgram] Provider is null");
      return null;
    }
    // Validate provider has all required fields
    if (!provider.wallet || !provider.wallet.publicKey) {
      console.warn(
        "[useCollateralVaultProgram] Provider wallet or publicKey is missing"
      );
      return null;
    }

    console.log("[useCollateralVaultProgram] Provider:", {
      connection: provider.connection?.rpcEndpoint,
      wallet: provider.wallet?.publicKey?.toBase58(),
      hasPublicKey: !!provider.wallet?.publicKey,
      publicKeyType: typeof provider.wallet?.publicKey,
    });

    // Step 2: Check connection
    if (!connection?.rpcEndpoint) {
      console.warn(
        "[useCollateralVaultProgram] Connection or rpcEndpoint is null"
      );
      return null;
    }
    console.log(
      "[useCollateralVaultProgram] Connection endpoint:",
      connection.rpcEndpoint
    );

    try {
      // Step 3: Get program IDs
      const programIds = getProgramId(connection.rpcEndpoint);
      if (!programIds) {
        console.warn("[useCollateralVaultProgram] getProgramId returned null");
        return null;
      }
      console.log("[useCollateralVaultProgram] Program IDs retrieved:", {
        collateralVault: programIds.collateralVault?.toBase58(),
      });

      if (!programIds.collateralVault) {
        console.warn(
          "[useCollateralVaultProgram] collateralVault program ID is missing"
        );
        return null;
      }

      // Step 4: Validate PublicKey instance
      if (!(programIds.collateralVault instanceof PublicKey)) {
        console.error(
          "[useCollateralVaultProgram] Invalid collateralVault program ID - not a PublicKey instance",
          {
            type: typeof programIds.collateralVault,
            value: programIds.collateralVault,
          }
        );
        return null;
      }

      // Step 5: Validate PublicKey can be converted to base58
      let programIdString: string;
      try {
        programIdString = programIds.collateralVault.toBase58();
        console.log(
          "[useCollateralVaultProgram] Program ID validated:",
          programIdString
        );
      } catch (e) {
        console.error(
          "[useCollateralVaultProgram] Invalid collateralVault PublicKey:",
          e
        );
        return null;
      }

      // Step 6: Use bundled IDL (can't use async fetchIdl in useMemo)
      // TODO: Consider using useEffect + useState to fetch IDL asynchronously if needed
      const idl = collateralVaultIdl as Idl;
      console.log("[useCollateralVaultProgram] Using bundled IDL");

      console.log("[useCollateralVaultProgram] IDL loaded:", {
        name: idl.metadata?.name,
        version: idl.metadata?.version,
        instructionsCount: idl.instructions?.length || 0,
        accountsCount: idl.accounts?.length || 0,
        address: idl.address,
        hasMetadata: !!idl.metadata,
      });

      // Validate IDL structure
      if (
        !idl.metadata?.name ||
        !idl.instructions ||
        !Array.isArray(idl.instructions)
      ) {
        console.error("[useCollateralVaultProgram] Invalid IDL structure:", {
          hasName: !!idl.metadata?.name,
          hasVersion: !!idl.metadata?.version,
          hasInstructions: !!idl.instructions,
          instructionsIsArray: Array.isArray(idl.instructions),
        });
        return null;
      }

      // Step 7: Use IDL directly without metadata
      // Since we're passing programId to the Program constructor, Anchor doesn't need metadata.address
      // This avoids the isPublicKeyData validation error
      const idlToUse: Idl = idl;

      // Step 8: Validate provider wallet before creating Program
      if (!provider.wallet?.publicKey) {
        console.error(
          "[useCollateralVaultProgram] Provider wallet publicKey is missing"
        );
        return null;
      }

      // Step 9: Create Program instance
      console.log("[useCollateralVaultProgram] Creating Program instance...");
      console.log("[useCollateralVaultProgram] Program ID:", programIdString);
      console.log(
        "[useCollateralVaultProgram] Provider wallet publicKey:",
        provider.wallet.publicKey.toBase58()
      );
      console.log("[useCollateralVaultProgram] IDL:", {
        name: idlToUse.metadata?.name,
        version: idlToUse.metadata?.version,
        address: idlToUse.address,
        hasMetadata: !!idlToUse.metadata,
        instructionsCount: idlToUse.instructions?.length,
        accountsCount: idlToUse.accounts?.length,
        eventsCount: idlToUse.events?.length,
        errorsCount: idlToUse.errors?.length,
      });
      try {
        // Ensure programId is a valid PublicKey instance
        const programId = programIds.collateralVault;
        if (!(programId instanceof PublicKey)) {
          throw new Error("Program ID is not a PublicKey instance");
        }

        // Log all inputs to Program constructor for debugging
        console.log("[useCollateralVaultProgram] Program constructor inputs:", {
          idlName: idlToUse.metadata?.name,
          idlVersion: idlToUse.metadata?.version,
          idlAddress: idlToUse.address,
          idlHasMetadata: !!idlToUse.metadata,
          programIdType: programId.constructor.name,
          programIdValue: programId.toBase58(),
          providerType: provider.constructor.name,
          providerWalletType: provider.wallet?.constructor?.name,
          providerPublicKeyType: provider.wallet?.publicKey?.constructor?.name,
          providerPublicKeyValue: provider.wallet?.publicKey?.toBase58(),
          providerPublicKeyInstance:
            provider.wallet?.publicKey instanceof PublicKey,
        });

        // Validate provider.wallet.publicKey one more time before Program construction
        if (
          !provider.wallet?.publicKey ||
          !(provider.wallet.publicKey instanceof PublicKey)
        ) {
          throw new Error("Provider wallet publicKey is invalid or missing");
        }

        // Try to create Program - wrap in additional try-catch for more context
        let program: Program<CollateralVaultIdl>;
        try {
          // Ensure all required fields are present
          if (
            !idlToUse.metadata?.version ||
            !idlToUse.metadata?.name ||
            !idlToUse.instructions
          ) {
            throw new Error("IDL missing required fields");
          }

          // Create Program with IDL
          // Anchor 0.32.x Program constructor: new Program(idl, provider)
          // The new IDL format has `address` at the top level, so Anchor can extract it automatically
          program = new Program<CollateralVaultIdl>(idlToUse as any, provider);
        } catch (innerError: any) {
          // Log full error details for debugging
          console.error(
            "[useCollateralVaultProgram] Inner Program constructor error:",
            {
              error: innerError,
              message: innerError?.message,
              stack: innerError?.stack,
              name: innerError?.name,
              idlPreview: JSON.stringify(
                {
                  name: idlToUse.metadata?.name,
                  version: idlToUse.metadata?.version,
                  address: idlToUse.address,
                  instructions: idlToUse.instructions?.slice(0, 1),
                  accounts: idlToUse.accounts?.slice(0, 1),
                },
                null,
                2
              ),
              programIdString: programId.toBase58(),
              providerWalletPublicKey: provider.wallet?.publicKey?.toBase58(),
            }
          );
          // Also log error message as string for easier reading
          console.error(
            "[useCollateralVaultProgram] Error message:",
            innerError?.message || String(innerError)
          );
          console.error(
            "[useCollateralVaultProgram] Error name:",
            innerError?.name || "Unknown"
          );
          if (innerError?.stack) {
            console.error(
              "[useCollateralVaultProgram] Error stack:",
              innerError.stack
            );
          }
          throw innerError;
        }

        console.log(
          "[useCollateralVaultProgram] Program created successfully:",
          {
            programId: program.programId.toBase58(),
            hasMethods: !!program.methods,
          }
        );

        return program;
      } catch (programError: any) {
        console.error(
          "[useCollateralVaultProgram] Failed to create Program instance:",
          {
            error: programError,
            message: programError?.message,
            stack: programError?.stack,
            name: programError?.name,
            idlName: idl.metadata?.name,
            idlAddress: idl.address,
            programId: programIdString,
            providerType: typeof provider,
          }
        );
        // Also log error message as string
        console.error(
          "[useCollateralVaultProgram] Program error message:",
          programError?.message || String(programError)
        );
        throw programError; // Re-throw to be caught by outer catch
      }
    } catch (error: any) {
      console.error(
        "[useCollateralVaultProgram] Failed to create CollateralVaultProgram:",
        {
          error,
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          connectionEndpoint: connection?.rpcEndpoint,
          hasProvider: !!provider,
        }
      );
      // Also log error message as string
      console.error(
        "[useCollateralVaultProgram] Outer error message:",
        error?.message || String(error)
      );
      return null;
    }
  }, [provider, connection]);
}

/**
 * Initialize Position Management program
 */
export function usePositionMgmtProgram(): Program<PositionMgmtIdl> | null {
  const provider = useAnchorProvider();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!provider || !connection?.rpcEndpoint) return null;

    const programIds = getProgramId(connection.rpcEndpoint);
    if (!programIds || !programIds.positionMgmt) return null;

    // For now, create a minimal program structure
    // When IDL is available, use: new Program(IDL, programIds.positionMgmt, provider)
    const program = {
      programId: programIds.positionMgmt,
      provider,
      // Methods will be added in position-mgmt.ts
    } as unknown as Program<PositionMgmtIdl>;

    return program;
  }, [provider, connection]);
}

/**
 * Helper to get network from connection
 */
export function getNetwork(connection: Connection): string {
  return connection.rpcEndpoint;
}
