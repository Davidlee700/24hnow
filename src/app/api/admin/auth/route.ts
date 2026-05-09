import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function makeToken(password: string): string {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiry);
  const sig = sign(payload, password);
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) throw new Error('ADMIN_PASSWORD environment variable is not set');
  return password;
}

export function validateToken(req: NextRequest): boolean {
  try {
    const adminPassword = getAdminPassword();
    const raw = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    const [b64, sig] = raw.split('.');
    if (!b64 || !sig) return false;

    const payload = Buffer.from(b64, 'base64url').toString();
    const expiry = Number(payload);
    if (isNaN(expiry) || Date.now() > expiry) return false;

    return sign(payload, adminPassword) === sig;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminPassword = getAdminPassword();
    const { password } = await req.json();
    const inputPassword = password?.trim();

    if (inputPassword === adminPassword) {
      return NextResponse.json({ token: makeToken(adminPassword) });
    }

    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
