use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use std::str::FromStr;

/// Example: Send SOL transaction
/// 
/// This demonstrates how to send SOL from one account to another.
/// 
/// NOTE: This example requires the 'from' account's private key.
/// For demonstration, you'll need to provide the keypair.
/// In production, use a wallet or secure key management system.
pub async fn run(from: String, to: String, amount: f64, private_key: Option<String>) -> Result<()> {
    println!("📤 Sending SOL transaction...");
    
    // Parse addresses
    let from_pubkey = Pubkey::from_str(&from)
        .context("Invalid 'from' address")?;
    let to_pubkey = Pubkey::from_str(&to)
        .context("Invalid 'to' address")?;
    
    // Convert SOL to lamports
    let lamports = (amount * 1_000_000_000.0) as u64;
    
    println!("   From: {}", from_pubkey);
    println!("   To: {}", to_pubkey);
    println!("   Amount: {} SOL ({} lamports)", amount, lamports);
    
    // Connect to localnet
    let rpc_url = "http://127.0.0.1:8899";
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );
    
    // Check sender balance
    let sender_balance = client.get_balance(&from_pubkey)
        .context("Failed to get sender balance")?;
    
    if sender_balance < lamports {
        anyhow::bail!(
            "❌ Insufficient balance!\n\
             Sender has: {} lamports\n\
             Required: {} lamports\n\
             💡 Request an airdrop first: cargo run -- airdrop {} {}",
            sender_balance,
            lamports,
            from_pubkey,
            amount
        );
    }
    
    // Load keypair if provided
    let keypair = if let Some(pk_str) = private_key {
        println!("\n🔑 Loading keypair from private key...");
        let pk_bytes = bs58::decode(&pk_str)
            .into_vec()
            .context("Invalid private key format (must be base58)")?;
        
        if pk_bytes.len() != 64 {
            anyhow::bail!("Invalid private key length. Expected 64 bytes, got {}", pk_bytes.len());
        }
        
        Keypair::from_bytes(&pk_bytes)
            .context("Failed to create keypair from private key")?
    } else {
        anyhow::bail!(
            "❌ Private key required!\n\
             Usage: cargo run -- send-transaction <from> <to> <amount> --private-key <base58_private_key>\n\
             \n\
             Example:\n\
             cargo run -- send-transaction {} {} {} --private-key <your_private_key>",
            from_pubkey, to_pubkey, amount
        );
    };
    
    // Verify the keypair matches the from address
    if keypair.pubkey() != from_pubkey {
        anyhow::bail!(
            "❌ Private key does not match the 'from' address!\n\
             Expected: {}\n\
             Got: {}",
            from_pubkey,
            keypair.pubkey()
        );
    }
    
    println!("   ✅ Keypair verified (matches sender address)");
    
    // Get recent blockhash
    println!("\n📡 Preparing transaction...");
    let recent_blockhash = client.get_latest_blockhash()
        .context("Failed to get recent blockhash")?;
    
    // Create transfer instruction
    let instruction = system_instruction::transfer(&from_pubkey, &to_pubkey, lamports);
    
    // Build transaction
    let mut transaction = Transaction::new_with_payer(
        &[instruction],
        Some(&from_pubkey),
    );
    
    // Set recent blockhash
    transaction.message.recent_blockhash = recent_blockhash;
    
    // Sign transaction (use blockhash from transaction message, like ephemeral-vault does)
    transaction.sign(&[&keypair], transaction.message.recent_blockhash);
    println!("   ✅ Transaction signed");
    
    // Send transaction
    println!("📤 Sending transaction...");
    let signature = client.send_transaction(&transaction)?;
    println!("   Transaction Signature: {}", signature);
    println!("   Waiting for confirmation...");
    
    client.confirm_transaction(&signature)
        .context("Failed to confirm transaction")?;
    
    println!("✅ Transaction sent and confirmed!");
    
    // Wait a bit for balances to update
    std::thread::sleep(std::time::Duration::from_millis(1000));
    
    // Verify balances
    let sender_new_balance = client.get_balance(&from_pubkey)?;
    let receiver_balance = client.get_balance(&to_pubkey)?;
    
    println!("\n💰 Updated Balances:");
    println!("   Sender:   {:.9} SOL", sender_new_balance as f64 / 1_000_000_000.0);
    println!("   Receiver: {:.9} SOL", receiver_balance as f64 / 1_000_000_000.0);
    
    Ok(())
}

