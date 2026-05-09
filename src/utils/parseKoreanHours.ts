// 네이버 description 텍스트에서 raw_hours 형식 추출
// raw_hours 포맷: "월: 1000-2400 화: 1000-2400 ..."
// 익일 새벽 시간은 2600 형식으로 저장 (26시 = 다음날 2시)
// openHours.ts의 parseRawHours가 closeMin > 1440을 overnight으로 처리

const ALL_DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

// "10:00", "10시", "10시30분", "익일 2시" → HHMM 문자열
function parseTimeToken(str: string, nextDay = false): string | null {
  const m = str.match(/(\d{1,2})(?::(\d{2})|시(?:(\d{2})분?)?)/);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2] ?? m[3] ?? '0');
  if (nextDay) h += 24; // 익일 → +24 (2600, 2700 등)
  return `${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}`;
}

// "월~금", "평일", "매일", "토,일" → 요일 배열
function expandDays(dayStr: string): string[] {
  const s = dayStr.trim();
  if (/매일|전일|상시|every/i.test(s)) return [...ALL_DAYS];
  if (/평일|weekday/i.test(s)) return ['월', '화', '수', '목', '금'];
  if (/주말|weekend/i.test(s)) return ['토', '일'];

  // "월~금" / "월-금"
  const rangeM = s.match(/([월화수목금토일])(?:요일)?[~\-]([월화수목금토일])(?:요일)?/);
  if (rangeM) {
    const si = ALL_DAYS.indexOf(rangeM[1] as any);
    const ei = ALL_DAYS.indexOf(rangeM[2] as any);
    if (si !== -1 && ei !== -1) {
      if (si <= ei) return [...ALL_DAYS].slice(si, ei + 1);
      // 역순 범위 (예: 금~월) → 끝까지 + 처음부터
      return [...ALL_DAYS.slice(si), ...ALL_DAYS.slice(0, ei + 1)];
    }
  }

  // "월,화,수" / "월화수" / 단일 요일
  const singles = s.match(/[월화수목금토일]/g);
  if (singles) return singles.filter(d => ALL_DAYS.includes(d as any));

  return [];
}

// open/close HHMM 쌍을 raw_hours 세그먼트로 변환
function buildSegment(days: string[], open: string, close: string): string {
  return days.map(d => `${d}: ${open}-${close}`).join(' ');
}

export function parseKoreanHours(desc: string): string | null {
  if (!desc) return null;

  // 24시간 영업
  if (/(24시간\s*영업|연중무휴|00:00.*24:00|0{4}.*2400)/i.test(desc)) {
    return ALL_DAYS.map(d => `${d}: 0000-2400`).join(' ');
  }

  const segments: string[] = [];

  // ── 패턴 A: 요일 범위 + 시간  ──────────────────────────────────────────
  // 예: "월~금 10:00~22:00", "평일 09시~21시", "주말 10:00~익일02:00"
  const patternA = /([월화수목금토일평주매][~\-요일말일,화수목금토\s]*)\s*(\d{1,2}[:시]\d{0,2}분?)\s*[~\-~]\s*(익일\s*)?(\d{1,2}[:시]\d{0,2}분?)/g;
  let m: RegExpExecArray | null;
  while ((m = patternA.exec(desc)) !== null) {
    const days = expandDays(m[1]);
    const open = parseTimeToken(m[2]);
    const nextDay = !!m[3];
    const close = parseTimeToken(m[4], nextDay);
    if (days.length && open && close) {
      segments.push(buildSegment(days, open, close));
    }
  }

  if (segments.length > 0) {
    // 언급 안 된 요일 채우기 (언급된 요일 기준 첫 번째 시간으로)
    const mentioned = new Set(segments.join(' ').match(/[월화수목금토일](?=:)/g) ?? []);
    const missing = ALL_DAYS.filter(d => !mentioned.has(d));
    if (missing.length > 0 && missing.length < 7 && segments[0]) {
      const firstRange = segments[0].match(/\d{4}-\d{4,6}/)?.[0];
      if (firstRange) {
        segments.push(buildSegment(missing, firstRange.split('-')[0], firstRange.split('-')[1]));
      }
    }
    return segments.join(' ');
  }

  // ── 패턴 B: 요일 없이 시간만  ──────────────────────────────────────────
  // 예: "10:00~24:00", "10시~익일 02시", "오전 10시 ~ 오후 11시"
  const patternB = /(\d{1,2})[:시](\d{2}분?)?\s*[~\-~]\s*(익일\s*)?(\d{1,2})[:시](\d{2}분?)?/;
  const bm = desc.match(patternB);
  if (bm) {
    const oh = bm[1].padStart(2, '0');
    const om = (bm[2] ?? '00').replace('분', '').padStart(2, '0');
    const nextDay = !!bm[3];
    let ch = parseInt(bm[4]);
    if (nextDay) ch += 24;
    const cm = (bm[5] ?? '00').replace('분', '').padStart(2, '0');
    const open = `${oh}${om}`;
    const close = `${String(ch).padStart(2, '0')}${cm}`;
    return ALL_DAYS.map(d => `${d}: ${open}-${close}`).join(' ');
  }

  // ── 패턴 C: 오전/오후 표기  ────────────────────────────────────────────
  // 예: "오전 10시 ~ 밤 12시"
  const ampm: Record<string, number> = { 오전: 0, 오후: 12, 저녁: 12, 밤: 12, 새벽: 24 };
  const patternC = /(오전|오후|저녁|밤|새벽)\s*(\d{1,2})시\s*[~\-]\s*(오전|오후|저녁|밤|새벽)?\s*(\d{1,2})시/;
  const cm2 = desc.match(patternC);
  if (cm2) {
    const openH = (ampm[cm2[1]] ?? 0) + parseInt(cm2[2]);
    const closeOffset = cm2[3] ? (ampm[cm2[3]] ?? 0) : 0;
    let closeH = closeOffset + parseInt(cm2[4]);
    // 닫는 시간이 여는 시간보다 작으면 익일로 처리
    if (closeH <= openH) closeH += 24;
    const open = `${String(openH).padStart(2, '0')}00`;
    const close = `${String(closeH).padStart(2, '0')}00`;
    return ALL_DAYS.map(d => `${d}: ${open}-${close}`).join(' ');
  }

  return null;
}
