import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";

/**
 * Airdrop SOL to a wallet address on localnet
 * @param connection - Solana connection instance
 * @param publicKey - Public key of the wallet to receive SOL
 * @param amount - Amount of SOL to airdrop (in SOL, not lamports)
 * @returns Transaction signature
 */
export async function airdropSol(
  connection: Connection,
  publicKey: PublicKey,
  amount: number
): Promise<string> {
  // Log airdrop start
  useDevConsoleStore.getState().addEvent({
    type: "airdrop",
    message: `Requested ${amount} SOL airdrop`,
    status: "pending",
    details: {
      recipient: publicKey.toString(),
    },
  });

  try {
    // Convert SOL to lamports
    const lamports = amount * LAMPORTS_PER_SOL;

    // Request airdrop
    const signature = await connection.requestAirdrop(publicKey, lamports);

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    // Log success
    useDevConsoleStore.getState().addEvent({
      type: "airdrop",
      message: `Successfully airdropped ${amount} SOL`,
      transaction: signature,
      status: "success",
      details: {
        amount: `${amount} SOL`,
        balance: `${amount} SOL`,
      },
    });

    return signature;
  } catch (error: any) {
    // Log error
    useDevConsoleStore.getState().addEvent({
      type: "error",
      message: `Failed to airdrop ${amount} SOL: ${error.message}`,
      status: "failed",
    });
    throw error;
  }
}

/**
 * Create a new SPL token mint
 * @param connection - Solana connection instance
 * @param payer - Keypair of the account paying for the transaction
 * @param mintAuthority - Public key that will be the mint authority
 * @param decimals - Number of decimals for the token
 * @returns Public key of the created mint
 */
export async function createTokenMint(
  connection: Connection,
  payer: Keypair,
  mintAuthority: PublicKey,
  decimals: number
): Promise<PublicKey> {
  useDevConsoleStore.getState().addEvent({
    type: "mint",
    message: `Creating token mint with ${decimals} decimals`,
    status: "pending",
    details: {
      mintAuthority: mintAuthority.toString(),
    },
  });

  try {
    const mint = await createMint(
      connection,
      payer,
      mintAuthority, // mint authority
      null, // freeze authority (null = no freeze authority)
      decimals,
      undefined, // keypair (undefined = generate new)
      undefined, // confirmOptions
      TOKEN_PROGRAM_ID
    );

    useDevConsoleStore.getState().addEvent({
      type: "mint",
      message: `Token mint created successfully`,
      status: "success",
      details: {
        mintAddress: mint.toString(),
        decimals: decimals.toString(),
      },
    });

    return mint;
  } catch (error: any) {
    useDevConsoleStore.getState().addEvent({
      type: "error",
      message: `Failed to create token mint: ${error.message}`,
      status: "failed",
    });
    throw error;
  }
}

/**
 * Get or create an Associated Token Account (ATA)
 * @param connection - Solana connection instance
 * @param payer - Keypair of the account paying for the transaction
 * @param mint - Public key of the token mint
 * @param owner - Public key of the token account owner
 * @returns Public key of the Associated Token Account
 */
export async function getOrCreateATA(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false, // allowOwnerOffCurve
    TOKEN_PROGRAM_ID
  );

  // Check if ATA already exists
  try {
    await getAccount(connection, ata, undefined, TOKEN_PROGRAM_ID);
    return ata;
  } catch (error: any) {
    // Account doesn't exist, create it
    if (error.name === "TokenAccountNotFoundError") {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey, // payer
          ata, // ata
          owner, // owner
          mint, // mint
          TOKEN_PROGRAM_ID
        )
      );

      await sendAndConfirmTransaction(connection, transaction, [payer], {
        commitment: "confirmed",
      });

      return ata;
    }
    throw error;
  }
}

/**
 * Mint tokens to a token account
 * @param connection - Solana connection instance
 * @param payer - Keypair of the account paying for the transaction
 * @param mint - Public key of the token mint
 * @param destination - Public key of the destination token account
 * @param authority - Keypair of the mint authority
 * @param amount - Amount of tokens to mint (in the smallest unit, e.g., if decimals=6, amount=1000000 = 1 token)
 * @param decimals - Number of decimals for the token
 * @returns Transaction signature
 */
export async function mintTokens(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  destination: PublicKey,
  authority: Keypair,
  amount: number,
  decimals: number
): Promise<string> {
  const displayAmount = amount / (10 ** decimals);
  
  useDevConsoleStore.getState().addEvent({
    type: "mint",
    message: `Minting ${displayAmount} tokens`,
    status: "pending",
    details: {
      mint: mint.toString(),
      destination: destination.toString(),
    },
  });

  try {
    // Convert amount to the smallest unit (multiply by 10^decimals)
    const amountInSmallestUnit = BigInt(amount) * BigInt(10 ** decimals);

    const signature = await mintTo(
      connection,
      payer,
      mint,
      destination,
      authority,
      amountInSmallestUnit,
      undefined, // multiSigners
      undefined, // confirmOptions
      TOKEN_PROGRAM_ID
    );

    useDevConsoleStore.getState().addEvent({
      type: "mint",
      message: `Successfully minted ${displayAmount} tokens`,
      transaction: signature,
      status: "success",
      details: {
        amount: `${displayAmount}`,
      },
    });

    return signature;
  } catch (error: any) {
    useDevConsoleStore.getState().addEvent({
      type: "error",
      message: `Failed to mint tokens: ${error.message}`,
      status: "failed",
    });
    throw error;
  }
}

/**
 * Get the token balance of a token account
 * @param connection - Solana connection instance
 * @param tokenAccount - Public key of the token account
 * @returns Token balance as a BigInt
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<bigint> {
  const accountInfo = await getAccount(
    connection,
    tokenAccount,
    undefined, // commitment
    TOKEN_PROGRAM_ID
  );

  return accountInfo.amount;
}

