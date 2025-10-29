'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import Notice from './Notice';


const WalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function ConnectBar() {
    const { publicKey } = useWallet();
    const [mounted, setMounted] = useState(false);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const sync = async () => {
            if (!publicKey) return;
            setErrMsg(null);
            setInfoMsg('Signing you in…');
            try {
                const r = await fetch('/api/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: publicKey.toBase58() }),
                });
                if (!r.ok) {
                    const j = await r.json().catch(() => ({}));
                    throw new Error(j?.error || `Signin failed (${r.status})`);
                }
                setInfoMsg('Wallet linked to session.');
            } catch (e: any) {
                setErrMsg(e?.message || 'Failed to link wallet.');
                setInfoMsg(null);
            }
        };
        if (mounted) sync();
    }, [publicKey, mounted]);

    return (
        <div className="p-4">
            <div className="flex items-center justify-end">
                {mounted ? (
                    <WalletMultiButton className="!bg-sol-gradient !text-black !font-semibold !rounded-xl !px-4 !py-2" />
                ) : (
                    <div className="h-10 w-40 rounded-xl bg-white/5" />
                )}
            </div>

            <div className="mt-2 space-y-2">
                {infoMsg && <Notice kind="info">{infoMsg}</Notice>}
                {errMsg && <Notice kind="error">{errMsg}</Notice>}
            </div>
        </div>
    );
}
