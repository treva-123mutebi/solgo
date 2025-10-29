export async function fetchWithRetry(
    url: string,
    init: RequestInit,
    tries = 3,
    baseDelayMs = 600
) {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
        try {
            const res = await fetch(url, init);
            if (res.ok) return res;
            if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
                const delay = baseDelayMs * Math.pow(2, i);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            return res;
        } catch (e) {
            lastErr = e;
            const delay = baseDelayMs * Math.pow(2, i);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    if (lastErr) throw lastErr;
    return await fetch(url, init);
}
