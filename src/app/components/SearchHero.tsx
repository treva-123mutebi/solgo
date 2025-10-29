'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Notice from './Notice';

type CTA = {
    label: string;
    action: 'route' | 'export_csv' | 'copy_trade' | 'open_top_holders' | 'create_watch' | 'suggest';
    payload?: any;
};
type Insight = { label: string; value: string };
type Row = Record<string, unknown>;

type Meta = {
    ai?: { source: 'openai' | 'fallback'; latencyMs: number; error?: string; raw?: any };
    svc?: { name: string; latencyMs?: number; error?: string };
    fatal?: boolean;
};

type QueryOk = {
    ok: true;
    wallet: string | null;
    data: {
        insights: Insight[];
        ctas: CTA[];
        summary?: string;
        table?: Row[];
        suggestions?: string[];
    };
    meta?: Meta;
};
type QueryErr = { ok: false; error: string; meta?: Meta };
type QueryResponse = QueryOk | QueryErr;

export default function SearchHero() {
    const { publicKey } = useWallet();

    const [mounted, setMounted] = useState(false);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState<QueryResponse | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const [lastQuery, setLastQuery] = useState<string>('');
    const [showTrace, setShowTrace] = useState(false);

    const addr = useMemo(() => (mounted && publicKey ? publicKey.toBase58() : null), [mounted, publicKey]);
    const shortAddr = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : null;

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted || !res || !('ok' in res) || !res.ok || !lastQuery) return;
        try {
            const key = 'solgo:history';
            const prev: string[] = JSON.parse(localStorage.getItem(key) || '[]');
            const next = [lastQuery, ...prev.filter((x) => x !== lastQuery)].slice(0, 10);
            localStorage.setItem(key, JSON.stringify(next));
        } catch { }
    }, [mounted, res, lastQuery]);

    const exportCSV = (rows: Row[]) => {
        if (!rows || rows.length === 0) return;
        const colSet = rows.reduce<Set<string>>((s, r) => {
            Object.keys(r || {}).forEach((k) => s.add(k));
            return s;
        }, new Set<string>());
        const cols = Array.from(colSet);
        const header = cols.join(',');
        const lines = rows.map((r) => cols.map((k) => JSON.stringify((r as any)?.[k] ?? '')).join(','));
        const csv = [header, ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'solgo-export.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const run = async (override?: string) => {
        setInfoMsg(null);
        setErrMsg(null);

        const promptText = (override ?? q).trim();
        if (!promptText) {
            setErrMsg('Type a question, e.g. Who holds the most CHILLGUY tokens?');
            return;
        }

        setLoading(true);
        setRes(null);
        setLastQuery(promptText);

        try {
            const r = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText, wallet: addr ?? null }),
            });
            const data = (await r.json()) as QueryResponse;
            setRes(data);
            if (!('ok' in data) || !data.ok) setErrMsg((data as any).error || 'Request failed.');
            else setInfoMsg('Results ready.');
        } catch (e: any) {
            setErrMsg(e?.message || 'Network error.');
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') run();
    };

    const handleCta = (c: CTA) => {
        if (!res || !('ok' in res) || !res.ok) return;
        const table: Row[] = Array.isArray(res.data.table) ? res.data.table : [];

        if (c.action === 'export_csv' && table.length) {
            exportCSV(table);
            return;
        }
        if (c.action === 'route' && c.payload?.kind) {
            const token = c.payload?.token ? ` ${c.payload.token}` : '';
            const nextQuery =
                c.payload.kind === 'new_listings'
                    ? 'New token listings'
                    : c.payload.kind === 'price'
                        ? `Price${token}`
                        : c.payload.kind === 'top_holders'
                            ? `Top holders of ${c.payload.token ?? ''}`.trim()
                            : q;
            setQ(nextQuery);
            run(nextQuery);
            return;
        }
        if (c.action === 'suggest') {
            const suggestion = typeof c.label === 'string' ? c.label : q;
            setQ(suggestion);
            run(suggestion);
            return;
        }
        console.log('CTA clicked', c);
    };

    const aiMeta = (res && 'meta' in res && res.meta?.ai) ? res.meta.ai : undefined;
    const svcMeta = (res && 'meta' in res && res.meta?.svc) ? res.meta.svc : undefined;

    return (
        <div className="flex flex-col items-center mt-16 gap-6">
            <div className="text-center">
                <div className="text-5xl font-extrabold tracking-tight">
                    <span className="bg-sol-gradient bg-clip-text text-transparent">Sol</span>
                    <span className="text-white">Go</span>
                </div>
                <p className="mt-3 text-sol-teal/90">Ask Solana in plain English. Get actionable CTAs.</p>
            </div>

            <div className="w-full max-w-2xl">
                <div className="flex items-center gap-2 bg-sol-ink rounded-2xl px-4 py-3 shadow-soft">
                    {mounted ? (
                        <input
                            className="flex-1 bg-transparent outline-none text-lg placeholder-gray-400"
                            placeholder='e.g. "Who holds the most CHILLGUY tokens?"'
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={handleKey}
                            autoComplete="off"
                            name="solgo-query"
                            suppressHydrationWarning
                        />
                    ) : (
                        <div className="h-10 flex-1 rounded-md bg-white/5" />
                    )}
                    <button
                        onClick={() => run()}
                        disabled={loading}
                        className="rounded-xl px-5 py-2 font-semibold bg-sol-gradient text-black disabled:opacity-60"
                    >
                        {loading ? 'Thinking…' : 'Ask'}
                    </button>
                </div>

                <div className="mt-2 text-xs text-gray-400">
                    {addr ? <>Connected: <span className="text-white font-medium">{shortAddr}</span></> : 'Wallet not connected'}
                </div>

                {/* Messages */}
                <div className="mt-3 space-y-2">
                    {infoMsg && <Notice kind="info">{infoMsg}</Notice>}
                    {errMsg && <Notice kind="error">{errMsg}</Notice>}
                </div>

                {/* Quick chips */}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {['What is Solana?', 'New token listings', 'Price SOL', 'Top holders of CHILLGUY'].map((s, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setQ(s);
                                run(s);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-full"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            {res && (
                <div className="w-full max-w-2xl mt-6 bg-sol-ink/80 rounded-2xl p-4 border border-white/10">
                    {/* Trace / meta */}
                    <div className="mb-3">
                        <button
                            className="text-xs underline text-gray-400"
                            onClick={() => setShowTrace((v) => !v)}
                        >
                            {showTrace ? 'Hide' : 'Show'} trace
                        </button>
                        {showTrace && (
                            <div className="mt-2 space-y-2">
                                {aiMeta && (
                                    <Notice kind={aiMeta.error ? 'error' : 'info'}>
                                        <div className="text-xs">
                                            <div>AI source: <b>{aiMeta.source}</b> • {aiMeta.latencyMs}ms</div>
                                            {aiMeta.error && <div>Error: {aiMeta.error}</div>}
                                            {aiMeta.raw && (
                                                <div className="mt-1">
                                                    Raw intent: <code className="text-[10px] break-all">{JSON.stringify(aiMeta.raw)}</code>
                                                </div>
                                            )}
                                        </div>
                                    </Notice>
                                )}
                                {svcMeta && (
                                    <Notice kind={svcMeta.error ? 'error' : 'info'}>
                                        <div className="text-xs">
                                            <div>Service: <b>{svcMeta.name}</b> {typeof svcMeta.latencyMs === 'number' ? `• ${svcMeta.latencyMs}ms` : ''}</div>
                                            {svcMeta.error && <div>Error: {svcMeta.error}</div>}
                                        </div>
                                    </Notice>
                                )}
                            </div>
                        )}
                    </div>

                    {/* If request failed, show server error and stop */}
                    {'ok' in res && !res.ok && (
                        <Notice kind="error">{res.error || 'Request failed.'}</Notice>
                    )}

                    {'ok' in res && res.ok && (
                        <>
                            {/* Summary (generic info) */}
                            {res.data.summary && (
                                <div className="prose prose-invert max-w-none text-gray-200 mb-3">
                                    <p className="whitespace-pre-wrap">{res.data.summary}</p>
                                </div>
                            )}

                            {/* Insights */}
                            <div className="space-y-2">
                                {res.data.insights.map((i, idx) => (
                                    <div key={idx} className="text-sm text-gray-300">
                                        <span className="text-gray-400">{i.label}:</span> {i.value}
                                    </div>
                                ))}
                            </div>

                            {/* Suggested follow-ups */}
                            {Array.isArray(res.data.suggestions) && res.data.suggestions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                    {res.data.suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setQ(s);
                                                run(s);
                                            }}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-full"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Table */}
                            {(() => {
                                const table: Row[] = Array.isArray(res.data.table) ? res.data.table : [];
                                if (table.length === 0) return null;
                                const headers = Object.keys(table[0] as Row);
                                return (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="text-gray-400">
                                                <tr>
                                                    {headers.map((k) => (
                                                        <th key={k} className="text-left font-medium pr-4 py-1">{k}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {table.map((row, i) => (
                                                    <tr key={i} className="border-t border-white/10">
                                                        {headers.map((k) => (
                                                            <td key={k} className="pr-4 py-1">
                                                                {String((row as any)?.[k] ?? '')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="mt-3">
                                            <button
                                                onClick={() => exportCSV(table)}
                                                className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg px-3 py-1 text-sm"
                                            >
                                                Export CSV
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* CTAs */}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {res.data.ctas.map((c, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleCta(c)}
                                        className="bg-sol-gradient text-black font-semibold px-3 py-1.5 rounded-lg"
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 text-xs text-gray-400">
                                {addr ? `Signed in as ${shortAddr}` : 'Connect a wallet to personalize results'}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
