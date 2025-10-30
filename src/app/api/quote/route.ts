import { NextRequest, NextResponse } from 'next/server';
import { jupQuote } from '@/app/lib/services/jupiter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const { inputMint, outputMint, amount, slippageBps } = body || {};
    if (!inputMint || !outputMint || !amount) {
        return NextResponse.json({ ok: false, error: 'Missing swap params' }, { status: 400 });
    }
    try {
        const quote = await jupQuote({ inputMint, outputMint, amount, slippageBps: slippageBps ?? 50 });
        // Keep it light for UI
        const outAmount = quote?.outAmount ?? null;
        const routeCount = Array.isArray(quote?.routePlan) ? quote.routePlan.length : 0;
        return NextResponse.json({ ok: true, data: { outAmount, routeCount } });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
}
