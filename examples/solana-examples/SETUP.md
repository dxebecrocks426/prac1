# Solana Development Environment Setup

This guide will help you set up a complete Solana development environment for working with localnet examples and the collateral vault assignment.

## 📋 Prerequisites Checklist

- [ ] macOS, Linux, or WSL2 (Windows Subsystem for Linux)
- [ ] Terminal/Command line access
- [ ] Internet connection
- [ ] ~5GB free disk space

## 🔧 Step 1: Install Rust

Solana programs are written in Rust. Install Rust using rustup:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow the prompts, then reload your shell
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

**Expected output**: Rust 1.75+ and Cargo version

## 🔧 Step 2: Install Solana CLI Tools

The Solana CLI provides tools for interacting with Solana networks:

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add this to your ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Reload shell or run:
source ~/.bashrc  # or source ~/.zshrc

# Verify installation
solana --version
solana-keygen --version
```

**Expected output**: Solana CLI version 1.18+

## 🔧 Step 3: Configure Solana CLI

Set Solana to use localnet (for development):

```bash
# Set cluster to localnet
solana config set --url localhost

# Verify configuration
solana config get

# Generate a keypair (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your address
solana address
```

## 🔧 Step 4: Install Bun

Required for Anchor framework and TypeScript examples:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell
source ~/.bashrc  # or source ~/.zshrc

# Verify installation
bun --version
```

**Expected output**: Bun version 1.0+

## 🔧 Step 5: Install Anchor Framework

Anchor is a framework for building Solana programs:

```bash
# Install Anchor using avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor version
avm install latest
avm use latest

# Verify installation
anchor --version
```

**Expected output**: Anchor version 0.29+

## 🧪 Step 6: Test Your Setup

### Test 1: Start Localnet Validator

```bash
# Start validator (keep this running)
solana-test-validator

# You should see output like:
# "Ledger location: test-ledger"
# "Log: ..."
```

**Keep this terminal open!** The validator must be running for examples to work.

### Test 2: Verify Connection

In a **new terminal**:

```bash
# Check connection
solana cluster-version

# Should show version number
```

### Test 3: Test Rust Examples

```bash
cd solana-examples/rust-scripts

# Build
cargo build

# Run connect example
cargo run -- connect
```

**Expected**: Successfully connected message

### Test 4: Test TypeScript Examples

```bash
cd solana-examples/anchor-examples

# Install dependencies
bun install

# Run basic setup
bun run example:01
```

**Expected**: Successfully connected message

## 🎯 Step 7: Verify All Tools

Run this checklist:

```bash
# Rust
rustc --version        # Should show 1.75+
cargo --version        # Should show version

# Solana
solana --version       # Should show 1.18+
solana config get      # Should show localhost URL

# Bun
bun --version          # Should show 1.0+

# Anchor
anchor --version       # Should show 0.29+
```

## 🐛 Common Issues & Solutions

### Issue: "command not found: solana"

**Solution**:
```bash
# Add Solana to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: "Failed to connect to localnet"

**Solution**:
1. Make sure `solana-test-validator` is running
2. Check it's on port 8899: `lsof -i :8899`
3. Try restarting the validator

### Issue: "Anchor not found"

**Solution**:
```bash
# Reinstall Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify PATH includes Cargo bin
export PATH="$HOME/.cargo/bin:$PATH"
```

### Issue: "Port 8899 already in use"

**Solution**:
```bash
# Find and kill the process
lsof -ti:8899 | xargs kill -9

# Or use a different port
solana-test-validator --rpc-port 8899 --faucet-port 9900
```

### Issue: "Rust compilation errors"

**Solution**:
```bash
# Update Rust
rustup update

# Update Cargo
cargo update

# Clean and rebuild
cargo clean
cargo build
```

## 📚 Additional Resources

- [Solana Installation Guide](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Installation Guide](https://www.anchor-lang.com/docs/installation)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Solana Cookbook](https://solanacookbook.com/)

## ✅ Setup Complete!

Once all tests pass, you're ready to:
1. Run the learning examples
2. Start working on the collateral vault assignment
3. Build and deploy Solana programs

## 🆘 Getting Help

If you encounter issues:
1. Check the error message carefully
2. Review the Common Issues section above
3. Check Solana/Anchor documentation
4. Ask in team channels

Happy coding! 🚀

