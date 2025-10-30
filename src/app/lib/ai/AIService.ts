import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

// Initialize SDKs only if keys exist
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const gemini = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

export class AIService {
    async ask(prompt: string) {
        // --- Try OpenAI first ---
        if (openai) {
            try {
                const start = Date.now();
                const res = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are SolGo AI, a Solana knowledge assistant. Be concise, helpful, and return JSON-safe text.",
                        },
                        { role: "user", content: prompt },
                    ],
                });

                const answer = res.choices?.[0]?.message?.content?.trim() ?? "";
                return {
                    ok: true,
                    source: "openai",
                    latencyMs: Date.now() - start,
                    summary: answer,
                    ctas: this.extractCTAs(prompt, answer),
                };
            } catch (err: any) {
                console.warn("⚠️ OpenAI failed:", err.message);
            }
        }

        // --- Fallback to Gemini ---
        if (gemini) {
            try {
                const start = Date.now();
                // ✅ Correct model name
                const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

                const result = await model.generateContent(prompt);
                const answer = (await result.response.text())?.trim() ?? "";

                return {
                    ok: true,
                    source: "gemini",
                    latencyMs: Date.now() - start,
                    summary: answer,
                    ctas: this.extractCTAs(prompt, answer),
                };
            } catch (err: any) {
                console.warn("⚠️ Gemini failed:", err.message);
            }
        }

        // --- If all fail ---
        return {
            ok: false,
            error: "All AI providers failed or unavailable.",
        };
    }

    

        // Simple CTA inference

        extractCTAs(prompt: string, summary: string) {

            const lower = prompt.toLowerCase();

            const ctas: any[] = [];

    

            if (lower.includes("price"))

                ctas.push({ label: "View latest price", action: "route", payload: { kind: "price" } });

            if (lower.includes("holder"))

                ctas.push({ label: "View top holders", action: "route", payload: { kind: "top_holders" } });

            if (lower.includes("listing"))

                ctas.push({ label: "View new token listings", action: "route", payload: { kind: "new_listings" } });

    

            if (ctas.length === 0)

                ctas.push({ label: "Try another query", action: "suggest" });

    

            ctas.push({ label: "Export CSV", action: "export_csv" });

            return ctas;

        }

    

        async route(prompt: string, wallet: string | null) {

            const result = await this.ask(prompt);

    

            if (!result.ok) {

                return result;

            }

    

            const { summary, ctas, source, latencyMs } = result;

    

            return {

                ok: true,

                wallet,

                data: {

                    summary,

                    insights: [

                        { label: "AI source", value: source },

                        { label: "Latency", value: `${latencyMs}ms` },

                    ],

                    ctas,

                },

            };

        }

    }

    