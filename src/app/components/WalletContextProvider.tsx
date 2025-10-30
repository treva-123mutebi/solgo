'use client';

import { ReactNode, useMemo } from 'react';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    AlphaWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import ClientWalletProvider from './ClientWalletProvider';

type Props = { children: ReactNode };

export default function WalletContextProvider({ children }: Props) {
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';

    // memoize wallets to avoid recreation on re-renders
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new AlphaWalletAdapter(),
            new TorusWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <ClientWalletProvider wallets={wallets}>{children}</ClientWalletProvider>
        </ConnectionProvider>
    );
}
