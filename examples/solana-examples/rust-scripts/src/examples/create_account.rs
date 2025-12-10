use anyhow::Result;
use solana_sdk::signature::{Keypair, Signer};

/// Example: Create a new keypair account
/// 
/// This demonstrates how to generate a new Solana keypair.
/// Keypairs are used to sign transactions and identify accounts.
/// 
/// IMPORTANT: In production, never share your private key!
/// For localnet testing, it's safe to display keys.
pub async fn run() -> Result<()> {
    println!("🔑 Generating new Solana keypair...");
    
    // Generate a new random keypair
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey();
    
    println!("✅ New account created!");
    println!("\n📋 Account Details:");
    println!("   Public Key: {}", pubkey);
    println!("   Public Key (base58): {}", pubkey.to_string());
    
    // Display private key (base58 encoded)
    // In production, NEVER expose private keys!
    let private_key_bytes = keypair.to_bytes();
    let private_key_base58 = bs58::encode(&private_key_bytes).into_string();
    println!("   Private Key (base58): {}", private_key_base58);
    
    println!("\n💡 Next Steps:");
    println!("   1. Request an airdrop to fund this account:");
    println!("      cargo run -- airdrop {} 1", pubkey);
    println!("   2. Check the balance:");
    println!("      cargo run -- balance {}", pubkey);
    
    println!("\n⚠️  Security Note:");
    println!("   Keep your private key secure! Anyone with access to it");
    println!("   can control your account and transfer funds.");
    
    Ok(())
}

