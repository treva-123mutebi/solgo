import type { CTA, ServiceKind } from './types';

export function ctasFor(kind: ServiceKind): CTA[] {
    switch (kind) {
        case 'new_listings':
            return [
                { label: 'Monitor new listings', action: 'create_watch', payload: { scope: 'token_new_listings' } },
                { label: 'Export CSV', action: 'export_csv' },
                { label: 'See SOL price', action: 'route', payload: { kind: 'price', token: 'SOL' } },
            ];
        case 'top_holders':
            return [
                { label: 'View top holders', action: 'open_top_holders' },
                { label: 'Copy-trade whale', action: 'copy_trade', payload: { strategy: 'mirror-largest' } },
                { label: 'Export CSV', action: 'export_csv' },
            ];
        case 'price':
            return [
                { label: 'Export CSV', action: 'export_csv' },
                { label: 'See new listings', action: 'route', payload: { kind: 'new_listings' } },
            ];
        case 'generic_info':
            return [
                { label: 'See SOL price', action: 'route', payload: { kind: 'price', token: 'SOL' } },
                { label: 'New token listings', action: 'route', payload: { kind: 'new_listings' } },
                { label: 'Top holders of CHILLGUY', action: 'route', payload: { kind: 'top_holders', token: 'CHILLGUY' } },
            ];
        default:
            return [
                { label: 'New token listings', action: 'route', payload: { kind: 'new_listings' } },
                { label: 'See SOL price', action: 'route', payload: { kind: 'price', token: 'SOL' } },
            ];
    }
}
