import { aiClassify, aiSummarize } from './providers';
import { birdeyeNewListings, birdeyeTokenMeta, birdeyeTokenPrice } from '@/app/lib/services/birdeye';

type CTA = { label: string; action: 'route' | 'export_csv' | 'swap_quote' | 'open_top_holders' | 'create_watch' | 'suggest'; payload?: any };

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZ2fF9xA'; // USDC (6 dp)

export class AIService {
    async route(prompt: string, wallet: string | null) {
        console.log('🤖 AI route start', { prompt, wallet });

        // 1) Classify intent (Gemini → OpenAI → fallback)
        const { intent, meta: aiMeta } = await aiClassify(prompt);
        console.log('🧠 AI intent result:', aiMeta, intent);

        let data: { summary?: string; insights: { label: string; value: string }[]; suggestions?: string[]; table?: any[]; ctas: CTA[] } = {
            insights: [],
            ctas: [],
            table: [],
        };
        let svcMeta: { name: string; latencyMs?: number; error?: string } | undefined;

        try {
            const t0 = Date.now();

            // 2) Services FIRST, then layer AI insights / CTAs
            switch (intent?.kind) {
                case 'new_listings': {
                    const out = await birdeyeNewListings(10); // service call first
                    data.table = out.table;

                    // optional extra fetch: add quick hints for the first token
                    const first = out.items?.[0];
                    if (first?.address) {
                        const [meta, price] = await Promise.allSettled([
                            birdeyeTokenMeta(first.address),
                            birdeyeTokenPrice(first.address),
                        ]);
                        if (meta.status === 'fulfilled') {
                            data.insights.push({ label: 'Sample token', value: `${meta.value.symbol || first.symbol} • ${meta.value.address}` });
                        }
                        if (price.status === 'fulfilled' && price.value.value != null) {
                            data.insights.push({ label: 'Sample price (USD)', value: String(price.value.value) });
                        }
                    }

                    // 3) Now ask AI to summarize WHAT WE GOT
                    const context = `User asked: ${prompt}. We fetched ${out.table.length} new listings. Fields: symbol, name, address, createdAt, liquidity.`;
                    const s = await aiSummarize(context);
                    data.summary = s.summary || 'New token listings fetched.';

                    // 4) CTAs based on what we have (swap flow demo on first row)
                    if (first?.address) {
                        data.ctas.push({
                            label: `Get swap quote for ${first.symbol || 'token'}`,
                            action: 'swap_quote',
                            payload: {
                                // user swaps USDC -> new token
                                inputMint: USDC_MINT,
                                outputMint: first.address,
                                amount: '1000000', // 1 USDC (6 dp)
                                slippageBps: 50,
                            }
                        });
                    }
                    data.ctas.push(
                        { label: 'Export CSV', action: 'export_csv' },
                        { label: 'View price', action: 'route', payload: { kind: 'price' } },
                    );

                    data.insights.push({ label: 'Detected intent', value: 'New token listings' });
                    svcMeta = { name: 'birdeye.new_listings', latencyMs: Date.now() - t0 };
                    break;
                }

                case 'price': {
                    data.insights.push({ label: 'Detected intent', value: 'Price lookup' });
                    data.summary = 'Price lookup is coming soon. Ask for “New token listings” to try the swap flow.';
                    data.ctas.push({ label: 'New token listings', action: 'route', payload: { kind: 'new_listings' } });
                    svcMeta = { name: 'price.mock', latencyMs: Date.now() - t0 };
                    break;
                }

                case 'top_holders': {
                    data.insights.push({ label: 'Detected intent', value: 'Top holders lookup' });
                    data.summary = 'Top holders is coming soon. Ask for “New token listings” to try the swap flow.';
                    data.ctas.push({ label: 'New token listings', action: 'route', payload: { kind: 'new_listings' } });
                    svcMeta = { name: 'holders.mock', latencyMs: Date.now() - t0 };
                    break;
                }

                case 'generic_info': {
                    const s = await aiSummarize(prompt);
                    data.summary = s.summary || 'No summary available.';
                    data.insights.push({ label: 'Detected intent', value: 'General info' });
                    data.suggestions = ['New token listings', 'Price SOL', 'Top holders of CHILLGUY'];
                    svcMeta = { name: 'ai.summary', latencyMs: s.latencyMs };
                    break;
                }

                default: {
                    data.summary = 'Try: "New token listings", "Price SOL", or "Top holders of <TOKEN>".';
                    data.insights.push({ label: 'Detected intent', value: 'Generic' });
                    data.ctas.push(
                        { label: 'New token listings', action: 'route', payload: { kind: 'new_listings' } },
                        { label: 'Export CSV', action: 'export_csv' },
                    );
                    svcMeta = { name: 'router.generic', latencyMs: Date.now() - t0 };
                    break;
                }
            }
        } catch (e: any) {
            svcMeta = { name: 'router', error: String(e?.message || e) };
            return { ok: false as const, error: svcMeta.error || 'Service failure', meta: { ai: aiMeta, svc: svcMeta } };
        }

        return {
            ok: true as const,
            wallet,
            data,
            meta: { ai: aiMeta, svc: svcMeta },
        };
    }
}
