/**
 * Example 01: Basic Setup and Connection
 * 
 * This example demonstrates how to:
 * - Connect to Solana localnet
 * - Verify the connection
 * - Get basic network information
 * 
 * Run: cargo run --bin 01_basic_setup
 */

use anyhow::Result;
use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;

#[tokio::main]
async fn main() -> Result<()> {
    println!("🔌 Connecting to Solana localnet...\n");

    // Localnet RPC endpoint (default when running solana-test-validator)
    let rpc_url = "http://127.0.0.1:8899";
    
    // Create connection
    let client = RpcClient::new_with_commitment(
        rpc_url.to_string(),
        CommitmentConfig::confirmed(),
    );

    // Test connection by getting version
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
            eprintln!("❌ Failed to connect to localnet: {}", e);
            eprintln!("\n💡 Make sure solana-test-validator is running:");
            eprintln!("   $ solana-test-validator");
            std::process::exit(1);
        }
    }

    // Get current slot (block number)
    match client.get_slot() {
        Ok(slot) => println!("   Current Slot: {}", slot),
        Err(e) => println!("   Warning: Could not get slot: {}", e),
    }

    // Get block height
    match client.get_block_height() {
        Ok(block_height) => println!("   Block Height: {}", block_height),
        Err(e) => println!("   Warning: Could not get block height: {}", e),
    }

    // Get recent blockhash (needed for transactions)
    match client.get_latest_blockhash() {
        Ok(blockhash) => {
            println!("   Recent Blockhash: {}", blockhash);
        }
        Err(e) => println!("   Warning: Could not get blockhash: {}", e),
    }

    println!("\n💡 Next Steps:");
    println!("   • Run example 02 to create and manage accounts");
    println!("   • Run example 03 to send transactions");
    println!("   • Run example 04 to learn about PDAs");

    Ok(())
}

