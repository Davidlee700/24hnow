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

export function validateToken(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const newPasswordFallback = 'dmsdud12!@';
  
  const raw = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const [b64, sig] = raw.split('.');
  if (!b64 || !sig) return false;

  const payload = Buffer.from(b64, 'base64url').toString();
  const expiry = Number(payload);
  if (isNaN(expiry) || Date.now() > expiry) return false;

  // Check against both current env var and fallback
  const isMatchEnv = adminPassword ? sign(payload, adminPassword) === sig : false;
  const isMatchFallback = sign(payload, newPasswordFallback) === sig;

  return isMatchEnv || isMatchFallback;
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const inputPassword = password.trim();
  const targetPassword = adminPassword.trim();
  const newPasswordFallback = 'dmsdud12!@';

  if (inputPassword !== targetPassword && inputPassword !== newPasswordFallback) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const activePassword = inputPassword === newPasswordFallback ? newPasswordFallback : targetPassword;
  return NextResponse.json({ token: makeToken(activePassword) });
}
