import type { ServiceResult } from '@/app/lib/ai/types';

const BIRDEYE = 'https://public-api.birdeye.so';

// A tiny demo map; extend or resolve symbols via your registry later
const SYMBOL_TO_MINT: Record<string, string> = {
    SOL: 'So11111111111111111111111111111111111111112',
};

export async function svcNewListings(): Promise<ServiceResult> {
    const key = process.env.BIRDEYE_API_KEY?.trim();
    if (!key) {
        return {
            kind: 'new_listings',
            insights: [
                { label: 'Detected intent', value: 'New token listings' },
                { label: 'Source', value: 'Mock (no API key)' },
            ],
            table: [
                { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', createdAt: Date.now() },
            ],
        };
    }

    const url = `${BIRDEYE}/defi/v2/tokens/new_listing?limit=10&meme_platform_enabled=false`;
    const res = await fetch(url, {
        headers: { accept: 'application/json', 'x-chain': 'solana', 'X-API-KEY': key },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Birdeye error ${res.status}`);
    const j = await res.json();
    const items = Array.isArray(j?.data?.items) ? j.data.items : [];

    return {
        kind: 'new_listings',
        insights: [
            { label: 'Detected intent', value: 'New token listings' },
            { label: 'Source', value: 'Birdeye' },
            { label: 'Count', value: String(items.length) },
        ],
        table: items.map((it: any) => ({
            mint: it?.address ?? '',
            symbol: it?.symbol ?? '',
            name: it?.name ?? '',
            createdAt: it?.createdAt ?? '',
        })),
    };
}

export async function svcPrice(token?: string): Promise<ServiceResult> {
    const key = process.env.BIRDEYE_API_KEY?.trim();
    const addr =
        (token && SYMBOL_TO_MINT[token.toUpperCase()]) ||
        SYMBOL_TO_MINT.SOL; // default SOL

    if (!key) {
        return {
            kind: 'price',
            insights: [
                { label: 'Detected intent', value: `Price of ${token || 'SOL'}` },
                { label: 'Source', value: 'Mock (no API key)' },
            ],
            table: [{ token: token || 'SOL', priceUsd: 0, liquidity: 0, updated: Date.now() }],
        };
    }

    const url = `${BIRDEYE}/defi/price?address=${encodeURIComponent(addr)}`;
    const res = await fetch(url, {
        headers: { accept: 'application/json', 'x-chain': 'solana', 'X-API-KEY': key },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Birdeye error ${res.status}`);
    const j = await res.json();
    const d = j?.data || {};

    return {
        kind: 'price',
        insights: [
            { label: 'Detected intent', value: `Price of ${token || 'SOL'}` },
            { label: 'Source', value: 'Birdeye' },
        ],
        table: [
            {
                token: token || 'SOL',
                priceUsd: d.value ?? null,
                priceChange24h: d.priceChange24h ?? null,
                liquidity: d.liquidity ?? null,
                updated: d.updateUnixTime ?? null,
            },
        ],
    };
}
