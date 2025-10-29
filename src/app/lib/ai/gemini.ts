import { fetchWithRetry } from '@/app/lib/util/retry';

function stripMd(s: string) {
    return (s || '')
        .replace(/[*_`#>-]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

type ClassifyOut = {
    intent: any;
    meta: { source: 'gemini'; latencyMs: number; error?: string; raw?: any };
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

export async function geminiClassifyIntent(prompt: string): Promise<ClassifyOut> {
    const key = process.env.GEMINI_API_KEY?.trim();
    const start = Date.now();
    if (!key) throw new Error('GEMINI_API_KEY missing');

    const sys = `Return ONLY compact JSON for one intent:
{"kind":"new_listings"}
{"kind":"top_holders","token":"<optional>"}
{"kind":"price","token":"<optional>"}
{"kind":"generic_info"}
{"kind":"generic"}`;

    const body = {
        contents: [
            { role: 'user', parts: [{ text: `${sys}\n\nQuery: ${prompt}\nReply with JSON only.` }] }
        ],
        generationConfig: { temperature: 0 }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store'
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
        return { intent: null, meta: { source: 'gemini', latencyMs, error: `Gemini ${res.status}` } };
    }

    const j = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    let intent: any = null;
    try {
        intent = JSON.parse(text);
    } catch {
        // some models wrap code fences—strip and retry
        const cleaned = text.replace(/```json|```/g, '').trim();
        intent = JSON.parse(cleaned);
    }
    return { intent, meta: { source: 'gemini', latencyMs, raw: intent } };
}

export async function geminiSummarize(prompt: string): Promise<{ summary: string; meta: { source: 'gemini'; latencyMs: number; error?: string } }> {
    const key = process.env.GEMINI_API_KEY?.trim();
    const start = Date.now();
    if (!key) throw new Error('GEMINI_API_KEY missing');

    const model = process.env.GEMINI_SUMMARY_MODEL ?? 'gemini-1.5-pro';
    const body = {
        contents: [
            { role: 'user', parts: [{ text: `Write a concise, neutral answer (80–160 words), concrete facts. No fluff. No code.\n\n${prompt}` }] }
        ],
        generationConfig: { temperature: 0.2 }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store'
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
        return { summary: 'No summary available.', meta: { source: 'gemini', latencyMs, error: `Gemini ${res.status}` } };
    }

    const j = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No summary available.';
    return { summary: stripMd(text), meta: { source: 'gemini', latencyMs } };
}
