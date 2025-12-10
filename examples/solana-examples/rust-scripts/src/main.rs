use clap::{Parser, Subcommand};
use std::process;

mod examples;

#[derive(Parser)]
#[command(name = "solana-examples")]
#[command(about = "Solana learning examples for localnet", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Connect to localnet and verify connection
    Connect,
    /// Get balance of an account
    Balance {
        /// Public key address (base58 encoded)
        address: String,
    },
    /// Request airdrop of SOL to an account
    Airdrop {
        /// Public key address to receive airdrop
        address: String,
        /// Amount in SOL (default: 1)
        #[arg(default_value = "1")]
        amount: f64,
    },
    /// Create a new keypair account
    CreateAccount,
    /// Send SOL transaction between accounts
    SendTransaction {
        /// From address (base58)
        from: String,
        /// To address (base58)
        to: String,
        /// Amount in SOL
        amount: f64,
        /// Private key (base58) of the sender
        #[arg(long)]
        private_key: Option<String>,
    },
    /// Demonstrate Program Derived Address (PDA) basics
    PdaBasics,
    /// Demonstrate SPL Token operations
    TokenBasics,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Connect => examples::connect_localnet::run().await,
        Commands::Balance { address } => examples::get_balance::run(address).await,
        Commands::Airdrop { address, amount } => examples::airdrop::run(address, amount).await,
        Commands::CreateAccount => examples::create_account::run().await,
        Commands::SendTransaction { from, to, amount, private_key } => {
            examples::send_transaction::run(from, to, amount, private_key).await
        }
        Commands::PdaBasics => examples::pda_basics::run().await,
        Commands::TokenBasics => examples::token_basics::run().await,
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        process::exit(1);
    }
}

