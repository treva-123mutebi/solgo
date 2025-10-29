// In-memory store for demo. Replace with Prisma/Drizzle later.
type User = { wallet: string; createdAt: number };
const users = new Map<string, User>();

export function upsertUserByWallet(pubkey: string): User {
    const existing = users.get(pubkey);
    if (existing) return existing;
    const user = { wallet: pubkey, createdAt: Date.now() };
    users.set(pubkey, user);
    return user;
}

export function getUser(pubkey: string) {
    return users.get(pubkey);
}
