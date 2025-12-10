import {
  Adapter,
  WalletError,
  WalletName,
  WalletReadyState,
  WalletAdapterEvents,
  EventEmitter,
} from "@solana/wallet-adapter-base";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { loadLocalnetWallet } from "./wallet-storage";

export class LocalnetWalletAdapter
  extends EventEmitter<WalletAdapterEvents>
  implements Adapter
{
  name: WalletName = "Localnet Wallet" as WalletName;
  url = "localnet";
  icon =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsb=";
  readyState: WalletReadyState = WalletReadyState.Installed;
  publicKey: PublicKey | null = null;
  connecting = false;
  private _keypair: ReturnType<typeof loadLocalnetWallet> = null;

  constructor() {
    super();
    // Load wallet on initialization
    this._keypair = loadLocalnetWallet();
    if (this._keypair) {
      this.publicKey = this._keypair.publicKey;
    }
  }

  async connect(): Promise<void> {
    if (this.connecting) {
      return;
    }

    // If already connected, emit connect event (needed for autoConnect)
    if (this.publicKey) {
      this.emit("connect", this.publicKey);
      return;
    }

    this.connecting = true;

    try {
      this._keypair = loadLocalnetWallet();
      if (!this._keypair) {
        // Redirect to onboarding if no wallet exists
        if (typeof window !== "undefined") {
          window.location.href = "/onboarding/localnet";
        }
        throw new WalletError(
          "Localnet wallet not found. Redirecting to onboarding..."
        );
      }

      this.publicKey = this._keypair.publicKey;
      this.readyState = WalletReadyState.Installed;

      this.emit("connect", this.publicKey);
    } catch (error: any) {
      this.connecting = false;
      this.emit("error", error);
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this.publicKey = null;
    this.readyState = WalletReadyState.Installed;
    this.emit("disconnect");
  }

  private getKeypair(): ReturnType<typeof loadLocalnetWallet> {
    if (!this._keypair) {
      this._keypair = loadLocalnetWallet();
    }
    return this._keypair;
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: any,
    options?: any
  ): Promise<string> {
    const keypair = this.getKeypair();
    if (!keypair) {
      throw new WalletError("Localnet wallet not found");
    }

    if (transaction instanceof VersionedTransaction) {
      transaction.sign([keypair]);
    } else {
      transaction.sign(keypair);
    }

    return connection.sendRawTransaction(transaction.serialize(), options);
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    const keypair = this.getKeypair();
    if (!keypair) {
      throw new WalletError("Localnet wallet not found");
    }

    if (transaction instanceof VersionedTransaction) {
      transaction.sign([keypair]);
    } else {
      transaction.sign(keypair);
    }

    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    const keypair = this.getKeypair();
    if (!keypair) {
      throw new WalletError("Localnet wallet not found");
    }

    return transactions.map((transaction) => {
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([keypair]);
      } else {
        transaction.sign(keypair);
      }
      return transaction;
    });
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const keypair = this.getKeypair();
    if (!keypair) {
      throw new WalletError("Localnet wallet not found");
    }

    // Sign message using nacl (if available) or web3.js
    const signature = keypair.sign(message);
    return signature.signature;
  }
}
