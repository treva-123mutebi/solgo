'use client';

import { ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

type Props = { children: ReactNode };

export default function WalletContextProvider({ children }: Props) {
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';

    return (
        <ConnectionProvider endpoint={endpoint}>
            {/* Wallet Standard: pass an empty array */}
            <WalletProvider wallets={[]} autoConnect={false}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
