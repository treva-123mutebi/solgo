// app/api/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/app/lib/ai/router';

const buckets = new Map<string, { tokens: number; ts: number }>();
const CAP = 6;           // max tokens
const REFILL_MS = 4000;  // add 1 token every 4s

function allow(ip: string) {
    const now = Date.now();
    const b = buckets.get(ip) ?? { tokens: CAP, ts: now };
    const add = Math.floor((now - b.ts) / REFILL_MS);
    if (add > 0) {
        b.tokens = Math.min(CAP, b.tokens + add);
        b.ts = now;
    }
    if (b.tokens <= 0) {
        buckets.set(ip, b);
        return false;
    }
    b.tokens -= 1;
    buckets.set(ip, b);
    return true;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
    if (!allow(ip)) {
        return NextResponse.json({ ok: false, error: 'Too many requests. Slow down.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt as string | undefined;
    const wallet = (body?.wallet as string | null) ?? null;

    if (!prompt || typeof prompt !== 'string') {
        return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 });
    }

    try {
        const ai = new AIService();
        const out = await ai.route(prompt, wallet);
        return NextResponse.json(out, { status: out.ok ? 200 : 500 });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || 'Router failure', meta: { fatal: true } },
            { status: 500 }
        );
    }
}
