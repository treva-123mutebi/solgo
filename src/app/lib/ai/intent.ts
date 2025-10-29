import type { ServiceKind } from './types';

export type Intent =
    | { kind: 'new_listings' }
    | { kind: 'top_holders'; token?: string }
    | { kind: 'price'; token?: string }          // e.g., price of SOL
    | { kind: 'generic_info' }                   // summaries
    | { kind: 'generic' };

export function keywordFallback(prompt: string): Intent {
    const p = (prompt || '').toLowerCase();
    if (p.includes('new') && p.includes('listing')) return { kind: 'new_listings' };
    if (p.includes('top holder') || p.includes('who holds')) return { kind: 'top_holders' };
    if (p.includes('price')) return { kind: 'price' };
    // broad questions -> info
    if (p.startsWith('what ') || p.startsWith('who ') || p.startsWith('how ') || p.includes('solana?'))
        return { kind: 'generic_info' };
    return { kind: 'generic' };
}

export function isServiceKind(x: any): x is ServiceKind {
    return x === 'new_listings' || x === 'top_holders' || x === 'price' || x === 'generic_info' || x === 'generic';
}
