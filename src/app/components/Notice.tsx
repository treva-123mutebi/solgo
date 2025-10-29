'use client';

export default function Notice({
    kind = 'info',
    children,
}: {
    kind?: 'info' | 'error' | 'success';
    children: React.ReactNode;
}) {
    const styles =
        kind === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : kind === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-white/5 border-white/10 text-gray-300';
    return (
        <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>
    );
}
