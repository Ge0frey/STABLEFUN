import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

export const ConnectionStatus = () => {
  const { connection } = useConnection();
  const { connected } = useWallet();
  const [rpcStatus, setRpcStatus] = useState<'ok' | 'error'>('ok');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await connection.getLatestBlockhash();
        setRpcStatus('ok');
      } catch {
        setRpcStatus('error');
      }
    };

    const interval = setInterval(checkConnection, 10000);
    checkConnection();

    return () => clearInterval(interval);
  }, [connection]);

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${rpcStatus === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className={rpcStatus === 'ok' ? 'text-green-400' : 'text-red-400'}>
        {rpcStatus === 'ok' ? 'Connected' : 'RPC Error'}
      </span>
      {!connected && <span className="text-yellow-400">Wallet disconnected</span>}
    </div>
  );
}; 