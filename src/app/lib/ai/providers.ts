import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AISource = 'gemini' | 'openai' | 'fallback';

const openaiKey = process.env.OPENAI_API_KEY?.trim();
const geminiKey = process.env.GEMINI_API_KEY?.trim();

export const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
export const gemini = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

export async function aiClassify(prompt: string): Promise<{ intent: any; meta: { source: AISource; latencyMs: number; error?: string; raw?: any } }> {
    const sys = `Return ONLY compact JSON for exactly one:
{"kind":"new_listings"}
{"kind":"top_holders","token":"<optional>"}
{"kind":"price","token":"<optional>"}
{"kind":"generic_info"}
{"kind":"generic"}`;

    // 1) Gemini first
    if (gemini) {
        const start = Date.now();
        try {
            const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
            const res = await model.generateContent(`${sys}\n\nQuery: ${prompt}\nReply JSON only.`);
            const text = (await res.response.text()).trim();
            const cleaned = text.replace(/```json|```/g, '').trim();
            const intent = JSON.parse(cleaned);
            return { intent, meta: { source: 'gemini', latencyMs: Date.now() - start, raw: intent } };
        } catch (e: any) {
            return { intent: null, meta: { source: 'gemini', latencyMs: Date.now() - start, error: String(e?.message || e) } };
        }
    }

    // 2) OpenAI fallback
    if (openai) {
        const start = Date.now();
        try {
            const res = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: sys },
                    { role: "user", content: `Query: ${prompt}\nReturn JSON only.` },
                ],
                response_format: { type: "json_object" },
                temperature: 0
            });
            const text = res.choices?.[0]?.message?.content?.trim() ?? "{}";
            const intent = JSON.parse(text);
            return { intent, meta: { source: 'openai', latencyMs: Date.now() - start, raw: intent } };
        } catch (e: any) {
            return { intent: null, meta: { source: 'openai', latencyMs: Date.now() - start, error: String(e?.message || e) } };
        }
    }

    // 3) Keyword fallback
    const intent = keywordFallback(prompt);
    return { intent, meta: { source: 'fallback', latencyMs: 0, raw: intent } };
}

export function keywordFallback(prompt: string) {
    const p = prompt.toLowerCase();
    if (p.includes('new token') || p.includes('new listing') || p.includes('listings')) return { kind: 'new_listings' };
    if (p.includes('top holder') || p.includes('who holds')) return { kind: 'top_holders', token: undefined };
    if (p.includes('price')) return { kind: 'price', token: undefined };
    if (p.startsWith('what is ') || p.includes('explain') || p.includes('tell me about')) return { kind: 'generic_info' };
    return { kind: 'generic' };
}

export async function aiSummarize(context: string): Promise<{ summary: string; source: AISource; latencyMs: number; error?: string }> {
    // Gemini first
    if (gemini) {
        const start = Date.now();
        try {
            const model = gemini.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
            const res = await model.generateContent(
                `Write 2–4 concise sentences with concrete facts. No code, no markdown.
Context:
${context}`
            );
            const text = (await res.response.text())?.trim() ?? '';
            return { summary: strip(text), source: 'gemini', latencyMs: Date.now() - start };
        } catch { /* fall back */ }
    }
    // OpenAI fallback
    if (openai) {
        const start = Date.now();
        try {
            const res = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Write 2–4 concise sentences with concrete facts. No code, no markdown." },
                    { role: "user", content: context }
                ],
                temperature: 0.2
            });
            const text = res.choices?.[0]?.message?.content?.trim() ?? '';
            return { summary: strip(text), source: 'openai', latencyMs: Date.now() - start };
        } catch { /* ignore */ }
    }
    return { summary: '', source: 'fallback', latencyMs: 0, error: 'summary_failed' };
}

function strip(s: string) {
    return s.replace(/[*_`#>-]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
