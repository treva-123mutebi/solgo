// app/lib/ai/router.ts
import type { RoutedResult, ServiceResult } from './types';
import { classifyIntent, summarizeGeneric } from './openai';
import { ctasFor } from './ctas';
import { isServiceKind } from './intent';
import { svcNewListings, svcPrice } from '@/app/providers/birdeye';
import { svcGeneric, svcTopHolders } from '@/app/providers/comingSoon';

export class AIService {
    async route(prompt: string, wallet: string | null): Promise<RoutedResult & { meta?: any }> {
        const { intent, meta: aiMeta } = await classifyIntent(prompt);

        let svcResult: ServiceResult;
        const svcMeta: { name: string; latencyMs?: number; error?: string } = { name: 'unknown' };

        const svcStart = Date.now();
        try {
            switch (intent.kind) {
                case 'new_listings':
                    svcMeta.name = 'birdeye:new_listings';
                    svcResult = await svcNewListings();
                    break;
                case 'top_holders':
                    svcMeta.name = 'comingSoon:top_holders';
                    svcResult = await svcTopHolders(intent.token);
                    break;
                case 'price':
                    svcMeta.name = 'birdeye:price';
                    svcResult = await svcPrice(intent.token);
                    break;
                case 'generic_info': {
                    svcMeta.name = 'openai:summary';
                    const summary = await summarizeGeneric(prompt);
                    svcResult = {
                        kind: 'generic_info',
                        insights: [{ label: 'Detected intent', value: 'General knowledge' }],
                        summary,
                        suggestions: ['See SOL price', 'New token listings', 'Top holders of CHILLGUY'],
                    };
                    break;
                }
                default:
                    svcMeta.name = 'generic:comingSoon';
                    svcResult = await svcGeneric();
            }
            svcMeta.latencyMs = Date.now() - svcStart;
        } catch (e: any) {
            svcMeta.latencyMs = Date.now() - svcStart;
            svcMeta.error = String(e?.message || e);
            return { ok: false, error: svcMeta.error, meta: { ai: aiMeta, svc: svcMeta } };
        }

        const kind = svcResult.kind;
        if (!isServiceKind(kind)) {
            return { ok: false, error: 'Invalid service kind', meta: { ai: aiMeta, svc: svcMeta } };
        }

        return {
            ok: true,
            wallet,
            data: {
                insights: svcResult.insights,
                summary: svcResult.summary,
                table: svcResult.table,
                suggestions: svcResult.suggestions,
                ctas: ctasFor(kind),
            },
            meta: { ai: aiMeta, svc: svcMeta },
        };
    }
}
