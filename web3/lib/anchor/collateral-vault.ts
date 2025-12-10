"use client";

import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  Connection,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createApproveInstruction,
  createRevokeInstruction,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useCollateralVaultProgram } from "./programs";
import { CollateralVault, getProgramId } from "./types";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

// PDA seeds
const VAULT_SEED = "vault";
const VAULT_AUTHORITY_SEED = "vault_authority";

/**
 * Derive vault PDA for a user
 */
export function deriveVaultPDA(
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBuffer()],
    programId
  );
}

/**
 * Derive vault authority PDA
 */
export function deriveVaultAuthorityPDA(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_AUTHORITY_SEED)],
    programId
  );
}

/**
 * Fetch vault account data
 */
export async function fetchVault(
  owner: PublicKey,
  connection: Connection,
  programId: PublicKey
): Promise<CollateralVault | null> {
  try {
    const [vaultPDA] = deriveVaultPDA(owner, programId);
    const accountInfo = await connection.getAccountInfo(vaultPDA);

    if (!accountInfo) {
      return null;
    }

    // Parse account data (simplified - actual parsing depends on IDL)
    // This is a placeholder until IDL is available
    const data = accountInfo.data;

    return {
      owner: new PublicKey(data.slice(8, 40)),
      tokenAccount: new PublicKey(data.slice(40, 72)),
      totalBalance: BigInt(data.readBigUInt64LE(72)),
      lockedBalance: BigInt(data.readBigUInt64LE(80)),
      availableBalance: BigInt(data.readBigUInt64LE(88)),
      totalDeposited: BigInt(data.readBigUInt64LE(96)),
      totalWithdrawn: BigInt(data.readBigUInt64LE(104)),
      createdAt: BigInt(data.readBigInt64LE(112)),
      bump: data[120],
    };
  } catch (error) {
    console.error("Error fetching vault:", error);
    return null;
  }
}

/**
 * Hook to fetch user's vault
 */
export function useVault() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useCollateralVaultProgram();

  return useMemo(() => {
    if (!publicKey || !program) return null;

    const programIds = getProgramId(connection.rpcEndpoint);
    if (!programIds) return null;

    return {
      fetch: () =>
        fetchVault(publicKey, connection, programIds.collateralVault),
      programId: programIds.collateralVault,
    };
  }, [publicKey, connection, program]);
}

/**
 * Initialize vault instruction
 *
 * This creates a new collateral vault PDA for the user.
 * The vault is a Program Derived Address (PDA) that holds the user's USDT collateral.
 *
 * Steps:
 * 1. Derive the vault PDA (seeds: ["vault", owner.key()])
 * 2. Create the associated token account for the vault (if it doesn't exist)
 * 3. Initialize the vault account on-chain
 *
 * Note: The collateral vault program must be deployed to your localnet.
 * Program ID for localnet: 6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP
 */
