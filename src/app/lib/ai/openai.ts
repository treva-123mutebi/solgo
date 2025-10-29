import { keywordFallback } from './intent';
import { fetchWithRetry } from '@/app/lib/util/retry';
import { geminiClassifyIntent, geminiSummarize } from './gemini';

type ClassifyOut = {
    intent: any;
    meta: { source: 'openai' | 'gemini' | 'fallback'; latencyMs: number; error?: string; raw?: any };
};

function stripMd(s: string) {
    return (s || '')
        .replace(/[*_`#>-]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// tiny caches
const CLASSIFY_CACHE = new Map<string, { ts: number; value: ClassifyOut }>();
const SUMMARY_CACHE = new Map<string, { ts: number; value: { summary: string; meta: any } }>();
const TTL_MS = 2 * 60 * 1000;

function getCached<T>(map: Map<string, { ts: number; value: T }>, key: string): T | undefined {
    const v = map.get(key);
    if (v && Date.now() - v.ts < TTL_MS) return v.value;
    if (v) map.delete(key);
    return undefined;
}
function setCached<T>(map: Map<string, { ts: number; value: T }>, key: string, value: T) {
    map.set(key, { ts: Date.now(), value });
}

export async function classifyIntent(prompt: string): Promise<ClassifyOut> {
    const cached = getCached(CLASSIFY_CACHE, prompt);
    if (cached) return cached;

    const start = Date.now();
    const key = process.env.OPENAI_API_KEY?.trim();
    const org = process.env.OPENAI_ORG?.trim();

    const sys = `Return ONLY compact JSON for one of:
{"kind":"new_listings"}
{"kind":"top_holders","token":"<optional>"}
{"kind":"price","token":"<optional>"}
{"kind":"generic_info"}
{"kind":"generic"}`;

    if (key) {
        try {
            const body = {
                model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: `Query: ${prompt}\nReturn JSON only.` },
                ],
                temperature: 0,
                response_format: { type: 'json_object' },
            };

            const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${key}`,
                    ...(org ? { 'OpenAI-Organization': org } : {}),
                },
                body: JSON.stringify(body),
                cache: 'no-store',
            });

            const latencyMs = Date.now() - start;
            if (res.ok) {
                const j = await res.json();
                const raw = j?.choices?.[0]?.message?.content?.trim();
                let intent: any;
                try {
                    intent = raw ? JSON.parse(raw) : keywordFallback(prompt);
                } catch {
                    intent = keywordFallback(prompt);
                }
                const out: ClassifyOut = { intent, meta: { source: 'openai', latencyMs, raw: intent } };
                setCached(CLASSIFY_CACHE, prompt, out);
                return out;
            }
            // OpenAI returned non-ok — fall through to Gemini
        } catch {
            // network error — fall through to Gemini
        }
    }

    // Try Gemini
    try {
        const g = await geminiClassifyIntent(prompt);
        if (g.intent) {
            setCached(CLASSIFY_CACHE, prompt, g);
            return g;
        }
    } catch (e: any) {
        // ignore, go fallback
    }

    // Keyword fallback
    const intent = keywordFallback(prompt);
    const out: ClassifyOut = { intent, meta: { source: 'fallback', latencyMs: Date.now() - start } };
    setCached(CLASSIFY_CACHE, prompt, out);
    return out;
}

export async function summarizeGeneric(prompt: string): Promise<string> {
    const cached = getCached(SUMMARY_CACHE, prompt);
    if (cached) return cached.summary;

    const key = process.env.OPENAI_API_KEY?.trim();
    const org = process.env.OPENAI_ORG?.trim();

    if (key) {
        try {
            const body = {
                model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Write a concise answer (80–160 words), neutral, concrete. No fluff. No code.' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.2,
            };
            const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${key}`,
                    ...(org ? { 'OpenAI-Organization': org } : {}),
                },
                body: JSON.stringify(body),
                cache: 'no-store',
            });
            if (res.ok) {
                const j = await res.json();
                const v = stripMd(j?.choices?.[0]?.message?.content ?? 'No summary available.');
                setCached(SUMMARY_CACHE, prompt, { summary: v, meta: { source: 'openai' } });
                return v;
            }
        } catch {
            // fall through to Gemini
        }
    }

    try {
        const g = await geminiSummarize(prompt);
        setCached(SUMMARY_CACHE, prompt, { summary: g.summary, meta: g.meta });
        return g.summary;
    } catch {
        const v = 'No summary available.';
        setCached(SUMMARY_CACHE, prompt, { summary: v, meta: { source: 'fallback' } });
        return v;
    }
}
