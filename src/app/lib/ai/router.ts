import { NextRequest, NextResponse } from "next/server";
import { AIService } from "./AIService";


export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const { prompt, wallet } = await req.json().catch(() => ({}));
    if (!prompt) {
        return NextResponse.json({ ok: false, error: "Missing prompt" }, { status: 400 });
    }

    const ai = new AIService();
    const result = await ai.ask(prompt);

    if (!result.ok) {
        return NextResponse.json(result, { status: 500 });
    }

    const { summary, ctas, source, latencyMs } = result;

    return NextResponse.json({
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
    });
}