import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { 
  TOKEN_PROGRAM_ID, 
  getAccount as getTokenAccount,
  getMint as getTokenMint
} from '@solana/spl-token';
import { IDL } from './idl/stablecoin_factory';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Custom error type
interface StablecoinError extends Error {
  code?: string | number;
  msg?: string;
}

// Export the program ID
export const PROGRAM_ID = new PublicKey("CGnwq4D9qErCRjPujz5MVkMaixR8BLRACpAmLWsqoRRe");

interface CreateStablecoinParams {
  name: string;
  symbol: string;
  decimals: number;
  iconUrl: string;
  targetCurrency: string;
  bondMint: PublicKey;
  stablecoinData: Keypair;
  stablecoinMint: Keypair;
}

interface WalletAdapter {
  publicKey: PublicKey;
  sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>;
}

// Create a custom type that matches what Anchor expects
type AnchorWallet = {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
};

export class StablecoinProgram {
  public program: Program<typeof IDL>;
  private connection: Connection;
  private anchorWallet: AnchorWallet;
  public programId: PublicKey = PROGRAM_ID;

  constructor(
    connection: Connection,
    wallet: WalletContextState
  ) {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    this.connection = connection;

    // Create an adapter that matches what Anchor expects
    this.anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction!,
      signAllTransactions: wallet.signAllTransactions!,
    };

    const provider = new AnchorProvider(
      this.connection,
      this.anchorWallet,
      { commitment: 'confirmed' }
    );

    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  async createStablecoin(params: {
    name: string;
    symbol: string;
    decimals: number;
    iconUrl: string;
    targetCurrency: string;
    authority: PublicKey;
    stablecoinData: PublicKey;
    stablecoinMint: PublicKey;
    bondMint: PublicKey;
  }) {
    return this.program.methods
      .createStablecoin(
        params.name,
        params.symbol,
        params.decimals,
        params.iconUrl,
        params.targetCurrency
      )
      .accounts({
        authority: params.authority,
        stablecoinData: params.stablecoinData,
        stablecoinMint: params.stablecoinMint,
        bondMint: params.bondMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    try {
      const latestBlockhash = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = this.anchorWallet.publicKey;

      const signed = await this.anchorWallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize());

      await this.connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature,
      });

      return signature;
    } catch (err) {
      console.error('Transaction failed:', err);
      throw err;
    }
  }
} 