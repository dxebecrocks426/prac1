/**
 * Example 02: Account Operations
 * 
 * This example demonstrates how to:
 * - Generate new keypairs
 * - Get account balances
 * - Request airdrops
 * - Check account information
 * 
 * Run: cargo run --bin 02_account_operations
 */

use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    signature::{Keypair, Signer},
};
use bs58;

#[tokio::main]
async fn main() -> Result<()> {
    println!("🔑 Account Operations Example\n");

    // Connect to localnet
    let client = RpcClient::new_with_commitment(
        "http://127.0.0.1:8899".to_string(),
        CommitmentConfig::confirmed(),
    );

    // 1. Generate a new keypair
    println!("1️⃣  Generating new keypair...");
    let keypair = Keypair::new();
    let public_key = keypair.pubkey();
    
    println!("   ✅ New account created!");
    println!("   Public Key: {}", public_key);
    println!("   Private Key (base58): {}", bs58::encode(&keypair.to_bytes()).into_string());
    println!("   ⚠️  Keep your private key secure!");

    // 2. Check initial balance (should be 0)
    println!("\n2️⃣  Checking initial balance...");
    let balance_before = client.get_balance(&public_key)
        .context("Failed to get initial balance")?;
    println!("   Balance: {:.9} SOL ({} lamports)", balance_before as f64 / 1_000_000_000.0, balance_before);

    // 3. Request airdrop
    println!("\n3️⃣  Requesting airdrop of 2 SOL...");
    let airdrop_amount = 2_000_000_000; // 2 SOL in lamports
    let airdrop_signature = client.request_airdrop(&public_key, airdrop_amount)
        .context("Failed to request airdrop. Make sure localnet is running.")?;
    println!("   Transaction Signature: {}", airdrop_signature);

    // Wait for confirmation
    println!("   Waiting for confirmation...");
    client.confirm_transaction(&airdrop_signature)
        .context("Failed to confirm airdrop transaction")?;
    
    // Wait for balance to update (give it time to propagate)
    std::thread::sleep(std::time::Duration::from_millis(1500));

    // 4. Verify new balance with retries
    println!("\n4️⃣  Verifying new balance...");
    let mut final_balance = balance_before;
    for attempt in 0..20 {
        match client.get_balance(&public_key) {
            Ok(balance) => {
                final_balance = balance;
                // Check if balance increased by the airdrop amount
                if balance >= balance_before + airdrop_amount {
                    break;
                } else if attempt < 19 {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }
            Err(e) => {
                if attempt < 19 {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                } else {
                    anyhow::bail!("Failed to get balance after airdrop: {}", e);
                }
            }
        }
    }
    
    let balance_before_sol = balance_before as f64 / 1_000_000_000.0;
    let final_balance_sol = final_balance as f64 / 1_000_000_000.0;
    let airdropped_sol = airdrop_amount as f64 / 1_000_000_000.0;
    
    println!("   ✅ Airdrop successful!");
    println!("   Previous Balance: {:.9} SOL", balance_before_sol);
    println!("   Airdropped: {:.9} SOL", airdropped_sol);
    println!("   New Balance: {:.9} SOL ({} lamports)", final_balance_sol, final_balance);
    
    if final_balance < balance_before + airdrop_amount {
        println!("   ⚠️  Note: Balance increase ({:.9} SOL) is less than expected ({:.9} SOL)", 
                 (final_balance - balance_before) as f64 / 1_000_000_000.0,
                 airdropped_sol);
    }

    // 5. Get account info
    println!("\n5️⃣  Getting account info...");
    match client.get_account(&public_key) {
        Ok(account) => {
            println!("   ✅ Account found!");
            println!("   Owner: {}", account.owner);
            println!("   Lamports: {}", account.lamports);
            println!("   Executable: {}", account.executable);
            println!("   Rent Epoch: {}", account.rent_epoch);
            println!("   Data Length: {} bytes", account.data.len());
        }
        Err(_) => {
            println!("   ℹ️  Account not found on-chain yet.");
            println!("   This is normal for new accounts until they receive funds or are initialized.");
            println!("   Once an account has a balance > 0, it will appear in account info.");
        }
    }

    // 6. Generate multiple accounts (useful for testing)
    println!("\n6️⃣  Generating multiple test accounts...");
    let test_accounts: Vec<Keypair> = (0..3).map(|_| Keypair::new()).collect();
    for (index, account) in test_accounts.iter().enumerate() {
        println!("   Account {}: {}", index + 1, account.pubkey());
    }

    println!("\n💡 Tips:");
    println!("   • Airdrops are free on localnet/devnet");
    println!("   • Each account needs SOL for transaction fees");
    println!("   • Keep private keys secure - never share them!");
    println!("   • Use environment variables or secure storage in production");

    Ok(())
}

