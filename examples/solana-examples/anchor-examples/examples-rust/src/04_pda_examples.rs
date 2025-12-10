/**
 * Example 04: Program Derived Address (PDA) Examples
 * 
 * This example demonstrates how to:
 * - Derive PDAs
 * - Understand PDA seeds
 * - Use PDAs for program-owned accounts
 * 
 * Run: cargo run --bin 04_pda_examples
 */

use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};

#[tokio::main]
async fn main() -> Result<()> {
    println!("🔐 Program Derived Address (PDA) Examples\n");

    // Connect to localnet
    let _client = RpcClient::new_with_commitment(
        "http://127.0.0.1:8899".to_string(),
        CommitmentConfig::confirmed(),
    );

    // Example program ID (in real scenarios, this would be your deployed program)
    // Using System Program as an example
    let program_id = Pubkey::from_str("11111111111111111111111111111111")?;
    
    println!("Program ID: {}", program_id);
    println!("\n📚 What is a PDA?");
    println!("   • An address that doesn't have a private key");
    println!("   • Deterministically derived from seeds + program ID");
    println!("   • Can only be controlled by the program");
    println!("   • Used for program-owned accounts");

    // Example 1: Simple PDA with one seed
    println!("\n1️⃣  Deriving PDA with single seed...");
    let seed1 = b"vault";
    let (pda1, bump1) = Pubkey::find_program_address(&[seed1], &program_id);
    
    println!("   Seed: {:?}", seed1);
    println!("   PDA: {}", pda1);
    println!("   Bump: {}", bump1);

    // Example 2: PDA with multiple seeds (like collateral vault)
    println!("\n2️⃣  Deriving PDA with multiple seeds (Collateral Vault style)...");
    let user_keypair = Keypair::new();
    let user_pubkey = user_keypair.pubkey();
    let seed2 = b"vault";
    let user_pubkey_bytes = user_pubkey.as_ref();
    
    let (pda2, bump2) = Pubkey::find_program_address(
        &[seed2, user_pubkey_bytes],
        &program_id,
    );
    
    println!("   Seeds: [\"vault\", user_pubkey]");
    println!("   User Pubkey: {}", user_pubkey);
    println!("   PDA: {}", pda2);
    println!("   Bump: {}", bump2);
    println!("\n   💡 This is how collateral vault creates unique vaults per user!");

    // Example 3: PDA with string seed
    println!("\n3️⃣  Deriving PDA with string seed...");
    let seed3 = b"my-seed";
    let (pda3, bump3) = Pubkey::find_program_address(&[seed3], &program_id);
    
    println!("   Seed: \"my-seed\"");
    println!("   PDA: {}", pda3);
    println!("   Bump: {}", bump3);

    // Example 4: Verify PDA derivation
    println!("\n4️⃣  Verifying PDA derivation...");
    let (pda4, bump4) = Pubkey::find_program_address(
        &[seed2, user_pubkey_bytes],
        &program_id,
    );
    
    if pda4 == pda2 {
        println!("   ✅ PDA derivation is deterministic!");
        println!("   Same seeds + program ID = same PDA");
    }

    // Example 5: Using Anchor's PDA helper (conceptual)
    println!("\n5️⃣  Anchor PDA Helper (conceptual)...");
    println!("   In Anchor programs, you can use:");
    println!("   seeds = [b\"vault\", user.key().as_ref()]");
    println!("   bump = vault.bump");
    println!("   This is used in account validation");

    println!("\n💡 Common PDA Use Cases:");
    println!("   • Vault accounts (collateral vault)");
    println!("   • Associated Token Accounts (ATAs)");
    println!("   • Program state accounts");
    println!("   • Cross-program invocations");

    println!("\n🔗 Collateral Vault PDA Pattern:");
    println!("   Seeds: [b\"vault\", user_pubkey.as_ref()]");
    println!("   Program: collateral_vault_program_id");
    println!("   Result: One deterministic vault per user");
    println!("   Benefit: No need to store vault addresses, can derive them!");

    println!("\n📝 Key Points:");
    println!("   • PDAs are deterministic - same seeds = same PDA");
    println!("   • Bump seed ensures PDA is off the ed25519 curve");
    println!("   • Only the program can sign for PDAs");
    println!("   • PDAs enable program-controlled accounts");

    Ok(())
}

use std::str::FromStr;

