export async function fetchJson(url: string, init?: RequestInit) {
    const res = await fetch(url, { ...init, cache: 'no-store' });
    if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url} -> ${res.status}`);
    return await res.json();
}
