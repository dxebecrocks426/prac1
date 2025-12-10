/**
 * Example 03: Transactions
 * 
 * This example demonstrates how to:
 * - Build transactions
 * - Sign transactions
 * - Send transactions
 * - Confirm transactions
 * 
 * Run: cargo run --bin 03_transactions
 */

use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};

#[tokio::main]
async fn main() -> Result<()> {
    println!("📤 Transaction Example\n");

    // Connect to localnet
    let client = RpcClient::new_with_commitment(
        "http://127.0.0.1:8899".to_string(),
        CommitmentConfig::confirmed(),
    );

    // Create two keypairs: sender and receiver
    println!("1️⃣  Creating accounts...");
    let sender = Keypair::new();
    let receiver = Keypair::new();
    
    println!("   Sender: {}", sender.pubkey());
    println!("   Receiver: {}", receiver.pubkey());

    // Fund the sender account
    println!("\n2️⃣  Funding sender account...");
    let airdrop_amount = 2_000_000_000; // 2 SOL in lamports
    
    // Get balance before airdrop
    let balance_before = client.get_balance(&sender.pubkey())
        .context("Failed to get initial balance")?;
    
    // Request airdrop
    let airdrop_signature = client.request_airdrop(&sender.pubkey(), airdrop_amount)
        .context("Failed to request airdrop. Make sure localnet is running.")?;
    println!("   Transaction Signature: {}", airdrop_signature);
    
    // Wait for confirmation
    println!("   Waiting for confirmation...");
    client.confirm_transaction(&airdrop_signature)
        .context("Failed to confirm airdrop transaction")?;
    
    // Wait for balance to update (give it time to propagate)
    std::thread::sleep(std::time::Duration::from_millis(1500));
    
    // Get the final balance with retries to ensure it's updated
    let mut sender_balance = balance_before;
    for attempt in 0..20 {
        match client.get_balance(&sender.pubkey()) {
            Ok(balance) => {
                sender_balance = balance;
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
    let sender_balance_sol = sender_balance as f64 / 1_000_000_000.0;
    let airdropped_sol = airdrop_amount as f64 / 1_000_000_000.0;
    
    println!("   ✅ Airdrop successful!");
    println!("   Previous Balance: {:.9} SOL", balance_before_sol);
    println!("   Airdropped: {:.9} SOL", airdropped_sol);
    println!("   Current Balance: {:.9} SOL", sender_balance_sol);
    
    if sender_balance < balance_before + airdrop_amount {
        println!("   ⚠️  Note: Balance increase ({:.9} SOL) is less than expected ({:.9} SOL)", 
                 (sender_balance - balance_before) as f64 / 1_000_000_000.0,
                 airdropped_sol);
    }
    
    // Verify sender has sufficient balance for transaction
    let transfer_amount = 500_000_000; // 0.5 SOL in lamports
    if sender_balance < transfer_amount {
        anyhow::bail!(
            "Insufficient balance for transaction!\n\
             Sender has: {:.9} SOL ({} lamports)\n\
             Required: {:.9} SOL ({} lamports)",
            sender_balance_sol,
            sender_balance,
            transfer_amount as f64 / 1_000_000_000.0,
            transfer_amount
        );
    }

    // Get recent blockhash (required for transactions)
    println!("\n3️⃣  Getting recent blockhash...");
    let recent_blockhash = client.get_latest_blockhash()?;
    println!("   Blockhash: {}", recent_blockhash);

    // Create transfer instruction
    println!("\n4️⃣  Creating transfer instruction...");
    // transfer_amount is already defined above (line 100)
    
    let transfer_instruction = system_instruction::transfer(
        &sender.pubkey(),
        &receiver.pubkey(),
        transfer_amount,
    );

    println!("   Transferring: {} SOL", transfer_amount as f64 / 1_000_000_000.0);
    println!("   From: {}", sender.pubkey());
    println!("   To: {}", receiver.pubkey());

    // Build transaction
    println!("\n5️⃣  Building transaction...");
    let mut transaction = Transaction::new_with_payer(
        &[transfer_instruction],
        Some(&sender.pubkey()),
    );
    
    // Set recent blockhash
    transaction.message.recent_blockhash = recent_blockhash;

    // Sign transaction
    println!("6️⃣  Signing transaction...");
    transaction.sign(&[&sender], recent_blockhash);
    println!("   ✅ Transaction signed");

    // Get balances before transaction for comparison
    let sender_balance_before_tx = sender_balance;
    let receiver_balance_before_tx = client.get_balance(&receiver.pubkey())
        .context("Failed to get receiver balance before transaction")?;

    // Send and confirm transaction
    println!("\n7️⃣  Sending transaction...");
    let signature = client.send_transaction(&transaction)?;
    client.confirm_transaction(&signature)?;
    
    println!("   ✅ Transaction confirmed!");
    println!("   Signature: {}", signature);

    // Wait for balances to update (give it time to propagate)
    std::thread::sleep(std::time::Duration::from_millis(1500));

    // Verify balances with retries
    println!("\n8️⃣  Verifying balances...");
    let mut sender_new_balance = sender_balance_before_tx;
    let mut receiver_new_balance = receiver_balance_before_tx;
    
    // Retry until balances reflect the transaction
    for attempt in 0..20 {
        match (client.get_balance(&sender.pubkey()), client.get_balance(&receiver.pubkey())) {
            (Ok(sender_bal), Ok(receiver_bal)) => {
                sender_new_balance = sender_bal;
                receiver_new_balance = receiver_bal;
                
                // Check if receiver balance increased (transaction succeeded)
                if receiver_bal >= receiver_balance_before_tx + transfer_amount {
                    break;
                } else if attempt < 19 {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }
            _ => {
                if attempt < 19 {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }
        }
    }
    
    let sender_before_sol = sender_balance_before_tx as f64 / 1_000_000_000.0;
    let sender_after_sol = sender_new_balance as f64 / 1_000_000_000.0;
    let receiver_before_sol = receiver_balance_before_tx as f64 / 1_000_000_000.0;
    let receiver_after_sol = receiver_new_balance as f64 / 1_000_000_000.0;
    let transfer_amount_sol = transfer_amount as f64 / 1_000_000_000.0;
    
    println!("   Sender:");
    println!("     Before: {:.9} SOL", sender_before_sol);
    println!("     After:  {:.9} SOL", sender_after_sol);
    println!("     Change: {:.9} SOL", sender_after_sol - sender_before_sol);
    println!("   Receiver:");
    println!("     Before: {:.9} SOL", receiver_before_sol);
    println!("     After:  {:.9} SOL", receiver_after_sol);
    println!("     Change: {:.9} SOL", receiver_after_sol - receiver_before_sol);
    
    // Verify transaction succeeded
    if receiver_new_balance < receiver_balance_before_tx + transfer_amount {
        println!("   ⚠️  Warning: Receiver balance increase ({:.9} SOL) is less than expected ({:.9} SOL)",
                 (receiver_new_balance - receiver_balance_before_tx) as f64 / 1_000_000_000.0,
                 transfer_amount_sol);
    } else {
        println!("   ✅ Transaction verified successfully!");
    }

    // Get transaction details
    println!("\n9️⃣  Getting transaction details...");
    // Note: get_transaction API varies by Solana version
    // For simplicity, we'll skip detailed transaction parsing
    println!("   Transaction Signature: {}", signature);
    println!("   ✅ Transaction confirmed and included in block");

    println!("\n💡 Transaction Components:");
    println!("   • Instructions: What the transaction does");
    println!("   • Recent Blockhash: Prevents replay attacks");
    println!("   • Signatures: Prove authorization");
    println!("   • Fee Payer: Account that pays transaction fees");

    Ok(())
}

