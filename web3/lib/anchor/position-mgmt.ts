"use client";

import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { usePositionMgmtProgram } from "./programs";
import { Position, Side, UserAccount, getProgramId } from "./types";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { parsePositionAccountManual } from "@/lib/utils/account-parser";

// PDA seeds
const POSITION_SEED = "position";
const USER_ACCOUNT_SEED = "user";

/**
 * Derive position PDA for a user and symbol
 */
export function derivePositionPDA(
  owner: PublicKey,
  symbol: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POSITION_SEED), owner.toBuffer(), Buffer.from(symbol)],
    programId
  );
}

/**
 * Derive user account PDA
 */
export function deriveUserAccountPDA(
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_ACCOUNT_SEED), owner.toBuffer()],
    programId
  );
}

/**
 * Fetch position account data
 */
export async function fetchPosition(
  owner: PublicKey,
  symbol: string,
  connection: Connection,
  programId: PublicKey
): Promise<Position | null> {
  try {
    const [positionPDA] = derivePositionPDA(owner, symbol, programId);
    const accountInfo = await connection.getAccountInfo(positionPDA);

    if (!accountInfo) {
      return null;
    }

    // Parse account data (simplified - actual parsing depends on IDL)
    const data = accountInfo.data;
    const symbolLength = data.readUInt8(8);
    const symbolStart = 9;
    const symbolEnd = symbolStart + symbolLength;

    return {
      owner: new PublicKey(data.slice(symbolEnd, symbolEnd + 32)),
      symbol: data.slice(symbolStart, symbolEnd).toString(),
      side: data[symbolEnd + 32] as Side,
      size: BigInt(data.readBigUInt64LE(symbolEnd + 33)),
      entryPrice: BigInt(data.readBigUInt64LE(symbolEnd + 41)),
      margin: BigInt(data.readBigUInt64LE(symbolEnd + 49)),
      leverage: data.readUInt16LE(symbolEnd + 57),
      unrealizedPnl: BigInt(data.readBigInt64LE(symbolEnd + 59)),
      realizedPnl: BigInt(data.readBigInt64LE(symbolEnd + 67)),
      fundingAccrued: BigInt(data.readBigInt64LE(symbolEnd + 75)),
      liquidationPrice: BigInt(data.readBigUInt64LE(symbolEnd + 83)),
      lastUpdate: BigInt(data.readBigInt64LE(symbolEnd + 91)),
      bump: data[symbolEnd + 99],
    };
  } catch (error) {
    console.error("Error fetching position:", error);
    return null;
  }
}

/**
 * Fetch all positions for a user
 */
export async function fetchAllPositions(
  owner: PublicKey,
  connection: Connection,
  programId: PublicKey
): Promise<Position[]> {
  try {
    // Get all program accounts for position management program
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 200, // Approximate position account size (will vary based on symbol length)
        },
      ],
    });

    const positions: Position[] = [];
    
    // Parse each account and filter by owner
    for (const { account, pubkey } of accounts) {
      try {
        // Parse account data manually (using existing parser)
        const position = parsePositionAccountManual(account.data);
        
        // Filter by owner
        if (position && position.owner.equals(owner)) {
          positions.push(position);
        }
      } catch (error) {
        // Skip accounts that don't match position structure
        console.debug(`Failed to parse account ${pubkey.toBase58()}:`, error);
        continue;
      }
    }

    return positions;
  } catch (error) {
    console.error("Error fetching all positions:", error);
    return [];
  }
}

/**
 * Hook to fetch user's positions
 */
export function usePositions() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = usePositionMgmtProgram();

  return useMemo(() => {
    if (!publicKey || !program) return null;

    const programIds = getProgramId(connection.rpcEndpoint);
    if (!programIds) return null;

    return {
      fetch: (symbol: string) =>
        fetchPosition(publicKey, symbol, connection, programIds.positionMgmt),
      fetchAll: () =>
        fetchAllPositions(publicKey, connection, programIds.positionMgmt),
      programId: programIds.positionMgmt,
    };
  }, [publicKey, connection, program]);
}

/**
 * Open position instruction
 */
export async function openPosition(
  owner: PublicKey,
  symbol: string,
  side: Side,
  size: bigint,
  leverage: number,
  entryPrice: bigint,
  connection: Connection,
  programId: PublicKey
): Promise<Transaction> {
  const [positionPDA] = derivePositionPDA(owner, symbol, programId);
  const [userAccountPDA] = deriveUserAccountPDA(owner, programId);

  const transaction = new Transaction();

  // Placeholder - will be implemented with IDL
  // const instruction = await program.methods
  //   .openPosition(
  //     symbol,
  //     { long: side === Side.Long },
  //     new BN(size.toString()),
  //     leverage,
  //     new BN(entryPrice.toString())
  //   )
  //   .accounts({
  //     position: positionPDA,
  //     userAccount: userAccountPDA,
  //     owner,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .instruction();

  return transaction;
}

/**
 * Close position instruction
 */
export async function closePosition(
  owner: PublicKey,
  symbol: string,
  connection: Connection,
  programId: PublicKey
): Promise<Transaction> {
  const [positionPDA] = derivePositionPDA(owner, symbol, programId);
  const [userAccountPDA] = deriveUserAccountPDA(owner, programId);

  const transaction = new Transaction();

  // Placeholder - will be implemented with IDL
  return transaction;
}

