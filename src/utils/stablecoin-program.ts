import { Connection, PublicKey, Transaction, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, MINT_SIZE, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint } from '@solana/spl-token';
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { IDL } from './idl/stablecoin_factory';

// Update this to use your deployed program ID
const PROGRAM_ID = new PublicKey("CGnwq4D9qErCRjPujz5MVkMaixR8BLRACpAmLWsqoRRe");

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


export class StablecoinProgram {
  constructor(
    private connection: Connection,
    private wallet: WalletContextState,
    private program: Program<typeof IDL> = new Program(IDL, PROGRAM_ID)
  ) {}

  async createStablecoin(params: CreateStablecoinParams): Promise<string> {
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create the instruction
      const ix = await this.program.methods
        .createStablecoin(
          params.name,
          params.symbol,
          params.decimals,
          params.iconUrl,
          params.targetCurrency
        )
        .accounts({
          authority: this.wallet.publicKey,
          stablecoinData: params.stablecoinData.publicKey,
          stablecoinMint: params.stablecoinMint.publicKey,
          bondMint: params.bondMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Create transaction and add the instruction
      const latestBlockhash = await this.connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: this.wallet.publicKey,
        ...latestBlockhash,
      }).add(ix);

      // Partially sign with the stablecoin data and mint keypairs
      transaction.partialSign(params.stablecoinData, params.stablecoinMint);

      // Request wallet signature
      const signed = await this.wallet.signTransaction?.(transaction);
      if (!signed) {
        throw new Error('Failed to sign transaction');
      }

      // Send and confirm transaction
      const signature = await this.connection.sendRawTransaction(
        signed.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        }
      );

      await this.connection.confirmTransaction({
        signature,
        ...latestBlockhash
      }, 'confirmed');

      return signature;

    } catch (error) {
      console.error('Error in createStablecoin:', error);
      throw error;
    }
  }

  async mintTokens(params: {
    amount: number;
    authority: PublicKey;
    stablecoinData: PublicKey;
    stablecoinMint: PublicKey;
    userBondAccount: PublicKey;
    programBondAccount: PublicKey;
    userTokenAccount: PublicKey;
    oracleFeed: PublicKey;
  }) {
    try {
      const tx = await this.program.methods
        .mintTokens(new BN(params.amount))
        .accounts({
          authority: params.authority,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          userBondAccount: params.userBondAccount,
          programBondAccount: params.programBondAccount,
          userTokenAccount: params.userTokenAccount,
          oracleFeed: params.oracleFeed,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      const signature = await this.wallet.sendTransaction(tx, this.connection);
      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }

  async redeemTokens(params: {
    amount: number;
    authority: PublicKey;
    stablecoinData: PublicKey;
    stablecoinMint: PublicKey;
    userBondAccount: PublicKey;
    programBondAccount: PublicKey;
    userTokenAccount: PublicKey;
    oracleFeed: PublicKey;
  }) {
    try {
      const tx = await this.program.methods
        .redeemTokens(new BN(params.amount))
        .accounts({
          authority: params.authority,
          stablecoinData: params.stablecoinData,
          stablecoinMint: params.stablecoinMint,
          userBondAccount: params.userBondAccount,
          programBondAccount: params.programBondAccount,
          userTokenAccount: params.userTokenAccount,
          oracleFeed: params.oracleFeed,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await this.connection.confirmTransaction(tx);
      return tx;
    } catch (error) {
      console.error('Error redeeming tokens:', error);
      throw error;
    }
  }
} 