export async function initializeVault(
  owner: PublicKey,
  connection: Connection,
  programId: PublicKey,
  usdtMint: PublicKey,
  program?: any // Anchor Program instance (when IDL is available)
): Promise<Transaction> {
  const [vaultPDA, vaultBump] = deriveVaultPDA(owner, programId);
  const vaultTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    vaultPDA,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();

  // Check if vault token account exists, create if not
  const vaultTokenAccountInfo = await connection.getAccountInfo(
    vaultTokenAccount
  );
  if (!vaultTokenAccountInfo) {
    // Create associated token account instruction
    const createATAInstruction = await import("@solana/spl-token").then((spl) =>
      spl.createAssociatedTokenAccountInstruction(
        owner,
        vaultTokenAccount,
        vaultPDA,
        usdtMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    transaction.add(createATAInstruction);
  }

  // Build instruction using Anchor program
  if (!program || !program.methods || !program.methods.initializeVault) {
    throw new Error(
      "Collateral vault program not available. Please ensure the program is deployed to your localnet."
    );
  }

  try {
    const instruction = await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPDA,
        owner: owner,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(instruction);
  } catch (error: any) {
    console.error("Error building initialize_vault instruction:", error);

    // Check if program is deployed
    const programInfo = await connection.getAccountInfo(programId);
    if (!programInfo) {
      throw new Error(
        "Collateral vault program is not deployed to your localnet. " +
          "Please deploy the program first. Program ID: " +
          programId.toBase58()
      );
    }

    throw new Error(
      "Failed to build initialize_vault instruction: " +
        (error.message || String(error))
    );
  }

  return transaction;
}

/**
 * Deposit USDT into vault
 */
export async function depositToVault(
  owner: PublicKey,
  amount: bigint,
  connection: Connection,
  programId: PublicKey,
  usdtMint: PublicKey,
  program?: any // Anchor Program instance (when IDL is available)
): Promise<Transaction> {
  const [vaultPDA] = deriveVaultPDA(owner, programId);
  const userTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    owner,
    false,
    TOKEN_PROGRAM_ID
  );
  const vaultTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    vaultPDA,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();

  // Build instruction using Anchor program
  if (!program || !program.methods || !program.methods.deposit) {
    throw new Error(
      "Collateral vault program not available. Please ensure the program is deployed to your localnet."
    );
  }

  try {
    const instruction = await program.methods
      .deposit(new BN(amount.toString()))
      .accounts({
        vault: vaultPDA,
        owner: owner,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    transaction.add(instruction);
  } catch (error: any) {
    console.error("Error building deposit instruction:", error);

    // Check if program is deployed
    const programInfo = await connection.getAccountInfo(programId);
    if (!programInfo) {
      throw new Error(
        "Collateral vault program is not deployed to your localnet. " +
          "Please deploy the program first. Program ID: " +
          programId.toBase58()
      );
    }

    throw new Error(
      "Failed to build deposit instruction: " +
        (error.message || String(error))
    );
  }

  return transaction;
}

/**
 * Withdraw USDT from vault
 */
export async function withdrawFromVault(
  owner: PublicKey,
  amount: bigint,
  connection: Connection,
  programId: PublicKey,
  usdtMint: PublicKey,
  program?: any // Anchor Program instance (when IDL is available)
): Promise<Transaction> {
  const [vaultPDA] = deriveVaultPDA(owner, programId);
  const userTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    owner,
    false,
    TOKEN_PROGRAM_ID
  );
  const vaultTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    vaultPDA,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();

  // Build instruction using Anchor program
  if (!program || !program.methods || !program.methods.withdraw) {
    throw new Error(
      "Collateral vault program not available. Please ensure the program is deployed to your localnet."
    );
  }

  try {
    const instruction = await program.methods
      .withdraw(new BN(amount.toString()))
      .accounts({
        vault: vaultPDA,
        owner: owner,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    transaction.add(instruction);
  } catch (error: unknown) {
    console.error("Error building withdraw instruction:", error);

    // Check if program is deployed
    const programInfo = await connection.getAccountInfo(programId);
    if (!programInfo) {
      throw new Error(
        "Collateral vault program is not deployed to your localnet. " +
          "Please deploy the program first. Program ID: " +
          programId.toBase58()
      );
    }

    throw new Error(
      "Failed to build withdraw instruction: " +
        (error instanceof Error ? error.message : String(error))
    );
  }

  return transaction;
}

/**
 * Approve delegate for USDT spending
 */
export async function approveUSDTDelegate(
  owner: PublicKey,
  amount: bigint,
  connection: Connection,
  usdtMint: PublicKey,
  delegate: PublicKey
): Promise<Transaction> {
  const userTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    owner,
    false,
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();
  const approveIx = createApproveInstruction(
    userTokenAccount,
    delegate,
    owner,
    amount,
    [],
    TOKEN_PROGRAM_ID
  );

  transaction.add(approveIx);
  return transaction;
}

/**
 * Revoke delegate approval
 */
export async function revokeUSDTDelegate(
  owner: PublicKey,
  connection: Connection,
  usdtMint: PublicKey
): Promise<Transaction> {
  const userTokenAccount = await getAssociatedTokenAddress(
    usdtMint,
    owner,
    false,
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();
  const revokeIx = createRevokeInstruction(
    userTokenAccount,
    owner,
    [],
    TOKEN_PROGRAM_ID
  );

  transaction.add(revokeIx);
  return transaction;
}
