import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/app/lib/ai/service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt as string | undefined;
    const wallet = (body?.wallet as string | null) ?? null;

    if (!prompt) return NextResponse.json({ ok: false, error: 'Missing prompt' }, { status: 400 });

    const ai = new AIService();
    const out = await ai.route(prompt, wallet);
    return NextResponse.json(out, { status: out.ok ? 200 : 500 });
}
