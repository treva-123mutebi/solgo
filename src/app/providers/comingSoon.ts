import type { ServiceResult } from '@/app/lib/ai/types';

export async function svcTopHolders(_token?: string): Promise<ServiceResult> {
    return {
        kind: 'top_holders',
        insights: [{ label: 'Detected intent', value: 'Top holders (coming soon)' }],
        table: [],
    };
}

export async function svcGeneric(): Promise<ServiceResult> {
    return {
        kind: 'generic',
        insights: [{ label: 'Detected intent', value: 'Generic Solana query (coming soon)' }],
        table: [],
    };
}
