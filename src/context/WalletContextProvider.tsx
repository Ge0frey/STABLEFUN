import { FC, ReactNode, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use devnet for testing
  const network = WalletAdapterNetwork.Devnet;
  
  // Custom RPC endpoint with higher rate limits if needed
  const endpoint = useMemo(() => 
    clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};