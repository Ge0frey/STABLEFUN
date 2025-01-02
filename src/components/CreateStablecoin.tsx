import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StablebondProgram, Stablebond } from '@etherfuse/stablebond-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { StablecoinProgram } from '../utils/stablecoin-program';
import * as web3 from '@solana/web3.js';

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

export const CreateStablecoin = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [availableBonds, setAvailableBonds] = useState<Bond[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    currency: 'USD',
    icon: '',
    bondMint: ''
  });

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
  const handleBondSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      bondMint: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !sendTransaction || !connection) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);

      // Create keypairs for the new accounts
      const stablecoinData = web3.Keypair.generate();
      const stablecoinMint = web3.Keypair.generate();

      console.log('Generated keypairs:', {
        stablecoinData: stablecoinData.publicKey.toBase58(),
        stablecoinMint: stablecoinMint.publicKey.toBase58(),
      });

      let bondMintPubkey: PublicKey;
      try {
        bondMintPubkey = new PublicKey(formData.bondMint);
        console.log('Bond mint pubkey:', bondMintPubkey.toBase58());
      } catch (error) {
        console.error('Invalid bond mint address:', formData.bondMint, error);
        toast.error('Invalid bond mint address. Please select a valid bond.');
        return;
      }

      // Create program instance with wallet adapter
      const program = new StablecoinProgram(
        connection,
        {
          publicKey,
          sendTransaction: async (transaction: Transaction, connection: Connection, options?: any) => {
            try {
              console.log('Sending transaction with options:', options);
              const sig = await sendTransaction(transaction, connection, options);
              console.log('Transaction sent successfully:', sig);
              return sig;
            } catch (err) {
              console.error('Error in sendTransaction:', err);
              throw err;
            }
          }
        }
      );

      console.log('Calling createStablecoin...');
      const result = await program.createStablecoin({
        name: formData.name,
        symbol: formData.symbol,
        decimals: 9,
        iconUrl: formData.icon,
        targetCurrency: formData.currency,
        bondMint: bondMintPubkey,
        stablecoinData: stablecoinData.publicKey,
        stablecoinMint: stablecoinMint.publicKey,
        signers: [stablecoinData, stablecoinMint]
      });

      console.log('Stablecoin created successfully:', result);
      toast.success('Stablecoin created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        currency: 'USD',
        icon: '',
        bondMint: ''
      });
    } catch (error) {
      console.error('Detailed error in handleSubmit:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Failed to create stablecoin: ${errorMessage}`);
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
            onChange={(e) => {
              const selectedValue = e.target.value;
              console.log('Selected bond value:', selectedValue);
              setFormData(prev => ({ ...prev, bondMint: selectedValue }));
            }}
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