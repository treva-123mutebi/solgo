import { fetchJson } from './http';

const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY?.trim();
const HEADERS: Record<string, string> = {
    accept: 'application/json',
    'x-chain': 'solana',
    ...(BIRDEYE_KEY ? { 'X-API-KEY': BIRDEYE_KEY } : {}),
};

export async function birdeyeNewListings(limit = 10) {
    const url = `https://public-api.birdeye.so/defi/v2/tokens/new_listing?limit=${limit}&meme_platform_enabled=false`;
    const j = await fetchJson(url, { headers: HEADERS });
    const items = Array.isArray(j?.data?.items) ? j.data.items : [];
    const table = items.map((it: any) => ({
        symbol: it?.symbol ?? '',
        name: it?.name ?? '',
        address: it?.address ?? '',
        createdAt: it?.createdAt ?? '',
        liquidity: it?.liquidity ?? '',
    }));
    return { items, table };
}

export async function birdeyeTokenMeta(address: string) {
    // many accounts must pass ?address=... (preferred)
    const url = `https://public-api.birdeye.so/defi/v3/token/meta-data/single?address=${encodeURIComponent(address)}`;
    const j = await fetchJson(url, { headers: HEADERS });
    const d = j?.data ?? {};
    return {
        symbol: d?.symbol ?? '',
        name: d?.name ?? '',
        address: d?.address ?? address,
        decimals: d?.decimals ?? 0,
        logoURI: d?.logoURI ?? '',
        website: d?.website ?? '',
    };
}

export async function birdeyeTokenPrice(address: string) {
    const url = `https://public-api.birdeye.so/defi/price?address=${encodeURIComponent(address)}`;
    const j = await fetchJson(url, { headers: HEADERS });
    const d = j?.data ?? {};
    return {
        address,
        value: typeof d?.value === 'number' ? d.value : null,
        updateUnixTime: d?.updateUnixTime ?? null,
        // add more if needed
    };
}
