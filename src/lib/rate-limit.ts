const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}

export function getIp(req: Request): string {
  return (
    (req as any).headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ??
    (req as any).headers?.get?.('x-real-ip') ??
    'unknown'
  );
}
