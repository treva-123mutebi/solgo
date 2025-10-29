import { NextRequest, NextResponse } from 'next/server';
import { upsertUserByWallet } from '@/app/lib/db';

export async function POST(req: NextRequest) {
    const { wallet } = await req.json().catch(() => ({}));
    if (!wallet || typeof wallet !== 'string') {
        return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });
    }
    const user = upsertUserByWallet(wallet);
    return NextResponse.json({ ok: true, user });
}
