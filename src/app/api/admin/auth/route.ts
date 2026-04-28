import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function makeToken(password: string) {
  return createHash('sha256').update(password + 'admin-24hnow-salt').digest('hex');
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  if (password.trim() !== adminPassword.trim()) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const trimmed = adminPassword.trim();
  return NextResponse.json({ token: makeToken(trimmed) });
}

export function validateToken(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return false;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  return token === makeToken(adminPassword);
}
