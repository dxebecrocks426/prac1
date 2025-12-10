use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;

/// Example: Connect to Solana localnet
/// 
/// This demonstrates how to establish a connection to a local Solana validator.
/// Localnet is perfect for development and testing as it doesn't require real SOL.
pub async fn run() -> Result<()> {
    println!("🔌 Connecting to Solana localnet...");
    
    // Localnet RPC endpoint (default when running solana-test-validator)
    let rpc_url = "http://127.0.0.1:8899";
    
    // Create RPC client with commitment level
    // Commitment levels: processed, confirmed, finalized
    // For localnet, "confirmed" is usually sufficient
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );
    
    // Test the connection by getting the version
    match client.get_version() {
        Ok(version) => {
            println!("✅ Successfully connected to localnet!");
            println!("   RPC URL: {}", rpc_url);
            println!("   Solana Version: {}", version.solana_core);
            if let Some(feature_set) = version.feature_set {
                println!("   Feature Set: {}", feature_set);
            }
        }
        Err(e) => {
            anyhow::bail!(
                "❌ Failed to connect to localnet: {}\n\
                 Make sure solana-test-validator is running:\n\
                 $ solana-test-validator",
                e
            );
        }
    }
    
    // Get the current slot (block number)
    match client.get_slot() {
        Ok(slot) => println!("   Current Slot: {}", slot),
        Err(e) => println!("   Warning: Could not get slot: {}", e),
    }
    
    Ok(())
}

