import { fetchJson } from './http';

export async function jupQuote(params: { inputMint: string; outputMint: string; amount: string; slippageBps: number }) {
    const url = new URL('https://quote-api.jup.ag/v6/quote');
    url.searchParams.set('inputMint', params.inputMint);
    url.searchParams.set('outputMint', params.outputMint);
    url.searchParams.set('amount', params.amount);
    url.searchParams.set('slippageBps', String(params.slippageBps));
    url.searchParams.set('swapMode', 'ExactIn');

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Jupiter quote failed ${res.status}: ${errText}`);
    }

    const j = await res.json();
    if (!j?.routePlan?.length) throw new Error('No route found');
    return j;
}

