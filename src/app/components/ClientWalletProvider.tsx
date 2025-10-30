'use client';

import { JSX, useCallback } from 'react';
import { WalletError } from '@solana/wallet-adapter-base';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { WalletProviderProps } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function ClientWalletProvider({ wallets, children }: WalletProviderProps): JSX.Element {
    const onError = useCallback((error: WalletError) => {
        console.error('Wallet Error:', error);
        // Add user-friendly error handling here
        alert(`Wallet connection failed: ${error.message}`);
    }, []);

    return (
        <WalletProvider wallets={wallets} autoConnect={true} onError={onError}>
            <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
    );
}