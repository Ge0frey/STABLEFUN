import { useState, useEffect, useMemo } from 'react';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StablebondProgram } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { StablecoinProgram, PROGRAM_ID } from '../utils/stablecoin-program';
import { getErrorMessage } from '../utils/errors';
import { AnchorProvider, Program } from '@project-serum/anchor';
import { IDL } from '../utils/idl/stablecoin_factory';

interface StablebondType {
  mint: {
    toString: () => string;
  };
  name: string;
  symbol: string;
}

interface Bond {
  mint: string;
  name: string;
  symbol: string;
}

interface ExtendedError extends Error {
  cause?: Error;
}

const isWalletReadyForTransaction = (
  wallet: WalletContextState
): wallet is WalletContextState & { wallet: NonNullable<WalletContextState['wallet']> } => {
  return !!(wallet.connected && wallet.wallet?.adapter);
};

// Define the confirmation type
interface TransactionConfirmation {
  value: {
    err: any | null;
  };
}

export const CreateStablecoin = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [loading, setLoading] = useState(false);
  const [availableBonds, setAvailableBonds] = useState<Bond[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    currency: 'USD',
    icon: '',
    bondMint: ''
  });
  const [bondBalance, setBondBalance] = useState<number | null>(null);

  // Initialize the program
  const program = useMemo(() => {
    if (!connection || !publicKey) return null;
    
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
    
    return new Program(IDL, PROGRAM_ID, provider);
  }, [connection, wallet, publicKey]);

  useEffect(() => {
    const fetchBonds = async () => {
      if (!connection) return;
      
      try {
        const bonds = await StablebondProgram.getBonds(connection.rpcEndpoint);
        
        const formattedBonds = bonds.map((bond: any) => {
          console.log('Raw bond data:', bond);
          
          // Extract the mint address from the correct nested structure
          const mintString = bond.mint?.address;
          
          if (!mintString) {
            console.error('Missing mint address for bond:', bond);
            return null;
          }
          
          try {
            // Verify it's a valid Solana address
            new PublicKey(mintString);
            
            return {
              mint: mintString,
              name: bond.mint?.name || 'Unnamed Bond',
              symbol: bond.mint?.symbol || 'USTRY' // Using the symbol from your console output
            };
          } catch (e) {
            console.error('Invalid mint address:', mintString, e);
            return null;
          }
        })
        .filter(Boolean); // Remove any null entries
        
        console.log('Formatted bonds:', formattedBonds);
        setAvailableBonds(formattedBonds);
      } catch (error) {
        console.error('Failed to fetch bonds:', error);
        toast.error('Failed to fetch available bonds');
      }
    };
    
    fetchBonds();
  }, [connection]);

  // Handle bond selection
  const handleBondSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bondMint = e.target.value;
    setFormData(prev => ({ ...prev, bondMint }));
    
    if (bondMint) {
      console.log("Checking balance for bond mint:", bondMint);
      await checkBondBalance(bondMint);
    }
  };

  const checkBondBalance = async (bondMintStr: string) => {
    if (!publicKey || !connection) {
      console.log("No wallet connection");
      return;
    }

    try {
      const bondMintPubkey = new PublicKey(bondMintStr);
      
      // First find all token accounts owned by the user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: bondMintPubkey }
      );

      // Log for debugging
      console.log("Token accounts found:", tokenAccounts.value);

      if (tokenAccounts.value.length > 0) {
        // Get the balance from the first account found
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log("Found balance:", balance);
        setBondBalance(balance);
      } else {
        console.log("No token accounts found for this mint");
        setBondBalance(0);
      }

    } catch (error) {
      console.error('Error checking bond balance:', error);
      setBondBalance(0);
    }
  };

  useEffect(() => {
    if (formData.bondMint) {
      checkBondBalance(formData.bondMint);
    }
  }, [formData.bondMint, publicKey, connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey || !wallet || !connection || !program) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);

      // Create keypairs for the new accounts
      const stablecoinMint = Keypair.generate();
      const stablecoinData = Keypair.generate();

      // Get latest blockhash
      const latestBlockhash = await connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      // Get minimum rent for mint account
      const mintRent = await getMinimumBalanceForRentExemptMint(connection);

      // Add instructions to transaction
      transaction.add(
        // Create mint account
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: stablecoinMint.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID
        }),

        // Initialize mint
        createInitializeMintInstruction(
          stablecoinMint.publicKey,
          6, // decimals
          publicKey,
          publicKey
        ),

        // Create stablecoin instruction
        await program.methods
          .createStablecoin(
            formData.name,
            formData.symbol,
            6,
            formData.icon || '',
            formData.currency
          )
          .accounts({
            authority: publicKey,
            stablecoinData: stablecoinData.publicKey,
            stablecoinMint: stablecoinMint.publicKey,
            bondMint: new PublicKey(formData.bondMint),
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction()
      );

      // Sign transaction with both keypairs
      transaction.sign(stablecoinMint, stablecoinData);

      // Send transaction
      const signature = await wallet.sendTransaction(transaction, connection, {
        signers: [stablecoinMint, stablecoinData]
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
      }

      toast.success('Stablecoin created successfully!');
      
    } catch (error: any) {
      console.error('Error creating stablecoin:', error);
      toast.error(error.message || 'Failed to create stablecoin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Create New Stablecoin</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            placeholder="My Stablecoin"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
            placeholder="MYUSD"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Target Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="MXN">MXN</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Icon URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="flex-1 bg-gray-700 rounded-lg border border-gray-600 p-2 text-white"
              placeholder="https://example.com/icon"
            />
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2"
              onClick={() => {/* TODO: Implement icon upload */}}
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="bond" className="block text-sm font-medium text-gray-200">
            Bond
          </label>
          <select
            id="bond"
            value={formData.bondMint}
            onChange={handleBondSelect}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">Select a bond</option>
            {availableBonds.map((bond) => (
              <option key={bond.mint} value={bond.mint}>
                {bond.symbol} - {bond.name}
              </option>
            ))}
          </select>
          
          {formData.bondMint && (
            <div className="mt-2">
              <span className={`text-sm ${bondBalance !== null && bondBalance > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                Your Balance: {bondBalance === null ? 'Loading...' : `${bondBalance} ${bondBalance > 0 ? 'tokens' : ''}`}
              </span>
              {bondBalance !== null && bondBalance === 0 && (
                <p className="text-red-400 text-sm mt-1">
                  You need to have some bonds to create a stablecoin
                </p>
              )}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!publicKey || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Stablecoin'}
        </button>
      </form>
    </div>
  );
};