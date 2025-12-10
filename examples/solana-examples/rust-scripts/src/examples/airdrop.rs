use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
};
use std::str::FromStr;

/// Example: Request airdrop
/// 
/// This demonstrates how to request an airdrop of SOL on localnet.
/// Airdrops are free on localnet/devnet but not available on mainnet.
pub async fn run(address: String, amount: f64) -> Result<()> {
    println!("💸 Requesting airdrop...");
    
    // Parse the public key
    let pubkey = Pubkey::from_str(&address)
        .context("Invalid public key address")?;
    
    // Convert SOL to lamports
    let lamports = (amount * 1_000_000_000.0) as u64;
    
    println!("   To: {}", pubkey);
    println!("   Amount: {} SOL ({} lamports)", amount, lamports);
    
    // Connect to localnet
    let rpc_url = "http://127.0.0.1:8899";
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );
    
    // Get the balance BEFORE airdrop for comparison
    let balance_before = client.get_balance(&pubkey)
        .context("Failed to get initial balance")?;
    
    // Request airdrop
    println!("\n📡 Requesting airdrop from localnet...");
    let signature = client
        .request_airdrop(&pubkey, lamports)
        .context("Failed to request airdrop. Make sure localnet is running.")?;
    
    println!("   Transaction Signature: {}", signature);
    println!("   Waiting for confirmation...");
    
    // Wait for transaction to be confirmed
    client.confirm_transaction(&signature)
        .context("Failed to confirm airdrop transaction")?;
    
    // Wait for balance to update (give it time to propagate)
    std::thread::sleep(std::time::Duration::from_millis(1500));
            
    // Get the final balance with retries to ensure it's updated
    let mut final_balance = balance_before;
    for attempt in 0..20 {
            match client.get_balance(&pubkey) {
                Ok(balance) => {
                final_balance = balance;
                // Check if balance increased by the airdrop amount
                if balance >= balance_before + lamports {
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
    
    // Display results
    let balance_before_sol = balance_before as f64 / 1_000_000_000.0;
    let final_balance_sol = final_balance as f64 / 1_000_000_000.0;
    let airdropped_sol = lamports as f64 / 1_000_000_000.0;
    
    println!("✅ Airdrop successful!");
    println!("   Previous Balance: {:.9} SOL", balance_before_sol);
    println!("   Airdropped: {:.9} SOL", airdropped_sol);
    println!("   New Balance: {:.9} SOL", final_balance_sol);
    
    // Verify the increase matches
    if final_balance < balance_before + lamports {
        println!("   ⚠️  Note: Balance increase ({:.9} SOL) is less than expected ({:.9} SOL)", 
                 (final_balance - balance_before) as f64 / 1_000_000_000.0,
                 airdropped_sol);
    }
    
    Ok(())
}
