/**
 * Example 05: SPL Token Operations
 * 
 * This example demonstrates how to:
 * - Create a token mint
 * - Create token accounts
 * - Mint tokens
 * - Transfer tokens
 * 
 * Run: cargo run --bin 05_token_operations
 * 
 * Note: This example uses spl-token crate for token operations
 */

use anyhow::{Context, Result};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    program_pack::Pack,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_token::state::{Account, Mint};

#[tokio::main]
async fn main() -> Result<()> {
    println!("🪙 SPL Token Operations Example\n");

    // Connect to localnet
    let client = RpcClient::new_with_commitment(
        "http://127.0.0.1:8899".to_string(),
        CommitmentConfig::confirmed(),
    );

    // Create payer account (needs SOL for fees)
    println!("1️⃣  Setting up accounts...");
    let payer = Keypair::new();
    
    // Fund payer with retry logic
    println!("   Funding payer account...");
    let airdrop_amount = 2_000_000_000; // 2 SOL in lamports
    
    // Get balance before airdrop
    let balance_before = client.get_balance(&payer.pubkey())
        .context("Failed to get initial balance")?;
    
    // Request airdrop
    let airdrop_signature = client.request_airdrop(&payer.pubkey(), airdrop_amount)
        .context("Failed to request airdrop. Make sure localnet is running.")?;
    
    // Wait for confirmation
    client.confirm_transaction(&airdrop_signature)
        .context("Failed to confirm airdrop transaction")?;
    
    // Wait for balance to update (give it time to propagate)
    std::thread::sleep(std::time::Duration::from_millis(1500));
    
    // Get the final balance with retries to ensure it's updated
    let mut payer_balance = balance_before;
    for attempt in 0..20 {
        match client.get_balance(&payer.pubkey()) {
            Ok(balance) => {
                payer_balance = balance;
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
    
    println!("   Payer: {}", payer.pubkey());
    println!("   Payer balance: {:.9} SOL", payer_balance as f64 / 1_000_000_000.0);

    // Create mint authority (controls minting)
    let mint_authority = Keypair::new();
    println!("   Mint Authority: {}", mint_authority.pubkey());

    // Create token receiver
    let receiver = Keypair::new();
    println!("   Receiver: {}", receiver.pubkey());

    // Get recent blockhash
    let recent_blockhash = client.get_latest_blockhash()?;

    // 2. Create a token mint
    println!("\n2️⃣  Creating token mint...");
    println!("   💡 A mint represents a token type (like USDT)");
    
    let mint = Keypair::new();
    let decimals = 9u8;
    
    // Create mint account instruction
    let create_mint_ix = spl_token::instruction::initialize_mint(
        &spl_token::id(),
        &mint.pubkey(),
        &mint_authority.pubkey(),
        None, // Freeze authority (None = no freeze)
        decimals,
    )?;

    // Calculate rent for mint account
    let mint_rent = client.get_minimum_balance_for_rent_exemption(Mint::LEN)?;

    // Create account for mint
    let create_account_ix = system_instruction::create_account(
        &payer.pubkey(),
        &mint.pubkey(),
        mint_rent,
        Mint::LEN as u64,
        &spl_token::id(),
    );

    // Build and send transaction
    let mut transaction = Transaction::new_with_payer(
        &[create_account_ix, create_mint_ix],
        Some(&payer.pubkey()),
    );
    transaction.message.recent_blockhash = recent_blockhash;
    transaction.sign(&[&payer, &mint], recent_blockhash);
    
    let sig = client.send_transaction(&transaction)?;
    client.confirm_transaction(&sig)?;
    
    // Wait for mint to be fully processed
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    println!("   ✅ Mint created: {}", mint.pubkey());
    println!("   Decimals: {}", decimals);

    // 3. Create token account for payer
    println!("\n3️⃣  Creating token account for payer...");
    println!("   💡 Each user needs a token account per token type");
    
    let payer_token_account = Keypair::new();
    let token_account_rent = client.get_minimum_balance_for_rent_exemption(Account::LEN)?;

    let create_token_account_ix = spl_token::instruction::initialize_account2(
        &spl_token::id(),
        &payer_token_account.pubkey(),
        &mint.pubkey(),
        &payer.pubkey(),
    )?;

    let create_token_account_sys_ix = system_instruction::create_account(
        &payer.pubkey(),
        &payer_token_account.pubkey(),
        token_account_rent,
        Account::LEN as u64,
        &spl_token::id(),
    );

    let recent_blockhash2 = client.get_latest_blockhash()?;
    let mut transaction2 = Transaction::new_with_payer(
        &[create_token_account_sys_ix, create_token_account_ix],
        Some(&payer.pubkey()),
    );
    transaction2.message.recent_blockhash = recent_blockhash2;
    transaction2.sign(&[&payer, &payer_token_account], recent_blockhash2);
    
    let sig2 = client.send_transaction(&transaction2)?;
    client.confirm_transaction(&sig2)?;
    
    // Wait for token account to be fully processed
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    println!("   ✅ Token account: {}", payer_token_account.pubkey());
    println!("   Owner: {}", payer.pubkey());
    println!("   Mint: {}", mint.pubkey());

    // 4. Mint tokens to payer
    println!("\n4️⃣  Minting 1000 tokens to payer...");
    let mint_amount = 1000 * 10u64.pow(decimals as u32); // 1000 tokens with decimals
    
    let mint_to_ix = spl_token::instruction::mint_to(
        &spl_token::id(),
        &mint.pubkey(),
        &payer_token_account.pubkey(),
        &mint_authority.pubkey(),
        &[],
        mint_amount,
    )?;

    let recent_blockhash3 = client.get_latest_blockhash()?;
    let mut transaction3 = Transaction::new_with_payer(
        &[mint_to_ix],
        Some(&payer.pubkey()),
    );
    transaction3.message.recent_blockhash = recent_blockhash3;
    transaction3.sign(&[&payer, &mint_authority], recent_blockhash3);
    
    let sig3 = client.send_transaction(&transaction3)?;
    client.confirm_transaction(&sig3)?;
    
    // Wait for mint transaction to be fully processed
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    println!("   ✅ Minted {} tokens", mint_amount / 10u64.pow(decimals as u32));

    // 5. Check token balance with retries
    println!("\n5️⃣  Checking token balance...");
    let mut token_balance = 0u64;
    for attempt in 0..20 {
        match client.get_account_data(&payer_token_account.pubkey()) {
            Ok(account_data) => {
                match Account::unpack(&account_data) {
                    Ok(token_account) => {
                        token_balance = token_account.amount;
                        if token_balance >= mint_amount {
                            break;
                        } else if attempt < 19 {
                            std::thread::sleep(std::time::Duration::from_millis(200));
                        }
                    }
                    Err(_) => {
                        if attempt < 19 {
                            std::thread::sleep(std::time::Duration::from_millis(200));
                        }
                    }
                }
            }
            Err(_) => {
                if attempt < 19 {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }
        }
    }
    println!("   Balance: {} tokens", token_balance / 10u64.pow(decimals as u32));

    // 6. Create token account for receiver
    println!("\n6️⃣  Creating token account for receiver...");
    let receiver_token_account = Keypair::new();

    let create_receiver_token_account_ix = spl_token::instruction::initialize_account2(
        &spl_token::id(),
        &receiver_token_account.pubkey(),
        &mint.pubkey(),
        &receiver.pubkey(),
    )?;

    let create_receiver_token_account_sys_ix = system_instruction::create_account(
        &payer.pubkey(),
        &receiver_token_account.pubkey(),
        token_account_rent,
        Account::LEN as u64,
        &spl_token::id(),
    );

    let recent_blockhash4 = client.get_latest_blockhash()?;
    let mut transaction4 = Transaction::new_with_payer(
        &[create_receiver_token_account_sys_ix, create_receiver_token_account_ix],
        Some(&payer.pubkey()),
    );
    transaction4.message.recent_blockhash = recent_blockhash4;
    transaction4.sign(&[&payer, &receiver_token_account], recent_blockhash4);
    
    let sig4 = client.send_transaction(&transaction4)?;
    client.confirm_transaction(&sig4)?;
    
    // Wait for receiver token account to be fully processed
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    println!("   ✅ Token account: {}", receiver_token_account.pubkey());

    // 7. Transfer tokens
    println!("\n7️⃣  Transferring 100 tokens to receiver...");
    let transfer_amount = 100 * 10u64.pow(decimals as u32); // 100 tokens
    
    let transfer_ix = spl_token::instruction::transfer(
        &spl_token::id(),
        &payer_token_account.pubkey(),
        &receiver_token_account.pubkey(),
        &payer.pubkey(),
        &[],
        transfer_amount,
    )?;

    let recent_blockhash5 = client.get_latest_blockhash()?;
    let mut transaction5 = Transaction::new_with_payer(
        &[transfer_ix],
        Some(&payer.pubkey()),
    );
    transaction5.message.recent_blockhash = recent_blockhash5;
    transaction5.sign(&[&payer], recent_blockhash5);
    
    let transfer_signature = client.send_transaction(&transaction5)?;
    client.confirm_transaction(&transfer_signature)?;
    
    // Wait for transfer to be fully processed
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    println!("   ✅ Transfer complete!");
    println!("   Signature: {}", transfer_signature);

    // 8. Verify balances with retries
    println!("\n8️⃣  Verifying balances...");
    let mut payer_balance = 0u64;
    let mut receiver_balance = 0u64;
    
    // Retry until balances reflect the transfer
    for attempt in 0..20 {
        match (
            client.get_account_data(&payer_token_account.pubkey()),
            client.get_account_data(&receiver_token_account.pubkey()),
        ) {
            (Ok(payer_data), Ok(receiver_data)) => {
                match (Account::unpack(&payer_data), Account::unpack(&receiver_data)) {
                    (Ok(payer_account), Ok(receiver_account)) => {
                        payer_balance = payer_account.amount;
                        receiver_balance = receiver_account.amount;
                        
                        // Check if receiver balance increased (transfer succeeded)
                        if receiver_balance >= transfer_amount {
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
            _ => {
                if attempt < 19 {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }
        }
    }
    
    let payer_balance_tokens = payer_balance / 10u64.pow(decimals as u32);
    let receiver_balance_tokens = receiver_balance / 10u64.pow(decimals as u32);
    let transfer_amount_tokens = transfer_amount / 10u64.pow(decimals as u32);
    
    println!("   Payer balance: {} tokens", payer_balance_tokens);
    println!("   Receiver balance: {} tokens", receiver_balance_tokens);
    
    if receiver_balance >= transfer_amount {
        println!("   ✅ Transfer verified successfully!");
    } else {
        println!("   ⚠️  Warning: Receiver balance ({}) is less than expected ({})",
                 receiver_balance_tokens, transfer_amount_tokens);
    }

    println!("\n💡 Key Concepts:");
    println!("   • Mint: Represents a token type (created once)");
    println!("   • Token Account: Holds tokens for a user");
    println!("   • Associated Token Account (ATA): Standard PDA-based token account");
    println!("   • Mint Authority: Can create new tokens");
    println!("   • Transfer: Moves tokens between accounts");

    println!("\n🔗 For Collateral Vault:");
    println!("   • USDT is an SPL Token");
    println!("   • Users deposit USDT into vault token accounts");
    println!("   • Vault program uses CPI to SPL Token program");
    println!("   • Transfers happen via token::transfer() CPI");

    println!("\n📝 Token Transfer Flow:");
    println!("   1. User has USDT in their token account");
    println!("   2. User calls vault.deposit()");
    println!("   3. Vault program makes CPI to SPL Token program");
    println!("   4. Token program transfers USDT to vault account");
    println!("   5. Vault updates its balance tracking");

    Ok(())
}

