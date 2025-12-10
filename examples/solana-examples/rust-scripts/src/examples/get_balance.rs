use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
};
use std::str::FromStr;

/// Example: Get account balance
/// 
/// This demonstrates how to query the balance of a Solana account.
/// Balance is returned in lamports (1 SOL = 1,000,000,000 lamports).
pub async fn run(address: String) -> Result<()> {
    println!("💰 Getting balance for account: {}", address);
    
    // Parse the public key from base58 string
    let pubkey = Pubkey::from_str(&address)
        .context("Invalid public key address. Must be base58 encoded.")?;
    
    // Connect to localnet
    let rpc_url = "http://127.0.0.1:8899";
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );
    
    // Get account balance
    match client.get_balance(&pubkey) {
        Ok(balance_lamports) => {
            let balance_sol = balance_lamports as f64 / 1_000_000_000.0;
            println!("✅ Account Balance:");
            println!("   Address: {}", pubkey);
            println!("   Balance: {} lamports", balance_lamports);
            println!("   Balance: {:.9} SOL", balance_sol);
            
            if balance_lamports == 0 {
                println!("\n💡 Tip: Use 'airdrop' command to get SOL for this account");
            }
        }
        Err(e) => {
            anyhow::bail!("❌ Failed to get balance: {}", e);
        }
    }
    
    Ok(())
}

